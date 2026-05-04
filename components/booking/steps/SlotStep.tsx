'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useBookingStore } from '@/store/bookingStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Default employee ID — in a full implementation this would be dynamic
const DEFAULT_EMPLOYEE_ID = process.env.NEXT_PUBLIC_DEFAULT_EMPLOYEE_ID ?? ''

export default function SlotStep() {
  const {
    selectedService,
    selectedDate,
    selectedSlot,
    selectedAddons,
    setDate,
    setSlot,
    setStep,
  } = useBookingStore()

  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const totalDuration =
    (selectedService?.duration_minutes ?? 0) +
    selectedAddons.reduce((sum, a) => sum + a.duration_minutes, 0)

  const fetchSlots = useCallback(
    async (date: Date) => {
      if (!DEFAULT_EMPLOYEE_ID) return
      setLoadingSlots(true)
      setSlotsError(null)
      try {
        const params = new URLSearchParams({
          employeeId: DEFAULT_EMPLOYEE_ID,
          date: format(date, 'yyyy-MM-dd'),
          duration: String(totalDuration),
        })
        const res = await fetch(`/api/availability?${params}`)
        if (!res.ok) throw new Error('Erreur lors du chargement des créneaux')
        const data = await res.json()
        setSlots(data.slots ?? [])
      } catch (err) {
        setSlotsError('Impossible de charger les créneaux. Veuillez réessayer.')
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    },
    [totalDuration]
  )

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate)
    else setSlots([])
  }, [selectedDate, fetchSlots])

  function handleDayClick(day: Date) {
    if (isPast(day) && !isToday(day)) return
    setDate(day)
  }

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div>
      <h2
        className="text-2xl font-extrabold italic uppercase text-charbon mb-1"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Choisissez un créneau
      </h2>
      <p className="text-gray-500 mb-1 font-light">Sélectionnez une date puis un horaire disponible.</p>
      {selectedService && (
        <p className="text-sm text-vert font-medium mb-6">
          {selectedService.name}
          {totalDuration > 0 && <span className="text-gray-400 font-normal"> · {totalDuration} min</span>}
        </p>
      )}

      {/* Calendar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-150"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 capitalize">
            {format(viewMonth, 'MMMM yyyy', { locale: fr })}
          </h3>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-150"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const outOfMonth = !isSameMonth(day, viewMonth)
            const pastDay = isPast(day) && !isToday(day)
            const selected = selectedDate ? isSameDay(day, selectedDate) : false
            const today = isToday(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={outOfMonth || pastDay}
                className={cn(
                  'mx-auto h-9 w-9 flex items-center justify-center rounded-full text-sm transition-colors',
                  'disabled:opacity-30 disabled:cursor-not-allowed',
                  selected && 'bg-vert text-lime font-semibold',
                  !selected && today && 'border-2 border-vert text-vert font-semibold',
                  !selected && !today && !outOfMonth && !pastDay && 'hover:bg-vert/10 text-gray-900',
                  outOfMonth && 'text-gray-300'
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Créneaux disponibles le{' '}
            <span className="text-gray-900">
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </span>
          </h3>

          {loadingSlots ? (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Chargement des créneaux…</span>
            </div>
          ) : slotsError ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-red-600">{slotsError}</p>
              <button
                type="button"
                onClick={() => selectedDate && fetchSlots(selectedDate)}
                className="text-xs text-vert underline underline-offset-2 hover:opacity-75"
              >
                Réessayer
              </button>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun créneau disponible pour cette date.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSlot(slot)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime',
                    selectedSlot === slot
                      ? 'bg-vert border-vert text-lime'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-vert/40 hover:text-vert'
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer mobile pour le bouton fixe */}
      <div className="h-20 sm:hidden" />

      {/* Desktop */}
      <div className="hidden sm:flex justify-between">
        <Button variant="outline" onClick={() => setStep('service')}>
          Retour
        </Button>
        <Button
          onClick={() => setStep('auth')}
          disabled={!selectedDate || !selectedSlot}
          size="lg"
        >
          Continuer
        </Button>
      </div>

      {/* Mobile : boutons fixes en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 px-6 py-3 sm:hidden">
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('service')} className="flex-none">
            Retour
          </Button>
          <Button
            onClick={() => setStep('auth')}
            disabled={!selectedDate || !selectedSlot}
            size="lg"
            className="flex-1"
          >
            Continuer
          </Button>
        </div>
      </div>
    </div>
  )
}
