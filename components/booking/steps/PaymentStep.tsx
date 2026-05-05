'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useBookingStore } from '@/store/bookingStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Calendar, Tag, CreditCard, Ticket, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

const DEFAULT_EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEFAULT_EMPLOYEE_ID ?? ''

type PaymentMethod = 'stripe' | 'token'
type AvailableToken = { id: string; subscription_id: string }

export default function PaymentStep() {
  const {
    selectedService,
    selectedTier,
    selectedAddons,
    selectedDate,
    selectedSlot,
    promoCode,
    promoDiscount,
    totalCents,
    setStep,
    setPromoCode,
  } = useBookingStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe')
  const [availableTokens, setAvailableTokens] = useState<AvailableToken[]>([])
  const [tokensLoaded, setTokensLoaded] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [appliedPromoId, setAppliedPromoId] = useState<string | null>(null)
  const promoInputRef = useRef<HTMLInputElement>(null)

  const hasAddons = selectedAddons.length > 0
  const addonsTotalCents = selectedAddons.reduce((s, a) => s + a.price_cents, 0)

  useEffect(() => {
    if (!selectedService) return
    fetch(`/api/tokens/available?service_id=${selectedService.id}`)
      .then((r) => (r.ok ? r.json() : { tokens: [] }))
      .then((d) => {
        const tokens: AvailableToken[] = d.tokens ?? []
        setAvailableTokens(tokens)
        if (tokens.length > 0) setPaymentMethod('token')
      })
      .catch(() => {})
      .finally(() => setTokensLoaded(true))
  }, [selectedService]) // eslint-disable-line react-hooks/exhaustive-deps

  const dateTimeDisplay = (() => {
    if (!selectedDate || !selectedSlot) return null
    const [h, m] = selectedSlot.split(':').map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(h, m, 0, 0)
    return format(dt, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
  })()

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoLoading(true)
    try {
      const res = await fetch(`/api/promos/validate?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Code invalide', description: data.error, variant: 'destructive' })
        return
      }
      const { promo } = data
      const subtotal = selectedService ? (selectedTier?.price_cents ?? selectedService.price_cents ?? 0) + selectedAddons.reduce((s, a) => s + a.price_cents, 0) : 0
      const discount = promo.discount_type === 'percentage'
        ? Math.round(subtotal * promo.discount_value / 100)
        : promo.discount_value
      setPromoCode(promo.code, Math.min(discount, subtotal))
      setAppliedPromoId(promo.id)
      toast({ title: `Code "${promo.code}" appliqué`, description: `-${promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatPrice(promo.discount_value)}` })
    } finally {
      setPromoLoading(false)
    }
  }

  function removePromo() {
    setPromoCode(null, 0)
    setAppliedPromoId(null)
    setPromoInput('')
  }

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedSlot) return
    setIsSubmitting(true)

    const [h, m] = selectedSlot.split(':').map(Number)
    const start = new Date(selectedDate)
    start.setHours(h, m, 0, 0)

    try {
      if (paymentMethod === 'token') {
        const token = availableTokens[0]
        if (hasAddons) {
          // Hybrid: token covers the base service, Stripe charges add-ons only
          const res = await fetch('/api/checkout/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: DEFAULT_EMPLOYEE_ID,
              service_id: selectedService.id,
              addon_ids: selectedAddons.map((a) => a.id),
              start_at: start.toISOString(),
              token_id: token.id,
              notes: null,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la réservation')
          window.location.href = data.url
        } else {
          const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: DEFAULT_EMPLOYEE_ID,
              service_id: selectedService.id,
              addon_ids: [],
              start_at: start.toISOString(),
              payment_method: 'subscription_token',
              token_id: token.id,
              notes: null,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la réservation')
          window.location.href = `/confirmation/${data.booking.booking_ref}`
        }
      } else if (selectedService.is_subscription) {
        const res = await fetch('/api/subscriptions/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: selectedService.id,
            ...(selectedTier ? { tier_id: selectedTier.id } : {}),
            ...(selectedAddons.length > 0 ? { addon_ids: selectedAddons.map((a) => a.id) } : {}),
            ...(appliedPromoId ? { promo_code_id: appliedPromoId } : {}),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la souscription')
        window.location.href = data.url
      } else {
        const res = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: DEFAULT_EMPLOYEE_ID,
            service_id: selectedService.id,
            addon_ids: selectedAddons.map((a) => a.id),
            start_at: start.toISOString(),
            promo_code_id: appliedPromoId ?? null,
            notes: null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur lors de la réservation')
        window.location.href = data.url
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.'
      toast({ title: 'Erreur', description: message, variant: 'destructive' })
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h2
        className="text-2xl font-extrabold italic uppercase text-charbon mb-1"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Récapitulatif
      </h2>
      <p className="text-gray-500 mb-6 font-light">Vérifiez les détails avant de confirmer.</p>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          {/* Service */}
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{selectedService?.name}</p>
              {selectedService?.is_subscription && paymentMethod !== 'token' && (
                <Badge className="mt-1">Abonnement</Badge>
              )}
              {selectedTier && paymentMethod !== 'token' && (
                <p className="text-sm text-vert mt-1">
                  Engagement {selectedTier.commitment_months} mois
                </p>
              )}
            </div>
            <span className="font-semibold shrink-0 ml-4">
              {paymentMethod === 'token' ? (
                <span className="text-green-600 text-sm">Inclus</span>
              ) : (
                <>
                  {formatPrice(selectedTier?.price_cents ?? selectedService?.price_cents ?? 0)}
                  {selectedService?.is_subscription && (
                    <span className="text-gray-400 font-normal text-sm">/mois</span>
                  )}
                </>
              )}
            </span>
          </div>

          {/* Add-ons */}
          {selectedAddons.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              {selectedAddons.map((addon) => (
                <div key={addon.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{addon.name}</span>
                  <span className="text-gray-900">+{formatPrice(addon.price_cents)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Date & time */}
          {dateTimeDisplay && (
            <div className="border-t border-gray-100 pt-4 flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-vert shrink-0" />
              <span className="capitalize">{dateTimeDisplay}</span>
            </div>
          )}

          {/* Promo input — paiement carte (one-shot ou abonnement) */}
          {paymentMethod !== 'token' && (
            <div className="border-t border-gray-100 pt-4">
              {promoCode ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-green-700">
                    <Tag className="h-4 w-4" />
                    Code promo : <span className="font-mono font-semibold">{promoCode}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-700 font-semibold">-{formatPrice(promoDiscount)}</span>
                    <button type="button" onClick={removePromo} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    ref={promoInputRef}
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                    placeholder="Code promo"
                    className="h-9 text-sm font-mono uppercase"
                    disabled={promoLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                  >
                    {promoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Appliquer'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          <div className="border-t border-gray-200 pt-4 flex justify-between">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-vert">
              {paymentMethod === 'token' ? (
                hasAddons ? (
                  formatPrice(addonsTotalCents)
                ) : (
                  <span className="text-green-600">Inclus dans l'abonnement</span>
                )
              ) : (
                formatPrice(totalCents)
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment method selector — shown if tokens are available */}
      {tokensLoaded && availableTokens.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-gray-700">Mode de paiement</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('token')}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors duration-200 ${
                paymentMethod === 'token'
                  ? 'border-vert bg-vert/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Ticket className={`h-5 w-5 shrink-0 ${paymentMethod === 'token' ? 'text-vert' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${paymentMethod === 'token' ? 'text-vert' : 'text-gray-700'}`}>
                  Token abonnement
                </p>
                <p className="text-xs text-gray-500">
                  {hasAddons
                    ? `Prestation incluse · ${formatPrice(addonsTotalCents)} pour les suppléments`
                    : `${availableTokens.length} disponible${availableTokens.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('stripe')}
              className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors duration-200 ${
                paymentMethod === 'stripe'
                  ? 'border-vert bg-vert/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`h-5 w-5 shrink-0 ${paymentMethod === 'stripe' ? 'text-vert' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${paymentMethod === 'stripe' ? 'text-vert' : 'text-gray-700'}`}>
                  Payer par carte
                </p>
                <p className="text-xs text-gray-500">{formatPrice(totalCents)}</p>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('slot')}>
          Retour
        </Button>
        <Button size="lg" onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirmation en cours…
            </>
          ) : paymentMethod === 'token' && !hasAddons ? (
            'Confirmer la réservation'
          ) : (
            'Procéder au paiement'
          )}
        </Button>
      </div>
    </div>
  )
}
