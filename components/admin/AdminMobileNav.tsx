'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Car } from 'lucide-react'
import { NAV_ITEMS } from './nav-items'

interface Props {
  userName: string
}

export default function AdminMobileNav({ userName }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden fixed top-0 inset-x-0 z-40">
      <header className="h-14 bg-charbon border-b border-white/10 flex items-center justify-between px-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-white font-bold italic uppercase tracking-wide text-base"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Car className="h-4 w-4 text-lime" />
          Mirrorbook
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-gray-300 hover:text-white p-1"
          aria-label="Menu navigation"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 top-14 bg-black/50 z-30"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 right-0 top-14 z-40 bg-charbon border-b border-white/10 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="px-3 py-3 space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === href
                      ? 'bg-white/15 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-white/10">
              <p className="text-xs text-gray-500 truncate">{userName}</p>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
