import { type NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/emails/templates'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email: string | undefined = body.email
  const firstName: string = body.firstName ?? 'vous'

  if (!email) return Response.json({ ok: false }, { status: 400 })

  void sendEmail(email, 'Bienvenue sur Mirrorbook !', welcomeEmail(firstName))
  return Response.json({ ok: true })
}
