'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useBookingStore } from '@/store/bookingStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

// ── Login schema ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.email({ error: 'Adresse e-mail invalide' }),
  password: z.string().min(1, 'Le mot de passe est requis'),
})
type LoginFormValues = z.infer<typeof loginSchema>

// ── Signup schema ─────────────────────────────────────────────────────────────
const signupSchema = z.object({
  full_name: z.string().min(2, 'Le prénom et nom sont requis'),
  email: z.email({ error: 'Adresse e-mail invalide' }),
  password: z.string().min(8, 'Minimum 8 caractères'),
})
type SignupFormValues = z.infer<typeof signupSchema>

export default function AuthStep() {
  const { setStep } = useBookingStore()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleForgotPassword(email: string) {
    if (!email) return
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    })
    setForgotSent(true)
  }

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  async function handleLogin(values: LoginFormValues) {
    setAuthError(null)
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    setIsLoading(false)
    if (error) {
      setAuthError('E-mail ou mot de passe incorrect.')
      return
    }
    setStep('payment')
  }

  async function handleSignup(values: SignupFormValues) {
    setAuthError(null)
    setIsLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    })
    setIsLoading(false)
    if (error) {
      setAuthError(error.message)
      return
    }
    void fetch('/api/auth/welcome', { method: 'POST' })
    setStep('payment')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
      <p className="text-gray-500 mb-6">
        Connectez-vous ou créez un compte pour finaliser votre réservation.
      </p>

      <Tabs defaultValue="login">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="login" className="flex-1">
            Se connecter
          </TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">
            Créer un compte
          </TabsTrigger>
        </TabsList>

        {/* Login */}
        <TabsContent value="login">
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Adresse e-mail</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="votre@email.fr"
                autoComplete="email"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...loginForm.register('password')}
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          {forgotSent ? (
            <p className="mt-4 text-sm text-green-600 text-center">
              E-mail envoyé — vérifiez votre boîte de réception.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => handleForgotPassword(loginForm.getValues('email'))}
              className="mt-3 w-full text-center text-sm text-gray-400 hover:text-indigo-600 transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}
        </TabsContent>

        {/* Signup */}
        <TabsContent value="signup">
          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Prénom et nom</Label>
              <Input
                id="signup-name"
                placeholder="Jean Dupont"
                autoComplete="name"
                {...signupForm.register('full_name')}
              />
              {signupForm.formState.errors.full_name && (
                <p className="text-xs text-red-600">{signupForm.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Adresse e-mail</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="votre@email.fr"
                autoComplete="email"
                {...signupForm.register('email')}
              />
              {signupForm.formState.errors.email && (
                <p className="text-xs text-red-600">{signupForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Mot de passe</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
                {...signupForm.register('password')}
              />
              {signupForm.formState.errors.password && (
                <p className="text-xs text-red-600">{signupForm.formState.errors.password.message}</p>
              )}
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {authError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Création du compte…' : 'Créer mon compte'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={() => setStep('payment')}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Continuer sans compte
        </button>
      </div>

      <div className="mt-6 flex justify-start">
        <Button variant="outline" onClick={() => setStep('slot')}>
          Retour
        </Button>
      </div>
    </div>
  )
}
