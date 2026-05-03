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
  subscription_id: z.string().min(1),
  status: z.string().min(1),
})

const createSchema = z.object({
  service_id: z.string().min(1),
  current_period_start: z.string().min(1),
  current_period_end: z.string().min(1),
  status: z.string().min(1).default('active'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id: clientId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides : ' + JSON.stringify(parsed.error.issues) }, { status: 422 })

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

    const { id: clientId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: 'Données invalides : ' + JSON.stringify(parsed.error.issues) }, { status: 422 })

    const { service_id, current_period_start, current_period_end, status } = parsed.data
    const admin = getSupabaseAdminClient()

    const { data, error } = await admin
      .from('subscriptions')
      .insert({
        client_id: clientId,
        service_id,
        current_period_start,
        current_period_end,
        status,
        cancel_at_period_end: false,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('[POST /subscription] DB error:', error.message, error.code)
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ subscription: data }, { status: 201 })
  } catch (err) {
    console.error('[POST /subscription] Unexpected error:', err)
    return Response.json({ error: 'Erreur serveur inattendue' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id: clientId } = await params
  const { subscription_id } = await request.json().catch(() => ({}))
  if (!subscription_id) return Response.json({ error: 'subscription_id requis' }, { status: 400 })

  const admin = getSupabaseAdminClient()

  const { error } = await admin
    .from('subscriptions')
    .delete()
    .eq('id', subscription_id)
    .eq('client_id', clientId)

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}
