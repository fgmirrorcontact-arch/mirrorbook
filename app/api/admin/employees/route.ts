import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  display_name: z.string().min(1),
  color: z.string().default('#6366f1'),
  google_calendar_id: z.string().nullable().optional(),
})

async function assertAdmin(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { data, error } = await supabase
    .from('employees')
    .insert({ ...parsed.data, profile_id: user.id, is_active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('employees')
    .update(rest)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServerClient()
  if (!(await assertAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  const { error } = await admin.from('employees').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new Response(null, { status: 204 })
}
