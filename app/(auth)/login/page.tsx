'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Car } from 'lucide-react'

const schema = z.object({
  email: z.email({ error: 'Adresse e-mail invalide' }),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'
  const [authError, setAuthError] = useState<string | null>(null)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function handleForgotPassword() {
    const email = forgotEmail || getValues('email')
    if (!email) return
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })
    setForgotSent(true)
  }

  async function onSubmit(values: FormValues) {
    setAuthError(null)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setAuthError('E-mail ou mot de passe incorrect.')
      return
    }
    router.push(redirectTo)
    router.refresh()
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
            <Car className="h-6 w-6 text-lime" />
            Mirrorbook
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h1
            className="text-2xl font-extrabold italic uppercase text-white mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Connexion
          </h1>
          <p className="text-sm text-gray-400 mb-6 font-light">
            Accédez à votre espace client.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.fr"
                autoComplete="email"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-600 focus:border-lime focus:ring-lime"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-300">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-600 focus:border-lime focus:ring-lime"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full font-bold uppercase tracking-wider" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4">
            {forgotSent ? (
              <p className="text-sm text-lime text-center">
                E-mail envoyé — vérifiez votre boîte de réception.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center">Mot de passe oublié ?</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="votre@email.fr"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="flex-1 h-9 rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white shadow-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="h-9 px-3 rounded-md bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors shrink-0"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Pas encore de compte ?{' '}
          <Link href={`/signup${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`} className="text-lime hover:underline font-medium">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
