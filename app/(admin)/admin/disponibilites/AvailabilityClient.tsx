'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import { Trash2, Plus, UserPlus } from 'lucide-react'

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

const SLOT_DURATIONS = [15, 30, 45, 60, 90, 120]

type Employee = { id: string; display_name: string; color: string; is_active: boolean }

type DaySchedule = {
  employee_id?: string
  day_of_week: number
  is_active: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  break_minutes: number
}

type Exception = {
  id: string
  employee_id: string
  exception_date: string
  is_unavailable: boolean
  reason: string | null
}

// PostgreSQL retourne '09:00:00', l'input time attend '09:00'
function toHHMM(t: string) {
  return t?.slice(0, 5) ?? t
}

function buildDays(saved: DaySchedule[]): DaySchedule[] {
  return DAYS.map((d) => {
    const existing = saved.find((s) => s.day_of_week === d.value)
    if (existing) {
      return { ...existing, start_time: toHHMM(existing.start_time), end_time: toHHMM(existing.end_time) }
    }
    return {
      day_of_week: d.value,
      is_active: d.value >= 1 && d.value <= 5,
      start_time: '09:00',
      end_time: '18:00',
      slot_duration_minutes: 60,
      break_minutes: 0,
    }
  })
}

interface Props {
  employees: Employee[]
  allSchedules: DaySchedule[]
  allExceptions: Exception[]
}

