import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const createSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  description: z.string().nullable().optional(),
  discount_type: z.enum(['percentage', 'fixed_cents']),
  discount_value: z.number().min(0),
  min_purchase_cents: z.number().int().min(0).nullable().optional(),
  max_uses: z.number().int().min(1).nullable().optional(),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  applicable_service_ids: z.array(z.string().min(1)).nullable().optional(),
  is_active: z.boolean().default(true),
})

async function assertAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return data?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin())) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Corps invalide' }, { status: 400 })

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 422 })

  const admin = getSupabaseAdminClient()
  const { code, description, discount_type, discount_value, min_purchase_cents, max_uses, valid_from, valid_until, applicable_service_ids, is_active } = parsed.data

  const { data, error } = await admin
    .from('promo_codes')
    .insert({
      code,
      description: description ?? null,
      discount_type,
      discount_value,
      min_purchase_cents: min_purchase_cents ?? null,
      max_uses: max_uses ?? null,
      valid_from: valid_from ?? null,
      valid_until: valid_until ?? null,
      applicable_service_ids: applicable_service_ids ?? null,
      is_active,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ promo: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!(await assertAdmin())) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.id) return Response.json({ error: 'id requis' }, { status: 400 })

  const { id, ...fields } = body
  const parsed = createSchema.partial().safeParse(fields)
  if (!parsed.success) return Response.json({ error: 'Données invalides' }, { status: 422 })

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.from('promo_codes').update(parsed.data).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ promo: data })
}

export async function DELETE(request: NextRequest) {
  if (!(await assertAdmin())) {
    return Response.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await request.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'id requis' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  const { error } = await admin.from('promo_codes').delete().eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return new Response(null, { status: 204 })
}
