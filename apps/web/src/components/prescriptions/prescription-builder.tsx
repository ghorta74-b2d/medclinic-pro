'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { searchMedications, type MedicationEntry } from 'medclinic-shared'
import { X, Plus, Trash2, Search } from 'lucide-react'
import type { Patient } from 'medclinic-shared'

interface RxItem {
  medicationName: string
  dose: string
  route: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
}

interface ExistingPrescription {
  id: string
  patientId: string
  patientName: string
  items: RxItem[]
  instructions: string
  followUpDate: string // YYYY-MM-DD or ''
}

interface PrescriptionBuilderProps {
  onClose: () => void
  onCreated: () => void
  patientId?: string
  existing?: ExistingPrescription
}

const ROUTES = ['oral', 'sublingual', 'tópico', 'IM', 'IV', 'SC', 'inhalado', 'vaginal', 'rectal', 'oftálmico', 'ótico']
const FREQUENCIES = ['cada 4 horas', 'cada 6 horas', 'cada 8 horas', 'cada 12 horas', 'cada 24 horas', '1 vez al día', '2 veces al día', '3 veces al día', 'según necesidad']
const DURATIONS = ['3 días', '5 días', '7 días', '10 días', '14 días', '1 mes', '3 meses', '6 meses', 'indefinido']

const emptyItem = (): RxItem => ({
  medicationName: '', dose: '', route: 'oral', frequency: 'cada 8 horas', duration: '7 días', quantity: '', instructions: '',
})

export function PrescriptionBuilder({ onClose, onCreated, patientId: defaultPatientId, existing }: PrescriptionBuilderProps) {
  const isEditing = !!existing

  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState(existing?.patientId ?? defaultPatientId ?? '')
  const [selectedPatientName, setSelectedPatientName] = useState(existing?.patientName ?? '')
  const [items, setItems] = useState<RxItem[]>(existing?.items ?? [emptyItem()])
  const [instructions, setInstructions] = useState(existing?.instructions ?? '')
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Medication autocomplete per item
  const initMedSearch = existing?.items.map(it => it.medicationName) ?? ['']
  const [medSearch, setMedSearch] = useState<string[]>(initMedSearch)
  const [medResults, setMedResults] = useState<MedicationEntry[][]>(initMedSearch.map(() => []))

  useEffect(() => {
    if (patientSearch.length >= 2) {
      api.patients.list({ q: patientSearch, limit: '8' })
        .then((res) => setPatients((res as { data: Patient[] }).data))
        .catch(() => {})
    } else {
      setPatients([])
    }
  }, [patientSearch])

  function handleMedSearch(idx: number, q: string) {
    setMedSearch((s) => { const n = [...s]; n[idx] = q; return n })
    if (q.length >= 2) {
      const results = searchMedications(q)
      setMedResults((r) => { const n = [...r]; n[idx] = results; return n })
    } else {
      setMedResults((r) => { const n = [...r]; n[idx] = []; return n })
    }
    setItems((prev) => {
      const n = [...prev]
      n[idx] = { ...n[idx]!, medicationName: q }
      return n
    })
  }

  function selectMedication(idx: number, med: MedicationEntry) {
    setItems((prev) => {
      const n = [...prev]
      n[idx] = {
        ...n[idx]!,
        medicationName: `${med.name}${med.brandName ? ` (${med.brandName})` : ''}`,
        dose: med.concentration,
        route: med.route,
      }
      return n
    })
    setMedSearch((s) => { const n = [...s]; n[idx] = med.name; return n })
    setMedResults((r) => { const n = [...r]; n[idx] = []; return n })
  }

  function updateItem(idx: number, field: keyof RxItem, value: string) {
    setItems((prev) => {
      const n = [...prev]
      n[idx] = { ...n[idx]!, [field]: value }
      return n
    })
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
    setMedSearch((s) => [...s, ''])
    setMedResults((r) => [...r, []])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    setMedSearch((s) => s.filter((_, i) => i !== idx))
    setMedResults((r) => r.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPatientId) { setError('Seleccione un paciente'); return }
    const validItems = items.filter((it) => it.medicationName && it.dose)
    if (validItems.length === 0) { setError('Agregue al menos un medicamento'); return }

    setLoading(true)
    setError('')
    try {
      const payload = {
        items: validItems.map((it, i) => ({ ...it, sortOrder: i })),
        instructions: instructions || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      }
      if (isEditing && existing) {
        await (api.prescriptions as any).update(existing.id, payload)
      } else {
        await api.prescriptions.create({ patientId: selectedPatientId, ...payload })
      }
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditing ? 'Error al actualizar receta' : 'Error al crear receta')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Editar receta' : 'Nueva receta médica'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient — locked when editing */}
          {isEditing ? (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-500 font-medium mb-0.5">Paciente</p>
              <p className="text-sm font-semibold text-gray-900">{existing?.patientName}</p>
            </div>
          ) : !defaultPatientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              {selectedPatientId ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-green-800">{selectedPatientName}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedPatientId(''); setSelectedPatientName(''); setPatientSearch('') }}
                    className="ml-auto text-green-600 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {patients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(p.id)
                            setSelectedPatientName(`${p.firstName} ${p.lastName}`)
                            setPatientSearch('')
                            setPatients([])
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex justify-between"
                        >
                          <span>{p.firstName} {p.lastName}</span>
                          <span className="text-gray-400 text-xs">{p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Medication items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-800">Medicamentos</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar medicamento
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase">Medicamento {idx + 1}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Medication name with autocomplete */}
                    <div className="relative sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Nombre del medicamento *</label>
                      <input
                        type="text"
                        value={medSearch[idx] ?? ''}
                        onChange={(e) => handleMedSearch(idx, e.target.value)}
                        placeholder="Buscar medicamento..."
                        className={inputClass}
                      />
                      {(medResults[idx]?.length ?? 0) > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {medResults[idx]!.map((med, mi) => (
                            <button
                              key={mi}
                              type="button"
                              onClick={() => selectMedication(idx, med)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex flex-col"
                            >
                              <span className="font-medium">{med.name} {med.concentration}</span>
                              <span className="text-gray-400">{med.brandName} · {med.presentation} · {med.route}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Dosis *</label>
                      <input value={item.dose} onChange={(e) => updateItem(idx, 'dose', e.target.value)}
                        placeholder="500mg" className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Vía de administración</label>
                      <select value={item.route} onChange={(e) => updateItem(idx, 'route', e.target.value)} className={inputClass}>
                        {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
                      <select value={item.frequency} onChange={(e) => updateItem(idx, 'frequency', e.target.value)} className={inputClass}>
                        {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Duración</label>
                      <select value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} className={inputClass}>
                        {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cantidad total</label>
                      <input value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="21 tabletas" className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Indicaciones específicas</label>
                      <input value={item.instructions} onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                        placeholder="Tomar con alimentos..." className={inputClass} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Indicaciones generales</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Reposo relativo, dieta específica, actividad restringida..."
              className={inputClass}
            />
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de seguimiento</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar cambios' : 'Crear receta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
