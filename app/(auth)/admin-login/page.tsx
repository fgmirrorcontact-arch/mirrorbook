'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ShieldCheck } from 'lucide-react'

const schema = z.object({
  email: z.email({ error: 'Adresse e-mail invalide' }),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormValues = z.infer<typeof schema>

export default function AdminLoginPage() {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setAuthError(null)
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setAuthError('E-mail ou mot de passe incorrect.')
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setAuthError('Accès réservé aux administrateurs.')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-charbon flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center gap-2 text-white font-display font-bold italic uppercase text-xl tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <img src="/logo.svg" alt="Mirrorbook" className="h-8 w-auto" />
            <span className="text-lime text-sm font-semibold tracking-widest uppercase">Admin</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h1
            className="text-2xl font-extrabold italic uppercase text-white mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Connexion
          </h1>
          <p className="text-sm text-gray-400 mb-6 font-light">Accès réservé aux administrateurs.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemple.fr"
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

            <Button
              type="submit"
              className="w-full font-bold uppercase tracking-wider"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          <Link href="/book" className="hover:text-gray-400 transition-colors">
            ← Site de réservation
          </Link>
        </p>
      </div>
    </div>
  )
}
