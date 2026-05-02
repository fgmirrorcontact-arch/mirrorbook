import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import BookingWizard from '@/components/booking/BookingWizard'
import { Button } from '@/components/ui/button'
import type { Service, ServiceAddon } from '@/types'

export const metadata = {
  title: 'Réserver — Mirrorbook',
}

export default async function BookPage() {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: addons } = await supabase
    .from('service_addons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-indigo-600">Mirrorbook</h1>
          {user ? (
            <Link href="/dashboard">
              <Button size="sm" variant="outline">Mon espace</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline">Connexion</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <BookingWizard
          services={(services as Service[]) ?? []}
          addons={(addons as ServiceAddon[]) ?? []}
        />
      </main>
    </div>
  )
}
