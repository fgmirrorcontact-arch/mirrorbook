import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export const metadata = {
  title: 'Mes réservations — Mirrorbook',
}

export default async function BookingsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, start_at, end_at, status, total_price_cents, services(name, duration_minutes)')
    .eq('client_id', user.id)
    .order('start_at', { ascending: false })

  return <BookingsClient bookings={(bookings as never) ?? []} />
}
