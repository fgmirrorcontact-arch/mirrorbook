'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { formatPrice } from '@/lib/utils'
import RescheduleModal from '@/components/booking/RescheduleModal'

import LogoutButton from '@/components/LogoutButton'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

interface Booking {
  id: string
  booking_ref: string
  start_at: string
  end_at: string
  status: BookingStatus
  total_price_cents: number
  services: { name: string; duration_minutes: number } | null
}

const STATUS_LABELS: Record<BookingStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  completed: { label: 'Terminée', variant: 'secondary' },
  no_show: { label: 'Non présenté', variant: 'outline' },
}

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [reschedule, setReschedule] = useState<Booking | null>(null)

  const now = new Date()

  function isFutureActionable(booking: Booking) {
    return (
      (booking.status === 'pending' || booking.status === 'confirmed') &&
      new Date(booking.start_at) > now
    )
  }

  async function cancelBooking(id: string) {
    if (confirmCancel !== id) { setConfirmCancel(id); return }
    setCancelling(id)
    setConfirmCancel(null)
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setCancelling(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Impossible d\'annuler', variant: 'destructive' })
      return
    }
    toast({ title: 'Réservation annulée' })
    router.refresh()
  }

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
          <div className="flex items-center gap-2">
            <Link href="/book">
              <Button size="sm">Réserver</Button>
            </Link>
            <LogoutButton className="text-gray-400 hover:text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-3xl font-extrabold italic uppercase text-charbon"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mes réservations
          </h1>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Tableau de bord</Button>
          </Link>
        </div>

        {!bookings.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4 font-light">Aucune réservation pour le moment.</p>
            <Link href="/book">
              <Button>Prendre un rendez-vous</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const status = STATUS_LABELS[booking.status] ?? { label: booking.status, variant: 'secondary' as const }
              const actionable = isFutureActionable(booking)
              const isConfirmingCancel = confirmCancel === booking.id
              return (
                <div
                  key={booking.id}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-400">{booking.booking_ref}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="font-semibold text-charbon">{booking.services?.name ?? '—'}</p>
                    <p className="text-sm text-gray-500 capitalize mt-0.5">
                      {format(new Date(booking.start_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-charbon text-sm">{formatPrice(booking.total_price_cents)}</span>

                    {actionable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => setReschedule(booking)}
                        >
                          Modifier le créneau
                        </Button>

                        {isConfirmingCancel ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs"
                              onClick={() => cancelBooking(booking.id)}
                              disabled={cancelling === booking.id}
                            >
                              {cancelling === booking.id ? '…' : 'Confirmer'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => setConfirmCancel(null)}
                            >
                              Non
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => cancelBooking(booking.id)}
                            disabled={cancelling === booking.id}
                          >
                            Annuler
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {reschedule && (
        <RescheduleModal
          open
          onClose={() => setReschedule(null)}
          bookingId={reschedule.id}
          bookingRef={reschedule.booking_ref}
          serviceName={reschedule.services?.name ?? ''}
          durationMinutes={reschedule.services?.duration_minutes ?? 60}
          currentStartAt={reschedule.start_at}
        />
      )}
    </div>
  )
}
