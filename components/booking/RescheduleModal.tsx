'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, addMonths, subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/use-toast'

const DEFAULT_EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEFAULT_EMPLOYEE_ID ?? ''

interface Props {
  open: boolean
  onClose: () => void
  bookingId: string
  bookingRef: string
  serviceName: string
  durationMinutes: number
  currentStartAt: string
}

export default function RescheduleModal({
  open, onClose, bookingId, bookingRef, serviceName, durationMinutes, currentStartAt,
}: Props) {
  const router = useRouter()
  const [viewMonth, setViewMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const fetchSlots = useCallback(async (date: Date) => {
    if (!DEFAULT_EMPLOYEE_ID) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const params = new URLSearchParams({
        employeeId: DEFAULT_EMPLOYEE_ID,
        date: format(date, 'yyyy-MM-dd'),
        duration: String(durationMinutes),
        excludeBookingId: bookingId,
      })
      const res = await fetch(`/api/availability?${params}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [durationMinutes, bookingId])

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate)
  }, [selectedDate, fetchSlots])

  function handleClose() {
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
    setDone(false)
    onClose()
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot) return
    setSaving(true)
    try {
      const [hours, minutes] = selectedSlot.split(':').map(Number)
      const newStart = new Date(selectedDate)
      newStart.setHours(hours, minutes, 0, 0)

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_at: newStart.toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erreur')
      setDone(true)
      router.refresh()
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de modifier le créneau.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const monthStart = startOfMonth(viewMonth)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {done ? (
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <CheckCircle2 className="h-12 w-12 text-vert" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Créneau modifié !</p>
              <p className="text-sm text-gray-500 mt-1">
                Votre réservation {bookingRef} a été mise à jour.
              </p>
            </div>
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Modifier le créneau</DialogTitle>
              <DialogDescription>{serviceName} — Réf. {bookingRef}</DialogDescription>
            </DialogHeader>

            {/* Calendar */}
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-500" />
                </button>
                <span className="text-sm font-semibold text-gray-900 capitalize">
                  {format(viewMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-gray-100"
                >
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day) => {
                  const out = !isSameMonth(day, viewMonth)
                  const past = isPast(day) && !isToday(day)
                  const sel = selectedDate ? isSameDay(day, selectedDate) : false
                  const today = isToday(day)
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={out || past}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'mx-auto h-8 w-8 flex items-center justify-center rounded-full text-sm transition-colors',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                        sel && 'bg-vert text-lime font-semibold',
                        !sel && today && 'border-2 border-vert text-vert font-semibold',
                        !sel && !today && !out && !past && 'hover:bg-vert/10 text-gray-900',
                        out && 'text-gray-300',
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Slots */}
            {selectedDate && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2 capitalize">
                  {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun créneau disponible ce jour.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                          selectedSlot === s
                            ? 'bg-vert border-vert text-lime'
                            : 'border-gray-300 text-gray-700 hover:border-vert/40 hover:text-vert'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedSlot || saving}
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enregistrement…</> : 'Confirmer le nouveau créneau'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
