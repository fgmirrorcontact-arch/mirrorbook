import { type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = getSupabaseAdminClient()

  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: deleted, error } = await admin
    .from('bookings')
    .delete()
    .eq('status', 'pending')
    .lt('created_at', thirtyMinAgo)
    .select('id')

  if (error) {
    console.error('[cron/cleanup] erreur', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ deleted: deleted?.length ?? 0 })
}
