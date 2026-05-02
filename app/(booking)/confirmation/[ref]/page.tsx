import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  completed: { label: 'Terminée', variant: 'secondary' },
  no_show: { label: 'Non présenté', variant: 'outline' },
}

export default async function ConfirmationRefPage(props: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await props.params

  const supabase = await getSupabaseServerClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, services(*), employees(display_name, color)')
    .eq('booking_ref', ref)
    .single()

  if (!booking) notFound()

  const status = STATUS_LABELS[booking.status] ?? {
    label: booking.status,
    variant: 'secondary' as const,
  }

  const startAt = new Date(booking.start_at)
  const endAt = new Date(booking.end_at)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            Mirrorbook
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Réservation {booking.booking_ref}
          </h1>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 mb-8">
          <div className="px-6 py-4 flex justify-between text-sm">
            <span className="text-gray-500">Prestation</span>
            <span className="font-semibold text-gray-900">
              {booking.services?.name}
            </span>
          </div>
          <div className="px-6 py-4 flex justify-between text-sm">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-900 capitalize">
              {format(startAt, 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
          </div>
          <div className="px-6 py-4 flex justify-between text-sm">
            <span className="text-gray-500">Heure</span>
            <span className="font-medium text-gray-900">
              {format(startAt, "HH'h'mm")} – {format(endAt, "HH'h'mm")}
            </span>
          </div>
          {booking.employees?.display_name && (
            <div className="px-6 py-4 flex justify-between text-sm">
              <span className="text-gray-500">Technicien</span>
              <span className="font-medium text-gray-900">
                {booking.employees.display_name}
              </span>
            </div>
          )}
          <div className="px-6 py-4 flex justify-between text-sm">
            <span className="text-gray-500">Total réglé</span>
            <span className="font-bold text-indigo-600">
              {formatPrice(booking.total_price_cents)}
            </span>
          </div>
          {booking.notes && (
            <div className="px-6 py-4 text-sm">
              <span className="text-gray-500 block mb-1">Notes</span>
              <p className="text-gray-900">{booking.notes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/bookings">
            <Button variant="outline">Toutes mes réservations</Button>
          </Link>
          <Link href="/book">
            <Button>Nouvelle réservation</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
