import {
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  addMinutes,
  isAfter,
  isBefore,
  isToday,
  format,
} from 'date-fns'
import type { AvailabilitySchedule, AvailabilityException, Booking } from '@/types'

interface GetAvailableSlotsOptions {
  schedule: AvailabilitySchedule | null
  exception: AvailabilityException | null
  existingBookings: Pick<Booking, 'start_at' | 'end_at'>[]
  date: Date
  serviceDurationMinutes: number
}

/**
 * Returns an array of available time slots ('HH:mm') for a given employee and date.
 *
 * Logic:
 * 1. Check for a day-level exception — if is_unavailable, return [].
 * 2. Determine effective start/end from exception custom hours or base schedule.
 * 3. Generate candidate slots spaced by slot_duration_minutes.
 * 4. Remove any slot where the service window [slot, slot + duration] overlaps an existing booking.
 * 5. Remove past slots when the date is today.
 */
export function getAvailableSlots({
  schedule,
  exception,
  existingBookings,
  date,
  serviceDurationMinutes,
}: GetAvailableSlotsOptions): string[] {
  // If unavailable today (holiday, etc.)
  if (exception?.is_unavailable) return []

  // No schedule at all
  if (!schedule || !schedule.is_active) return []

  // Determine effective window
  const effectiveStartStr: string =
    exception?.custom_start ?? schedule.start_time
  const effectiveEndStr: string =
    exception?.custom_end ?? schedule.end_time

  const [startH, startM] = effectiveStartStr.split(':').map(Number)
  const [endH, endM] = effectiveEndStr.split(':').map(Number)

  // Build Date objects anchored to the chosen date
  const windowStart = setSeconds(
    setMinutes(setHours(new Date(date), startH), startM),
    0
  )
  const windowEnd = setSeconds(
    setMinutes(setHours(new Date(date), endH), endM),
    0
  )

  const now = new Date()
  const slots: string[] = []
  let cursor = windowStart

  while (isBefore(cursor, windowEnd)) {
    const slotEnd = addMinutes(cursor, serviceDurationMinutes)

    // Slot must fit entirely within the working window
    if (isAfter(slotEnd, windowEnd)) break

    // Skip past slots if today
    if (isToday(date) && !isAfter(cursor, now)) {
      cursor = addMinutes(cursor, schedule.slot_duration_minutes)
      continue
    }

    // Check overlap with existing bookings
    const hasConflict = existingBookings.some((booking) => {
      const bStart = parseISO(booking.start_at)
      const bEnd = parseISO(booking.end_at)
      // Overlap: cursor < bEnd AND slotEnd > bStart
      return isBefore(cursor, bEnd) && isAfter(slotEnd, bStart)
    })

    if (!hasConflict) {
      slots.push(format(cursor, 'HH:mm'))
    }

    cursor = addMinutes(cursor, schedule.slot_duration_minutes)
  }

  return slots
}
