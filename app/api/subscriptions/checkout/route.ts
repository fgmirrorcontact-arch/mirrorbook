import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { stripe } from '@/lib/stripe'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const schema = z.object({
  service_id: uuidLike,
  tier_id: uuidLike.optional(),
  promo_code_id: uuidLike.nullable().optional(),
  addon_ids: z.array(uuidLike).default([]),
  employee_id: uuidLike,
  start_at: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 422 })

  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 })

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, name, stripe_price_id, is_subscription, tokens_per_renewal, price_cents, duration_minutes')
    .eq('id', parsed.data.service_id)
    .single()

  if (serviceError || !service) return Response.json({ error: 'Formule introuvable' }, { status: 404 })
  if (!service.is_subscription) return Response.json({ error: "Cette formule n'est pas un abonnement" }, { status: 400 })

  let stripePriceId = service.stripe_price_id
  let basePriceCents = service.price_cents ?? 0

  if (parsed.data.tier_id) {
    const { data: tier } = await admin
      .from('service_commitment_tiers')
      .select('stripe_price_id, price_cents')
      .eq('id', parsed.data.tier_id)
      .eq('service_id', service.id)
      .single()
    if (!tier) return Response.json({ error: 'Tier introuvable' }, { status: 404 })
    if (tier.stripe_price_id) stripePriceId = tier.stripe_price_id
    if (tier.price_cents != null) basePriceCents = tier.price_cents
  }

  if (!stripePriceId) return Response.json({ error: 'Formule non configurée dans Stripe (stripe_price_id manquant)' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('client_id', user.id)
    .eq('service_id', service.id)
    .in('status', ['active', 'past_due', 'incomplete'])
    .maybeSingle()

  if (existingSub) {
    const msg = existingSub.status === 'past_due'
      ? 'Vous avez un abonnement en retard de paiement pour cette formule. Réglez la facture en attente avant de souscrire à nouveau.'
      : 'Vous avez déjà un abonnement actif pour cette formule.'
    return Response.json({ error: msg }, { status: 409 })
  }

  // Fetch add-ons
  let addonTotal = 0
  let addonDuration = 0
  const addonRows: { id: string; name: string; price_cents: number; duration_minutes: number }[] = []
  if (parsed.data.addon_ids.length > 0) {
    const { data: addons } = await admin
      .from('service_addons')
      .select('id, name, price_cents, duration_minutes')
      .in('id', parsed.data.addon_ids)
    if (addons) {
      addonRows.push(...addons)
      addonTotal = addons.reduce((s, a) => s + a.price_cents, 0)
      addonDuration = addons.reduce((s, a) => s + a.duration_minutes, 0)
    }
  }

  const totalDuration = (service.duration_minutes ?? 60) + addonDuration
  const startAt = new Date(parsed.data.start_at)
  const endAt = new Date(startAt.getTime() + totalDuration * 60 * 1000)

  // Get or create Stripe customer
  const customerName = (profile as { company_name?: string | null } & typeof profile)?.company_name ?? profile?.full_name ?? undefined
  let customerId = profile?.stripe_customer_id ?? null
  if (customerId) {
    const exists = await stripe.customers.retrieve(customerId).catch(() => null)
    if (!exists || (exists as { deleted?: boolean }).deleted) customerId = null
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: customerName,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  } else if (customerName) {
    void stripe.customers.update(customerId, { name: customerName })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Build promo coupon — duration: 'forever' so the discount applies to all future subscription invoices too
  let stripeCouponId: string | undefined
  if (parsed.data.promo_code_id) {
    const { data: promo } = await admin
      .from('promo_codes')
      .select('discount_type, discount_value, code')
      .eq('id', parsed.data.promo_code_id)
      .eq('is_active', true)
      .single()
    if (promo) {
      const subtotal = basePriceCents + addonTotal
      const discountCents = promo.discount_type === 'percentage'
        ? Math.round(subtotal * promo.discount_value / 100)
        : Math.min(promo.discount_value, subtotal)
      const coupon = await stripe.coupons.create(
        promo.discount_type === 'percentage'
          ? { percent_off: promo.discount_value, duration: 'forever', name: promo.code }
          : { amount_off: Math.round(discountCents), currency: 'eur', duration: 'forever', name: promo.code }
      ).catch((err) => { console.error('[subscriptions/checkout] coupon error', err); return null })
      if (coupon) stripeCouponId = coupon.id
    }
  }

  // Generate booking ref
  const { data: refResult, error: refError } = await admin.rpc('generate_booking_ref')
  if (refError || !refResult) return Response.json({ error: 'Impossible de générer une référence' }, { status: 500 })

  // Create pending booking
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      booking_ref: refResult,
      client_id: user.id,
      employee_id: parsed.data.employee_id,
      service_id: service.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending',
      payment_method: 'stripe_one_time',
      total_price_cents: addonTotal,
      discount_cents: 0,
      promo_code_id: null,
      notes: null,
    })
    .select()
    .single()

  if (bookingError || !booking) {
    console.error('[subscriptions/checkout] booking insert error', bookingError)
    return Response.json({ error: 'Erreur lors de la création de la réservation' }, { status: 500 })
  }

  if (addonRows.length > 0) {
    await admin.from('booking_addons').insert(
      addonRows.map((a) => ({ booking_id: booking.id, addon_id: a.id, price_cents: a.price_cents }))
    )
  }

  // Line items: first month + add-ons
  const lineItems = [
    {
      price_data: {
        currency: 'eur',
        unit_amount: basePriceCents,
        product_data: { name: service.name },
      },
      quantity: 1 as const,
    },
    ...addonRows.map((a) => ({
      price_data: {
        currency: 'eur',
        unit_amount: a.price_cents,
        product_data: { name: a.name },
      },
      quantity: 1 as const,
    })),
  ]

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: lineItems,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
      invoice_creation: { enabled: true },
      payment_intent_data: {
        receipt_email: user.email ?? undefined,
        // Saves the card for the future subscription auto-renewal
        setup_future_usage: 'off_session',
      },
      success_url: `${appUrl}/subscription/success?booking_ref=${refResult}`,
      cancel_url: `${appUrl}/formules`,
      metadata: {
        type: 'subscription_initial',
        booking_id: booking.id,
        stripe_price_id: stripePriceId,
        service_id: service.id,
        ...(stripeCouponId ? { stripe_coupon_id: stripeCouponId } : {}),
      },
    })
  } catch (err) {
    console.error('[subscriptions/checkout] stripe error', err)
    return Response.json({ error: 'Erreur Stripe : ' + (err instanceof Error ? err.message : String(err)) }, { status: 502 })
  }

  return Response.json({ url: session.url })
}
