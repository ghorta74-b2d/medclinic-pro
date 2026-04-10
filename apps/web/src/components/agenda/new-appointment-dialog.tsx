'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '@/lib/api'
import { X, UserPlus, Search, Clock, Loader2 } from 'lucide-react'
import type { Patient, Doctor } from 'medclinic-shared'

// ── Horario por defecto (Lun-Vie 9-19, Sab 9-15) ─────────────
const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }[]> = {
  mon: [{ start: '09:00', end: '19:00' }],
  tue: [{ start: '09:00', end: '19:00' }],
  wed: [{ start: '09:00', end: '19:00' }],
  thu: [{ start: '09:00', end: '19:00' }],
  fri: [{ start: '09:00', end: '19:00' }],
  sat: [{ start: '09:00', end: '15:00' }],
}

// Normaliza formato viejo { monday:{start,end,enabled} } y nuevo { mon:[{start,end}] }
// Días no configurados explícitamente usan DEFAULT_SCHEDULE como fallback
function normalizeSchedule(cfg: unknown): Record<string, { start: string; end: string }[]> {
  if (!cfg || typeof cfg !== 'object') return DEFAULT_SCHEDULE
  const c = cfg as Record<string, unknown>
  if (c['mon'] && Array.isArray(c['mon'])) {
    // Nuevo formato: merge con DEFAULT para que días ausentes usen el default
    return { ...DEFAULT_SCHEDULE, ...(c as Record<string, { start: string; end: string }[]>) }
  }
  const map: Record<string, string> = {
    monday: 'mon', tuesday: 'tue', wednesday: 'wed',
    thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun',
  }
  const out: Record<string, { start: string; end: string }[]> = { ...DEFAULT_SCHEDULE }
  for (const [long, short] of Object.entries(map)) {
    const d = c[long] as { start?: string; end?: string; enabled?: boolean } | undefined
    if (d && d.enabled === false) delete out[short]   // explícitamente desactivado
    else if (d) out[short] = [{ start: d.start ?? '09:00', end: d.end ?? '19:00' }]
  }
  return out
}

// Slots dentro del horario laboral de un día dado (30 min cada uno)
function buildScheduleSlots(schedule: Record<string, { start: string; end: string }[]>, date: string): string[] {
  const dayIdx = new Date(`${date}T12:00:00`).getDay()
  const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIdx]!
  const windows = schedule[dayName] ?? []
  const slots: string[] = []
  for (const w of windows) {
    const [sh, sm] = w.start.split(':').map(Number)
    const [eh, em] = w.end.split(':').map(Number)
    if (sh === undefined) continue
    let h = sh, m = sm ?? 0
    const endMins = (eh ?? 19) * 60 + (em ?? 0)
    while (h * 60 + m < endMins) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      m += 30; if (m >= 60) { h++; m -= 60 }
    }
  }
  return slots
}

// ¿El slot ya pasó hoy?
function isPastSlot(slot: string, date: string): boolean {
  const todayStr = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD en local
  if (date !== todayStr) return false
  const [sh, sm] = slot.split(':').map(Number)
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() >= (sh ?? 0) * 60 + (sm ?? 0)
}

