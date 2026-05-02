import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const scheduleSchema = z.object({
  employee_id: z.string().uuid(),
  schedules: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_active: z.boolean(),
    start_time: z.string(),
    end_time: z.string(),
    slot_duration_minutes: z.number().int().min(15),
    break_minutes: z.number().int().min(0),
  })),
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
  const parsed = scheduleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { employee_id, schedules } = parsed.data
  const admin = getSupabaseAdminClient()

  const { error: deleteError } = await admin
    .from('availability_schedules')
    .delete()
    .eq('employee_id', employee_id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  // Save all 7 days (including inactive) to preserve explicit user choices
  const rows = schedules.map((s) => ({ ...s, employee_id }))

  const { data: inserted, error } = await admin
    .from('availability_schedules')
    .insert(rows)
    .select('employee_id, day_of_week, is_active, start_time, end_time, slot_duration_minutes, break_minutes')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ schedules: inserted })
}
