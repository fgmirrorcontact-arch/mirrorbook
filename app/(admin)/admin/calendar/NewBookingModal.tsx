'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, User } from 'lucide-react'

type Client = { id: string; full_name: string | null; phone: string | null; email?: string | null }
type Service = { id: string; name: string; price_cents: number; duration_minutes: number }
type Addon = { id: string; name: string; price_cents: number; duration_minutes: number }
type Employee = { id: string; display_name: string; color: string }
type Token = { id: string; service_id: string; services: { name: string } | null }

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  services: Service[]
  addons: Addon[]
  employees: Employee[]
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'card_present', label: 'CB sur place' },
  { value: 'stripe_one_time', label: 'Paiement en ligne' },
  { value: 'subscription_token', label: 'Token abonnement' },
  { value: 'free', label: 'Gratuit' },
]

function fmt(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export default function NewBookingModal({ open, onClose, onCreated, services, addons, employees }: Props) {
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const [serviceId, setServiceId] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')

  const [clientTokens, setClientTokens] = useState<Token[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (clientMode !== 'search' || searchQuery.length < 2) {
      setSearchResults([])
      setDropdownOpen(false)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.clients)
        setDropdownOpen(data.clients.length > 0)
      }
    }, 300)
  }, [searchQuery, clientMode])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (paymentMethod !== 'subscription_token' || !selectedClient) {
      setClientTokens([])
      setSelectedTokenId('')
      return
    }
    fetch(`/api/admin/clients/${selectedClient.id}/tokens`)
      .then((r) => r.json())
      .then((d) => setClientTokens(d.tokens ?? []))
  }, [paymentMethod, selectedClient])

  function toggleAddon(id: string) {
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]))
  }

  function reset() {
    setClientMode('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedClient(null)
    setDropdownOpen(false)
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setServiceId('')
    setSelectedAddons([])
    setDate('')
    setTime('')
    setEmployeeId(employees[0]?.id ?? '')
    setPaymentMethod('cash')
    setClientTokens([])
    setSelectedTokenId('')
    setNotes('')
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    setError('')

    if (clientMode === 'search' && !selectedClient) {
      setError('Sélectionnez un client ou créez-en un nouveau')
      return
    }
    if (clientMode === 'new' && (!newName.trim() || !newEmail.trim())) {
      setError('Nom et email requis pour le nouveau client')
      return
    }
    if (!serviceId) { setError('Choisissez une prestation'); return }
    if (paymentMethod === 'subscription_token' && !selectedTokenId) { setError('Sélectionnez un crédit abonnement'); return }
    if (!date) { setError('Choisissez une date'); return }
    if (!time) { setError('Choisissez une heure'); return }
    if (!employeeId) { setError('Choisissez un employé'); return }

    setLoading(true)

    const startAt = new Date(`${date}T${time}:00`).toISOString()

    const body: Record<string, unknown> = {
      employee_id: employeeId,
      service_id: serviceId,
      addon_ids: selectedAddons,
      start_at: startAt,
      payment_method: paymentMethod,
      token_id: paymentMethod === 'subscription_token' ? selectedTokenId : undefined,
      notes: notes.trim() || null,
      status: 'confirmed',
    }

    if (clientMode === 'search') {
      body.client_id = selectedClient!.id
    } else {
      body.new_client = { full_name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() || undefined }
    }

    console.log('[NewBookingModal] body:', JSON.stringify(body, null, 2))

    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
      return
    }

    reset()
    onCreated()
  }

  const selectedService = services.find((s) => s.id === serviceId)
  const addonTotal = selectedAddons.reduce((s, id) => s + (addons.find((a) => a.id === id)?.price_cents ?? 0), 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau rendez-vous</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* ── Client ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Client</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setClientMode('search'); setSelectedClient(null) }}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
                    clientMode === 'search' ? 'bg-vert/10 text-vert font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Search className="h-3 w-3" /> Existant
                </button>
                <button
                  type="button"
                  onClick={() => { setClientMode('new'); setSelectedClient(null) }}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${
                    clientMode === 'new' ? 'bg-vert/10 text-vert font-medium' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Plus className="h-3 w-3" /> Nouveau
                </button>
              </div>
            </div>

            {clientMode === 'search' ? (
              <div className="relative" ref={dropdownRef}>
                {selectedClient ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-vert/5 border border-vert/20 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedClient.full_name ?? 'Sans nom'}</p>
                      {selectedClient.phone && <p className="text-xs text-gray-500">{selectedClient.phone}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedClient(null); setSearchQuery('') }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Rechercher par nom..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                    />
                    {dropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                        {searchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 border-b border-gray-100 last:border-0"
                            onClick={() => { setSelectedClient(c); setSearchQuery(''); setDropdownOpen(false) }}
                          >
                            <User className="h-4 w-4 text-gray-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.full_name ?? c.email ?? 'Sans nom'}</p>
                              <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length >= 2 && searchResults.length === 0 && !dropdownOpen && (
                      <p className="text-xs text-gray-400 mt-1.5 px-1">Aucun client trouvé</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Nom complet *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Input placeholder="Email *" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Input placeholder="Téléphone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
            )}
          </div>

          {/* ── Prestation ── */}
          <div>
            <Label className="mb-2 block">Prestation</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une prestation..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {fmt(s.price_cents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Options / Add-ons ── */}
          {addons.length > 0 && (
            <div>
              <Label className="mb-2 block">Options</Label>
              <div className="space-y-1.5">
                {addons.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-vert accent-vert"
                      checked={selectedAddons.includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                    />
                    <span className="text-sm text-gray-700">
                      {a.name}{' '}
                      <span className="text-gray-400">+{fmt(a.price_cents)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Date & Heure ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-2 block">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Heure</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* ── Employé ── */}
          <div>
            <Label className="mb-2 block">Employé</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un employé..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                      {e.display_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Mode de paiement ── */}
          <div>
            <Label className="mb-2 block">Mode de paiement</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    paymentMethod === pm.value
                      ? 'border-vert bg-vert/10 text-vert font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sélection token abonnement ── */}
          {paymentMethod === 'subscription_token' && (
            <div>
              <Label className="mb-2 block">Crédit à utiliser</Label>
              {!selectedClient ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Sélectionnez d&apos;abord un client.
                </p>
              ) : clientTokens.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Aucun crédit disponible pour ce client.
                </p>
              ) : (
                <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un crédit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTokens.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.services?.name ?? 'Formule'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          <div>
            <Label className="mb-2 block">Notes</Label>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent"
              rows={3}
              placeholder="Notes pour le dossier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ── Récap prix ── */}
          {selectedService && (
            <div className="bg-gray-50 rounded-md px-3 py-2.5 text-sm space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>{selectedService.name}</span>
                <span>{fmt(selectedService.price_cents)}</span>
              </div>
              {selectedAddons.map((id) => {
                const a = addons.find((x) => x.id === id)
                if (!a) return null
                return (
                  <div key={id} className="flex justify-between text-gray-500">
                    <span>{a.name}</span>
                    <span>+{fmt(a.price_cents)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
                <span>Total</span>
                <span>{fmt(selectedService.price_cents + addonTotal)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-vert hover:bg-vert/90 text-lime"
          >
            {loading ? 'Création...' : 'Créer le RDV'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
