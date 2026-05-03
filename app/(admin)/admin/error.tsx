'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Admin error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <h2 className="text-xl font-semibold text-gray-900">Une erreur est survenue</h2>
      <p className="text-sm text-gray-500 max-w-sm">{error.message || 'Erreur inattendue lors du chargement de la page.'}</p>
      <Button onClick={reset} variant="outline">Réessayer</Button>
    </div>
  )
}
