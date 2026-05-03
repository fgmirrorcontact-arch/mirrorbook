'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Check } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Service, ServiceCommitmentTier } from '@/types'
import { formatPrice } from '@/lib/utils'

interface SubscribeButtonProps {
  serviceId: string
  tierId: string | null
  isAuthenticated: boolean
}

function SubscribeButton({ serviceId, tierId, isAuthenticated }: SubscribeButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubscribe() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/formules`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          ...(tierId && { tier_id: tierId }),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la redirection')
      }

      window.location.href = data.url
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.'
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      setLoading(false)
    }
  }

  return (
    <Button size="lg" className="w-full font-bold uppercase tracking-wider" onClick={handleSubscribe} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Redirection…
        </>
      ) : (
        "S'abonner"
      )}
    </Button>
  )
}

interface ServiceCardProps {
  service: Service
  tiers: ServiceCommitmentTier[]
  isActive: boolean
  isAuthenticated: boolean
}

export function ServiceCard({ service, tiers, isActive, isAuthenticated }: ServiceCardProps) {
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(0)

  const hasTiers = tiers.length > 0
  const activeTier = hasTiers ? tiers[selectedTierIndex] : null
  const displayedPrice = activeTier ? activeTier.price_cents : service.price_cents
  const selectedStripePrice = activeTier ? activeTier.stripe_price_id : service.stripe_price_id
  const hasStripePrice = !!selectedStripePrice

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex-1">
        <h2 className="text-lg font-bold text-charbon mb-1">{service.name}</h2>
        {service.description && (
          <p className="text-sm text-gray-500 mb-4 whitespace-pre-line font-light">{service.description}</p>
        )}

        {hasTiers && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Durée d&apos;engagement
            </label>
            <select
              value={selectedTierIndex}
              onChange={(e) => setSelectedTierIndex(Number(e.target.value))}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
            >
              {tiers.map((tier, i) => (
                <option key={tier.id} value={i}>
                  {tier.commitment_months} mois — {formatPrice(tier.price_cents)}/mois
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-3xl font-bold text-vert mb-1">
          {formatPrice(displayedPrice)}
          <span className="text-base font-normal text-gray-500">/mois</span>
        </div>
        {service.tokens_per_renewal && (
          <p className="text-sm text-gray-500 mb-4">
            {service.tokens_per_renewal} séance{service.tokens_per_renewal > 1 ? 's' : ''} par mois
          </p>
        )}
        {service.duration_minutes > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
            <Check className="h-4 w-4 text-lime bg-vert rounded-full p-0.5 shrink-0" />
            <span>Séances de {service.duration_minutes} min</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        {isActive ? (
          <Button variant="outline" size="lg" className="w-full" disabled>
            Abonnement actif
          </Button>
        ) : !hasStripePrice ? (
          <Button size="lg" className="w-full" disabled>
            Bientôt disponible
          </Button>
        ) : (
          <SubscribeButton
            serviceId={service.id}
            tierId={activeTier ? activeTier.id : null}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>
    </div>
  )
}
