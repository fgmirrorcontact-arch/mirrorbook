import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')
  if (!serviceId) return Response.json({ error: 'service_id requis' }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ tokens: [] })

  const { data: tokens, error } = await supabase
    .from('subscription_tokens')
    .select('id, subscription_id')
    .eq('client_id', user.id)
    .eq('service_id', serviceId)
    .eq('status', 'available')

  if (error) return Response.json({ tokens: [] })

  return Response.json({ tokens: tokens ?? [] })
}
