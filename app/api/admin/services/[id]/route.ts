import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0).optional(),
  duration_minutes: z.number().int().min(1).optional(),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  deposit_percent: z.number().int().nullable().optional(),
  min_lead_hours: z.number().int().min(0).optional(),
  max_lead_days: z.number().int().nullable().optional(),
  hide_duration: z.boolean().optional(),
  is_subscription: z.boolean().optional(),
  stripe_price_id: z.string().nullable().optional(),
  tokens_per_renewal: z.number().int().min(1).nullable().optional(),
  is_active: z.boolean().optional(),
  commitment_months: z.number().int().nullable().optional(),
})

async function assertAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('services')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabase.from('services').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}
