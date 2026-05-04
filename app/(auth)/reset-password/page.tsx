'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setReady(true)
      })
      return
    }

    // Hash-based recovery flow (#access_token=...&type=recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold italic uppercase text-white text-2xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          {!ready ? (
            <p className="text-center text-sm text-gray-400 py-4">Vérification en cours…</p>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-14 w-14 bg-vert rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-lime" />
                </div>
              </div>
              <p className="font-bold text-white uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                Mot de passe mis à jour
              </p>
              <p className="text-sm text-gray-400 font-light">Redirection vers la connexion…</p>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-extrabold italic uppercase text-white mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Nouveau mot de passe
              </h1>
              <p className="text-sm text-gray-400 mb-6 font-light">Choisissez un mot de passe sécurisé.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-gray-300">Nouveau mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-600 focus:border-lime focus:ring-lime"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-gray-300">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Répétez le mot de passe"
                    autoComplete="new-password"
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-600 focus:border-lime focus:ring-lime"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full font-bold uppercase tracking-wider" disabled={loading}>
                  {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
