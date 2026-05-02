import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  BookOpen,
  CreditCard,
  Tag,
  BarChart3,
  Car,
  Clock,
  UserCog,
  ExternalLink,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/admin/bookings', label: 'Réservations', icon: BookOpen },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
  { href: '/admin/services', label: 'Prestations', icon: Package },
  { href: '/admin/employees', label: 'Employés', icon: UserCog },
  { href: '/admin/disponibilites', label: 'Disponibilités', icon: Clock },
  { href: '/admin/promos', label: 'Codes promo', icon: Tag },
  { href: '/admin/reports', label: 'Rapports', icon: BarChart3 },
]

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2 text-white font-bold">
            <Car className="h-5 w-5 text-indigo-400" />
            <span>Mirrorbook</span>
          </Link>
          <p className="text-xs text-gray-500 mt-1">Administration</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Site de réservation
          </Link>
        </div>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 px-1 mb-2 truncate">{profile.full_name ?? user.email}</p>
          <LogoutButton
            redirectTo="/admin-login"
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800 text-xs"
          />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
