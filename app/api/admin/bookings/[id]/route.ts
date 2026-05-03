import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

const patchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  notes: z.string().nullable().optional(),
  internal_notes: z.string().nullable().optional(),
  cancellation_reason: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

  const admin = getSupabaseAdminClient()

  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  }

  const { error } = await admin.from('bookings').update(updates as never).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdminClient()

  const { error } = await admin.from('bookings').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}
