import { getSupabaseServerClient } from '@/lib/supabase/server'
import BookingsClient from './BookingsClient'

export const metadata = {
  title: 'Admin — Réservations',
}

export default async function AdminBookingsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, profiles(full_name), services(name), employees(display_name)')
    .order('start_at', { ascending: false })
    .limit(200)

  return <BookingsClient bookings={(bookings as never) ?? []} />
}
