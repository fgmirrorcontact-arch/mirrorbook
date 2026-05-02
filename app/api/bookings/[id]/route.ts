import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import { deleteCalendarEvent } from '@/lib/google-calendar'
import { sendEmail } from '@/lib/email'
import { bookingCancelledEmail, bookingRescheduledEmail } from '@/lib/emails/templates'

type BookingUpdate = Database['public']['Tables']['bookings']['Update']

const patchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  internal_notes: z.string().optional(),
  cancellation_reason: z.string().optional(),
  start_at: z.string().datetime().optional(),
})

// ── GET /api/bookings/[id] ────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, services(*), employees(display_name, color), profiles(full_name)')
    .eq('id', id)
    .single()

  if (error || !booking) {
    return Response.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && booking.client_id !== user.id) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  return Response.json({ booking })
}

// ── DELETE /api/bookings/[id] ─────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = getSupabaseAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select('google_calendar_event_id, employees(google_calendar_id)')
    .eq('id', id)
    .single()

  const { error } = await admin.from('bookings').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  if (booking?.google_calendar_event_id) {
    const employee = (booking as unknown as { employees: { google_calendar_id: string | null } | null }).employees
    const calendarId = employee?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? ''
    if (calendarId) {
      deleteCalendarEvent({ calendarId, eventId: booking.google_calendar_event_id })
    }
  }

  return new Response(null, { status: 204 })
}

// ── PATCH /api/bookings/[id] ──────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    if (parsed.data.status && parsed.data.status !== 'cancelled') {
      return Response.json(
        { error: 'Vous pouvez uniquement annuler vos réservations' },
        { status: 403 }
      )
    }
    const { data: existing } = await supabase
      .from('bookings')
      .select('client_id, start_at, service_id, services(duration_minutes, min_lead_hours)')
      .eq('id', id)
      .single()
    if (!existing || existing.client_id !== user.id) {
      return Response.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (parsed.data.start_at) {
      const svc = existing.services as unknown as { duration_minutes: number; min_lead_hours: number } | null
      const minLead = (svc?.min_lead_hours ?? 24) * 60 * 60 * 1000
      const newStart = new Date(parsed.data.start_at)
      if (newStart.getTime() - Date.now() < minLead) {
        return Response.json(
          { error: `Modification impossible moins de ${svc?.min_lead_hours ?? 24}h avant le rendez-vous` },
          { status: 422 }
        )
      }
    }
  }

  const updates: BookingUpdate = { ...parsed.data } as BookingUpdate

  if (parsed.data.status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  }

  if (parsed.data.start_at) {
    const { data: fullBooking } = await supabase
      .from('bookings')
      .select('services(duration_minutes), booking_addons(service_addons(duration_minutes))')
      .eq('id', id)
      .single()
    const svcDuration = (fullBooking?.services as unknown as { duration_minutes: number } | null)?.duration_minutes ?? 0
    const addonDuration = ((fullBooking?.booking_addons ?? []) as unknown as { service_addons: { duration_minutes: number } | null }[])
      .reduce((s, a) => s + (a.service_addons?.duration_minutes ?? 0), 0)
    const newStart = new Date(parsed.data.start_at)
    updates.end_at = new Date(newStart.getTime() + (svcDuration + addonDuration) * 60 * 1000).toISOString()
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select('*, services(name), employees(google_calendar_id)')
    .single()

  if (error || !booking) {
    return Response.json({ error: 'Impossible de mettre à jour la réservation' }, { status: 500 })
  }

  // Email d'annulation (fire and forget)
  if (parsed.data.status === 'cancelled') {
    const { data: { user: cancelUser } } = await supabase.auth.getUser()
    if (cancelUser?.email) {
      const { data: cancelProfile } = await supabase
        .from('profiles').select('full_name').eq('id', cancelUser.id).single()
      const firstName = cancelProfile?.full_name?.split(' ')[0] ?? 'vous'
      const svcName = (booking as unknown as { services?: { name: string } }).services?.name ?? 'Prestation'
      void sendEmail(
        cancelUser.email,
        `Réservation annulée — ${booking.booking_ref}`,
        bookingCancelledEmail({
          firstName,
          bookingRef: booking.booking_ref,
          serviceName: svcName,
          startAt: booking.start_at,
        })
      )
    }
  }

  const employee = (booking as unknown as { employees: { google_calendar_id: string | null } | null }).employees
  const calendarId = employee?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? ''

  // Delete Google Calendar event on cancellation
  if (parsed.data.status === 'cancelled' && booking.google_calendar_event_id && calendarId) {
    deleteCalendarEvent({ calendarId, eventId: booking.google_calendar_event_id })
  }

  // Email de modification de créneau (fire and forget)
  if (parsed.data.start_at) {
    const { data: { user: rescheduleUser } } = await supabase.auth.getUser()
    if (rescheduleUser?.email) {
      const { data: rescheduleProfile } = await supabase
        .from('profiles').select('full_name').eq('id', rescheduleUser.id).single()
      const firstName = rescheduleProfile?.full_name?.split(' ')[0] ?? 'vous'
      const svcName = (booking as unknown as { services?: { name: string } }).services?.name ?? 'Prestation'
      void sendEmail(
        rescheduleUser.email,
        `Créneau modifié — ${booking.booking_ref}`,
        bookingRescheduledEmail({
          firstName,
          bookingRef: booking.booking_ref,
          serviceName: svcName,
          newStartAt: booking.start_at,
          newEndAt: booking.end_at,
        })
      )
    }
  }

  // Update Google Calendar event on reschedule
  if (parsed.data.start_at && booking.google_calendar_event_id && calendarId) {
    const svcName = (booking as unknown as { services?: { name: string } }).services?.name ?? 'Réservation'
    const admin = getSupabaseAdminClient()
    admin.from('profiles').select('full_name').eq('id', user.id).single().then(({ data: p }) => {
      import('@/lib/google-calendar').then(({ updateCalendarEvent }) => {
        if (typeof updateCalendarEvent === 'function') {
          updateCalendarEvent({
            calendarId,
            eventId: booking.google_calendar_event_id!,
            summary: `${svcName} — ${p?.full_name ?? 'Client'}`,
            startAt: booking.start_at,
            endAt: booking.end_at,
          })
        }
      })
    })
  }

  return Response.json({ booking })
}
