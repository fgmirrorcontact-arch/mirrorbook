'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444']

const EMPTY_FORM = { display_name: '', color: '#6366f1', google_calendar_id: '' }

export default function AdminEmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)

  async function loadEmployees() {
    const res = await fetch('/api/admin/employees')
    if (res.ok) {
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }

  useEffect(() => { loadEmployees() }, [])

  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setOpen(true)
  }

  function openEdit(emp: Employee) {
    setEditTarget(emp)
    setForm({
      display_name: emp.display_name,
      color: emp.color,
      google_calendar_id: emp.google_calendar_id ?? '',
    })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!form.display_name.trim()) return
    setSubmitting(true)

    const payload = {
      display_name: form.display_name.trim(),
      color: form.color,
      google_calendar_id: form.google_calendar_id.trim() || null,
    }

    const res = await fetch('/api/admin/employees', {
      method: editTarget ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTarget ? { id: editTarget.id, ...payload } : payload),
    })

    setSubmitting(false)

    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' })
      return
    }

    toast({ title: editTarget ? 'Employé mis à jour' : 'Employé créé' })
    setOpen(false)
    loadEmployees()
    router.refresh()
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Supprimer « ${emp.display_name} » ? Cette action est irréversible.`)) return
    const res = await fetch('/api/admin/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id }),
    })
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive' })
      return
    }
    toast({ title: 'Employé supprimé' })
    loadEmployees()
  }

  async function toggleActive(emp: Employee) {
    await fetch('/api/admin/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id, is_active: !emp.is_active }),
    })
    loadEmployees()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employés</h1>
          <p className="text-sm text-gray-500 mt-0.5">{employees.length} employé(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un employé
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
          <p className="text-gray-400 text-sm">Aucun employé. Créez-en un avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employé</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Google Calendar ID</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-7 w-7 rounded-full shrink-0"
                        style={{ backgroundColor: emp.color }}
                      />
                      <span className="font-medium text-gray-900">{emp.display_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                    {emp.google_calendar_id ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => toggleActive(emp)}>
                      <Badge variant={emp.is_active ? 'success' : 'outline'}>
                        {emp.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(emp)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDelete(emp)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Modifier l\'employé' : 'Nouvel employé'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Nom affiché</Label>
              <Input
                placeholder="Jean Dupont"
                value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Couleur (calendrier)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
                    style={{
                      backgroundColor: c,
                      outline: form.color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Google Calendar ID</Label>
              <Input
                placeholder="nom@gmail.com ou ID de calendrier"
                value={form.google_calendar_id}
                onChange={(e) => setForm((p) => ({ ...p, google_calendar_id: e.target.value }))}
              />
              <p className="text-xs text-gray-400">
                Google Calendar → Paramètres du calendrier → Intégration. Laisser vide pour utiliser le calendrier par défaut.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.display_name.trim()}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
