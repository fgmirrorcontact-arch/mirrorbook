'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { Service, ServiceAddon } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { formatPrice, formatDuration } from '@/lib/utils'

const TVA_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5,5%', value: 5.5 },
  { label: '10%', value: 10 },
  { label: '20%', value: 20 },
]

const serviceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  price_euros: z.coerce.number().min(0, 'Prix invalide'),
  duration_hours: z.coerce.number().int().min(0),
  duration_minutes: z.coerce.number().int().min(0).max(59),
  category: z.string().optional(),
  image_url: z.string().url('URL invalide').optional().or(z.literal('')),
  tax_rate: z.coerce.number().min(0).max(100),
  deposit_enabled: z.boolean().default(false),
  deposit_percent: z.coerce.number().int().min(0).max(100).optional(),
  min_lead_hours: z.coerce.number().int().min(0).default(0),
  max_lead_days: z.coerce.number().int().min(0).optional(),
  hide_duration: z.boolean().default(false),
  is_subscription: z.boolean().default(false),
  stripe_price_id: z.string().optional(),
  tokens_per_renewal: z.coerce.number().int().min(1).optional(),
  commitment_months: z.coerce.number().int().nullable().optional(),
  is_active: z.boolean().default(true),
})
type ServiceFormValues = z.infer<typeof serviceSchema>

function toFormValues(s: Service): ServiceFormValues {
  return {
    name: s.name,
    description: s.description ?? '',
    price_euros: s.price_cents / 100,
    duration_hours: Math.floor(s.duration_minutes / 60),
    duration_minutes: s.duration_minutes % 60,
    category: s.category ?? '',
    image_url: s.image_url ?? '',
    tax_rate: s.tax_rate,
    deposit_enabled: s.deposit_percent != null,
    deposit_percent: s.deposit_percent ?? undefined,
    min_lead_hours: s.min_lead_hours,
    max_lead_days: s.max_lead_days ?? undefined,
    hide_duration: s.hide_duration,
    is_subscription: s.is_subscription,
    stripe_price_id: s.stripe_price_id ?? '',
    tokens_per_renewal: s.tokens_per_renewal ?? undefined,
    commitment_months: s.commitment_months ?? null,
    is_active: s.is_active,
  }
}

function toApiPayload(values: ServiceFormValues, sortOrder?: number) {
  return {
    name: values.name,
    description: values.description || null,
    price_cents: values.is_subscription ? 0 : Math.round(values.price_euros * 100),
    duration_minutes: values.duration_hours * 60 + values.duration_minutes,
    category: values.category || null,
    image_url: values.image_url || null,
    tax_rate: values.tax_rate,
    deposit_percent: values.is_subscription ? null : (values.deposit_enabled ? (values.deposit_percent ?? null) : null),
    min_lead_hours: values.min_lead_hours,
    max_lead_days: values.max_lead_days ?? null,
    hide_duration: values.hide_duration,
    is_subscription: values.is_subscription,
    stripe_price_id: null,
    tokens_per_renewal: values.is_subscription ? (values.tokens_per_renewal ?? null) : null,
    commitment_months: null,
    is_active: values.is_active,
    ...(sortOrder !== undefined && { sort_order: sortOrder }),
  }
}

type TierRow = { commitment_months: number; price_euros: string; stripe_price_id: string }

const DEFAULT_VALUES: Partial<ServiceFormValues> = {
  is_active: true,
  is_subscription: false,
  deposit_enabled: false,
  hide_duration: false,
  tax_rate: 20,
  min_lead_hours: 0,
  duration_hours: 0,
  duration_minutes: 30,
}

const ADDON_EMPTY = {
  name: '',
  description: '',
  price_euros: '',
  duration_minutes: '0',
  applicable_to: [] as string[],
  is_active: true,
}

interface Props {
  services: Service[]
  addons: ServiceAddon[]
}

