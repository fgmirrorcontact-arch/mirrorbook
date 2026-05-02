import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export default async function SubscriptionSuccessPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Abonnement activé !</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Votre abonnement est maintenant actif. Vos crédits de séances seront disponibles dans quelques instants.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button variant="outline">Mon espace</Button>
          </Link>
          <Link href="/book">
            <Button>Réserver une séance</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
