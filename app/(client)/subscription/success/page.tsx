import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function SubscriptionSuccessPage(props: { searchParams: Promise<{ booking_ref?: string }> }) {
  const { booking_ref } = await props.searchParams
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let bookingDisplay: { ref: string; dateLabel: string } | null = null
  if (booking_ref) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_ref, start_at')
      .eq('booking_ref', booking_ref)
      .single()
    if (booking) {
      const dt = new Date(booking.start_at)
      bookingDisplay = {
        ref: booking.booking_ref,
        dateLabel: format(dt, "EEEE d MMMM 'à' HH'h'mm", { locale: fr }),
      }
    }
  }

  return (
    <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 font-display font-bold italic uppercase text-white text-lg tracking-wide mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
        </Link>
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-vert rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-lime" />
          </div>
        </div>
        <h1
          className="text-2xl font-extrabold italic uppercase text-white mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Abonnement activé !
        </h1>
        <p className="text-gray-400 mb-2 text-sm font-light">
          Votre abonnement est maintenant actif et votre première séance est réservée.
        </p>
        {bookingDisplay && (
          <p className="text-gray-300 mb-2 text-sm font-medium capitalize">
            {bookingDisplay.dateLabel}
          </p>
        )}
        <p className="text-gray-500 mb-6 text-xs">
          Vous recevrez un email de confirmation dans quelques instants.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button variant="outline">Mon espace</Button>
          </Link>
          {bookingDisplay && (
            <Link href={`/confirmation/${bookingDisplay.ref}`}>
              <Button className="font-bold uppercase tracking-wider">Voir ma réservation</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
