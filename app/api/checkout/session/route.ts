import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { stripe } from '@/lib/stripe'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const schema = z.object({
  employee_id: uuidLike,
  service_id: uuidLike,
  addon_ids: z.array(uuidLike).default([]),
  start_at: z.string().min(1),
  token_id: uuidLike.nullable().optional(),
  promo_code_id: uuidLike.nullable().optional(),
  notes: z.string().nullable().optional(),
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

  const data = parsed.data

  const [
    { data: service, error: serviceError },
    { data: profile },
  ] = await Promise.all([
    supabase.from('services').select('name, price_cents, duration_minutes').eq('id', data.service_id).single(),
    supabase.from('profiles').select('full_name, company_name, stripe_customer_id').eq('id', user.id).single(),
  ])

  if (serviceError || !service) return Response.json({ error: 'Prestation introuvable' }, { status: 404 })

  let addonTotal = 0
  let addonDuration = 0
  const addonRows: { id: string; name: string; price_cents: number; duration_minutes: number }[] = []

  if (data.addon_ids.length > 0) {
    const { data: addons } = await supabase
      .from('service_addons')
      .select('id, name, price_cents, duration_minutes')
      .in('id', data.addon_ids)
    if (addons) {
      addonRows.push(...addons)
      addonTotal = addons.reduce((s, a) => s + a.price_cents, 0)
      addonDuration = addons.reduce((s, a) => s + a.duration_minutes, 0)
    }
  }

  const totalDuration = service.duration_minutes + addonDuration
  const startAt = new Date(data.start_at)
  const endAt = new Date(startAt.getTime() + totalDuration * 60 * 1000)

  // Resolve promo discount
  let discountCents = 0
  let promoForCoupon: { code: string; discount_type: string; discount_value: number } | null = null
  if (data.promo_code_id) {
    const { data: promo } = await admin
      .from('promo_codes')
      .select('code, discount_type, discount_value')
      .eq('id', data.promo_code_id)
      .eq('is_active', true)
      .single()
    if (promo) {
      const subtotal = service.price_cents + addonTotal
      discountCents = promo.discount_type === 'percentage'
        ? Math.round(subtotal * promo.discount_value / 100)
        : promo.discount_value
      discountCents = Math.min(discountCents, subtotal)
      promoForCoupon = promo
    }
  }

  const { data: refResult, error: refError } = await admin.rpc('generate_booking_ref')
  if (refError || !refResult) return Response.json({ error: 'Impossible de générer une référence' }, { status: 500 })

  // When a token covers the base service, only add-ons are charged via Stripe
  const isTokenHybrid = !!data.token_id
  if (isTokenHybrid && addonRows.length === 0) {
    return Response.json({ error: 'Un token ne peut pas être utilisé sans complément via ce flux' }, { status: 422 })
  }
  const chargedCents = isTokenHybrid
    ? addonTotal
    : service.price_cents + addonTotal - discountCents

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      booking_ref: refResult,
      client_id: user.id,
      employee_id: data.employee_id,
      service_id: data.service_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending',
      payment_method: 'stripe_one_time',
      token_id: data.token_id ?? null,
      total_price_cents: chargedCents,
      discount_cents: isTokenHybrid ? 0 : discountCents,
      promo_code_id: isTokenHybrid ? null : (data.promo_code_id ?? null),
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (bookingError || !booking) {
    console.error('[checkout/session] booking insert error', bookingError)
    return Response.json({ error: 'Erreur lors de la création de la réservation' }, { status: 500 })
  }

  if (addonRows.length > 0) {
    await admin.from('booking_addons').insert(
      addonRows.map((a) => ({ booking_id: booking.id, addon_id: a.id, price_cents: a.price_cents }))
    )
  }

  // Get or create Stripe customer
  const customerName = (profile as { company_name?: string | null } & typeof profile)?.company_name ?? profile?.full_name ?? undefined
  let customerId = profile?.stripe_customer_id ?? null
  if (customerId) {
    // Verify the customer exists in the current Stripe mode (test vs live IDs differ)
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

  const lineItems = [
    // Skip service base price when token covers it
    ...(isTokenHybrid ? [] : [{
      price_data: {
        currency: 'eur',
        unit_amount: service.price_cents,
        product_data: { name: service.name },
      },
      quantity: 1 as const,
    }]),
    ...addonRows.map((a) => ({
      price_data: {
        currency: 'eur',
        unit_amount: a.price_cents,
        product_data: { name: a.name },
      },
      quantity: 1 as const,
    })),
  ]

  // Create Stripe coupon for promo discount
  let stripeCouponId: string | undefined
  if (promoForCoupon && discountCents > 0) {
    const coupon = await stripe.coupons.create(
      promoForCoupon.discount_type === 'percentage'
        ? { percent_off: promoForCoupon.discount_value, duration: 'once', name: promoForCoupon.code }
        : { amount_off: Math.round(discountCents), currency: 'eur', duration: 'once', name: promoForCoupon.code }
    ).catch((err) => { console.error('[checkout/session] coupon error', err); return null })
    if (coupon) stripeCouponId = coupon.id
  }

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: lineItems,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
      invoice_creation: { enabled: true },
      payment_intent_data: { receipt_email: user.email ?? undefined },
      success_url: `${appUrl}/success?ref=${refResult}`,
      cancel_url: `${appUrl}/cancel?ref=${refResult}`,
      metadata: {
        booking_id: booking.id,
        ...(data.token_id ? { token_id: data.token_id } : {}),
      },
    })
  } catch (err) {
    console.error('[checkout/session] stripe error', err)
    return Response.json({ error: 'Erreur Stripe : ' + (err instanceof Error ? err.message : String(err)) }, { status: 502 })
  }

  return Response.json({ url: session.url })
}
