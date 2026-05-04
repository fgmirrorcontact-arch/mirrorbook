'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatPrice } from '@/lib/utils'
import { Trash2, Download, Mail } from 'lucide-react'

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

interface Booking {
  id: string
  booking_ref: string
  start_at: string
  status: BookingStatus
  total_price_cents: number
  payment_method: string
  profiles: { full_name: string | null } | null
  services: { name: string } | null
  employees: { display_name: string } | null
}

const STATUS_LABELS: Record<BookingStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'destructive' },
  completed: { label: 'Terminée', variant: 'secondary' },
  no_show: { label: 'Non présenté', variant: 'outline' },
}

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)

  const filtered = bookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false
    if (dateFilter) {
      const bookingDate = format(new Date(b.start_at), 'yyyy-MM-dd')
      if (bookingDate !== dateFilter) return false
    }
    return true
  })

  async function changeStatus(id: string, status: BookingStatus) {
    setUpdating(id)
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' })
      return
    }
    toast({ title: 'Statut mis à jour' })
    router.refresh()
  }

  const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Espèces',
    card_present: 'CB sur place',
    stripe_one_time: 'Paiement en ligne',
    subscription_token: 'Abonnement',
  }

  function downloadCSV() {
    const headers = ['Référence', 'Client', 'Prestation', 'Employé', 'Date', 'Montant (€)', 'Statut', 'Mode de paiement']
    const rows = filtered.map((b) => [
      b.booking_ref,
      b.profiles?.full_name ?? '',
      b.services?.name ?? '',
      b.employees?.display_name ?? '',
      format(new Date(b.start_at), "dd/MM/yyyy HH'h'mm", { locale: fr }),
      (b.total_price_cents / 100).toFixed(2).replace('.', ','),
      STATUS_LABELS[b.status]?.label ?? b.status,
      PAYMENT_LABELS[b.payment_method] ?? b.payment_method,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function resendEmail(id: string) {
    setResending(id)
    const res = await fetch(`/api/admin/bookings/${id}/resend`, { method: 'POST' })
    setResending(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: "Impossible d'envoyer l'email", variant: 'destructive' })
      return
    }
    toast({ title: 'Email de confirmation renvoyé' })
  }

  async function deleteBooking(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setDeleting(id)
    const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' })
    setDeleting(null)
    setConfirmDelete(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' })
      return
    }
    toast({ title: 'Réservation supprimée' })
    router.refresh()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} / {bookings.length} réservation(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
            ))}
          </select>
          <input
            type="date"
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {(statusFilter || dateFilter) && (
            <Button size="sm" variant="outline" onClick={() => { setStatusFilter(''); setDateFilter('') }}>
              Réinitialiser
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={downloadCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Réf.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Prestation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucune réservation trouvée.
                  </td>
                </tr>
              ) : filtered.map((booking) => {
                const status = STATUS_LABELS[booking.status] ?? { label: booking.status, variant: 'secondary' as const }
                const isConfirmingDelete = confirmDelete === booking.id
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {booking.booking_ref}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {booking.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {booking.services?.name}
                      {booking.employees?.display_name && (
                        <span className="text-xs text-gray-400 ml-1">· {booking.employees.display_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize text-xs whitespace-nowrap">
                      {format(new Date(booking.start_at), "d MMM yyyy HH'h'mm", { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatPrice(booking.total_price_cents)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
                        value={booking.status}
                        disabled={updating === booking.id}
                        onChange={(e) => changeStatus(booking.id, e.target.value as BookingStatus)}
                      >
                        {(Object.keys(STATUS_LABELS) as BookingStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-vert hover:border-vert/40"
                        onClick={() => resendEmail(booking.id)}
                        disabled={resending === booking.id}
                        title="Renvoyer l'email de confirmation"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            onClick={() => deleteBooking(booking.id)}
                            disabled={deleting === booking.id}
                          >
                            {deleting === booking.id ? '…' : 'Confirmer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Non
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:border-red-300"
                          onClick={() => deleteBooking(booking.id)}
                          title="Supprimer la réservation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
