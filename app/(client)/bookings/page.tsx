import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Car } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'

export const metadata = {
  title: 'Mes réservations — Mirrorbook',
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  completed: { label: 'Terminée', variant: 'secondary' },
  no_show: { label: 'Non présenté', variant: 'outline' },
}

export default async function BookingsPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('client_id', user.id)
    .order('start_at', { ascending: false })

  return (
    <div className="min-h-screen bg-aluminium">
      <header className="bg-charbon border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold italic uppercase text-white text-lg tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Car className="h-5 w-5 text-lime" />
            Mirrorbook
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/book">
              <Button size="sm">Réserver</Button>
            </Link>
            <LogoutButton className="text-gray-400 hover:text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-3xl font-extrabold italic uppercase text-charbon"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mes réservations
          </h1>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Tableau de bord
            </Button>
          </Link>
        </div>

        {!bookings?.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4 font-light">Aucune réservation pour le moment.</p>
            <Link href="/book">
              <Button>Prendre un rendez-vous</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Référence
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Prestation
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((booking) => {
                  const status = STATUS_LABELS[booking.status] ?? {
                    label: booking.status,
                    variant: 'secondary' as const,
                  }
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {booking.booking_ref}
                      </td>
                      <td className="px-5 py-3 font-medium text-charbon">
                        {booking.services?.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">
                        {format(new Date(booking.start_at), "d MMM yyyy HH'h'mm", {
                          locale: fr,
                        })}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-charbon">
                        {formatPrice(booking.total_price_cents)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
