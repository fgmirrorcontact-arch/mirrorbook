import { getSupabaseServerClient } from '@/lib/supabase/server'
import AdminServicesClient from './ServicesClient'
import type { Service, ServiceAddon } from '@/types'

export const metadata = {
  title: 'Admin — Prestations',
}

export default async function AdminServicesPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: services }, { data: addons }] = await Promise.all([
    supabase.from('services').select('*').order('sort_order', { ascending: true }),
    supabase.from('service_addons').select('*').order('sort_order', { ascending: true }),
  ])

  return (
    <AdminServicesClient
      services={(services as Service[]) ?? []}
      addons={(addons as ServiceAddon[]) ?? []}
    />
  )
}
