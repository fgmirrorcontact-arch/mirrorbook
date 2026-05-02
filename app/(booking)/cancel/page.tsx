import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function BookingCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement annulé</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Votre réservation n&apos;a pas été confirmée. Aucun montant n&apos;a été débité.
        </p>
        <Link href="/book">
          <Button size="lg">Réessayer</Button>
        </Link>
      </div>
    </div>
  )
}
