import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0),
  duration_minutes: z.number().int().min(1),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  tax_rate: z.number().min(0).max(100).default(0),
  deposit_percent: z.number().int().nullable().optional(),
  min_lead_hours: z.number().int().min(0).default(0),
  max_lead_days: z.number().int().nullable().optional(),
  hide_duration: z.boolean().default(false),
  is_subscription: z.boolean().default(false),
  stripe_price_id: z.string().nullable().optional(),
  tokens_per_renewal: z.number().int().min(1).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  commitment_months: z.number().int().nullable().optional(),
})

async function assertAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { data, error } = await supabase.from('services').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data, { status: 201 })
}
