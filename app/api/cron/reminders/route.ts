import { type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { bookingReminderEmail, subscriptionReminderEmail } from '@/lib/emails/templates'

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

  // ─── Rappels abonnement (J+5 sans réservation) ───────────────────────────
  const { data: pendingReminders } = await admin
    .from('email_logs')
    .select('id, user_id, email, metadata')
    .eq('type', 'subscription_reminder')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  let sentReminders = 0
  for (const reminder of pendingReminders ?? []) {
    try {
      const meta = (reminder.metadata ?? {}) as { serviceName?: string; tokensCount?: number; subscriptionId?: string }

      // Check if the client has booked since renewal (5 days ago)
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      const { count: bookingCount } = await admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', reminder.user_id)
        .in('status', ['confirmed', 'pending'])
        .gte('created_at', fiveDaysAgo.toISOString())

      if (bookingCount && bookingCount > 0) {
        await admin.from('email_logs').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: 'skipped — réservation existante' }).eq('id', reminder.id)
        continue
      }

      // Check remaining tokens
      const { data: tokens } = await admin
        .from('subscription_tokens')
        .select('id')
        .eq('client_id', reminder.user_id)
        .eq('status', 'available')

      const availableTokens = tokens?.length ?? 0
      if (availableTokens === 0) {
        await admin.from('email_logs').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: 'skipped — pas de tokens' }).eq('id', reminder.id)
        continue
      }

      const { data: subProfile } = await admin.from('profiles').select('full_name').eq('id', reminder.user_id).single()
      const firstName = subProfile?.full_name?.split(' ')[0] ?? 'vous'
      const serviceName = meta.serviceName ?? 'votre formule'
      const subject = `Rappel — vous avez ${availableTokens} séance${availableTokens > 1 ? 's' : ''} disponible${availableTokens > 1 ? 's' : ''}`

      await sendEmail(
        reminder.email,
        subject,
        subscriptionReminderEmail({ firstName, serviceName, tokensCount: availableTokens })
      )

      await admin.from('email_logs').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        subject,
      }).eq('id', reminder.id)

      sentReminders++
    } catch (err) {
      console.error('[cron/reminders] subscription reminder error', reminder.id, err)
      await admin.from('email_logs').update({ status: 'error', error_message: String(err) }).eq('id', reminder.id)
    }
  }

  return Response.json({ sent, total: bookings?.length ?? 0, sentReminders, pendingReminders: pendingReminders?.length ?? 0 })
}
