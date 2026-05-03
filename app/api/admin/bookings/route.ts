import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createCalendarEvent } from '@/lib/google-calendar'

const newClientSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
})

const uuidLike = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

const createBookingSchema = z
  .object({
    client_id: uuidLike.optional(),
    new_client: newClientSchema.optional(),
    employee_id: uuidLike,
    service_id: uuidLike,
    addon_ids: z.array(uuidLike).default([]),
    start_at: z.string().min(1),
    payment_method: z
      .enum(['cash', 'card_present', 'stripe_one_time', 'subscription_token'])
      .default('cash'),
    notes: z.string().nullable().optional(),
    internal_notes: z.string().nullable().optional(),
    status: z.enum(['pending', 'confirmed']).default('confirmed'),
  })
  .refine((d) => d.client_id || d.new_client, {
    message: 'client_id ou new_client requis',
  })

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps de la requête invalide' }, { status: 400 })

  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    console.error('[admin/bookings] 422 body:', JSON.stringify(body))
    console.error('[admin/bookings] 422 errors:', JSON.stringify(parsed.error.flatten()))
    return Response.json({ error: 'Données invalides' }, { status: 422 })
  }

  const admin = getSupabaseAdminClient()
  const data = parsed.data

  // Resolve or create client
  let clientId = data.client_id
  let clientName: string | null = null

  if (!clientId && data.new_client) {
    const { full_name, email, phone } = data.new_client
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) return Response.json({ error: createError.message }, { status: 400 })

    clientId = newUser.user.id
    clientName = full_name

    if (phone) {
      await admin.from('profiles').update({ phone }).eq('id', clientId)
    }
  }

  if (!clientId) return Response.json({ error: 'Client introuvable' }, { status: 400 })

  // Fetch service, employee and (existing) client profile in parallel
  const [
    { data: service, error: serviceError },
    { data: employee },
    { data: clientProfile },
  ] = await Promise.all([
    admin.from('services').select('name, price_cents, duration_minutes').eq('id', data.service_id).single(),
    admin.from('employees').select('google_calendar_id').eq('id', data.employee_id).single(),
    clientName ? Promise.resolve({ data: null }) : admin.from('profiles').select('full_name').eq('id', clientId).single(),
  ])

  if (serviceError || !service) return Response.json({ error: 'Prestation introuvable' }, { status: 404 })

  clientName = clientName ?? clientProfile?.full_name ?? null

  // Fetch addons
  let addonTotal = 0
  let addonDuration = 0
  const addonRows: { id: string; price_cents: number; duration_minutes: number }[] = []

  if (data.addon_ids.length > 0) {
    const { data: addons } = await admin
      .from('service_addons')
      .select('id, price_cents, duration_minutes')
      .in('id', data.addon_ids)

    if (addons) {
      addonRows.push(...addons)
      addonTotal = addons.reduce((s, a) => s + a.price_cents, 0)
      addonDuration = addons.reduce((s, a) => s + a.duration_minutes, 0)
    }
  }

  const startAt = new Date(data.start_at)
  const endAt = new Date(startAt.getTime() + (service.duration_minutes + addonDuration) * 60 * 1000)

  const { data: refResult, error: refError } = await admin.rpc('generate_booking_ref')
  if (refError || !refResult) {
    return Response.json({ error: 'Impossible de générer une référence' }, { status: 500 })
  }

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      booking_ref: refResult,
      client_id: clientId,
      employee_id: data.employee_id,
      service_id: data.service_id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: data.status,
      payment_method: data.payment_method,
      total_price_cents: service.price_cents + addonTotal,
      discount_cents: 0,
      notes: data.notes ?? null,
      internal_notes: data.internal_notes ?? null,
    })
    .select()
    .single()

  if (bookingError || !booking) {
    console.error('admin booking insert error', bookingError)
    return Response.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }

  if (addonRows.length > 0) {
    await admin.from('booking_addons').insert(
      addonRows.map((a) => ({
        booking_id: booking.id,
        addon_id: a.id,
        price_cents: a.price_cents,
      }))
    )
  }

  // Create Google Calendar event (fire and forget)
  const calendarId = employee?.google_calendar_id ?? process.env.GOOGLE_CALENDAR_ID ?? ''
  if (calendarId) {
    createCalendarEvent({
      calendarId,
      summary: `${service.name} — ${clientName ?? 'Client'}`,
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
