import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import AdminMobileNav from '@/components/admin/AdminMobileNav'
import { NAV_ITEMS } from '@/components/admin/nav-items'
import { ExternalLink } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/admin-login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const userName = profile.full_name ?? user.email ?? ''

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile nav — hidden on lg+ */}
      <AdminMobileNav userName={userName} />

      {/* Sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-60 bg-charbon text-gray-300 flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white font-display font-bold italic uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <img src="/logo.svg" alt="Mirrorbook" className="h-7 w-auto" />
          </Link>
          <p className="text-xs text-gray-500 mt-1">Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0 text-gray-400" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Booking site link */}
        <div className="px-3 pb-2">
          <Link
            href="/book"
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Site de réservation
          </Link>
        </div>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-gray-500 px-1 mb-2 truncate">{userName}</p>
          <LogoutButton
            redirectTo="/admin-login"
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/10 text-xs"
          />
        </div>
      </aside>

      {/* Content — top padding on mobile for fixed header */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
