'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Save, X, Plus, Minus, RefreshCw, Trash2, KeyRound, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { formatPrice } from '@/lib/utils'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
type SubStatus = 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'

interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: string
  created_at: string
  admin_notes?: string | null
}

interface Booking {
  id: string
  booking_ref: string
  start_at: string
  status: BookingStatus
  total_price_cents: number
  services: { name: string } | null
  employees: { display_name: string } | null
}

interface Subscription {
  id: string
  service_id: string
  status: SubStatus
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  services: { name: string; tokens_per_renewal: number | null } | null
}

interface Service {
  id: string
  name: string
  is_subscription: boolean
}

interface PromoCode {
  id: string
  code: string
  discount_type: string
  discount_value: number
}

interface Props {
  clientId: string
  profile: Profile
  email: string | null
  bookings: Booking[]
  subscriptions: Subscription[]
  availableTokens: { id: string; subscription_id: string; service_id: string; expires_at: string | null }[]
  services: Service[]
  promos: PromoCode[]
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
  no_show: 'No-show',
}

const SUB_STATUS_LABELS: Record<SubStatus, string> = {
  active: 'Actif',
  past_due: 'Retard paiement',
  cancelled: 'Annulé',
  paused: 'Pausé',
  incomplete: 'Incomplet',
}

const SUB_STATUS_VARIANTS: Record<SubStatus, 'success' | 'destructive' | 'outline' | 'secondary'> = {
  active: 'success',
  past_due: 'destructive',
  cancelled: 'outline',
  paused: 'secondary',
  incomplete: 'secondary',
}

