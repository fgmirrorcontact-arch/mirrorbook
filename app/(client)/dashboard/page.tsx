import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Package, Ticket } from 'lucide-react'
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

  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, services(name, duration_minutes)')
    .eq('client_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(5)

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, services(name)')
    .eq('client_id', user.id)
    .eq('status', 'active')

  const { count: tokenCount } = await supabase
    .from('subscription_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'available')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-aluminium">
      <header className="bg-charbon border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold italic uppercase text-white text-lg tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:block">
              Connecté en tant que <span className="text-white font-medium">{profile?.full_name ?? user.email}</span>
            </span>
            <Link href="/book">
              <Button size="sm">Réserver</Button>
            </Link>
            <LogoutButton className="text-gray-400 hover:text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1
          className="text-3xl font-extrabold italic uppercase text-charbon mb-8"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Mon espace
        </h1>

        {/* KPI cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-vert rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-lime" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charbon">
                    {upcomingBookings?.length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Réservations à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-vert rounded-lg flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-lime" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charbon">
                    {subscriptions?.length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">Abonnement(s) actif(s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-vert rounded-lg flex items-center justify-center shrink-0">
                  <Ticket className="h-5 w-5 text-lime" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-charbon">
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
            <h2 className="text-base font-semibold text-charbon">
              Prochaines réservations
            </h2>
            <Link href="/bookings" className="text-sm text-vert hover:underline font-medium">
              Tout voir
            </Link>
          </div>

          <UpcomingBookings bookings={(upcomingBookings ?? []) as Parameters<typeof UpcomingBookings>[0]['bookings']} />
        </section>

        {/* Subscriptions */}
        {(subscriptions?.length ?? 0) > 0 && (
          <section>
            <h2 className="text-base font-semibold text-charbon mb-4">
              Abonnements actifs
            </h2>
            <div className="space-y-3">
              {subscriptions!.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-charbon text-sm">
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
