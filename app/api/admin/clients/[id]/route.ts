import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const patchSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().optional(),
  admin_notes: z.string().nullable().optional(),
  is_blocked: z.boolean().optional(),
})

async function assertAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdminClient()

  const [
    { data: profile, error: profileError },
    { data: authUser },
    { data: bookings },
    { data: subscriptions },
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
  ])

  if (profileError || !profile) return Response.json({ error: 'Client introuvable' }, { status: 404 })

  // Available tokens per subscription
  const activeSubIds = (subscriptions ?? [])
    .filter((s) => s.status === 'active' || s.status === 'past_due')
    .map((s) => s.id)

  let tokens: { id: string; subscription_id: string; service_id: string; status: string; expires_at: string | null }[] = []
  if (activeSubIds.length > 0) {
    const { data: tok } = await admin
      .from('subscription_tokens')
      .select('id, subscription_id, service_id, status, expires_at')
      .in('subscription_id', activeSubIds)
      .eq('status', 'available')
    tokens = tok ?? []
  }

  return Response.json({
    profile,
    email: authUser?.user?.email ?? null,
    bookings: bookings ?? [],
    subscriptions: subscriptions ?? [],
    available_tokens: tokens,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdminClient()

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 422 })

  const admin = getSupabaseAdminClient()
  const { email, full_name, phone, admin_notes, is_blocked } = parsed.data

  const profileUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (phone !== undefined) profileUpdates.phone = phone
  if (admin_notes !== undefined) profileUpdates.admin_notes = admin_notes
  if (is_blocked !== undefined) profileUpdates.is_blocked = is_blocked

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdates as never).eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  if (email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email })
    if (error) return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ ok: true })
}
