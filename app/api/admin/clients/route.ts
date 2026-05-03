import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createClientSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createClientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (parsed.data.phone) {
    await admin
      .from('profiles')
      .update({ phone: parsed.data.phone })
      .eq('id', newUser.user.id)
  }

  return NextResponse.json({ id: newUser.user.id }, { status: 201 })
}
