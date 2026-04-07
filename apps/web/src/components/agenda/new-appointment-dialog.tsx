'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { X } from 'lucide-react'
import type { Patient, Doctor, AppointmentType } from 'medclinic-shared'

interface NewAppointmentDialogProps {
  defaultDate: Date
  onClose: () => void
  onCreated: () => void
}

export function NewAppointmentDialog({
  defaultDate,
  onClose,
  onCreated,
}: NewAppointmentDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [types, setTypes] = useState<AppointmentType[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dateStr = defaultDate.toISOString().split('T')[0]!

  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentTypeId: '',
    startsAt: `${dateStr}T09:00`,
    endsAt: `${dateStr}T09:30`,
    mode: 'IN_PERSON' as 'IN_PERSON' | 'TELEMEDICINE',
    chiefComplaint: '',
  })

  useEffect(() => {
    loadTypes()
  }, [])

  useEffect(() => {
    if (patientSearch.length >= 2) {
      searchPatients()
    } else {
      setPatients([])
    }
  }, [patientSearch])

  async function loadTypes() {
    try {
      const res = await api.appointments.types() as { data: AppointmentType[] }
      setTypes(res.data)
    } catch {}
  }

  async function searchPatients() {
    try {
      const res = await api.patients.list({ q: patientSearch, limit: '10' }) as { data: Patient[] }
      setPatients(res.data)
    } catch {}
  }

  function handleTypeChange(typeId: string) {
    const type = types.find((t) => t.id === typeId)
    if (type) {
      const start = new Date(form.startsAt)
      const end = new Date(start.getTime() + type.durationMinutes * 60_000)
      setForm((f) => ({
        ...f,
        appointmentTypeId: typeId,
        endsAt: end.toISOString().slice(0, 16),
      }))
    } else {
      setForm((f) => ({ ...f, appointmentTypeId: typeId }))
    }
  }

  function handleStartChange(value: string) {
    const type = types.find((t) => t.id === form.appointmentTypeId)
    const duration = type?.durationMinutes ?? 30
    const start = new Date(value)
    const end = new Date(start.getTime() + duration * 60_000)
    setForm((f) => ({
      ...f,
      startsAt: value,
      endsAt: end.toISOString().slice(0, 16),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.patientId) {
      setError('Seleccione un paciente')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.appointments.create({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        appointmentTypeId: form.appointmentTypeId || undefined,
        chiefComplaint: form.chiefComplaint || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nueva cita</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value)
                if (!e.target.value) setForm((f) => ({ ...f, patientId: '' }))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {patients.length > 0 && !form.patientId && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, patientId: p.id }))
                      setPatientSearch(`${p.firstName} ${p.lastName}`)
                      setPatients([])
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between"
                  >
                    <span>{p.firstName} {p.lastName}</span>
                    <span className="text-gray-400 text-xs">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {form.patientId && (
              <p className="text-xs text-green-600 mt-1">Paciente seleccionado</p>
            )}
          </div>

          {/* Appointment type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de cita
            </label>
            <select
              value={form.appointmentTypeId}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin tipo específico</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.durationMinutes} min
                </option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
            <div className="flex gap-2">
              {(['IN_PERSON', 'TELEMEDICINE'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.mode === mode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {mode === 'IN_PERSON' ? 'Presencial' : 'Telemedicina'}
                </button>
              ))}
            </div>
          </div>

          {/* Chief complaint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de consulta
            </label>
            <input
              type="text"
              placeholder="Breve descripción del motivo..."
              value={form.chiefComplaint}
              onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Creando...' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
