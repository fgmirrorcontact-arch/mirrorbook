import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Package, Ticket } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import LogoutButton from '@/components/LogoutButton'
import UpcomingBookings from '@/components/dashboard/UpcomingBookings'

export const metadata = {
  title: 'Mon espace — Mirrorbook',
}

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Upcoming bookings (next 5)
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, services(name, duration_minutes)')
    .eq('client_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(5)

  // Active subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, services(name)')
    .eq('client_id', user.id)
    .eq('status', 'active')

  // Available tokens
  const { count: tokenCount } = await supabase
    .from('subscription_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'available')

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
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon espace</h1>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {upcomingBookings?.length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Réservations à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {subscriptions?.length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Abonnement(s) actif(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {tokenCount ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Crédits disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming bookings */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Prochaines réservations
            </h2>
            <Link href="/dashboard/bookings" className="text-sm text-indigo-600 hover:underline">
              Tout voir
            </Link>
          </div>

          <UpcomingBookings bookings={(upcomingBookings ?? []) as Parameters<typeof UpcomingBookings>[0]['bookings']} />
        </section>

        {/* Subscriptions */}
        {(subscriptions?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Abonnements actifs
            </h2>
            <div className="space-y-3">
              {subscriptions!.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {sub.services?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Renouvellement le{' '}
                      {format(new Date(sub.current_period_end), 'd MMMM yyyy', {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <Badge variant="success">Actif</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
