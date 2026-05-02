'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function ConfirmationStep() {
  const { selectedService, selectedDate, selectedSlot, createdBookingRef, reset } =
    useBookingStore()

  const dateTimeDisplay = (() => {
    if (!selectedDate || !selectedSlot) return null
    const [h, m] = selectedSlot.split(':').map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(h, m, 0, 0)
    return format(dt, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
  })()

  return (
    <div className="text-center py-8">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Réservation confirmée !
      </h2>
      <p className="text-gray-500 mb-8">
        Votre réservation a bien été enregistrée. Vous recevrez un e-mail de
        confirmation.
      </p>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left mb-8 space-y-3">
        {createdBookingRef && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Référence</span>
            <span className="font-mono font-semibold text-gray-900">
              {createdBookingRef}
            </span>
          </div>
        )}
        {selectedService && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Prestation</span>
            <span className="font-medium text-gray-900">{selectedService.name}</span>
          </div>
        )}
        {dateTimeDisplay && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Date et heure</span>
            <span className="font-medium text-gray-900 capitalize">
              {dateTimeDisplay}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/dashboard/bookings">
          <Button variant="outline">Voir mes réservations</Button>
        </Link>
        <Link href="/book" onClick={reset}>
          <Button>Nouvelle réservation</Button>
        </Link>
      </div>
    </div>
  )
}
