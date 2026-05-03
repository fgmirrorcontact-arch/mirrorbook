import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(0).optional(),
  duration_minutes: z.number().int().min(0).optional(),
  applicable_to: z.array(z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
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
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin
    .from('service_addons')
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
  const { error } = await supabase.from('service_addons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new Response(null, { status: 204 })
}
