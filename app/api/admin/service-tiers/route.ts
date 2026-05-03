import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

async function assertAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')
  if (!serviceId) return NextResponse.json({ error: 'service_id requis' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('service_commitment_tiers')
    .select('*')
    .eq('service_id', serviceId)
    .order('commitment_months')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const syncSchema = z.object({
  service_id: z.string().regex(uuidLike, 'Invalid UUID'),
  tiers: z.array(
    z.object({
      commitment_months: z.number().int().min(1),
      price_cents: z.number().int().min(0),
      stripe_price_id: z.string().nullable().optional(),
    })
  ),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()
  if (!(await assertAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { service_id, tiers } = parsed.data

  const { error: delError } = await admin
    .from('service_commitment_tiers')
    .delete()
    .eq('service_id', service_id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (tiers.length === 0) return NextResponse.json([])

  const { data, error: insError } = await admin
    .from('service_commitment_tiers')
    .insert(
      tiers.map((t) => ({
        service_id,
        commitment_months: t.commitment_months,
        price_cents: t.price_cents,
        stripe_price_id: t.stripe_price_id ?? null,
      }))
    )
    .select()

  if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  return NextResponse.json(data)
}
