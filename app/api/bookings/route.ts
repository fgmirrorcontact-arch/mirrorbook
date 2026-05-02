import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendEmail } from '@/lib/email'
import { bookingConfirmedEmail } from '@/lib/emails/templates'

// ── Validation schema ─────────────────────────────────────────────────────────
const createBookingSchema = z.object({
  employee_id: z.string().uuid(),
  service_id: z.string().uuid(),
  addon_ids: z.array(z.string().uuid()).default([]),
  start_at: z.string().datetime(),
  payment_method: z.enum(['stripe_one_time', 'subscription_token']).default('stripe_one_time'),
  token_id: z.string().uuid().optional(),
  promo_code_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// ── POST /api/bookings ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Corps de la requête invalide' }, { status: 400 })
  }

  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Authentification requise' }, { status: 401 })
  }

  const data = parsed.data

  // Fetch service, employee and client profile in parallel
  const [
    { data: service, error: serviceError },
    { data: employee },
    { data: profile },
  ] = await Promise.all([
    supabase.from('services').select('name, price_cents, duration_minutes').eq('id', data.service_id).single(),
    supabase.from('employees').select('google_calendar_id').eq('id', data.employee_id).single(),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  if (serviceError || !service) {
    return Response.json({ error: 'Prestation introuvable' }, { status: 404 })
  }

  // Fetch addons
  let addonTotal = 0
  let addonDuration = 0
  const addonRows: { id: string; price_cents: number; duration_minutes: number }[] = []

  if (data.addon_ids.length > 0) {
    const { data: addons } = await supabase
      .from('service_addons')
      .select('id, price_cents, duration_minutes')
      .in('id', data.addon_ids)

    if (addons) {
      addonRows.push(...addons)
      addonTotal = addons.reduce((s, a) => s + a.price_cents, 0)
      addonDuration = addons.reduce((s, a) => s + a.duration_minutes, 0)
    }
  }

  const totalDuration = service.duration_minutes + addonDuration
  const startAt = new Date(data.start_at)
  const endAt = new Date(startAt.getTime() + totalDuration * 60 * 1000)

  // Consume token before booking (validates ownership + availability atomically)
  if (data.payment_method === 'subscription_token') {
    if (!data.token_id) {
      return Response.json({ error: 'token_id requis pour ce mode de paiement' }, { status: 422 })
    }
    const { data: consumed, error: tokenError } = await admin
      .from('subscription_tokens')
      .update({ status: 'used' })
      .eq('id', data.token_id)
      .eq('client_id', user.id)
      .eq('status', 'available')
      .select('id')
    if (tokenError || !consumed || consumed.length === 0) {
      return Response.json({ error: 'Token indisponible ou déjà utilisé' }, { status: 409 })
    }
  }

  // Generate booking_ref using DB function
  const { data: refResult, error: refError } = await admin.rpc('generate_booking_ref')
  if (refError || !refResult) {
    // Revert token if ref generation fails
    if (data.payment_method === 'subscription_token' && data.token_id) {
      await admin.from('subscription_tokens').update({ status: 'available' }).eq('id', data.token_id)
    }
    return Response.json(
      { error: 'Impossible de générer une référence de réservation' },
      { status: 500 }
    )
  }

  // Insert booking
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      booking_ref: refResult,
      client_id: user.id,
      employee_id: data.employee_id,
      service_id: data.service_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'confirmed',
      payment_method: data.payment_method,
      token_id: data.token_id ?? null,
      total_price_cents: service.price_cents + addonTotal,
      discount_cents: 0,
      promo_code_id: data.promo_code_id ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (bookingError || !booking) {
    console.error('booking insert error', bookingError)
    // Revert token if booking creation fails
    if (data.payment_method === 'subscription_token' && data.token_id) {
      await admin.from('subscription_tokens').update({ status: 'available' }).eq('id', data.token_id)
    }
    return Response.json({ error: 'Erreur lors de la création de la réservation' }, { status: 500 })
  }

  // Insert booking addons
  if (addonRows.length > 0) {
    await admin.from('booking_addons').insert(
      addonRows.map((a) => ({
        booking_id: booking.id,
        addon_id: a.id,
        price_cents: a.price_cents,
      }))
    )
  }

  // Email de confirmation (fire and forget)
  if (user.email) {
    const firstName = profile?.full_name?.split(' ')[0] ?? 'vous'
    void sendEmail(
      user.email,
      `Réservation confirmée — ${refResult}`,
      bookingConfirmedEmail({
        firstName,
        bookingRef: refResult,
        serviceName: service.name,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        totalCents: service.price_cents + addonTotal,
        paymentMethod: data.payment_method,
      })
    )
  }

  // Create Google Calendar event (fire and forget — never blocks the response)
  const calendarId = employee?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? ''
  if (calendarId) {
    createCalendarEvent({
      calendarId,
      summary: `${service.name} — ${profile?.full_name ?? 'Client'}`,
      description: `Réf : ${refResult}${data.notes ? `\n${data.notes}` : ''}`,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    }).then((eventId) => {
      if (eventId) {
        admin.from('bookings').update({ google_calendar_event_id: eventId }).eq('id', booking.id)
      }
    })
  }

  return Response.json({ booking }, { status: 201 })
}

// ── GET /api/bookings (admin only) ────────────────────────────────────────────
export async function GET(_request: NextRequest) {
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

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, profiles(full_name), services(name), employees(display_name)')
    .order('start_at', { ascending: false })
    .limit(200)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ bookings })
}