// ── Catálogo de motivos por especialidad ─────────────────────
const COMPLAINTS: Record<string, string[]> = {
  'medicina general': ['Fiebre', 'Tos y gripe', 'Dolor de cabeza', 'Dolor abdominal', 'Presión arterial', 'Control de diabetes', 'Revisión general', 'Seguimiento'],
  pediatría:         ['Fiebre', 'Tos', 'Diarrea', 'Vacunación', 'Control del niño sano', 'Revisión de crecimiento', 'Llanto excesivo'],
  ginecología:       ['Revisión anual', 'Control prenatal', 'Dolor pélvico', 'Papanicolaou', 'Planificación familiar', 'Irregularidad menstrual'],
  cardiología:       ['Dolor en el pecho', 'Palpitaciones', 'Presión alta', 'Falta de aire', 'Mareos', 'Control cardiológico'],
  dermatología:      ['Erupción cutánea', 'Acné', 'Revisión de lunares', 'Caída de cabello', 'Comezón', 'Manchas en piel'],
  ortopedia:         ['Dolor de rodilla', 'Dolor lumbar', 'Dolor de hombro', 'Fractura', 'Lesión deportiva', 'Artritis'],
  oftalmología:      ['Revisión de vista', 'Ojo rojo', 'Visión borrosa', 'Lentes nuevos', 'Dolor ocular'],
  neurología:        ['Dolor de cabeza crónico', 'Migraña', 'Mareos', 'Convulsiones', 'Entumecimiento'],
  psiquiatría:       ['Ansiedad', 'Depresión', 'Insomnio', 'Control de medicamento', 'Estrés'],
  endocrinología:    ['Control de diabetes', 'Tiroides', 'Sobrepeso', 'Control hormonal', 'Colesterol alto'],
  nutrición:         ['Control de peso', 'Plan alimenticio', 'Diabetes nutricional', 'Colesterol', 'Obesidad'],
  default:           ['Revisión general', 'Consulta de seguimiento', 'Primera vez', 'Urgencia', 'Control mensual', 'Postoperatorio'],
}
function getComplaints(specialty?: string | null): string[] {
  if (!specialty) return COMPLAINTS['default']!
  const s = specialty.toLowerCase()
  const key = Object.keys(COMPLAINTS).find(k => s.includes(k))
  return COMPLAINTS[key ?? 'default'] ?? COMPLAINTS['default']!
}

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
  // Fecha local (no UTC) para que el día sea correcto en México
  const todayLocal = new Date().toLocaleDateString('sv-SE')
  const defaultDateLocal = defaultDate.toLocaleDateString('sv-SE')

  // ── Paciente ─────────────────────────────────────────────────
  const [patientMode, setPatientMode] = useState<PatientMode>('search')
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', phoneDigits: '' })

  // ── Cita ─────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState(defaultDateLocal)
  const [selectedTime, setSelectedTime] = useState('')
  const [durationMins, setDurationMins] = useState(30)
  const [mode, setMode] = useState<'IN_PERSON' | 'TELEMEDICINE'>('IN_PERSON')

  // ── Disponibilidad ───────────────────────────────────────────
  const [scheduleSlots, setScheduleSlots] = useState<string[]>([])   // slots en horario laboral
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set()) // slots ocupados
  const [loadingSlots, setLoadingSlots] = useState(false)

  // ── Motivo ───────────────────────────────────────────────────
  const [complaint, setComplaint] = useState('')
  const [customComplaint, setCustomComplaint] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // ── UI ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadDoctors() }, [])
  useEffect(() => { loadDayAvailability() }, [selectedDate, doctorId, doctors])
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

  async function loadDayAvailability() {
    const effectiveId = doctorId || (doctors.length === 1 ? doctors[0]!.id : '')
    if (!effectiveId || !selectedDate) return

    setLoadingSlots(true)
    try {
      const doc = doctors.find(d => d.id === effectiveId)
      const schedule = normalizeSchedule((doc as any)?.scheduleConfig)
      const slots = buildScheduleSlots(schedule, selectedDate)
      setScheduleSlots(slots)

      // Citas del día para marcar ocupados (parse como fecha local, no UTC)
      const [sy, sm, sd] = selectedDate.split('-').map(Number)
      const fromDate = new Date(sy!, sm! - 1, sd!, 0, 0, 0)
      const toDate   = new Date(sy!, sm! - 1, sd!, 23, 59, 59)
      const from = fromDate.toISOString()
      const to   = toDate.toISOString()
      const res = await api.appointments.list({ doctorId: effectiveId, from, to }) as { data: any[] }

      const booked = new Set<string>()
      for (const appt of res.data) {
        if (['CANCELLED', 'NO_SHOW'].includes(appt.status)) continue
        const start = new Date(appt.startsAt)
        const end   = new Date(appt.endsAt)
        let cur = new Date(`${selectedDate}T${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`)
        while (cur < end) {
          booked.add(`${String(cur.getHours()).padStart(2,'0')}:${String(cur.getMinutes()).padStart(2,'0')}`)
          cur = new Date(cur.getTime() + 30 * 60_000)
        }
      }
      setBookedSet(booked)

      // Auto-selecciona el primer slot libre no pasado
      const firstFree = slots.find(t => !booked.has(t) && !isPastSlot(t, selectedDate))
      setSelectedTime(prev => {
        const stillOk = slots.includes(prev) && !booked.has(prev) && !isPastSlot(prev, selectedDate)
        return stillOk ? prev : (firstFree ?? '')
      })
    } catch {} finally {
      setLoadingSlots(false)
    }
  }

  async function searchPatients() {
    try {
      const res = await api.patients.list({ q: patientSearch, limit: '10' }) as { data: Patient[] }
      setPatients(res.data)
    } catch {}
  }

  const catalogComplaints = useMemo(() => {
    const doc = doctors.find(d => d.id === doctorId) ?? doctors[0]
    return getComplaints((doc as any)?.specialty)
  }, [doctorId, doctors])

  function switchToNew() {
    setPatientMode('new')
    setSelectedPatientId('')
    setSelectedPatientName('')
    setPatients([])
    const parts = patientSearch.trim().split(' ')
    setNewPatient({ firstName: parts[0] ?? '', lastName: parts.slice(1).join(' '), phoneDigits: '' })
    setPatientSearch('')
  }

  function switchToSearch() {
    setPatientMode('search')
    setNewPatient({ firstName: '', lastName: '', phoneDigits: '' })
    setSelectedPatientId('')
    setSelectedPatientName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!selectedTime) { setError('Selecciona un horario disponible'); return }

    const chiefComplaint = showCustom ? customComplaint.trim() : complaint
    let patientId = selectedPatientId

    if (patientMode === 'new') {
      if (!newPatient.firstName.trim() || !newPatient.lastName.trim()) {
        setError('Nombre y apellido son requeridos')
        return
      }
      if (newPatient.phoneDigits.length !== 10) {
        setError('El teléfono debe tener exactamente 10 dígitos')
        return
      }
      setLoading(true)
      try {
        // find-or-create por teléfono (idempotente)
        const res = await api.patients.create({
          firstName: newPatient.firstName.trim(),
          lastName:  newPatient.lastName.trim(),
          phone:     `+52${newPatient.phoneDigits}`,
        }) as { data: Patient }
        patientId = res.data.id
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al registrar el paciente')
        setLoading(false)
        return
      }
    } else {
      if (!patientId) { setError('Selecciona o registra un paciente'); return }
      setLoading(true)
    }

    const startsAt = new Date(`${selectedDate}T${selectedTime}`).toISOString()
    const endsAt   = new Date(new Date(`${selectedDate}T${selectedTime}`).getTime() + durationMins * 60_000).toISOString()

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

  // ── Clase de cada slot ───────────────────────────────────────
  function slotClass(slot: string): string {
    const past   = isPastSlot(slot, selectedDate)
    const booked = bookedSet.has(slot)
    const sel    = selectedTime === slot
    if (sel)    return 'bg-blue-600 text-white font-semibold border border-blue-600 shadow-sm'
    if (booked) return 'bg-gray-100 text-gray-400 cursor-not-allowed line-through border border-gray-200'
    if (past)   return 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
    return 'bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 border border-gray-200 cursor-pointer'
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
                <input type="text" placeholder="Buscar por nombre o teléfono..."
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); if (!e.target.value) { setSelectedPatientId(''); setSelectedPatientName('') } }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {patients.length > 0 && !selectedPatientId && (
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {patients.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedPatientId(p.id); setSelectedPatientName(`${p.firstName} ${p.lastName}`); setPatientSearch(`${p.firstName} ${p.lastName}`); setPatients([]) }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center justify-between">
                        <span>{p.firstName} {p.lastName}</span>
                        <span className="text-gray-400 text-xs">{p.phone}</span>
                      </button>
                    ))}
                    <button type="button" onClick={switchToNew}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                      <UserPlus className="w-3 h-3" /> Crear "{patientSearch}" como nuevo
                    </button>
                  </div>
                )}
                {patientSearch.length >= 2 && patients.length === 0 && !selectedPatientId && (
                  <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                    <button type="button" onClick={switchToNew}
                      className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100">
                      <UserPlus className="w-3 h-3" /> Crear "{patientSearch}" como nuevo
                    </button>
                  </div>
                )}
                {selectedPatientId && <p className="text-xs text-green-600 mt-1">✓ {selectedPatientName}</p>}
              </>
            ) : (
              <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Registro rápido — completa el expediente después</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nombre <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="María" value={newPatient.firstName}
                      onChange={e => setNewPatient(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Apellido <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="García" value={newPatient.lastName}
                      onChange={e => setNewPatient(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Teléfono WhatsApp <span className="text-red-500">*</span></label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-xs text-gray-600 font-medium select-none">+52</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="5512345678"
                      value={newPatient.phoneDigits}
                      onChange={e => setNewPatient(p => ({ ...p, phoneDigits: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      maxLength={10}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {newPatient.phoneDigits.length > 0 && newPatient.phoneDigits.length < 10 && (
                    <p className="text-xs text-amber-500 mt-0.5">{10 - newPatient.phoneDigits.length} dígitos restantes</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── DOCTOR (solo si hay varios) ── */}
          {doctors.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Doctor <span className="text-red-500">*</span></label>
              <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar doctor...</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}{(d as any).specialty ? ` — ${(d as any).specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── FECHA ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input type="date" value={selectedDate}
              min={todayLocal}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* ── HORARIOS ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hora de inicio
              </label>
              {loadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : scheduleSlots.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Sin horario laboral este día.
              </p>
            ) : (
              <>
                {/* Leyenda */}
                <div className="flex gap-4 mb-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block" /> Disponible
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" /> Ocupado
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block" /> Pasado
                  </span>
                </div>
                {/* Grid — solo slots del horario laboral */}
                <div className="grid grid-cols-6 gap-1">
                  {scheduleSlots.map(slot => {
                    const past   = isPastSlot(slot, selectedDate)
                    const booked = bookedSet.has(slot)
                    return (
                      <button key={slot} type="button"
                        disabled={booked || past}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-1.5 rounded-lg text-xs transition-colors ${slotClass(slot)}`}>
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── DURACIÓN ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración</label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button key={d.value} type="button" onClick={() => setDurationMins(d.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    durationMins === d.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
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
              {(['IN_PERSON', 'TELEMEDICINE'] as const).map(m => (
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
              {catalogComplaints.map(c => (
                <button key={c} type="button"
                  onClick={() => { setShowCustom(false); setCustomComplaint(''); setComplaint(c === complaint ? '' : c) }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    complaint === c && !showCustom
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400 bg-white'
                  }`}>
                  {c}
                </button>
              ))}
              <button type="button"
                onClick={() => { setComplaint(''); setShowCustom(true) }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  showCustom ? 'bg-gray-700 text-white border-gray-700' : 'border-dashed border-gray-400 text-gray-500 hover:border-gray-600 bg-white'
                }`}>
                {showCustom ? '✎ Otro...' : '+ Otro'}
              </button>
            </div>
            {showCustom && (
              <input type="text" autoFocus placeholder="Escribe el motivo..."
                value={customComplaint} onChange={e => setCustomComplaint(e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
            {!showCustom && complaint && <p className="text-xs text-blue-600 mt-1">✓ {complaint}</p>}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !selectedTime}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              {loading
                ? (patientMode === 'new' ? 'Registrando...' : 'Creando...')
                : selectedTime ? `Crear cita ${selectedTime}` : 'Selecciona un horario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
