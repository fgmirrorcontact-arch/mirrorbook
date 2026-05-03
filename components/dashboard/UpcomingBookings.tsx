'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import RescheduleModal from '@/components/booking/RescheduleModal'

interface Booking {
  id: string
  booking_ref: string
  start_at: string
  end_at: string
  status: string
  total_price_cents: number
  services?: { name: string; duration_minutes: number } | null
}

export default function UpcomingBookings({ bookings }: { bookings: Booking[] }) {
  const [rescheduling, setRescheduling] = useState<Booking | null>(null)

  if (!bookings.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
        Aucune réservation à venir.{' '}
        <Link href="/book" className="text-vert font-medium hover:underline">
          Réserver maintenant
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {booking.services?.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                {format(new Date(booking.start_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(booking.total_price_cents)}
              </span>
              <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'}>
                {booking.status === 'confirmed' ? 'Confirmée' : 'En attente'}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setRescheduling(booking)}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </div>
          </div>
        ))}
      </div>

      {rescheduling && (
        <RescheduleModal
          open={!!rescheduling}
          onClose={() => setRescheduling(null)}
          bookingId={rescheduling.id}
          bookingRef={rescheduling.booking_ref}
          serviceName={rescheduling.services?.name ?? 'Prestation'}
          durationMinutes={rescheduling.services?.duration_minutes ?? 60}
          currentStartAt={rescheduling.start_at}
        />
      )}
    </>
  )
}
