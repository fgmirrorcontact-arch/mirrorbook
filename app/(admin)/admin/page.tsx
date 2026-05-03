import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { startOfMonth, subMonths, subDays } from 'date-fns'
import DashboardCharts from '@/components/admin/DashboardCharts'
import type { ChartPoint } from '@/components/admin/DashboardCharts'

export const metadata = {
  title: "Admin — Vue d'ensemble",
}

function getLast12Months() {
  const result = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label:
        d.toLocaleDateString('fr-FR', { month: 'short' }) +
        ' ' +
        String(d.getFullYear()).slice(2),
    })
  }
  return result
}

export default async function AdminOverviewPage() {
  const supabase = await getSupabaseServerClient()
  const today = new Date()
  const monthStart = startOfMonth(today)
  const twelveMonthsAgo = startOfMonth(subMonths(today, 11))
  const ninetyDaysAgo = subDays(today, 90)

  // ── Parallel queries ─────────────────────────────────────────────────────────
  const [
    { data: monthlyRaw },
    { data: subsRaw },
    { count: activeSubs },
    { data: serviceRowsRaw },
    { data: clientRowsRaw },
    { data: promoUsesRaw },
    { data: promoCodesRaw },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('start_at, total_price_cents, discount_cents, status')
      .gte('start_at', twelveMonthsAgo.toISOString())
      .in('status', ['confirmed', 'completed', 'no_show']),

    supabase
      .from('subscriptions')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString()),

    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    supabase
      .from('bookings')
      .select('service_id, services(name)')
      .gte('start_at', ninetyDaysAgo.toISOString())
      .in('status', ['confirmed', 'completed']),

    supabase
      .from('bookings')
      .select('client_id, profiles(full_name)')
      .gte('start_at', twelveMonthsAgo.toISOString())
      .in('status', ['confirmed', 'completed']),

    supabase
      .from('promo_code_uses')
      .select('promo_code_id, discount_applied_cents'),

    supabase
      .from('promo_codes')
      .select('id, code'),
  ])

  // ── Aggregations ─────────────────────────────────────────────────────────────
  const bookings = monthlyRaw ?? []
  const subs = subsRaw ?? []

  // KPIs for current month
  const monthBookings = bookings.filter(b => new Date(b.start_at) >= monthStart)
  const confirmedThisMonth = monthBookings.filter(b => b.status !== 'no_show')
  const monthRevenue = confirmedThisMonth.reduce(
    (sum, b) => sum + b.total_price_cents - b.discount_cents,
    0,
  )
  const noShowCount = monthBookings.filter(b => b.status === 'no_show').length
  const noShowRate =
    monthBookings.length > 0
      ? Math.round((noShowCount / monthBookings.length) * 100)
      : 0

  // Monthly chart data (12 months)
  const months = getLast12Months()
  const chartData: ChartPoint[] = months.map(({ year, month, label }) => {
    const mb = bookings.filter(b => {
      const d = new Date(b.start_at)
      return d.getFullYear() === year && d.getMonth() === month
    })
    const revenue = mb
      .filter(b => b.status !== 'no_show')
      .reduce((sum, b) => sum + b.total_price_cents - b.discount_cents, 0)
    const newSubs = subs.filter(s => {
      const d = new Date(s.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    }).length
    return { label, revenue, subs: newSubs }
  })

  // Top services (last 90 days)
  type SvcRow = { service_id: string; services: { name: string } | null }
  const svcMap: Record<string, { name: string; count: number }> = {}
  for (const r of (serviceRowsRaw ?? []) as SvcRow[]) {
    if (!svcMap[r.service_id])
      svcMap[r.service_id] = { name: (r.services as { name: string } | null)?.name ?? '—', count: 0 }
    svcMap[r.service_id].count++
  }
  const topServices = Object.values(svcMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Top clients (last 12 months)
  type CliRow = { client_id: string; profiles: { full_name: string | null } | null }
  const cliMap: Record<string, { name: string; count: number }> = {}
  for (const r of (clientRowsRaw ?? []) as CliRow[]) {
    if (!cliMap[r.client_id])
      cliMap[r.client_id] = {
        name: (r.profiles as { full_name: string | null } | null)?.full_name ?? 'Client',
        count: 0,
      }
    cliMap[r.client_id].count++
  }
  const topClients = Object.values(cliMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxCount = topClients[0]?.count ?? 1

  // Promo stats
  const promoCodeMap = Object.fromEntries(
    (promoCodesRaw ?? []).map(p => [p.id, p.code]),
  )
  const promoAgg: Record<string, { code: string; uses: number; discount: number }> = {}
  for (const u of promoUsesRaw ?? []) {
    if (!promoAgg[u.promo_code_id]) {
      promoAgg[u.promo_code_id] = {
        code: promoCodeMap[u.promo_code_id] ?? '—',
        uses: 0,
        discount: 0,
      }
    }
    promoAgg[u.promo_code_id].uses++
    promoAgg[u.promo_code_id].discount += u.discount_applied_cents
  }
  const promoStats = Object.values(promoAgg).sort((a, b) => b.uses - a.uses)

  // KPI cards
  const kpis = [
    {
      label: 'Réservations ce mois',
      value: String(confirmedThisMonth.length),
      icon: Calendar,
      color: 'text-vert',
      bg: 'bg-vert/10',
    },
    {
      label: "Chiffre d'affaires (mois)",
      value: formatPrice(monthRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Abonnements actifs',
      value: String(activeSubs ?? 0),
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Taux de no-show',
      value: `${noShowRate} %`,
      icon: AlertTriangle,
      color: noShowRate > 10 ? 'text-red-600' : 'text-amber-500',
      bg: noShowRate > 10 ? 'bg-red-50' : 'bg-amber-50',
    },
  ]

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Vue d'ensemble</h1>

      {/* ── KPI cards ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`h-11 w-11 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 leading-tight">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts ── */}
      <DashboardCharts data={chartData} />

      {/* ── Bottom tables ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Top services */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Services les plus utilisés
            <span className="ml-1.5 font-normal text-gray-400 text-xs">90 j.</span>
          </h2>
          {topServices.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <ol className="space-y-2.5">
              {topServices.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-300 w-4 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-sm text-gray-700 truncate">{s.name}</span>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">
                        {s.count}
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime rounded-full"
                        style={{ width: `${Math.round((s.count / (topServices[0]?.count ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Top clients */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Clients les plus actifs
            <span className="ml-1.5 font-normal text-gray-400 text-xs">12 mois</span>
          </h2>
          {topClients.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée</p>
          ) : (
            <ol className="space-y-2.5">
              {topClients.map((c, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-300 w-4 shrink-0 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-sm text-gray-700 truncate">{c.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {c.count} rés.
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full"
                        style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Promo codes */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Codes promo utilisés</h2>
          {promoStats.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun code utilisé</p>
          ) : (
            <div className="space-y-3">
              {promoStats.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-gray-800 truncate">
                      {p.code}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.uses} utilisation{p.uses > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-red-500">
                      −{formatPrice(p.discount)}
                    </p>
                    <p className="text-xs text-gray-400">remisé</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
