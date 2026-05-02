import { getSupabaseServerClient } from '@/lib/supabase/server'
import AvailabilityClient from './AvailabilityClient'

export const metadata = { title: 'Admin — Disponibilités' }

export default async function AdminDisponibilitesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name, color, is_active')
    .order('created_at')

  const { data: schedules } = await supabase
    .from('availability_schedules')
    .select('employee_id, day_of_week, is_active, start_time, end_time, slot_duration_minutes, break_minutes')

  const today = new Date().toISOString().split('T')[0]
  const { data: exceptions } = await supabase
    .from('availability_exceptions')
    .select('id, employee_id, exception_date, is_unavailable, reason')
    .gte('exception_date', today)
    .order('exception_date')

  return (
    <AvailabilityClient
      employees={employees ?? []}
      allSchedules={schedules ?? []}
      allExceptions={exceptions ?? []}
    />
  )
}
