'use client'

import { useBookingStore } from '@/store/bookingStore'
import type { ServiceAddon } from '@/types'
import { Button } from '@/components/ui/button'
import { Plus, Minus, Clock } from 'lucide-react'
import { formatPrice, formatDuration, cn } from '@/lib/utils'

interface AddonStepProps {
  addons: ServiceAddon[]
}

export default function AddonStep({ addons }: AddonStepProps) {
  const { selectedService, selectedAddons, toggleAddon, setStep } = useBookingStore()

  const applicableAddons = selectedService
    ? addons.filter(
        (a) =>
          a.is_active &&
          (a.applicable_to.length === 0 || a.applicable_to.includes(selectedService.id))
      )
    : []

  return (
    <div>
      <h2
        className="text-2xl font-extrabold italic uppercase text-charbon mb-1"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Options supplémentaires
      </h2>
      <p className="text-gray-500 mb-6 font-light">
        Ajoutez des options à votre prestation, ou continuez sans.
      </p>

      <div className="space-y-2 mb-8">
        {applicableAddons.map((addon) => {
          const isSelected = selectedAddons.some((a) => a.id === addon.id)
          return (
            <div
              key={addon.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 transition-colors duration-200',
                isSelected ? 'border-vert/30 bg-vert/5' : 'border-gray-200 bg-white'
              )}
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                {addon.description && (
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{addon.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <div className="text-right">
                  {addon.duration_minutes > 0 && (
                    <p className="flex items-center justify-end gap-1 text-xs text-gray-400 mb-0.5">
                      <Clock className="h-3 w-3" />
                      +{formatDuration(addon.duration_minutes)}
                    </p>
                  )}
                  <span className="text-sm font-semibold text-gray-900">
                    +{formatPrice(addon.price_cents)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAddon(addon)}
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime',
                    isSelected
                      ? 'bg-vert text-lime hover:bg-vert/80'
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

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('service')}>
          Retour
        </Button>
        <Button size="lg" onClick={() => setStep('slot')}>
          Continuer
        </Button>
      </div>
    </div>
  )
}
