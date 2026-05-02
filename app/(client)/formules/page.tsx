import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ServiceCard } from './FormulesClient'
import type { ServiceCommitmentTier } from '@/types'

export const metadata = {
  title: 'Formules — Mirrorbook',
}

export default async function FormulesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_subscription', true)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const activeServiceIds = new Set<string>()
  if (user) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('service_id')
      .eq('client_id', user.id)
      .eq('status', 'active')
    subs?.forEach((s) => activeServiceIds.add(s.service_id))
  }

  let tiersByService: Record<string, ServiceCommitmentTier[]> = {}
  if (services && services.length > 0) {
    const serviceIds = services.map((s) => s.id)
    const { data: tiers } = await supabase
      .from('service_commitment_tiers')
      .select('*')
      .in('service_id', serviceIds)
      .order('commitment_months')
    if (tiers) {
      for (const t of tiers) {
        if (!tiersByService[t.service_id]) tiersByService[t.service_id] = []
        tiersByService[t.service_id].push(t as ServiceCommitmentTier)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            Mirrorbook
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Mon espace</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Connexion</Button>
              </Link>
            )}
            <Link href="/book">
              <Button size="sm">Réserver</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Nos formules</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Abonnez-vous pour bénéficier de séances à tarif préférentiel et d&apos;un accès prioritaire aux créneaux.
          </p>
        </div>

        {!services?.length ? (
          <p className="text-center text-gray-500">Aucune formule disponible pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                tiers={tiersByService[service.id] ?? []}
                isActive={activeServiceIds.has(service.id)}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
