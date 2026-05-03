import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import NewClientButton from './ClientsClient'

export const metadata = {
  title: 'Admin — Clients',
}

export default async function AdminClientsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      role,
      created_at,
      bookings(count),
      subscriptions(status)
    `)
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profiles?.length ?? 0} client(s) enregistré(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Rechercher un client…"
            className="w-full sm:w-64 h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime"
          />
          <NewClientButton />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Client
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Réservations
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Abonnement
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Inscrit le
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles?.map((profile) => {
                const bookingCount =
                  (profile.bookings as unknown as { count: number }[])?.[0]?.count ?? 0
                const activeSub = (profile.subscriptions as { status: string }[])?.some(
                  (s) => s.status === 'active'
                )

                return (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${profile.id}`} className="block">
                        <p className="font-medium text-gray-900 hover:text-vert whitespace-nowrap">
                          {profile.full_name ?? '—'}
                        </p>
                        {profile.phone && (
                          <p className="text-xs text-gray-400">{profile.phone}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                      {bookingCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activeSub ? (
                        <Badge variant="success">Actif</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${profile.id}`}
                        className="text-xs text-vert hover:text-vert/70 font-medium whitespace-nowrap"
                      >
                        Voir la fiche →
                      </Link>
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
