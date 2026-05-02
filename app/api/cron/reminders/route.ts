import { type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingReminderEmail } from '@/lib/emails/templates'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const { data: bookings, error } = await admin
    .from('bookings')
    .select('id, booking_ref, start_at, end_at, client_id, services(name)')
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', tomorrow.toISOString())
    .lt('start_at', dayAfter.toISOString())

  if (error) {
    console.error('[cron/reminders] erreur DB', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of bookings ?? []) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(booking.client_id)
      if (!user?.email) continue

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', booking.client_id)
        .single()

      const firstName = profile?.full_name?.split(' ')[0] ?? 'vous'
      const serviceName = (booking as unknown as { services?: { name: string } }).services?.name ?? 'Prestation'

      await sendEmail(
        user.email,
        `Rappel — votre rendez-vous de demain (${booking.booking_ref})`,
        bookingReminderEmail({
          firstName,
          bookingRef: booking.booking_ref,
          serviceName,
          startAt: booking.start_at,
          endAt: booking.end_at,
        })
      )
      sent++
    } catch (err) {
      console.error('[cron/reminders] erreur booking', booking.id, err)
    }
  }

  return Response.json({ sent, total: bookings?.length ?? 0 })
}
