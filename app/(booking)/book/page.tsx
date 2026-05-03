import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import BookingWizard from '@/components/booking/BookingWizard'
import { Button } from '@/components/ui/button'
import { Car } from 'lucide-react'
import type { Service, ServiceAddon } from '@/types'

export const metadata = {
  title: 'Réserver — Mirrorbook',
}

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service: initialServiceId } = await searchParams
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
    <div className="min-h-screen bg-aluminium">
      {/* Header */}
      <header className="bg-charbon border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold italic uppercase text-white text-lg tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Car className="h-5 w-5 text-lime" />
            Mirrorbook
          </Link>
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
          initialServiceId={initialServiceId}
        />
      </main>
    </div>
  )
}
