import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { stripe } from '@/lib/stripe'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const schema = z.object({
  service_id: uuidLike,
  tier_id: uuidLike.optional(),
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
    .select('id, name, stripe_price_id, is_subscription, tokens_per_renewal')
    .eq('id', parsed.data.service_id)
    .single()

  if (serviceError || !service) return Response.json({ error: 'Formule introuvable' }, { status: 404 })
  if (!service.is_subscription) return Response.json({ error: "Cette formule n'est pas un abonnement" }, { status: 400 })

  let stripePriceId = service.stripe_price_id

  if (parsed.data.tier_id) {
    const { data: tier } = await admin
      .from('service_commitment_tiers')
      .select('stripe_price_id')
      .eq('id', parsed.data.tier_id)
      .eq('service_id', service.id)
      .single()
    if (!tier) return Response.json({ error: 'Tier introuvable' }, { status: 404 })
    if (tier.stripe_price_id) stripePriceId = tier.stripe_price_id
  }

  if (!stripePriceId) return Response.json({ error: 'Formule non configurée dans Stripe (stripe_price_id manquant)' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Check if user already has an active subscription to this service
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('client_id', user.id)
    .eq('service_id', service.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existingSub) {
    return Response.json({ error: 'Vous avez déjà un abonnement actif pour cette formule' }, { status: 409 })
  }

  let customerId = profile?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/subscription/success`,
    cancel_url: `${appUrl}/formules`,
    metadata: { service_id: service.id },
  })

  return Response.json({ url: session.url })
}
