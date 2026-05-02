'use client'

import { useState, useEffect } from 'react'
import { useBookingStore } from '@/store/bookingStore'
import type { Service, ServiceAddon, TierOption } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Plus, Minus } from 'lucide-react'
import { formatPrice, formatDuration, cn } from '@/lib/utils'

interface ServiceStepProps {
  services: Service[]
  addons?: ServiceAddon[]
}

export default function ServiceStep({ services, addons = [] }: ServiceStepProps) {
  const { selectedService, selectedTier, selectedAddons, setService, setTier, toggleAddon, setStep } =
    useBookingStore()

  const [tiers, setTiers] = useState<TierOption[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (!selectedService?.is_subscription) {
      setTiers([])
      return
    }
    fetch(`/api/service-tiers?service_id=${selectedService.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTiers)
      .catch(() => setTiers([]))
  }, [selectedService])

  const applicableAddons = selectedService
    ? addons.filter(
        (a) =>
          a.is_active &&
          (a.applicable_to.length === 0 || a.applicable_to.includes(selectedService.id))
      )
    : []

  // Separate subscriptions from regular services (preserving sort_order)
  const regularServices = services.filter((s) => s.is_active && !s.is_subscription)
  const subscriptionServices = services.filter((s) => s.is_active && s.is_subscription)

  // Group regular services by category while preserving sort_order
  const categoryMap = new Map<string, Service[]>()
  for (const s of regularServices) {
    const key = s.category ?? ''
    if (!categoryMap.has(key)) categoryMap.set(key, [])
    categoryMap.get(key)!.push(s)
  }

  const totalGroups = categoryMap.size + (subscriptionServices.length > 0 ? 1 : 0)
  const showHeaders = totalGroups > 1

  const needsTier = selectedService?.is_subscription && tiers.length > 0 && !selectedTier
  const canContinue = !!selectedService && !needsTier

  function handleContinue() {
    if (canContinue) setStep('slot')
  }

  function renderCard(service: Service) {
    const isSelected = selectedService?.id === service.id
    const showTiers = isSelected && service.is_subscription && tiers.length > 0
    return (
      <div
        key={service.id}
        className={cn(
          'w-full rounded-xl border-2 overflow-hidden transition-all',
          isSelected
            ? 'border-indigo-600 shadow-md'
            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
        )}
      >
        <button
          type="button"
          onClick={() => setService(service)}
          className={cn(
            'w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500',
            isSelected ? 'bg-indigo-50' : 'bg-white'
          )}
        >
          {service.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.image_url}
              alt={service.name}
              className="w-full h-36 object-cover"
            />
          )}
          <div className={cn('p-4', service.description ? 'pb-2' : '')}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-base leading-tight">
                {service.name}
              </h3>
              {service.is_subscription && (
                <Badge variant="default" className="shrink-0 ml-1">
                  Abonnement
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {!service.is_subscription && (
                <span className="flex items-center gap-1 font-semibold text-gray-900">
                  {formatPrice(service.price_cents)}
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(service.duration_minutes)}
              </span>
              {service.is_subscription && service.tokens_per_renewal && (
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                  {service.tokens_per_renewal} passage{service.tokens_per_renewal > 1 ? 's' : ''}/mois
                </span>
              )}
            </div>
          </div>
        </button>

        {service.description && (() => {
          const isExpanded = expandedIds.has(service.id)
          const isLong = service.description.length > 100
          return (
            <div className={cn('px-4 pb-4', isSelected ? 'bg-indigo-50' : 'bg-white')}>
              <p className={cn('text-sm text-gray-500 leading-relaxed whitespace-pre-line', !isExpanded && isLong && 'line-clamp-2')}>
                {service.description}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(service.id, e)}
                  className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {isExpanded ? 'Afficher moins' : 'Afficher plus'}
                </button>
              )}
            </div>
          )
        })()}

        {showTiers && (
          <div className="border-t border-indigo-100 bg-white p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Choisissez votre engagement
            </p>
            <div className="flex flex-col gap-1.5">
              {tiers.map((tier) => {
                const isTierSelected = selectedTier?.id === tier.id
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setTier(isTierSelected ? null : tier)}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg border-2 px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500',
                      isTierSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                    )}
                  >
                    <span className="text-sm font-semibold">{tier.commitment_months} mois</span>
                    <span className={cn('text-sm font-medium', isTierSelected ? 'text-indigo-100' : 'text-gray-500')}>
                      {formatPrice(tier.price_cents)}/mois
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Choisissez votre prestation</h2>
      <p className="text-gray-500 mb-6">Sélectionnez le type de lavage souhaité.</p>

      {/* Regular services grouped by category */}
      {[...categoryMap.entries()].map(([category, catServices]) => (
        <div key={category || '__none'} className="mb-6">
          {showHeaders && category && (
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {category}
            </h3>
          )}
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            {catServices.map((service) => renderCard(service))}
          </div>
        </div>
      ))}

      {/* Subscriptions */}
      {subscriptionServices.length > 0 && (
        <div className="mb-6">
          {showHeaders && (
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Abonnements
            </h3>
          )}
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            {subscriptionServices.map((service) => renderCard(service))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {selectedService && applicableAddons.length > 0 && (
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Options supplémentaires</h3>
          <div className="space-y-2">
            {applicableAddons.map((addon) => {
              const isSelected = selectedAddons.some((a) => a.id === addon.id)
              return (
                <div
                  key={addon.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 transition-colors',
                    isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                    {addon.description && (
                      <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{addon.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-semibold text-gray-900">
                      +{formatPrice(addon.price_cents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={cn(
                        'h-7 w-7 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                        isSelected
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                      aria-label={isSelected ? `Retirer ${addon.name}` : `Ajouter ${addon.name}`}
                    >
                      {isSelected ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!canContinue} size="lg">
          Continuer
        </Button>
      </div>
    </div>
  )
}
