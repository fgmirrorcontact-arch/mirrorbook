import { getSupabaseServerClient } from '@/lib/supabase/server'
import CalendarWrapper from './CalendarWrapper'

export const metadata = { title: 'Admin — Calendrier' }

export default async function AdminCalendarPage() {
  const supabase = await getSupabaseServerClient()

  const from = new Date()
  from.setMonth(from.getMonth() - 2)
  const to = new Date()
  to.setMonth(to.getMonth() + 6)

  const [{ data: bookings }, { data: employees }, { data: services }, { data: addons }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, booking_ref, employee_id, start_at, end_at, status, notes, internal_notes, total_price_cents,
        client:profiles ( full_name ),
        service:services ( name ),
        employee:employees ( display_name, color ),
        booking_addons ( addon:service_addons ( name, price_cents ) )
      `)
      .neq('status', 'pending')
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString())
      .order('start_at'),
    supabase
      .from('employees')
      .select('id, display_name, color, is_active')
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('services')
      .select('id, name, price_cents, duration_minutes')
      .eq('is_active', true)
      .eq('is_subscription', false)
      .order('sort_order'),
    supabase
      .from('service_addons')
      .select('id, name, price_cents, duration_minutes')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <CalendarWrapper
      bookings={(bookings ?? []) as any}
      employees={employees ?? []}
      services={services ?? []}
      addons={addons ?? []}
    />
  )
}
