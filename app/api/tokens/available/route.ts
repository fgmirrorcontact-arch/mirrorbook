import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json(serviceId ? { tokens: [] } : { service_ids: [], subscribed_service_ids: [] })

  if (serviceId) {
    const { data: tokens, error } = await supabase
      .from('subscription_tokens')
      .select('id, subscription_id')
      .eq('client_id', user.id)
      .eq('service_id', serviceId)
      .eq('status', 'available')
    if (error) return Response.json({ tokens: [] })
    return Response.json({ tokens: tokens ?? [] })
  }

  // No service_id: return service_ids with available tokens + service_ids with active subscriptions
  const [{ data: tokenRows, error: tokenError }, { data: subRows }] = await Promise.all([
    supabase
      .from('subscription_tokens')
      .select('service_id')
      .eq('client_id', user.id)
      .eq('status', 'available'),
    supabase
      .from('subscriptions')
      .select('service_id')
      .eq('client_id', user.id)
      .eq('status', 'active'),
  ])
  if (tokenError) return Response.json({ service_ids: [], subscribed_service_ids: [] })
  const service_ids = [...new Set((tokenRows ?? []).map((r) => r.service_id as string))]
  const subscribed_service_ids = [...new Set((subRows ?? []).map((r) => r.service_id as string).filter(Boolean))]
  return Response.json({ service_ids, subscribed_service_ids })
}
