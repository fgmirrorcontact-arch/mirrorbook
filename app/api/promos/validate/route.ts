import { type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  const subtotalParam = searchParams.get('subtotal')
  if (!code) return Response.json({ error: 'Code requis' }, { status: 400 })

  const admin = getSupabaseAdminClient()

  const { data: promo } = await admin
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, valid_from, valid_until, max_uses, uses_count, min_purchase_cents')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (!promo) return Response.json({ error: 'Code invalide ou expiré' }, { status: 404 })

  const now = new Date()
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return Response.json({ error: "Ce code promo n'est pas encore actif" }, { status: 404 })
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return Response.json({ error: 'Ce code promo a expiré' }, { status: 404 })
  }
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return Response.json({ error: "Ce code promo a atteint sa limite d'utilisation" }, { status: 404 })
  }
  if (promo.min_purchase_cents && subtotalParam) {
    const subtotal = parseInt(subtotalParam, 10)
    if (!isNaN(subtotal) && subtotal < promo.min_purchase_cents) {
      const minFormatted = (promo.min_purchase_cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
      return Response.json({ error: `Ce code est valable à partir de ${minFormatted} d'achat` }, { status: 422 })
    }
  }

  return Response.json({
    promo: {
      id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_purchase_cents: promo.min_purchase_cents,
    },
  })
}
