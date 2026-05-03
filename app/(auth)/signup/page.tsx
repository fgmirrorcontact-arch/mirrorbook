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
import { AlertCircle, Car } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Le nom est requis'),
  email: z.email({ error: 'Adresse e-mail invalide' }),
  password: z.string().min(8, 'Minimum 8 caractères'),
})
type FormValues = z.infer<typeof schema>

export default function SignupPage() {
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
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    void fetch('/api/auth/welcome', { method: 'POST' })
    router.push('/dashboard')
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
            Créer un compte
          </h1>
          <p className="text-sm text-gray-400 mb-6 font-light">
            Rejoignez Mirrorbook pour gérer vos réservations.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-gray-300">Prénom et nom</Label>
              <Input
                id="full_name"
                placeholder="Jean Dupont"
                autoComplete="name"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-600 focus:border-lime focus:ring-lime"
                {...register('full_name')}
              />
              {errors.full_name && (
                <p className="text-xs text-red-400">{errors.full_name.message}</p>
              )}
            </div>

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
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
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
              {isSubmitting ? 'Création en cours…' : 'Créer mon compte'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-lime hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
