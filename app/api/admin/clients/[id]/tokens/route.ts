import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { tokensRenewedEmail } from '@/lib/emails/templates'

const schema = z.object({
  subscription_id: z.string().min(1),
  service_id: z.string().min(1),
  quantity: z.number().min(1).max(20),
  expires_at: z.string().nullable().optional(),
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
  const { id: clientId } = await params
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('subscription_tokens')
    .select('id, service_id, services(name)')
    .eq('client_id', clientId)
    .eq('status', 'available')
    .order('issued_at')
  if (error) console.error('[tokens GET]', error.message)
  return Response.json({ tokens: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id: clientId } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides : ' + JSON.stringify(parsed.error.issues) }, { status: 422 })

  const { subscription_id, service_id, quantity, expires_at } = parsed.data
  const admin = getSupabaseAdminClient()

  const rows = Array.from({ length: quantity }, () => ({
    subscription_id,
    client_id: clientId,
    service_id,
    status: 'available' as const,
    expires_at: expires_at ?? null,
  }))

  const { data, error } = await admin.from('subscription_tokens').insert(rows).select()
  if (error) return Response.json({ error: error.message }, { status: 400 })

  // Email au client (fire and forget)
  const [
    { data: { user: clientUser } },
    { data: service },
    { data: clientProfile },
  ] = await Promise.all([
    admin.auth.admin.getUserById(clientId),
    admin.from('services').select('name').eq('id', service_id).single(),
    admin.from('profiles').select('full_name').eq('id', clientId).single(),
  ])
  if (clientUser?.email) {
    const firstName = clientProfile?.full_name?.split(' ')[0] ?? 'vous'
    void sendEmail(
      clientUser.email,
      `${quantity} crédit${quantity > 1 ? 's' : ''} ajouté${quantity > 1 ? 's' : ''} — ${service?.name ?? 'Formule'}`,
      tokensRenewedEmail({
        firstName,
        serviceName: service?.name ?? 'Formule',
        tokensCount: quantity,
        periodEnd: expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    )
  }

  return Response.json({ tokens: data }, { status: 201 })
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

  const { data: token } = await admin
    .from('subscription_tokens')
    .select('id')
    .eq('subscription_id', subscription_id)
    .eq('client_id', clientId)
    .eq('status', 'available')
    .limit(1)
    .single()

  if (!token) return Response.json({ error: 'Aucun crédit disponible à supprimer' }, { status: 404 })

  const { error } = await admin.from('subscription_tokens').delete().eq('id', token.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}
