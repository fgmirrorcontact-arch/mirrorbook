import { getSupabaseServerClient } from '@/lib/supabase/server'
import AdminPromosClient from './PromosClient'
import type { PromoCode } from '@/types'

export const metadata = {
  title: 'Admin — Codes promo',
}

export default async function AdminPromosPage() {
  const supabase = await getSupabaseServerClient()

  const { data: promos } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Codes promo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {promos?.length ?? 0} code(s) configuré(s)
        </p>
      </div>
      <AdminPromosClient promos={(promos as PromoCode[]) ?? []} />
    </div>
  )
}
