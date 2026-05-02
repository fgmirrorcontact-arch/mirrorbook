import { notFound } from 'next/navigation'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import ClientDetailClient from './ClientDetailClient'

export const metadata = { title: 'Admin — Fiche client' }

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = getSupabaseAdminClient()

  const [
    { data: profile, error: profileError },
    { data: authUser },
    { data: bookings },
    { data: subscriptions },
    { data: services },
    { data: promos },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).single(),
    admin.auth.admin.getUserById(id),
    admin
      .from('bookings')
      .select('id, booking_ref, start_at, end_at, status, total_price_cents, services(name), employees(display_name)')
      .eq('client_id', id)
      .order('start_at', { ascending: false })
      .limit(30),
    admin
      .from('subscriptions')
      .select('*, services(name, tokens_per_renewal)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    admin.from('services').select('id, name, is_subscription').eq('is_active', true).order('sort_order'),
    admin.from('promo_codes').select('id, code, discount_type, discount_value').eq('is_active', true),
  ])

  if (profileError || !profile) notFound()

  const activeSubIds = (subscriptions ?? [])
    .filter((s) => s.status === 'active' || s.status === 'past_due')
    .map((s) => s.id)

  let availableTokens: { id: string; subscription_id: string; service_id: string; expires_at: string | null }[] = []
  if (activeSubIds.length > 0) {
    const { data: tok } = await admin
      .from('subscription_tokens')
      .select('id, subscription_id, service_id, expires_at')
      .in('subscription_id', activeSubIds)
      .eq('status', 'available')
    availableTokens = tok ?? []
  }

  return (
    <ClientDetailClient
      clientId={id}
      profile={profile as never}
      email={authUser?.user?.email ?? null}
      bookings={(bookings as never) ?? []}
      subscriptions={(subscriptions as never) ?? []}
      availableTokens={availableTokens}
      services={(services as never) ?? []}
      promos={(promos as never) ?? []}
    />
  )
}
