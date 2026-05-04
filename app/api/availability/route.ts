import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/availability/slots'
import { getCalendarBusyTimes } from '@/lib/google-calendar'
import type { AvailabilitySchedule, AvailabilityException, Booking } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const employeeId = searchParams.get('employeeId')
  const dateStr = searchParams.get('date')
  const durationStr = searchParams.get('duration')

  if (!employeeId || !dateStr || !durationStr) {
    return Response.json(
      { error: 'Paramètres manquants : employeeId, date, duration' },
      { status: 400 }
    )
  }

  const date = new Date(dateStr)
  const duration = parseInt(durationStr, 10)

  if (isNaN(date.getTime()) || isNaN(duration) || duration < 1) {
    return Response.json(
      { error: 'Paramètres invalides' },
      { status: 400 }
    )
  }

  const dayOfWeek = date.getDay() // 0=Sunday … 6=Saturday
  const dateOnly = date.toISOString().split('T')[0]

  const supabase = await getSupabaseServerClient()

  // Fetch the recurring schedule for this weekday
  const { data: scheduleData } = await supabase
    .from('availability_schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  // Fetch any exception for this specific date
  const { data: exceptionData } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('exception_date', dateOnly)
    .single()

  // Fetch employee's Google Calendar ID
  const { data: employeeData } = await supabase
    .from('employees')
    .select('google_calendar_id')
    .eq('id', employeeId)
    .single()
  const calendarId = employeeData?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? ''

  if (!scheduleData) {
    console.warn(`[availability] pas de schedule pour employee=${employeeId} day=${dayOfWeek} (${dateOnly})`)
    return Response.json({ slots: [] })
  }

  if (!calendarId) {
    console.warn(`[availability] calendarId manquant pour employee=${employeeId}`)
  }

  const dayStart = `${dateOnly}T00:00:00Z`
  const dayEnd = `${dateOnly}T23:59:59Z`

  const [{ data: bookingsData }, calendarBusy] = await Promise.all([
    supabase
      .from('bookings')
      .select('start_at, end_at')
      .eq('employee_id', employeeId)
      .eq('status', 'confirmed')
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd),
    calendarId ? getCalendarBusyTimes(calendarId, dayStart, dayEnd) : Promise.resolve([]),
  ])

  console.log(`[availability] ${dateOnly} employee=${employeeId} schedule=${scheduleData.start_time}-${scheduleData.end_time} bookings=${bookingsData?.length ?? 0} gcal_busy=${calendarBusy.length} calendarId=${calendarId || 'VIDE'}`, calendarBusy)

  const allBusy: Pick<Booking, 'start_at' | 'end_at'>[] = [
    ...((bookingsData as Pick<Booking, 'start_at' | 'end_at'>[]) ?? []),
    ...calendarBusy.map((b) => ({ start_at: b.start, end_at: b.end })),
  ]

  const slots = getAvailableSlots({
    schedule: scheduleData as AvailabilitySchedule,
    exception: (exceptionData as AvailabilityException) ?? null,
    existingBookings: allBusy,
    date,
    serviceDurationMinutes: duration,
  })

  console.log(`[availability] ${dateOnly} => ${slots.length} créneaux : ${slots.join(', ') || 'aucun'}`)

  return Response.json({ slots })
}
