import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json(serviceId ? { tokens: [] } : { service_ids: [] })

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

  // No service_id: return all service_ids the user has available tokens for
  const { data: rows, error } = await supabase
    .from('subscription_tokens')
    .select('service_id')
    .eq('client_id', user.id)
    .eq('status', 'available')
  if (error) return Response.json({ service_ids: [] })
  const service_ids = [...new Set((rows ?? []).map((r) => r.service_id as string))]
  return Response.json({ service_ids })
}
