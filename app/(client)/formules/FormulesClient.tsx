'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Timer } from 'lucide-react'
import type { Service, ServiceCommitmentTier } from '@/types'
import { formatPrice } from '@/lib/utils'

interface ServiceCardProps {
  service: Service
  tiers: ServiceCommitmentTier[]
  isActive: boolean
}

export function ServiceCard({ service, tiers, isActive }: ServiceCardProps) {
  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(0)
  const [showMore, setShowMore] = useState(false)
  const isLong = (service.description?.length ?? 0) > 120

  const hasTiers = tiers.length > 0
  const activeTier = hasTiers ? tiers[selectedTierIndex] : null
  const displayedPrice = activeTier ? activeTier.price_cents : service.price_cents

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col h-full shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out">
      <h2 className="text-lg font-bold text-charbon mb-3 min-h-[3.5rem] flex items-start">{service.name}</h2>

      <div className="flex-1 min-h-0">
        {service.description && (
          <div className="mb-3">
            <p className={`text-sm text-gray-500 whitespace-pre-line font-light${!showMore && isLong ? ' line-clamp-3' : ''}`}>
              {service.description}
            </p>
            {isLong && (
              <button type="button" onClick={() => setShowMore(v => !v)} className="mt-1 text-xs font-medium text-vert hover:text-vert/70">
                {showMore ? 'Afficher moins' : 'Afficher plus'}
              </button>
            )}
          </div>
        )}

        {hasTiers && (
          <div>
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
      </div>

      <div className="pt-4 border-t border-gray-100 mt-4">
        <div className="text-3xl font-bold text-vert mb-1">
          {formatPrice(displayedPrice)}
          <span className="text-base font-normal text-gray-500">/mois</span>
        </div>
        {service.tokens_per_renewal && (
          <p className="text-sm text-gray-500 mb-2">
            {service.tokens_per_renewal} séance{service.tokens_per_renewal > 1 ? 's' : ''} par mois
          </p>
        )}
        {service.duration_minutes > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Check className="h-4 w-4 text-lime bg-vert rounded-full p-0.5 shrink-0" />
            <span>Séances de {service.duration_minutes} min</span>
          </div>
        )}
        <div className="mt-4">
          {isActive ? (
            <Button variant="outline" size="lg" className="w-full" disabled>
              Abonnement actif
            </Button>
          ) : (
            <Link href={`/book?service=${service.id}`} className="block">
              <Button size="lg" className="w-full font-bold uppercase tracking-wider">
                Réserver
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function SingleServiceCard({ service }: { service: Service }) {
  const [showMore, setShowMore] = useState(false)
  const isLong = (service.description?.length ?? 0) > 120

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col hover:border-lime/40 hover:-translate-y-1 transition-all duration-300 ease-out">
      <h3 className="text-base font-semibold text-white mb-1">{service.name}</h3>
      <div className="flex-1">
        {service.description && (
          <div className="mt-1">
            <p className={`text-sm text-gray-400 whitespace-pre-line font-light${!showMore && isLong ? ' line-clamp-3' : ''}`}>
              {service.description}
            </p>
            {isLong && (
              <button type="button" onClick={() => setShowMore(v => !v)} className="mt-1 text-xs font-medium text-lime/70 hover:text-lime">
                {showMore ? 'Afficher moins' : 'Afficher plus'}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mt-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-2xl font-bold text-lime">{formatPrice(service.price_cents)}</p>
          {!service.hide_duration && service.duration_minutes > 0 && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Timer className="h-3 w-3" />
              {service.duration_minutes} min
            </p>
          )}
        </div>
        <Link href={`/book?service=${service.id}`}>
          <Button size="sm" className="shrink-0">Réserver</Button>
        </Link>
      </div>
    </div>
  )
}
