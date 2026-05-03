import { type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return Response.json({ error: 'Code requis' }, { status: 400 })

  const supabase = await getSupabaseServerClient()

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, expires_at, max_uses, used_count')
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (!promo) return Response.json({ error: 'Code invalide ou expiré' }, { status: 404 })

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return Response.json({ error: 'Ce code promo a expiré' }, { status: 404 })
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return Response.json({ error: 'Ce code promo a atteint sa limite d\'utilisation' }, { status: 404 })
  }

  return Response.json({
    promo: {
      id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
    },
  })
}
