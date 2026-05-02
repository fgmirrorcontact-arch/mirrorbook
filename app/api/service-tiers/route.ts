import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('service_id')
  if (!serviceId) return NextResponse.json([])

  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('service_commitment_tiers')
    .select('id, commitment_months, price_cents')
    .eq('service_id', serviceId)
    .order('commitment_months')

  return NextResponse.json(data ?? [])
}
