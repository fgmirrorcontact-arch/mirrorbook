import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') return Response.json({ error: 'Accès refusé' }, { status: 403 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json({ clients: [] })

  const admin = getSupabaseAdminClient()

  // Search profiles by name or phone (no role filter — profiles may not have role set yet)
  const { data: byName } = await admin
    .from('profiles')
    .select('id, full_name, phone')
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .neq('role', 'admin')
    .neq('role', 'employee')
    .limit(8)

  // Also search auth.users by email so we can match even if full_name is null
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const matchedByEmail = (authUsers?.users ?? []).filter(
    (u) => u.email?.toLowerCase().includes(q.toLowerCase())
  )

  // Merge: collect ids found by name/phone + ids found by email
  const byNameIds = new Set((byName ?? []).map((p) => p.id))
  const emailOnlyIds = matchedByEmail
    .filter((u) => !byNameIds.has(u.id))
    .map((u) => u.id)
    .slice(0, 8)

  let emailOnlyProfiles: { id: string; full_name: string | null; phone: string | null }[] = []
  if (emailOnlyIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', emailOnlyIds)
      .neq('role', 'admin')
      .neq('role', 'employee')
    emailOnlyProfiles = data ?? []
  }

  // Attach email to results
  const emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]))

  const all = [...(byName ?? []), ...emailOnlyProfiles].slice(0, 10)
  const clients = all.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    email: emailMap.get(p.id) ?? null,
  }))

  return Response.json({ clients })
}
