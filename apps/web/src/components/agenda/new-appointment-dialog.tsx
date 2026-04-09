'use client'

import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { X, UserPlus, Search, Clock } from 'lucide-react'
import type { Patient, AppointmentType, Doctor } from 'medclinic-shared'

// ── Catálogo de motivos por especialidad ─────────────────────
const COMPLAINTS_CATALOG: Record<string, string[]> = {
  'medicina general': ['Fiebre', 'Tos y gripe', 'Dolor de cabeza', 'Dolor abdominal', 'Presión arterial', 'Control de diabetes', 'Revisión general', 'Seguimiento'],
  pediatría: ['Fiebre', 'Tos', 'Diarrea', 'Vacunación', 'Control del niño sano', 'Revisión de crecimiento', 'Llanto excesivo', 'Primera vez'],
  ginecología: ['Revisión anual', 'Control prenatal', 'Dolor pélvico', 'Papanicolaou', 'Planificación familiar', 'Irregularidad menstrual', 'Embarazo'],
  cardiología: ['Dolor en el pecho', 'Palpitaciones', 'Presión alta', 'Falta de aire', 'Mareos', 'Control cardiológico', 'Arritmia'],
  dermatología: ['Erupción cutánea', 'Acné', 'Revisión de lunares', 'Caída de cabello', 'Comezón', 'Manchas en piel', 'Psoriasis'],
  ortopedia: ['Dolor de rodilla', 'Dolor lumbar', 'Dolor de hombro', 'Fractura', 'Lesión deportiva', 'Artritis', 'Postoperatorio'],
  oftalmología: ['Revisión de vista', 'Ojo rojo', 'Visión borrosa', 'Lentes nuevos', 'Dolor ocular', 'Cataratas'],
  neurología: ['Dolor de cabeza crónico', 'Migraña', 'Mareos', 'Convulsiones', 'Entumecimiento', 'Pérdida de memoria'],
  psiquiatría: ['Ansiedad', 'Depresión', 'Insomnio', 'Control de medicamento', 'Estrés', 'Crisis de pánico'],
  endocrinología: ['Control de diabetes', 'Tiroides', 'Sobrepeso', 'Control hormonal', 'Colesterol alto', 'Osteoporosis'],
  nutrición: ['Control de peso', 'Plan alimenticio', 'Diabetes nutricional', 'Colesterol', 'Obesidad'],
  default: ['Revisión general', 'Consulta de seguimiento', 'Primera vez', 'Urgencia', 'Control mensual', 'Postoperatorio'],
}

function getComplaints(specialty?: string | null): string[] {
  if (!specialty) return COMPLAINTS_CATALOG.default!
  const s = specialty.toLowerCase()
  const key = Object.keys(COMPLAINTS_CATALOG).find((k) => s.includes(k))
  return COMPLAINTS_CATALOG[key ?? 'default'] ?? COMPLAINTS_CATALOG.default!
}

// ── Generador de slots de tiempo ─────────────────────────────
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 7; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 20) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}
const TIME_SLOTS = generateTimeSlots()

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '1.5 hrs', value: 90 },
  { label: '2 horas', value: 120 },
]

type PatientMode = 'search' | 'new'

interface NewAppointmentDialogProps {
  defaultDate: Date
  onClose: () => void
  onCreated: () => void
}

