import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = {
  title: 'Admin — Mails',
}

const TYPE_LABELS: Record<string, string> = {
  subscription_activated: 'Abonnement activé',
  tokens_renewed: 'Crédits renouvelés',
  subscription_reminder: 'Rappel abonnement',
  payment_failed: 'Échec paiement',
  booking_confirmed: 'Réservation confirmée',
  booking_reminder: 'Rappel RDV',
  welcome: 'Bienvenue',
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  sent: { label: 'Envoyé', variant: 'success' },
  pending: { label: 'En attente', variant: 'warning' },
  error: { label: 'Erreur', variant: 'destructive' },
}

export default async function AdminMailsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: logs } = await supabase
    .from('email_logs')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  const sentCount = logs?.filter((l) => l.status === 'sent').length ?? 0
  const pendingCount = logs?.filter((l) => l.status === 'pending').length ?? 0
  const errorCount = logs?.filter((l) => l.status === 'error').length ?? 0

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mails</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historique des e-mails envoyés aux abonnés
          </p>
        </div>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Envoyés</p>
          <p className="text-2xl font-bold text-green-600">{sentCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">En attente</p>
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Erreurs</p>
          <p className="text-2xl font-bold text-red-500">{errorCount}</p>
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
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Objet
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Aucun e-mail enregistré
                  </td>
                </tr>
              ) : (
                (logs ?? []).map((log) => {
                  const statusConfig = STATUS_CONFIG[log.status] ?? { label: log.status, variant: 'secondary' as const }
                  const typeLabel = TYPE_LABELS[log.type] ?? log.type
                  const dateValue = log.status === 'pending' ? log.scheduled_for : log.sent_at ?? log.created_at

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {(log.profiles as { full_name?: string } | null)?.full_name ?? log.email}
                        <span className="block text-xs text-gray-400 font-normal">{log.email}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {typeLabel}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">
                        {log.subject ?? '—'}
                        {log.error_message && (
                          <span className="block text-red-500 mt-0.5">{log.error_message}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {dateValue
                          ? format(new Date(dateValue), log.status === 'pending' ? "d MMM yyyy 'à' HH:mm" : "d MMM yyyy 'à' HH:mm", { locale: fr })
                          : '—'}
                        {log.status === 'pending' && (
                          <span className="block text-amber-500 mt-0.5">Prévu</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
