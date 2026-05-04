import { type NextRequest } from 'next/server'
import * as z from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail, APP_URL } from '@/lib/email'
import { resetPasswordEmail } from '@/lib/emails/templates'

const schema = z.object({
  email: z.email(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ ok: true })

  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ ok: true })

  const admin = getSupabaseAdminClient()

  const redirectTo = `${APP_URL}/reset-password`
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: parsed.data.email,
    options: { redirectTo },
  })

  if (error || !data.properties?.action_link) {
    console.error('[forgot-password] generateLink error', error?.message, { redirectTo, email: parsed.data.email })
    return Response.json({ ok: true })
  }

  try {
    await sendEmail(
      parsed.data.email,
      'Réinitialisation de votre mot de passe — Mirrorbook',
      resetPasswordEmail({ link: data.properties.action_link })
    )
    console.log('[forgot-password] email envoyé à', parsed.data.email)
  } catch (e) {
    console.error('[forgot-password] sendEmail error', e)
  }

  // Always 200 — no email enumeration
  return Response.json({ ok: true })
}
