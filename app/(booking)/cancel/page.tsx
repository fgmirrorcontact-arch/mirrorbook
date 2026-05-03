import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Car, XCircle } from 'lucide-react'

export default function BookingCancelPage() {
  return (
    <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-900/30 border border-red-800/40 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 font-display font-bold italic uppercase text-white text-lg tracking-wide mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Car className="h-5 w-5 text-lime" />
          Mirrorbook
        </Link>
        <h1
          className="text-2xl font-extrabold italic uppercase text-white mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Paiement annulé
        </h1>
        <p className="text-gray-400 mb-6 text-sm font-light">
          Votre réservation n&apos;a pas été confirmée. Aucun montant n&apos;a été débité.
        </p>
        <Link href="/book">
          <Button size="lg" className="font-bold uppercase tracking-wider">Réessayer</Button>
        </Link>
      </div>
    </div>
  )
}