export function NewAppointmentDialog({ defaultDate, onClose, onCreated }: NewAppointmentDialogProps) {
  const dateStr = defaultDate.toISOString().split('T')[0]!

  // ── Estado paciente ──────────────────────────────────────────
  const [patientMode, setPatientMode] = useState<PatientMode>('search')
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', phone: '' })

  // ── Estado cita ──────────────────────────────────────────────
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateStr)
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [durationMins, setDurationMins] = useState(30)
  const [mode, setMode] = useState<'IN_PERSON' | 'TELEMEDICINE'>('IN_PERSON')

  // ── Estado motivo de consulta ────────────────────────────────
  const [complaint, setComplaint] = useState('')
  const [customComplaint, setCustomComplaint] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // ── UI ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadDoctors() }, [])

  useEffect(() => {
    if (patientSearch.length >= 2 && patientMode === 'search') searchPatients()
    else setPatients([])
  }, [patientSearch, patientMode])

  async function loadDoctors() {
    try {
      const res = await api.configuracion.doctors() as { data: Doctor[] }
      setDoctors(res.data)
      if (res.data.length === 1) setDoctorId(res.data[0]!.id)
    } catch {}
  }

  async function searchPatients() {
    try {
      const res = await api.patients.list({ q: patientSearch, limit: '10' }) as { data: Patient[] }
      setPatients(res.data)
    } catch {}
  }

  // Catálogo según especialidad del doctor seleccionado
  const catalogComplaints = useMemo(() => {
    const doctor = doctors.find((d) => d.id === doctorId) ?? doctors[0]
    return getComplaints(doctor?.specialty)
  }, [doctorId, doctors])

  function selectComplaintChip(c: string) {
    setShowCustom(false)
    setCustomComplaint('')
    setComplaint(c === complaint ? '' : c)
  }

  function handleCustomChip() {
    setComplaint('')
    setShowCustom(true)
  }

  function switchToNew() {
    setPatientMode('new')
    setSelectedPatientId('')
    setSelectedPatientName('')
    setPatients([])
    const parts = patientSearch.trim().split(' ')
    setNewPatient({
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' ') ?? '',
      phone: '',
    })
    setPatientSearch('')
  }

  function switchToSearch() {
    setPatientMode('search')
    setNewPatient({ firstName: '', lastName: '', phone: '' })
    setSelectedPatientId('')
    setSelectedPatientName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const chiefComplaint = showCustom ? customComplaint.trim() : complaint

    let patientId = selectedPatientId

    if (patientMode === 'new') {
      if (!newPatient.firstName.trim() || !newPatient.lastName.trim() || !newPatient.phone.trim()) {
        setError('Nombre, apellido y teléfono son requeridos')
        return
      }
      setLoading(true)
      try {
        const res = await api.patients.create({
          firstName: newPatient.firstName.trim(),
          lastName: newPatient.lastName.trim(),
          phone: newPatient.phone.trim(),
        }) as { data: Patient }
        patientId = res.data.id
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al crear el paciente')
        setLoading(false)
        return
      }
    } else {
      if (!patientId) { setError('Selecciona o registra un paciente'); return }
      setLoading(true)
    }

    const startsAt = new Date(`${selectedDate}T${selectedTime}`).toISOString()
    const endsAt = new Date(new Date(`${selectedDate}T${selectedTime}`).getTime() + durationMins * 60_000).toISOString()

    try {
      await api.appointments.create({
        patientId,
        doctorId: doctorId || undefined,
        startsAt,
        endsAt,
        mode,
        chiefComplaint: chiefComplaint || undefined,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Nueva cita</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── PACIENTE ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                Paciente <span className="text-red-500">*</span>
              </label>
              {patientMode === 'search' ? (
                <button type="button" onClick={switchToNew}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <UserPlus className="w-3 h-3" /> Nuevo paciente
                </button>
              ) : (
                <button type="button" onClick={switchToSearch}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium">
                  <Search className="w-3 h-3" /> Buscar existente
                </button>
              )}
            </div>

            {patientMode === 'search' ? (
              <>
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    if (!e.target.value) { setSelectedPatientId(''); setSelectedPatientName('') }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {patients.length > 0 && !selectedPatientId && (
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {patients.map((p) => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedPatientId(p.id); setSelectedPatientName(`${p.firstName} ${p.lastName}`); setPatientSearch(`${p.firstName} ${p.lastName}`); setPatients([]) }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between">
                        <span>{p.firstName} {p.lastName}</span>
                        <span className="text-gray-400 text-xs">{p.phone}</span>
                      </button>
                    ))}
                    <button type="button" onClick={switchToNew}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                      <UserPlus className="w-3 h-3" /> Crear "{patientSearch}" como nuevo paciente
                    </button>
                  </div>
                )}
                {patientSearch.length >= 2 && patients.length === 0 && !selectedPatientId && (
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="px-3 py-2 text-sm text-gray-400">No se encontraron resultados</div>
                    <button type="button" onClick={switchToNew}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                      <UserPlus className="w-3 h-3" /> Crear "{patientSearch}" como nuevo paciente
                    </button>
                  </div>
                )}
                {selectedPatientId && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedPatientName}</p>
                )}
              </>
            ) : (
              <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">
                  Registro rápido — puedes completar el expediente después
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Ej. María"
                      value={newPatient.firstName}
                      onChange={(e) => setNewPatient((p) => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Apellido <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="Ej. García"
                      value={newPatient.lastName}
                      onChange={(e) => setNewPatient((p) => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Teléfono WhatsApp <span className="text-red-500">*</span></label>
                  <input type="tel" placeholder="+521234567890"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  <p className="text-xs text-gray-400 mt-0.5">Formato internacional, ej. +5255xxxxxxxx</p>
                </div>
              </div>
            )}
          </div>

          {/* ── DOCTOR (solo si hay varios) ── */}
          {doctors.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Doctor <span className="text-red-500">*</span>
              </label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}{d.specialty ? ` — ${d.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── FECHA ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* ── HORARIO ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Hora de inicio
            </label>
            <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto pr-1">
              {TIME_SLOTS.map((slot) => (
                <button key={slot} type="button"
                  onClick={() => setSelectedTime(slot)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedTime === slot
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* ── DURACIÓN ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button key={d.value} type="button"
                  onClick={() => setDurationMins(d.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    durationMins === d.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── MODALIDAD ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalidad</label>
            <div className="flex gap-2">
              {(['IN_PERSON', 'TELEMEDICINE'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    mode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}>
                  {m === 'IN_PERSON' ? 'Presencial' : 'Telemedicina'}
                </button>
              ))}
            </div>
          </div>

          {/* ── MOTIVO DE CONSULTA ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo de consulta</label>
            <div className="flex flex-wrap gap-1.5">
              {catalogComplaints.map((c) => (
                <button key={c} type="button" onClick={() => selectComplaintChip(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    complaint === c && !showCustom
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'
                  }`}>
                  {c}
                </button>
              ))}
              <button type="button" onClick={handleCustomChip}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  showCustom
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'border-dashed border-gray-400 text-gray-500 hover:border-gray-600 bg-white'
                }`}>
                {showCustom ? '✎ Otro...' : '+ Otro'}
              </button>
            </div>
            {showCustom && (
              <input type="text" autoFocus
                placeholder="Escribe el motivo de la consulta..."
                value={customComplaint}
                onChange={(e) => setCustomComplaint(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            {!showCustom && complaint && (
              <p className="text-xs text-blue-600 mt-1">✓ {complaint}</p>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {loading ? (patientMode === 'new' ? 'Creando paciente...' : 'Creando...') : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
