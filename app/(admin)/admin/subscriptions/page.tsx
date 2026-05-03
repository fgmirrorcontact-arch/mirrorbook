import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = {
  title: 'Admin — Abonnements',
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  active: { label: 'Actif', variant: 'success' },
  past_due: { label: 'Impayé', variant: 'warning' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
  paused: { label: 'Pausé', variant: 'secondary' },
  incomplete: { label: 'Incomplet', variant: 'outline' },
}

export default async function AdminSubscriptionsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, profiles(full_name), services(name)')
    .order('created_at', { ascending: false })

  // Tokens per subscription
  const subIds = subscriptions?.map((s) => s.id) ?? []
  const { data: tokens } = subIds.length
    ? await supabase
        .from('subscription_tokens')
        .select('subscription_id, status')
        .in('subscription_id', subIds)
        .eq('status', 'available')
    : { data: [] }

  const tokensBySubId: Record<string, number> = {}
  tokens?.forEach((t) => {
    tokensBySubId[t.subscription_id] = (tokensBySubId[t.subscription_id] ?? 0) + 1
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subscriptions?.length ?? 0} abonnement(s)
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Client
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Formule
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Statut
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Prochain renouvellement
              </th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Crédits dispo.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscriptions?.map((sub) => {
              const status = STATUS_LABELS[sub.status] ?? {
                label: sub.status,
                variant: 'secondary' as const,
              }
              return (
                <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {sub.profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-700">
                    {sub.services?.name}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs capitalize">
                    {format(new Date(sub.current_period_end), 'd MMMM yyyy', {
                      locale: fr,
                    })}
                  </td>
                  <td className="px-5 py-3 text-center font-semibold text-gray-900">
                    {tokensBySubId[sub.id] ?? 0}
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
