import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const metadata = {
  title: 'Admin — Mails',
}

type EmailLog = {
  user_id: string | null
  type: string
  status: string
  sent_at: string | null
  scheduled_for: string | null
  error_message: string | null
}

function StatusCell({ log }: { log?: EmailLog }) {
  if (!log) {
    return <span className="text-gray-300 text-xs">—</span>
  }
  if (log.status === 'sent') {
    const date = log.sent_at ? format(new Date(log.sent_at), 'd MMM', { locale: fr }) : null
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="success">Envoyé</Badge>
        {date && <span className="text-xs text-gray-400">{date}</span>}
      </div>
    )
  }
  if (log.status === 'pending') {
    const date = log.scheduled_for ? format(new Date(log.scheduled_for), 'd MMM', { locale: fr }) : null
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="warning">Prévu</Badge>
        {date && <span className="text-xs text-gray-400">{date}</span>}
      </div>
    )
  }
  if (log.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="destructive">Erreur</Badge>
        {log.error_message && <span className="text-xs text-red-400 max-w-[120px] truncate">{log.error_message}</span>}
      </div>
    )
  }
  return <span className="text-gray-300 text-xs">—</span>
}

export default async function AdminMailsPage() {
  const supabase = await getSupabaseServerClient()

  // Current month window
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthLabel = format(now, 'MMMM yyyy', { locale: fr })

  // Active subscribers
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, client_id, profiles(full_name), services(name)')
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })

  const clientIds = subscriptions?.map((s) => s.client_id).filter(Boolean) ?? []

  // Get known emails from logs (most recent per user)
  const { data: allLogs } = clientIds.length
    ? await supabase
        .from('email_logs')
        .select('user_id, email')
        .in('user_id', clientIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const emailByUserId: Record<string, string> = {}
  for (const l of allLogs ?? []) {
    if (l.user_id && !emailByUserId[l.user_id]) emailByUserId[l.user_id] = l.email
  }

  // This month's logs
  const { data: monthLogs } = clientIds.length
    ? await supabase
        .from('email_logs')
        .select('user_id, type, status, sent_at, scheduled_for, error_message')
        .in('user_id', clientIds)
        .in('type', ['tokens_renewed', 'subscription_reminder', 'payment_failed'])
        .gte('created_at', startOfMonth.toISOString())
    : { data: [] }

  // Build map: client_id → { type → log }
  const logsByClient: Record<string, Record<string, EmailLog>> = {}
  for (const log of monthLogs ?? []) {
    if (!log.user_id) continue
    if (!logsByClient[log.user_id]) logsByClient[log.user_id] = {}
    // Keep most recent per type
    if (!logsByClient[log.user_id][log.type]) {
      logsByClient[log.user_id][log.type] = log as EmailLog
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi mails</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{monthLabel} · {subscriptions?.length ?? 0} abonné(s)</p>
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Crédits renouvelés
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Rappel J+5
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Échec paiement
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(subscriptions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Aucun abonné actif
                  </td>
                </tr>
              ) : (
                (subscriptions ?? []).map((sub) => {
                  const clientLogs = logsByClient[sub.client_id] ?? {}
                  const email = emailByUserId[sub.client_id]
                  const name = (sub.profiles as { full_name?: string | null } | null)?.full_name
                  const serviceName = (sub.services as { name?: string } | null)?.name

                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{name ?? '—'}</p>
                        {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-xs">
                        {serviceName ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <StatusCell log={clientLogs['tokens_renewed']} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusCell log={clientLogs['subscription_reminder']} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusCell log={clientLogs['payment_failed']} />
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
