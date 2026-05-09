'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import type { PromoCode } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

const promoSchema = z.object({
  code: z.string().min(2, 'Code requis').toUpperCase(),
  description: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed_cents']),
  discount_value: z.coerce.number().min(0),
  min_purchase_cents: z.coerce.number().int().min(0).optional(),
  max_uses: z.coerce.number().int().min(1).optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_active: z.boolean().default(true),
})
type PromoFormValues = z.infer<typeof promoSchema>

interface AdminPromosClientProps {
  promos: PromoCode[]
}

function toDateInput(val: string | null | undefined) {
  if (!val) return ''
  return val.slice(0, 10)
}

export default function AdminPromosClient({ promos }: AdminPromosClientProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_cents'>('percentage')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema) as Resolver<PromoFormValues>,
    defaultValues: { discount_type: 'percentage', is_active: true },
  })

  function openCreate() {
    setEditingPromo(null)
    setDiscountType('percentage')
    reset({ discount_type: 'percentage', is_active: true })
    setOpen(true)
  }

  function openEdit(promo: PromoCode) {
    setEditingPromo(promo)
    const dt = promo.discount_type as 'percentage' | 'fixed_cents'
    setDiscountType(dt)
    reset({
      code: promo.code,
      description: promo.description ?? '',
      discount_type: dt,
      // fixed_cents stored as centimes in DB — display as euros in form
      discount_value: dt === 'fixed_cents' ? Number(promo.discount_value) / 100 : Number(promo.discount_value),
      min_purchase_cents: promo.min_purchase_cents != null ? promo.min_purchase_cents / 100 : undefined,
      max_uses: promo.max_uses ?? undefined,
      valid_from: toDateInput(promo.valid_from),
      valid_until: toDateInput(promo.valid_until),
      is_active: promo.is_active,
    })
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setEditingPromo(null)
  }

  async function onSubmit(values: PromoFormValues) {
    // Convert euros back to centimes before sending to API
    const payload = {
      ...values,
      discount_value: values.discount_type === 'fixed_cents'
        ? Math.round(values.discount_value * 100)
        : values.discount_value,
      min_purchase_cents: values.min_purchase_cents != null
        ? Math.round(values.min_purchase_cents * 100)
        : undefined,
    }

    if (editingPromo) {
      const res = await fetch('/api/admin/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPromo.id, ...payload }),
      })
      if (!res.ok) {
        toast({ title: 'Erreur', description: 'Impossible de modifier.', variant: 'destructive' })
        return
      }
      toast({ title: 'Code promo mis à jour' })
    } else {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        toast({ title: 'Erreur', description: 'Impossible de créer le code promo.', variant: 'destructive' })
        return
      }
      toast({ title: 'Code promo créé' })
    }
    handleClose()
    router.refresh()
  }

  async function deletePromo(id: string) {
    setDeletingId(id)
    const res = await fetch('/api/admin/promos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' })
      return
    }
    toast({ title: 'Code supprimé' })
    router.refresh()
  }

  return (
    <>
      <div className="w-full">
        <div className="flex justify-end mb-6">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Créer un code
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Remise</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Utilisations</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Validité</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promos.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono font-semibold text-vert bg-vert/10 px-2 py-0.5 rounded text-xs">
                      {promo.code}
                    </span>
                    {promo.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{promo.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-900 font-semibold">
                    {promo.discount_type === 'percentage'
                      ? `${parseFloat(String(promo.discount_value))}%`
                      : formatPrice(Number(promo.discount_value))}
                    {!!promo.min_purchase_cents && (
                      <p className="text-xs text-gray-400 font-normal">dès {formatPrice(promo.min_purchase_cents)}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">
                    {promo.uses_count}
                    {promo.max_uses && <span className="text-gray-400">/{promo.max_uses}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {promo.valid_from ? new Date(promo.valid_from).toLocaleDateString('fr-FR') : '—'}{' '}
                    →{' '}
                    {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString('fr-FR') : '∞'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={promo.is_active ? 'success' : 'outline'}>
                      {promo.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(promo)}
                        className="text-gray-400 hover:text-vert transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deletePromo(promo.id)}
                        disabled={deletingId === promo.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Modifier le code promo' : 'Nouveau code promo'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-label">Libellé <span className="text-gray-400 font-normal text-xs">(optionnel)</span></Label>
              <Input id="promo-label" placeholder="Offre de bienvenue…" {...register('description')} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-code">Code</Label>
                <Input
                  id="promo-code"
                  placeholder="ETE2024"
                  className="uppercase"
                  {...register('code')}
                />
                {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Type de remise</Label>
                <Select
                  value={discountType}
                  onValueChange={(v) => {
                    const val = v as 'percentage' | 'fixed_cents'
                    setDiscountType(val)
                    setValue('discount_type', val)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_cents">Montant fixe (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promo-value">
                {discountType === 'percentage' ? 'Remise (%)' : 'Remise (€)'}
              </Label>
              <Input
                id="promo-value"
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                {...register('discount_value')}
              />
              {errors.discount_value && (
                <p className="text-xs text-red-600">{errors.discount_value.message}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-from">Valide à partir du <span className="text-gray-400 font-normal text-xs">(laisser vide = sans limite)</span></Label>
                <Input id="promo-from" type="date" {...register('valid_from')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-until">Valide jusqu'au <span className="text-gray-400 font-normal text-xs">(laisser vide = sans limite)</span></Label>
                <Input id="promo-until" type="date" {...register('valid_until')} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-min">Achat min. (€)</Label>
                <Input id="promo-min" type="number" step="0.01" min="0" placeholder="0" {...register('min_purchase_cents')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-max-uses">Nb utilisations max</Label>
                <Input id="promo-max-uses" type="number" placeholder="∞" {...register('max_uses')} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-gray-300 text-vert accent-vert" />
              Actif
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '…' : editingPromo ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
