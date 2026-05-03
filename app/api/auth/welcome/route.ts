import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/emails/templates'

export async function POST() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return Response.json({ ok: false }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'vous'
  void sendEmail(user.email, 'Bienvenue sur Mirrorbook !', welcomeEmail(firstName))

  return Response.json({ ok: true })
}
