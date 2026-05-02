'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { X, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import NewBookingModal from './NewBookingModal'

type Booking = {
  id: string
  booking_ref: string
  employee_id: string
  start_at: string
  end_at: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes: string | null
  total_price_cents: number
  client: { full_name: string | null } | null
  service: { name: string } | null
  employee: { display_name: string; color: string } | null
}

type Employee = { id: string; display_name: string; color: string; is_active: boolean }
type Service = { id: string; name: string; price_cents: number; duration_minutes: number }
type Addon = { id: string; name: string; price_cents: number; duration_minutes: number }

interface Props {
  bookings: Booking[]
  employees: Employee[]
  services: Service[]
  addons: Addon[]
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show: 'No-show',
}

const STATUS_CLASS: Record<Booking['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  no_show: 'bg-red-100 text-red-800 border-red-200',
}

function eventColor(b: Booking) {
  if (b.status === 'cancelled') return '#d1d5db'
  if (b.status === 'no_show') return '#f87171'
  if (b.status === 'completed') return '#6b7280'
  return b.employee?.color ?? '#6366f1'
}

function centsToEuros(cents: number) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export default function CalendarClient({ bookings, employees, services, addons }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Booking | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleEmployee(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const events: EventInput[] = bookings
    .filter((b) => !hidden.has(b.employee_id))
    .map((b) => ({
      id: b.id,
      title: b.service?.name ?? 'Réservation',
      start: b.start_at,
      end: b.end_at,
      backgroundColor: eventColor(b),
      borderColor: 'transparent',
      textColor: b.status === 'cancelled' ? '#6b7280' : '#fff',
      extendedProps: { booking: b },
    }))

  function handleEventClick(arg: EventClickArg) {
    setSelected(arg.event.extendedProps.booking as Booking)
  }

  function handleBookingCreated() {
    setNewBookingOpen(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletingId(id)
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    setSelected(null)
    setConfirmDelete(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex" style={{ height: '100vh' }}>
        {/* ── Main ── */}
        <div className="flex-1 flex flex-col p-6 min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
              <p className="text-sm text-gray-500 mt-0.5">Réservations par employé</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Employee filter pills */}
              {employees.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {employees.map((emp) => {
                    const active = !hidden.has(emp.id)
                    return (
                      <button
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          active
                            ? 'border-transparent text-white'
                            : 'border-gray-200 bg-white text-gray-400'
                        }`}
                        style={active ? { backgroundColor: emp.color } : undefined}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: active ? '#ffffff80' : emp.color }}
                        />
                        {emp.display_name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* New booking button */}
              <button
                onClick={() => setNewBookingOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                <Plus className="h-4 w-4" />
                Nouveau RDV
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden [&_.fc]:h-full [&_.fc-view-harness]:flex-1">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale={frLocale}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              buttonText={{
                today: "Aujourd'hui",
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour',
              }}
              events={events}
              eventClick={handleEventClick}
              height="100%"
              scrollTime="08:00:00"
              nowIndicator
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              slotDuration="00:30:00"
              expandRows
              businessHours={{ startTime: '08:00', endTime: '20:00' }}
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              allDaySlot={false}
            />
          </div>
        </div>

        {/* ── Detail panel ── */}
        {selected && (
          <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <span className="font-mono text-sm font-semibold text-gray-700">{selected.booking_ref}</span>
              <div className="flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      disabled={deletingId === selected.id}
                      className="text-xs text-red-600 font-medium hover:text-red-800 transition-colors"
                    >
                      {deletingId === selected.id ? 'Suppression...' : 'Confirmer'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer ce RDV"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => { setSelected(null); setConfirmDelete(false) }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_CLASS[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>

              {selected.employee && (
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selected.employee.color }} />
                  <span className="text-sm font-medium text-gray-900">{selected.employee.display_name}</span>
                </div>
              )}

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Client</dt>
                  <dd className="font-medium text-gray-900">{selected.client?.full_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Prestation</dt>
                  <dd className="font-medium text-gray-900">{selected.service?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Date &amp; heure</dt>
                  <dd className="font-medium text-gray-900">
                    {format(new Date(selected.start_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </dd>
                  <dd className="text-gray-500 mt-0.5">
                    jusqu'à {format(new Date(selected.end_at), 'HH:mm', { locale: fr })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Montant</dt>
                  <dd className="font-medium text-gray-900">{centsToEuros(selected.total_price_cents)}</dd>
                </div>
                {selected.notes && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Notes</dt>
                    <dd className="text-gray-700 leading-relaxed">{selected.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>

      <NewBookingModal
        open={newBookingOpen}
        onClose={() => setNewBookingOpen(false)}
        onCreated={handleBookingCreated}
        services={services}
        addons={addons}
        employees={employees}
      />
    </>
  )
}