export default function AdminServicesClient({ services, addons }: Props) {
  const router = useRouter()

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'services' | 'addons'>('services')

  // ── Service form ─────────────────────────────────────────────────────────────
  const [svcOpen, setSvcOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormValues>,
    defaultValues: DEFAULT_VALUES,
  })

  const depositEnabled = watch('deposit_enabled')
  const isSubscription = watch('is_subscription')

  const [tiers, setTiers] = useState<TierRow[]>([])

  function openCreate() {
    setEditTarget(null)
    reset(DEFAULT_VALUES)
    setTiers([])
    setSvcOpen(true)
  }

  async function openEdit(service: Service) {
    setEditTarget(service)
    reset(toFormValues(service))
    setTiers([])
    if (service.is_subscription) {
      const res = await fetch(`/api/admin/service-tiers?service_id=${service.id}`)
      if (res.ok) {
        const data: { commitment_months: number; price_cents: number; stripe_price_id: string | null }[] = await res.json()
        setTiers(data.map((t) => ({
          commitment_months: t.commitment_months,
          price_euros: String(t.price_cents / 100),
          stripe_price_id: t.stripe_price_id ?? '',
        })))
      }
    }
    setSvcOpen(true)
  }

  async function onSubmit(values: ServiceFormValues) {
    const isEdit = editTarget != null
    const url = isEdit ? `/api/admin/services/${editTarget.id}` : '/api/admin/services'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toApiPayload(values, isEdit ? undefined : services.length)),
    })

    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' })
      return
    }

    if (values.is_subscription) {
      const serviceId = isEdit ? editTarget!.id : (await res.json()).id
      const tiersRes = await fetch('/api/admin/service-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          tiers: tiers.map((t) => ({
            commitment_months: t.commitment_months,
            price_cents: Math.round(parseFloat(t.price_euros || '0') * 100),
            stripe_price_id: t.stripe_price_id.trim() || null,
          })),
        }),
      })
      if (!tiersRes.ok) {
        const errData = await tiersRes.json().catch(() => ({}))
        const msg = typeof errData.error === 'string'
          ? errData.error
          : errData.error
            ? JSON.stringify(errData.error)
            : 'Impossible de sauvegarder les tarifs d\'engagement.'
        toast({ title: 'Erreur tarifs', description: msg, variant: 'destructive' })
        return
      }
    }

    toast({ title: isEdit ? 'Prestation mise à jour' : 'Prestation créée' })
    setSvcOpen(false)
    reset()
    router.refresh()
  }

  // ── Addon form ───────────────────────────────────────────────────────────────
  const [addonOpen, setAddonOpen] = useState(false)
  const [editAddon, setEditAddon] = useState<ServiceAddon | null>(null)
  const [af, setAf] = useState({ ...ADDON_EMPTY })
  const [addonSubmitting, setAddonSubmitting] = useState(false)
  const [addonError, setAddonError] = useState('')

  function openCreateAddon() {
    setEditAddon(null)
    setAf({ ...ADDON_EMPTY })
    setAddonError('')
    setAddonOpen(true)
  }

  function openEditAddon(addon: ServiceAddon) {
    setEditAddon(addon)
    setAf({
      name: addon.name,
      description: addon.description ?? '',
      price_euros: String(addon.price_cents / 100),
      duration_minutes: String(addon.duration_minutes),
      applicable_to: [...addon.applicable_to],
      is_active: addon.is_active,
    })
    setAddonError('')
    setAddonOpen(true)
  }

  function toggleApplicable(serviceId: string) {
    setAf((prev) => ({
      ...prev,
      applicable_to: prev.applicable_to.includes(serviceId)
        ? prev.applicable_to.filter((id) => id !== serviceId)
        : [...prev.applicable_to, serviceId],
    }))
  }

  async function submitAddon() {
    if (!af.name.trim()) { setAddonError('Le nom est requis'); return }
    setAddonSubmitting(true)
    setAddonError('')

    const payload = {
      name: af.name.trim(),
      description: af.description.trim() || null,
      price_cents: Math.round(parseFloat(af.price_euros || '0') * 100),
      duration_minutes: parseInt(af.duration_minutes || '0', 10),
      applicable_to: af.applicable_to,
      is_active: af.is_active,
    }

    const isEdit = editAddon != null
    const url = isEdit ? `/api/admin/addons/${editAddon.id}` : '/api/admin/addons'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? payload : { ...payload, sort_order: addons.length }),
    })

    setAddonSubmitting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setAddonError(typeof data.error === 'string' ? data.error : 'Erreur lors de la sauvegarde')
      return
    }

    toast({ title: isEdit ? 'Complément mis à jour' : 'Complément créé' })
    setAddonOpen(false)
    router.refresh()
  }

  async function deleteService(service: Service) {
    if (!confirm(`Supprimer « ${service.name} » ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/admin/services/${service.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' })
      return
    }
    toast({ title: 'Prestation supprimée' })
    router.refresh()
  }

  async function deleteAddon(addon: ServiceAddon) {
    if (!confirm(`Supprimer « ${addon.name} » ?`)) return
    const res = await fetch(`/api/admin/addons/${addon.id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' })
      return
    }
    toast({ title: 'Complément supprimé' })
    router.refresh()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {services.length} prestation(s) · {addons.length} complément(s)
          </p>
        </div>
        <Button onClick={tab === 'services' ? openCreate : openCreateAddon}>
          <Plus className="h-4 w-4 mr-1" />
          {tab === 'services' ? 'Ajouter une prestation' : 'Ajouter un complément'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('services')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'services'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Prestations
        </button>
        <button
          onClick={() => setTab('addons')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'addons'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Compléments
        </button>
      </div>

      {/* Services table */}
      {tab === 'services' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prestation</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Durée</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{service.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{service.category ?? '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {formatPrice(service.price_cents)}
                    {service.is_subscription && (
                      <span className="text-xs text-gray-400 font-normal">/mois</span>
                    )}
                    {service.is_subscription && service.tokens_per_renewal && (
                      <p className="text-xs text-vert font-normal">
                        {service.tokens_per_renewal} passage{service.tokens_per_renewal > 1 ? 's' : ''}/mois
                      </p>
                    )}
                    {service.is_subscription && service.commitment_months && (
                      <p className="text-xs text-gray-400 font-normal">
                        Engagement {service.commitment_months} mois
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600">
                    {formatDuration(service.duration_minutes)}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-500">
                    {service.tax_rate > 0 ? `${service.tax_rate}%` : '—'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {service.is_subscription ? (
                      <Badge variant="default">Abonnement</Badge>
                    ) : (
                      <Badge variant="secondary">Unique</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={service.is_active ? 'success' : 'outline'}>
                      {service.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => deleteService(service)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Addons table */}
      {tab === 'addons' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {addons.length === 0 ? (
            <p className="px-5 py-10 text-center text-gray-400 text-sm">
              Aucun complément. Créez-en un avec le bouton ci-dessus.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Complément</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Durée</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prestations associées</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {addons.map((addon) => (
                  <tr key={addon.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      {addon.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{addon.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      +{formatPrice(addon.price_cents)}
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">
                      {addon.duration_minutes > 0 ? formatDuration(addon.duration_minutes) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {addon.applicable_to.length === 0 ? (
                        <span className="text-gray-400 text-xs">Aucune</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {addon.applicable_to.map((svcId) => {
                            const svc = services.find((s) => s.id === svcId)
                            return svc ? (
                              <span
                                key={svcId}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                              >
                                {svc.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={addon.is_active ? 'success' : 'outline'}>
                        {addon.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEditAddon(addon)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-600"
                          onClick={() => deleteAddon(addon)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Service dialog ── */}
      <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier la prestation' : 'Nouvelle prestation'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Nom du service</Label>
              <Input id="svc-name" placeholder="Lavage Extérieur" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Description</Label>
              <textarea
                id="svc-desc"
                rows={3}
                placeholder="Description visible par le client lors de la réservation…"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime resize-none"
                {...register('description')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-image">Image du service (URL)</Label>
              <Input id="svc-image" type="url" placeholder="https://…" {...register('image_url')} />
              {errors.image_url && <p className="text-xs text-red-600">{errors.image_url.message}</p>}
            </div>

            {!isSubscription && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-price">Prix (€)</Label>
                  <div className="relative">
                    <Input
                      id="svc-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="29.00"
                      className="pr-8"
                      {...register('price_euros')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                  </div>
                  {errors.price_euros && <p className="text-xs text-red-600">{errors.price_euros.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="svc-tax">TVA</Label>
                  <select
                    id="svc-tax"
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-lime"
                    {...register('tax_rate')}
                  >
                    {TVA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Durée du service</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Input type="number" min="0" max="23" className="w-20" {...register('duration_hours')} />
                  <span className="text-sm text-gray-500">h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min="0" max="59" className="w-20" {...register('duration_minutes')} />
                  <span className="text-sm text-gray-500">min</span>
                </div>
              </div>
            </div>

            {!isSubscription && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" {...register('deposit_enabled')} className="h-4 w-4 rounded border-gray-300 text-vert" />
                  Accepter les acomptes
                </label>
                {depositEnabled && (
                  <div className="ml-6 flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      className="w-24"
                      placeholder="30"
                      {...register('deposit_percent')}
                    />
                    <span className="text-sm text-gray-500">% du montant total</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="svc-min-lead">Délai min avant réservation</Label>
                <div className="flex items-center gap-1.5">
                  <Input id="svc-min-lead" type="number" min="0" className="w-24" placeholder="0" {...register('min_lead_hours')} />
                  <span className="text-sm text-gray-500">heures</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-max-lead">Délai max avant réservation</Label>
                <div className="flex items-center gap-1.5">
                  <Input id="svc-max-lead" type="number" min="0" className="w-24" placeholder="—" {...register('max_lead_days')} />
                  <span className="text-sm text-gray-500">jours</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-category">Catégorie</Label>
              <Input id="svc-category" placeholder="Extérieur, Complet…" {...register('category')} />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-gray-300 text-vert" />
                Afficher sur la page de réservation
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('hide_duration')} className="h-4 w-4 rounded border-gray-300 text-vert" />
                Masquer la durée
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('is_subscription')} className="h-4 w-4 rounded border-gray-300 text-vert" />
                Abonnement mensuel
              </label>
            </div>

            {isSubscription && (
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Abonnement</p>
                <div className="space-y-1.5">
                  <Label htmlFor="svc-tokens">Passages par renouvellement</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="svc-tokens"
                      type="number"
                      min="1"
                      className="w-24"
                      placeholder="2"
                      {...register('tokens_per_renewal')}
                    />
                    <span className="text-sm text-gray-500">passage(s)/mois</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label>Tarifs par engagement</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTiers((prev) => [
                          ...prev,
                          { commitment_months: 3, price_euros: '', stripe_price_id: '' },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Optionnel — le client choisira son engagement sur la page formules.
                  </p>
                  {tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2.5 bg-gray-50">
                      <select
                        value={tier.commitment_months}
                        onChange={(e) =>
                          setTiers((prev) =>
                            prev.map((t, j) =>
                              j === i ? { ...t, commitment_months: Number(e.target.value) } : t
                            )
                          )
                        }
                        className="h-8 rounded border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime"
                      >
                        <option value={3}>3 mois</option>
                        <option value={6}>6 mois</option>
                        <option value={12}>12 mois</option>
                      </select>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 pr-7 h-8 text-sm"
                          placeholder="19.90"
                          value={tier.price_euros}
                          onChange={(e) =>
                            setTiers((prev) =>
                              prev.map((t, j) => (j === i ? { ...t, price_euros: e.target.value } : t))
                            )
                          }
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                      </div>
                      <Input
                        className="flex-1 h-8 text-sm font-mono"
                        placeholder="price_xxx (Stripe)"
                        value={tier.stripe_price_id}
                        onChange={(e) =>
                          setTiers((prev) =>
                            prev.map((t, j) => (j === i ? { ...t, stripe_price_id: e.target.value } : t))
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setTiers((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSvcOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement…' : 'Enregistrer et fermer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Addon dialog ── */}
      <Dialog open={addonOpen} onOpenChange={setAddonOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAddon ? 'Modifier le complément' : 'Nouveau complément'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={af.name}
                onChange={(e) => setAf((p) => ({ ...p, name: e.target.value }))}
                placeholder="Protection céramique"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime resize-none"
                value={af.description}
                onChange={(e) => setAf((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description visible par le client…"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prix (€)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pr-8"
                    value={af.price_euros}
                    onChange={(e) => setAf((p) => ({ ...p, price_euros: e.target.value }))}
                    placeholder="9.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Durée (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={af.duration_minutes}
                  onChange={(e) => setAf((p) => ({ ...p, duration_minutes: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prestations associées</Label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto border border-gray-200 rounded-md p-3">
                {services.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune prestation disponible</p>
                ) : (
                  services.map((svc) => (
                    <label key={svc.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-vert accent-vert"
                        checked={af.applicable_to.includes(svc.id)}
                        onChange={() => toggleApplicable(svc.id)}
                      />
                      <span className="text-gray-700">
                        {svc.name}
                        {svc.category && (
                          <span className="text-gray-400 ml-1 text-xs">({svc.category})</span>
                        )}
                        {!svc.is_active && (
                          <span className="text-gray-300 ml-1 text-xs">· inactif</span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-vert"
                checked={af.is_active}
                onChange={(e) => setAf((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Afficher sur la page de réservation
            </label>

            {addonError && <p className="text-sm text-red-600">{addonError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddonOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitAddon} disabled={addonSubmitting}>
              {addonSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
