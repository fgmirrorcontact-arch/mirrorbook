'use client'

import { useEffect } from 'react'
import { useBookingStore } from '@/store/bookingStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Service, ServiceAddon } from '@/types'
import ServiceStep from './steps/ServiceStep'
import AddonStep from './steps/AddonStep'
import SlotStep from './steps/SlotStep'
import AuthStep from './steps/AuthStep'
import PaymentStep from './steps/PaymentStep'
import ConfirmationStep from './steps/ConfirmationStep'

const STEPS = [
  { key: 'service', label: 'Prestation', visible: true },
  { key: 'addon', label: 'Options', visible: true },
  { key: 'slot', label: 'Créneau', visible: true },
  { key: 'auth', label: 'Connexion', visible: false },
  { key: 'payment', label: 'Paiement', visible: true },
  { key: 'confirmation', label: 'Confirmation', visible: false },
] as const

const STEP_ORDER = STEPS.map((s) => s.key)
const VISIBLE_STEPS = STEPS.filter((s) => s.visible)

interface BookingWizardProps {
  services: Service[]
  addons?: ServiceAddon[]
  initialServiceId?: string
}

export default function BookingWizard({ services, addons = [], initialServiceId }: BookingWizardProps) {
  const { step, setStep, setService, reset } = useBookingStore()

  useEffect(() => {
    if (!initialServiceId) return
    const service = services.find((s) => s.id === initialServiceId)
    if (!service) return
    reset()
    setService(service)
    const applicable = addons.filter(
      (a) => a.is_active && (a.applicable_to.length === 0 || a.applicable_to.includes(service.id))
    )
    setStep(applicable.length > 0 ? 'addon' : 'slot')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step !== 'auth') return
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data: authData }) => {
      if (authData.user) setStep('payment')
    })
  }, [step, setStep])

  const currentIndex = STEP_ORDER.indexOf(step)

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator — only visible steps */}
      <nav className="mb-8" aria-label="Étapes de réservation">
        <ol className="flex items-center gap-0">
          {VISIBLE_STEPS.map((s, visibleIndex) => {
            const stepIndex = STEP_ORDER.indexOf(s.key)
            const isCompleted = stepIndex < currentIndex
            const isCurrent = stepIndex === currentIndex
            const isUpcoming = stepIndex > currentIndex
            return (
              <li key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300',
                      isCompleted
                        ? 'bg-vert border-vert text-lime'
                        : isCurrent
                        ? 'bg-white border-vert text-vert'
                        : 'bg-white border-gray-300 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      visibleIndex + 1
                    )}
                  </div>
                  <span
                    className={[
                      'mt-1.5 text-xs font-medium',
                      isCurrent ? 'text-vert' : isUpcoming ? 'text-gray-400' : 'text-gray-600',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </div>
                {visibleIndex < VISIBLE_STEPS.length - 1 && (
                  <div
                    className={[
                      'flex-1 h-0.5 mx-2 mb-5 transition-colors duration-300',
                      isCompleted ? 'bg-vert' : 'bg-gray-200',
                    ].join(' ')}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Active step */}
      <div>
        {step === 'service' && <ServiceStep services={services} addons={addons} />}
        {step === 'addon' && <AddonStep addons={addons} />}
        {step === 'slot' && <SlotStep />}
        {step === 'auth' && <AuthStep />}
        {step === 'payment' && <PaymentStep />}
        {step === 'confirmation' && <ConfirmationStep />}
      </div>
    </div>
  )
}
