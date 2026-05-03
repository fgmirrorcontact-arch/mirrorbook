import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  BookOpen,
  CreditCard,
  Tag,
  BarChart3,
  Clock,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: "Vue d'ensemble", icon: LayoutDashboard },
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
