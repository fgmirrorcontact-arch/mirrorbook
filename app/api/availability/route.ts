import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/availability/slots'
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

  // Fetch existing confirmed/pending bookings for this employee on this date
  const dayStart = `${dateOnly}T00:00:00Z`
  const dayEnd = `${dateOnly}T23:59:59Z`

  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('start_at, end_at')
    .eq('employee_id', employeeId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)

  const slots = getAvailableSlots({
    schedule: (scheduleData as AvailabilitySchedule) ?? null,
    exception: (exceptionData as AvailabilityException) ?? null,
    existingBookings: (bookingsData as Pick<Booking, 'start_at' | 'end_at'>[]) ?? [],
    date,
    serviceDurationMinutes: duration,
  })

  return Response.json({ slots })
}
