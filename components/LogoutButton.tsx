'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface LogoutButtonProps {
  redirectTo?: string
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
}

export default function LogoutButton({
  redirectTo = '/login',
  variant = 'ghost',
  className,
}: LogoutButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      <LogOut className="h-4 w-4 mr-1.5" />
      {loading ? 'Déconnexion…' : 'Se déconnecter'}
    </Button>
  )
}
