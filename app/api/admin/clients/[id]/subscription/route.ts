import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  subscription_id: z.string().uuid(),
  status: z.enum(['active', 'past_due', 'cancelled', 'paused', 'incomplete']),
})

async function assertAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id: clientId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const { subscription_id, status } = parsed.data
  const admin = getSupabaseAdminClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()

  const { error } = await admin
    .from('subscriptions')
    .update(updates as never)
    .eq('id', subscription_id)
    .eq('client_id', clientId)

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true })
}