export default function AvailabilityClient({ employees: initialEmployees, allSchedules, allExceptions }: Props) {
  const router = useRouter()
  const [employees, setEmployees] = useState(initialEmployees)
  const [selectedId, setSelectedId] = useState<string | null>(initialEmployees[0]?.id ?? null)

  const selected = employees.find((e) => e.id === selectedId) ?? null

  // ── Nouvel employé form ────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)

  async function createEmployee() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: newName, color: newColor }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const emp = await res.json()
      setEmployees((prev) => [...prev, emp])
      setSelectedId(emp.id)
      setShowCreate(false)
      setNewName('')
      toast({ title: 'Employé créé' })
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  // ── Édition employé ────────────────────────────────────────────────────────
  const [empName, setEmpName] = useState(selected?.display_name ?? '')
  const [empColor, setEmpColor] = useState(selected?.color ?? '#6366f1')
  const [empSaving, setEmpSaving] = useState(false)

  function selectEmployee(emp: Employee) {
    setSelectedId(emp.id)
    setEmpName(emp.display_name)
    setEmpColor(emp.color)
    setDays(buildDays(allSchedules.filter((s) => s.employee_id === emp.id)))
    setExceptions(allExceptions.filter((e) => e.employee_id === emp.id))
  }

  async function saveEmployee() {
    if (!selected) return
    setEmpSaving(true)
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, display_name: empName, color: empColor }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEmployees((prev) => prev.map((e) => e.id === selected.id ? { ...e, display_name: empName, color: empColor } : e))
      toast({ title: 'Mis à jour' })
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), variant: 'destructive' })
    } finally {
      setEmpSaving(false)
    }
  }

  async function toggleActive() {
    if (!selected) return
    const res = await fetch('/api/admin/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, is_active: !selected.is_active }),
    })
    if (res.ok) {
      setEmployees((prev) => prev.map((e) => e.id === selected.id ? { ...e, is_active: !e.is_active } : e))
      toast({ title: selected.is_active ? 'Employé désactivé' : 'Employé activé' })
    }
  }

  // ── Planning ───────────────────────────────────────────────────────────────
  const [days, setDays] = useState<DaySchedule[]>(
    buildDays(allSchedules.filter((s) => s.employee_id === (initialEmployees[0]?.id ?? '')))
  )
  const [schedSaving, setSchedSaving] = useState(false)

  // Resync days when allSchedules prop changes (après router.refresh)
  useEffect(() => {
    if (selectedId) {
      setDays(buildDays(allSchedules.filter((s) => s.employee_id === selectedId)))
    }
  }, [allSchedules, selectedId])

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function saveSchedules() {
    if (!selected) return
    setSchedSaving(true)
    try {
      const res = await fetch('/api/admin/availability/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selected.id, schedules: days }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(typeof err.error === 'string' ? err.error : JSON.stringify(err.error))
      }
      const { schedules: saved } = await res.json()
      setDays(buildDays(saved ?? []))
      toast({ title: 'Planning enregistré' })
      router.refresh()
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), variant: 'destructive' })
    } finally {
      setSchedSaving(false)
    }
  }

  // ── Exceptions ─────────────────────────────────────────────────────────────
  const [exceptions, setExceptions] = useState<Exception[]>(
    allExceptions.filter((e) => e.employee_id === (initialEmployees[0]?.id ?? ''))
  )
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [excSaving, setExcSaving] = useState(false)

  async function addException() {
    if (!selected || !newDate) return
    setExcSaving(true)
    try {
      const res = await fetch('/api/admin/availability/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selected.id, exception_date: newDate, is_unavailable: true, reason: newReason || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created = await res.json()
      setExceptions((prev) => [...prev, created])
      setNewDate('')
      setNewReason('')
      toast({ title: 'Date bloquée' })
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), variant: 'destructive' })
    } finally {
      setExcSaving(false)
    }
  }

  async function removeException(id: string) {
    const res = await fetch(`/api/admin/availability/exceptions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setExceptions((prev) => prev.filter((e) => e.id !== id))
      toast({ title: 'Date débloquée' })
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disponibilités</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gérez l'équipe, les horaires et les jours bloqués.</p>
      </div>

      {/* ── Équipe ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Équipe</h2>
          <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Ajouter
          </Button>
        </div>

        {/* Formulaire création */}
        {showCreate && (
          <div className="border border-dashed border-indigo-300 rounded-lg p-4 bg-indigo-50/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom affiché</Label>
                <Input placeholder="Alexandre" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded border border-gray-300 p-0.5" />
                  <span className="text-sm text-gray-500">{newColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button size="sm" onClick={createEmployee} disabled={creating || !newName.trim()}>
                {creating ? 'Création…' : 'Créer'}
              </Button>
            </div>
          </div>
        )}

        {/* Liste employés */}
        {employees.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun employé — cliquez sur Ajouter</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => selectEmployee(emp)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  selectedId === emp.id
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: emp.color }} />
                {emp.display_name}
                {!emp.is_active && <Badge variant="outline" className="text-xs ml-1">Inactif</Badge>}
              </button>
            ))}
          </div>
        )}

        {/* Édition employé sélectionné */}
        {selected && (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Modifier — {selected.display_name}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={empName} onChange={(e) => setEmpName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={empColor} onChange={(e) => setEmpColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded border border-gray-300 p-0.5" />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button size="sm" variant="outline" onClick={toggleActive}>
                {selected.is_active ? 'Désactiver' : 'Activer'}
              </Button>
              <Button size="sm" onClick={saveEmployee} disabled={empSaving}>
                {empSaving ? 'Enregistrement…' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Planning ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Planning {selected ? `— ${selected.display_name}` : ''}
          </h2>
          {!selected && <Badge variant="outline" className="text-amber-600 border-amber-300">Sélectionnez un employé</Badge>}
        </div>

        <div className="space-y-2">
          {days.map((day, i) => {
            const label = DAYS.find((d) => d.value === day.day_of_week)?.label
            return (
              <div key={day.day_of_week} className={`rounded-lg border p-3.5 transition-colors ${day.is_active ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer w-28 shrink-0">
                    <input type="checkbox" checked={day.is_active} onChange={(e) => updateDay(i, { is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                  {day.is_active && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Input type="time" value={day.start_time} onChange={(e) => updateDay(i, { start_time: e.target.value })} className="w-28 h-8 text-sm" />
                        <span className="text-gray-400 text-sm">→</span>
                        <Input type="time" value={day.end_time} onChange={(e) => updateDay(i, { end_time: e.target.value })} className="w-28 h-8 text-sm" />
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-500 shrink-0">Créneaux</span>
                        <select value={day.slot_duration_minutes} onChange={(e) => updateDay(i, { slot_duration_minutes: Number(e.target.value) })} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          {SLOT_DURATIONS.map((d) => (
                            <option key={d} value={d}>{d >= 60 ? `${d / 60}h` : `${d} min`}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-gray-500 shrink-0">Pause</span>
                        <Input type="number" min="0" max="60" value={day.break_minutes} onChange={(e) => updateDay(i, { break_minutes: Number(e.target.value) })} className="w-16 h-8 text-sm" />
                        <span className="text-gray-500">min</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-1">
          <Button onClick={saveSchedules} disabled={schedSaving || !selected}>
            {schedSaving ? 'Enregistrement…' : 'Sauvegarder le planning'}
          </Button>
        </div>
      </section>

      {/* ── Jours bloqués ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">
          Jours bloqués {selected ? `— ${selected.display_name}` : ''}
        </h2>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-40">
            <Label>Motif <span className="text-gray-400">(optionnel)</span></Label>
            <Input placeholder="Congés, férié…" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
          </div>
          <Button onClick={addException} disabled={excSaving || !selected || !newDate} variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Bloquer
          </Button>
        </div>

        {exceptions.length > 0 ? (
          <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
            {exceptions.sort((a, b) => a.exception_date.localeCompare(b.exception_date)).map((exc) => (
              <li key={exc.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(exc.exception_date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {exc.reason && <span className="ml-2 text-xs text-gray-400">— {exc.reason}</span>}
                </div>
                <button onClick={() => removeException(exc.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Aucun jour bloqué</p>
        )}
      </section>
    </div>
  )
}
