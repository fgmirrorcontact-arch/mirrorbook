import { addMinutes, isAfter, isBefore, isToday } from 'date-fns'
import type { AvailabilitySchedule, AvailabilityException, Booking } from '@/types'

interface GetAvailableSlotsOptions {
  schedule: AvailabilitySchedule | null
  exception: AvailabilityException | null
  existingBookings: Pick<Booking, 'start_at' | 'end_at'>[]
  date: Date
  serviceDurationMinutes: number
}

// Returns Europe/Paris UTC offset in hours (+2 summer, +1 winter)
function parisOffset(at: Date): number {
  const utcH = at.getUTCHours()
  const parisH = parseInt(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(at),
    10
  )
  const diff = parisH - utcH
  if (diff > 12) return diff - 24
  if (diff < -12) return diff + 24
  return diff
}

// Convert a Paris "HH:mm" schedule time to a UTC Date on the given day
function toUtcDate(baseDate: Date, hhmm: string, offsetHours: number): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(baseDate)
  d.setUTCHours(h - offsetHours, m, 0, 0)
  return d
}

// Format a UTC Date as "HH:mm" in Europe/Paris timezone
function formatParisSlot(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return `${h}:${m}`
}

/**
 * Returns available time slots ("HH:mm" Paris time) for a given employee and date.
 *
 * Schedule times (start_time / end_time) are treated as Europe/Paris local times.
 * All overlap checks run in UTC so they match the UTC timestamps stored in the DB
 * and returned by Google Calendar freebusy.
 */
export function getAvailableSlots({
  schedule,
  exception,
  existingBookings,
  date,
  serviceDurationMinutes,
}: GetAvailableSlotsOptions): string[] {
  if (exception?.is_unavailable) return []
  if (!schedule || !schedule.is_active) return []

  const effectiveStartStr: string = exception?.custom_start ?? schedule.start_time
  const effectiveEndStr: string = exception?.custom_end ?? schedule.end_time

  // Compute Paris UTC offset at noon to avoid DST edge cases at midnight
  const noon = new Date(date)
  noon.setUTCHours(12, 0, 0, 0)
  const offset = parisOffset(noon)

  // Window bounds as UTC timestamps
  const windowStart = toUtcDate(date, effectiveStartStr, offset)
  const windowEnd = toUtcDate(date, effectiveEndStr, offset)

  const now = new Date()
  const slots: string[] = []
  let cursor = new Date(windowStart)

  while (isBefore(cursor, windowEnd)) {
    const slotEnd = addMinutes(cursor, serviceDurationMinutes)

    // Slot must end at or before the working window
    if (isAfter(slotEnd, windowEnd)) break

    // Skip past slots when the date is today
    if (isToday(date) && !isAfter(cursor, now)) {
      cursor = addMinutes(cursor, 30)
      continue
    }

    // Check overlap with existing bookings (DB) and Google Calendar busy times
    const hasConflict = existingBookings.some((booking) => {
      const bStart = new Date(booking.start_at)
      const bEnd = new Date(booking.end_at)
      return isBefore(cursor, bEnd) && isAfter(slotEnd, bStart)
    })

    if (!hasConflict) {
      slots.push(formatParisSlot(cursor))
    }

    cursor = addMinutes(cursor, 30)
  }

  return slots
}
