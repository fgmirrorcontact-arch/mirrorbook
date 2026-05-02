import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/emails/templates'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && next !== '/reset-password') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const createdAt = new Date(user.created_at).getTime()
        const isNewUser = Date.now() - createdAt < 10 * 60 * 1000
        if (isNewUser) {
          const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'vous'
          void sendEmail(user.email, 'Bienvenue sur Mirrorbook !', welcomeEmail(firstName))
        }
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/login?error=1', request.url))
}
