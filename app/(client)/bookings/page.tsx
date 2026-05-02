import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            Mirrorbook
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/book">
              <Button size="sm">Réserver</Button>
            </Link>
            <LogoutButton className="text-gray-500 hover:text-gray-900" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Tableau de bord
            </Button>
          </Link>
        </div>

        {!bookings?.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">Aucune réservation pour le moment.</p>
            <Link href="/book">
              <Button>Prendre un rendez-vous</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
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
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {booking.booking_ref}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {booking.services?.name}
                      </td>
                      <td className="px-5 py-3 text-gray-600 capitalize">
                        {format(new Date(booking.start_at), "d MMM yyyy HH'h'mm", {
                          locale: fr,
                        })}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
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
        )}
      </main>
    </div>
  )
}
