import { getSupabaseServerClient } from '@/lib/supabase/server'
import { listCalendarEvents } from '@/lib/google-calendar'
import CalendarWrapper from './CalendarWrapper'

export const metadata = { title: 'Admin — Calendrier' }

export default async function AdminCalendarPage() {
  const supabase = await getSupabaseServerClient()

  const from = new Date()
  from.setMonth(from.getMonth() - 2)
  const to = new Date()
  to.setMonth(to.getMonth() + 6)

  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? ''

  const [{ data: bookings }, { data: employees }, { data: services }, { data: addons }, gcalEvents] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, booking_ref, employee_id, start_at, end_at, status, notes, internal_notes, total_price_cents,
        google_calendar_event_id,
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
      .order('sort_order'),
    supabase
      .from('service_addons')
      .select('id, name, price_cents, duration_minutes')
      .eq('is_active', true)
      .order('sort_order'),
    calendarId
      ? listCalendarEvents(calendarId, from.toISOString(), to.toISOString())
      : Promise.resolve([]),
  ])

  // Filter out events already mirrored as bookings in Mirrorbook
  const mirroredIds = new Set(
    (bookings ?? [])
      .map((b) => (b as unknown as { google_calendar_event_id: string | null }).google_calendar_event_id)
      .filter(Boolean)
  )
  const externalEvents = gcalEvents.filter((e) => !mirroredIds.has(e.id))

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <CalendarWrapper
      bookings={(bookings ?? []) as any}
      employees={employees ?? []}
      services={services ?? []}
      addons={addons ?? []}
      externalEvents={externalEvents}
    />
  )
}
