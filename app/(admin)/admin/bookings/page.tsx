import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatPrice } from '@/lib/utils'

export const metadata = {
  title: 'Admin — Réservations',
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  completed: { label: 'Terminée', variant: 'secondary' },
  no_show: { label: 'Non présenté', variant: 'outline' },
}

export default async function AdminBookingsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, profiles(full_name), services(name), employees(display_name)')
    .order('start_at', { ascending: false })
    .limit(100)

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {bookings?.length ?? 0} réservation(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime">
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées</option>
            <option value="completed">Terminées</option>
          </select>
          <input
            type="date"
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Réf.
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Prestation
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Total
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings?.map((booking) => {
                const status = STATUS_LABELS[booking.status] ?? {
                  label: booking.status,
                  variant: 'secondary' as const,
                }
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {booking.booking_ref}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {booking.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {booking.services?.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs whitespace-nowrap">
                      {format(new Date(booking.start_at), "d MMM yyyy HH'h'mm", {
                        locale: fr,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatPrice(booking.total_price_cents)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