export default function ClientDetailClient({
  clientId,
  profile,
  email,
  bookings,
  subscriptions,
  availableTokens,
  services,
  promos,
}: Props) {
  const router = useRouter()

  // ── Edit profile ─────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(profile.full_name ?? '')
  const [editPhone, setEditPhone] = useState(profile.phone ?? '')
  const [editEmail, setEditEmail] = useState(email ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  async function saveProfile() {
    setSavingProfile(true)
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: editName,
        phone: editPhone || null,
        email: editEmail !== email ? editEmail : undefined,
      }),
    })
    setSavingProfile(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Erreur inconnue', variant: 'destructive' })
      return
    }
    toast({ title: 'Profil mis à jour' })
    setEditMode(false)
    window.location.reload()
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState((profile as never as { admin_notes?: string | null }).admin_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)

  async function saveNotes() {
    setSavingNotes(true)
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    })
    setSavingNotes(false)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Notes non sauvegardées', variant: 'destructive' })
      return
    }
    toast({ title: 'Notes sauvegardées' })
  }

  // ── Tokens ───────────────────────────────────────────────────────────────────
  const [tokenSubId, setTokenSubId] = useState(subscriptions.find((s) => s.status === 'active')?.id ?? '')
  const [tokenQty, setTokenQty] = useState(1)
  const [tokenExpiry, setTokenExpiry] = useState('')
  const [addingTokens, setAddingTokens] = useState(false)
  const [removingToken, setRemovingToken] = useState<string | null>(null)

  const selectedSub = subscriptions.find((s) => s.id === tokenSubId)

  async function removeToken(subId: string) {
    setRemovingToken(subId)
    const res = await fetch(`/api/admin/clients/${clientId}/tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subId }),
    })
    setRemovingToken(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Erreur', variant: 'destructive' })
      return
    }
    toast({ title: '1 crédit retiré' })
    window.location.reload()
  }

  async function addTokens() {
    if (!tokenSubId || !selectedSub) return
    setAddingTokens(true)
    const res = await fetch(`/api/admin/clients/${clientId}/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: tokenSubId,
        service_id: selectedSub.service_id,
        quantity: tokenQty,
        expires_at: tokenExpiry || null,
      }),
    })
    setAddingTokens(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Erreur', variant: 'destructive' })
      return
    }
    toast({ title: `${tokenQty} crédit(s) ajouté(s)` })
    window.location.reload()
  }

  // ── Subscription status ──────────────────────────────────────────────────────
  async function changeSubStatus(subId: string, status: SubStatus) {
    const res = await fetch(`/api/admin/clients/${clientId}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subId, status }),
    })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' })
      return
    }
    toast({ title: 'Abonnement mis à jour' })
    window.location.reload()
  }

  // ── Reset password ───────────────────────────────────────────────────────────
  const [resettingPwd, setResettingPwd] = useState(false)

  async function resetPassword() {
    setResettingPwd(true)
    const res = await fetch(`/api/admin/clients/${clientId}/reset-password`, { method: 'POST' })
    setResettingPwd(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Impossible de générer le lien', variant: 'destructive' })
      return
    }
    const { link } = await res.json()
    navigator.clipboard.writeText(link).catch(() => {})
    toast({ title: 'Lien copié dans le presse-papier', description: 'Envoyez ce lien au client pour réinitialiser son mot de passe.' })
  }

  // ── Delete client ────────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function deleteClient() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Impossible de supprimer', variant: 'destructive' })
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    router.push('/admin/clients')
  }

  // ── Subscription create ──────────────────────────────────────────────────────
  const subscriptionServices = services.filter((s) => s.is_subscription).length > 0
    ? services.filter((s) => s.is_subscription)
    : services
  const [showCreateSub, setShowCreateSub] = useState(false)
  const [newSubServiceId, setNewSubServiceId] = useState(subscriptionServices[0]?.id ?? '')
  const [newSubStart, setNewSubStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [newSubEnd, setNewSubEnd] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10)
  })
  const [newSubStatus, setNewSubStatus] = useState<SubStatus>('active')
  const [creatingSubscription, setCreatingSubscription] = useState(false)

  async function createSubscription() {
    if (!newSubServiceId) return
    setCreatingSubscription(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: newSubServiceId,
          current_period_start: new Date(newSubStart).toISOString(),
          current_period_end: new Date(newSubEnd).toISOString(),
          status: newSubStatus,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: d.error ?? 'Erreur inconnue', variant: 'destructive' })
        return
      }
      toast({ title: 'Abonnement créé' })
      setShowCreateSub(false)
      window.location.reload()
    } catch {
      toast({ title: 'Erreur réseau', description: 'Impossible de contacter le serveur', variant: 'destructive' })
    } finally {
      setCreatingSubscription(false)
    }
  }

  // ── Subscription delete ──────────────────────────────────────────────────────
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null)
  const [deletingSub, setDeletingSub] = useState<string | null>(null)

  async function deleteSubscription(subId: string) {
    if (confirmDeleteSub !== subId) { setConfirmDeleteSub(subId); return }
    setDeletingSub(subId)
    const res = await fetch(`/api/admin/clients/${clientId}/subscription`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subId }),
    })
    setDeletingSub(null)
    setConfirmDeleteSub(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: d.error ?? 'Erreur', variant: 'destructive' })
      return
    }
    toast({ title: 'Abonnement supprimé' })
    window.location.reload()
  }

  // ── Booking status ───────────────────────────────────────────────────────────
  async function changeBookingStatus(bookingId: string, status: BookingStatus) {
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' })
      return
    }
    toast({ title: 'Réservation mise à jour' })
    window.location.reload()
  }

  const activeSubs = subscriptions.filter((s) => s.status === 'active' || s.status === 'past_due' || s.status === 'paused')
  const tokenCountBySub = availableTokens.reduce<Record<string, number>>((acc, t) => {
    acc[t.subscription_id] = (acc[t.subscription_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Back */}
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name ?? '—'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{email ?? '—'} · Client depuis le {new Date(profile.created_at).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <Button variant="destructive" size="sm" onClick={deleteClient} disabled={deleting}>
                {deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Annuler
              </Button>
            </>
          ) : (
            <>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Modifier
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={resetPassword} disabled={resettingPwd}>
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                {resettingPwd ? '…' : 'Réinitialiser le mdp'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-600 hover:text-red-700 hover:border-red-300">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* ── Info ── */}
        <div className="col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Informations</h2>

          {editMode ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nom complet</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Téléphone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="06 …" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {savingProfile ? 'Sauvegarde…' : 'Sauvegarder'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Nom</dt>
                <dd className="font-medium text-gray-900">{profile.full_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Téléphone</dt>
                <dd>{profile.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Email</dt>
                <dd className="break-all">{email ?? '—'}</dd>
              </div>
            </dl>
          )}

          {/* Notes */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <Label className="text-xs text-gray-500">Notes internes</Label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations, préférences, historique particulier…"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime resize-none"
            />
            <Button size="sm" variant="outline" onClick={saveNotes} disabled={savingNotes}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {savingNotes ? 'Sauvegarde…' : 'Sauvegarder les notes'}
            </Button>
          </div>

          {/* Promos actives */}
          {promos.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs text-gray-500 font-medium">Codes promo utilisés</p>
              <div className="flex flex-wrap gap-1.5">
                {promos.map((p) => (
                  <span
                    key={p.id}
                    className="font-mono text-xs bg-vert/10 text-vert px-2 py-0.5 rounded cursor-pointer hover:bg-vert/20"
                    title={p.discount_type === 'percentage' ? `${p.discount_value}%` : formatPrice(p.discount_value)}
                    onClick={() => navigator.clipboard.writeText(p.code)}
                  >
                    {p.code}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400">Cliquez pour copier</p>
            </div>
          )}
        </div>

        {/* ── Abonnement ── */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Abonnements & crédits</h2>
            {subscriptionServices.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowCreateSub((v) => !v)}>
                <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                Créer un abonnement
              </Button>
            )}
          </div>

          {showCreateSub && (
            <div className="border border-vert/30 bg-vert/5 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-vert uppercase tracking-wide">Nouvel abonnement manuel</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Prestation</Label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm"
                    value={newSubServiceId}
                    onChange={(e) => setNewSubServiceId(e.target.value)}
                  >
                    {subscriptionServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Statut</Label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm"
                    value={newSubStatus}
                    onChange={(e) => setNewSubStatus(e.target.value as SubStatus)}
                  >
                    <option value="active">Actif</option>
                    <option value="paused">Pausé</option>
                    <option value="incomplete">Incomplet</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Début de période</Label>
                  <Input type="date" value={newSubStart} onChange={(e) => setNewSubStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fin de période</Label>
                  <Input type="date" value={newSubEnd} onChange={(e) => setNewSubEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={createSubscription} disabled={creatingSubscription || !newSubServiceId}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {creatingSubscription ? 'Création…' : 'Créer'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateSub(false)}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {subscriptions.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun abonnement.</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const tokenCount = tokenCountBySub[sub.id] ?? 0
                const isConfirmingDelete = confirmDeleteSub === sub.id
                return (
                  <div key={sub.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{sub.services?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(sub.current_period_start).toLocaleDateString('fr-FR')} → {new Date(sub.current_period_end).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={SUB_STATUS_VARIANTS[sub.status]}>{SUB_STATUS_LABELS[sub.status]}</Badge>
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          value={sub.status}
                          onChange={(e) => changeSubStatus(sub.id, e.target.value as SubStatus)}
                        >
                          <option value="active">Actif</option>
                          <option value="paused">Pausé</option>
                          <option value="past_due">Retard paiement</option>
                          <option value="cancelled">Annulé</option>
                          <option value="incomplete">Incomplet</option>
                        </select>
                        {isConfirmingDelete ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs px-2"
                              onClick={() => deleteSubscription(sub.id)}
                              disabled={deletingSub === sub.id}
                            >
                              {deletingSub === sub.id ? '…' : 'Confirmer'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => setConfirmDeleteSub(null)}
                            >
                              Non
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                            onClick={() => deleteSubscription(sub.id)}
                            title="Supprimer l'abonnement"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-vert">{tokenCount}</span> crédit(s) disponible(s)
                        {sub.services?.tokens_per_renewal && (
                          <span className="text-gray-400"> · {sub.services.tokens_per_renewal}/mois</span>
                        )}
                      </p>
                      {tokenCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                          onClick={() => removeToken(sub.id)}
                          disabled={removingToken === sub.id}
                          title="Retirer 1 crédit"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add tokens form */}
          {activeSubs.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ajouter des crédits manuellement</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Abonnement</Label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm"
                    value={tokenSubId}
                    onChange={(e) => setTokenSubId(e.target.value)}
                  >
                    {activeSubs.map((s) => (
                      <option key={s.id} value={s.id}>{s.services?.name ?? s.id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 w-24">
                  <Label className="text-xs">Quantité</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={tokenQty}
                    onChange={(e) => setTokenQty(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Expiration (optionnel)</Label>
                  <Input type="date" value={tokenExpiry} onChange={(e) => setTokenExpiry(e.target.value)} />
                </div>
                <Button size="sm" onClick={addTokens} disabled={addingTokens || !tokenSubId}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {addingTokens ? 'Ajout…' : 'Ajouter'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Historique réservations ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Historique des réservations <span className="text-gray-400 font-normal">({bookings.length})</span>
          </h2>
        </div>

        {bookings.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">Aucune réservation.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prestation</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-vert bg-vert/10 px-1.5 py-0.5 rounded">
                      {b.booking_ref}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {b.services?.name ?? '—'}
                    {b.employees?.display_name && (
                      <span className="text-xs text-gray-400 ml-1">· {b.employees.display_name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {new Date(b.start_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {formatPrice(b.total_price_cents)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      value={b.status}
                      onChange={(e) => changeBookingStatus(b.id, e.target.value as BookingStatus)}
                    >
                      {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
