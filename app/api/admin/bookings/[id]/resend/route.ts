import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingConfirmedEmail } from '@/lib/emails/templates'

async function assertAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await assertAdmin())) return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const admin = getSupabaseAdminClient()

  const { data: booking, error } = await admin
    .from('bookings')
    .select('booking_ref, start_at, end_at, total_price_cents, payment_method, client_id, services(name)')
    .eq('id', id)
    .single()

  if (error || !booking) return Response.json({ error: 'Réservation introuvable' }, { status: 404 })

  const { data: { user: clientUser } } = await admin.auth.admin.getUserById(booking.client_id)
  if (!clientUser?.email) return Response.json({ error: 'Email client introuvable' }, { status: 404 })

  const { data: profile } = await admin.from('profiles').select('full_name').eq('id', booking.client_id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'vous'
  const serviceName = (booking.services as { name: string } | null)?.name ?? 'Prestation'

  await sendEmail(
    clientUser.email,
    `Réservation confirmée — ${booking.booking_ref}`,
    bookingConfirmedEmail({
      firstName,
      bookingRef: booking.booking_ref,
      serviceName,
      startAt: booking.start_at,
      endAt: booking.end_at,
      totalCents: booking.total_price_cents,
      paymentMethod: booking.payment_method as 'stripe_one_time' | 'subscription_token',
    })
  )

  return Response.json({ ok: true })
}
