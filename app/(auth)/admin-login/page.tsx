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
    // Verify admin role before redirecting
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            Mirrorbook Admin
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-1">Connexion</h1>
          <p className="text-sm text-gray-400 mb-6">Accès réservé aux administrateurs.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemple.fr"
                autoComplete="email"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
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
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
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
