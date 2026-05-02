'use client'

import { useEffect } from 'react'
import { useBookingStore } from '@/store/bookingStore'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Service, ServiceAddon } from '@/types'
import ServiceStep from './steps/ServiceStep'
import SlotStep from './steps/SlotStep'
import AuthStep from './steps/AuthStep'
import PaymentStep from './steps/PaymentStep'
import ConfirmationStep from './steps/ConfirmationStep'

const STEPS = [
  { key: 'service', label: 'Prestation' },
  { key: 'slot', label: 'Créneau' },
  { key: 'auth', label: 'Connexion' },
  { key: 'payment', label: 'Paiement' },
  { key: 'confirmation', label: 'Confirmation' },
] as const

const STEP_ORDER = STEPS.map((s) => s.key)

interface BookingWizardProps {
  services: Service[]
  addons?: ServiceAddon[]
}

export default function BookingWizard({ services, addons = [] }: BookingWizardProps) {
  const { step, setStep } = useBookingStore()

  // If the user is already authenticated when they land on the auth step,
  // skip to payment automatically.
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
      {/* Progress indicator */}
      <nav className="mb-8" aria-label="Étapes de réservation">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex
            return (
              <li key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                      isCompleted
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : isCurrent
                        ? 'bg-white border-indigo-600 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-400',
                    ].join(' ')}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={[
                      'mt-1.5 text-xs font-medium',
                      isCurrent ? 'text-indigo-600' : isUpcoming ? 'text-gray-400' : 'text-gray-600',
                    ].join(' ')}
                  >
                    {s.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={[
                      'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                      isCompleted ? 'bg-indigo-600' : 'bg-gray-200',
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
        {step === 'slot' && <SlotStep />}
        {step === 'auth' && <AuthStep />}
        {step === 'payment' && <PaymentStep />}
        {step === 'confirmation' && <ConfirmationStep />}
      </div>
    </div>
  )
}
