import { Suspense } from 'react'
import SignupForm from './SignupForm'

export const metadata = { title: 'Créer un compte — Mirrorbook' }

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
