'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { api, getUserRole, getOwnDoctorId } from '@/lib/api'
import { X, UserPlus, Search, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Patient, Doctor } from 'medclinic-shared'

// ── Doctor extendido con scheduleConfig (viene del API pero no está en el tipo compartido)
type DoctorWithSchedule = Doctor & { scheduleConfig?: unknown }

// ── Mini date picker en español ──────────────────────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_ES  = ['Lu','Ma','Mi','Ju','Vi','Sá','Do']

function SpanishDatePicker({ value, min, onChange }: { value: string; min: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [vy, vm, vd] = value.split('-').map(Number)
  const selected = value ? new Date(vy!, vm! - 1, vd!) : null

  const [viewYear, setViewYear]   = useState(() => selected?.getFullYear() ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => selected?.getMonth()    ?? new Date().getMonth())

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const offset   = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const [my, mm, md] = min.split('-').map(Number)
  const minDate = new Date(my!, mm! - 1, md!)

  function select(day: number) {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  const displayValue = selected
    ? `${selected.getDate()} ${MESES_ES[selected.getMonth()]} ${selected.getFullYear()}`
    : 'Selecciona una fecha'

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between bg-white">
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{displayValue}</span>
        <Clock className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-gray-800">{MESES_ES[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DIAS_ES.map(d => <p key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</p>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const thisDate = new Date(viewYear, viewMonth, day)
              const isSelected = selected?.getDate() === day && selected?.getMonth() === viewMonth && selected?.getFullYear() === viewYear
              const isPast = thisDate < minDate
              return (
                <button key={i} type="button" disabled={isPast} onClick={() => select(day)}
                  className={`text-sm rounded-lg py-1 transition-colors ${isSelected ? 'bg-blue-600 text-white font-semibold' : isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 text-gray-800'}`}>
                  {day}
                </button>
              )
            })}
          </div>
          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-end">
            <button type="button" onClick={() => { const t = new Date(); select(t.getDate()); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()) }}
              className="text-xs text-blue-600 hover:underline font-medium">Hoy</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Horario por defecto: Lun-Vie 9-18, Sab 9-14 ──────────────
// Domingo: sin horario (no incluido = día libre)
const DEFAULT_SCHEDULE: Record<string, { start: string; end: string }[]> = {
  mon: [{ start: '09:00', end: '18:00' }],
  tue: [{ start: '09:00', end: '18:00' }],
  wed: [{ start: '09:00', end: '18:00' }],
  thu: [{ start: '09:00', end: '18:00' }],
  fri: [{ start: '09:00', end: '18:00' }],
  sat: [{ start: '09:00', end: '14:00' }],
}

/**
 * Normaliza scheduleConfig a formato canónico { mon:[{start,end}], ... }
 *
 * Soporta:
 *   - Formato NUEVO (guardado por Configuración):
 *       { mon: [{start:'09:00', end:'18:00'}], tue: [...], ... }
 *       Los días deshabilitados NO aparecen en el objeto.
 *
 *   - Formato VIEJO (creado automáticamente al registrar doctor):
 *       { monday: {start:'09:00', end:'18:00', enabled:true}, saturday: {..., enabled:false}, ... }
 *
 *   - null / undefined / vacío → usa DEFAULT_SCHEDULE completo
 *
 * Nunca sobre-escribe días con defaults si la config dice explícitamente
 * que están habilitados — solo usa defaults para días que no existen en la config.
 */
function normalizeSchedule(cfg: unknown): Record<string, { start: string; end: string }[]> {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
    return { ...DEFAULT_SCHEDULE }
  }

  const c = cfg as Record<string, unknown>
  const SHORT_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const LONG_TO_SHORT: Record<string, string> = {
    monday: 'mon', tuesday: 'tue', wednesday: 'wed',
    thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun',
  }

  // Detectar formato
  const hasNewFormat = SHORT_DAYS.some(k => k in c)
  const hasOldFormat = Object.keys(LONG_TO_SHORT).some(k => k in c)

  if (!hasNewFormat && !hasOldFormat) {
    // Formato desconocido → defaults
    return { ...DEFAULT_SCHEDULE }
  }

  // Empezar desde DEFAULT y dejar que la config lo sobrescriba / quite días
  const out: Record<string, { start: string; end: string }[]> = { ...DEFAULT_SCHEDULE }

  if (hasNewFormat) {
    // Formato nuevo: sólo los días que aparecen en la config importan
    // Los días ausentes mantienen su valor de DEFAULT_SCHEDULE (o quedan sin horario si no están en DEFAULT)
    for (const day of SHORT_DAYS) {
      if (!(day in c)) continue  // no mencionado → mantiene default (o sin horario si no en DEFAULT)
      const val = c[day]
      if (Array.isArray(val) && val.length > 0) {
        // Día habilitado con horario específico
        out[day] = val as { start: string; end: string }[]
      } else {
        // Array vacío o null → día explícitamente deshabilitado
        delete out[day]
      }
    }
  } else {
    // Formato viejo: long keys con objeto { start, end, enabled }
    for (const [longKey, shortKey] of Object.entries(LONG_TO_SHORT)) {
      if (!(longKey in c)) continue
      const d = c[longKey] as { start?: string; end?: string; enabled?: boolean } | null
      if (!d || d.enabled === false) {
        delete out[shortKey]
      } else {
        out[shortKey] = [{ start: d.start ?? '09:00', end: d.end ?? '18:00' }]
      }
    }
  }

  return out
}

// ── Genera slots de 30 min dentro del horario laboral del día ──
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
    const endMins = (eh ?? 18) * 60 + (em ?? 0)
    while (h * 60 + m < endMins) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      m += 30; if (m >= 60) { h++; m -= 60 }
    }
  }
  return slots
}

// ── ¿El slot ya pasó hoy? ─────────────────────────────────────
function isPastSlot(slot: string, date: string): boolean {
  const todayStr = new Date().toLocaleDateString('sv-SE')
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
  const todayLocal       = new Date().toLocaleDateString('sv-SE')
  const defaultDateLocal = defaultDate.toLocaleDateString('sv-SE')

  // ── Auth / rol ───────────────────────────────────────────────
  // 'DOCTOR' | 'ADMIN' | 'STAFF' | null (cargando)
  const [userRole, setUserRole] = useState<string | null>(null)

  // ── Doctores ─────────────────────────────────────────────────
  // Para ADMIN/STAFF: lista completa con scheduleConfig
  // Para DOCTOR: vacía (no necesitan ver la lista)
  const [doctors, setDoctors] = useState<DoctorWithSchedule[]>([])

  // doctorId: para DOCTOR se auto-rellena con el suyo; para ADMIN lo elige el usuario
  const [doctorId, setDoctorId] = useState('')

  // Schedule del doctor seleccionado (normalizado, listo para buildScheduleSlots)
  // Para DOCTOR: viene del endpoint /configuracion/schedule (fuente de verdad)
  // Para ADMIN: viene de doc.scheduleConfig del listado de doctores
  const [activeSchedule, setActiveSchedule] = useState<Record<string, { start: string; end: string }[]> | null>(null)

  // ── Paciente ─────────────────────────────────────────────────
  const [patientMode, setPatientMode] = useState<PatientMode>('search')
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', phoneDigits: '' })

  // ── Cita ─────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(defaultDateLocal)
  const [selectedTime, setSelectedTime] = useState('')
  const [durationMins, setDurationMins] = useState(30)
  const [mode, setMode] = useState<'IN_PERSON' | 'TELEMEDICINE'>('IN_PERSON')

  // ── Disponibilidad ───────────────────────────────────────────
  const [scheduleSlots, setScheduleSlots] = useState<string[]>([])
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set())
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsReady, setSlotsReady] = useState(false)

  // ── Motivo ───────────────────────────────────────────────────
  const [complaint, setComplaint] = useState('')
  const [customComplaint, setCustomComplaint] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  // ── UI ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initDone, setInitDone] = useState(false)

  // ── INICIALIZACIÓN: detecta rol y carga datos según corresponda ──
  useEffect(() => {
    async function init() {
      try {
        const role = await getUserRole()
        setUserRole(role)

        if (role === 'DOCTOR') {
          // ► DOCTOR: obtenemos su propio ID y horario desde el endpoint autorizado.
          //   Esto funciona independientemente de cuántos doctores haya en la clínica.
          //   El endpoint siempre devuelve el schedule del doctor autenticado.
          const [ownId, schedRes] = await Promise.all([
            getOwnDoctorId(),
            api.configuracion.getSchedule() as Promise<{
              data: { doctorId: string; scheduleConfig: unknown; consultationDuration: number }
            }>,
          ])

          // doctor_id del JWT como primera opción, fallback al id del endpoint
          const myDoctorId = ownId ?? schedRes.data.doctorId
          setDoctorId(myDoctorId)

          // El backend ya aplica DEFAULT_SCHEDULE si el scheduleConfig está vacío
          // Pero normalizamos igualmente para manejar el formato viejo (long keys)
          setActiveSchedule(normalizeSchedule(schedRes.data.scheduleConfig))
        } else {
          // ► ADMIN / STAFF: cargamos todos los doctores activos de la clínica.
          //   El doctor se debe seleccionar explícitamente antes de ver horarios.
          const res = await api.configuracion.doctors() as { data: DoctorWithSchedule[] }
          setDoctors(res.data)
          // No pre-seleccionamos ningún doctor — el usuario debe elegir
        }
      } catch (e) {
        console.error('Error al inicializar el dialog de cita:', e)
      } finally {
        setInitDone(true)
      }
    }
    init()
  }, [])

  // ── Cuando ADMIN selecciona un doctor: carga su schedule ─────
  useEffect(() => {
    if (userRole === 'DOCTOR') return  // DOCTOR ya tiene su schedule desde init
    if (!doctorId) {
      setActiveSchedule(null)
      setScheduleSlots([])
      setSlotsReady(true)
      return
    }
    const doc = doctors.find(d => d.id === doctorId)
    if (doc) {
      setActiveSchedule(normalizeSchedule(doc.scheduleConfig))
    }
  }, [doctorId, doctors, userRole])

  // ── Cuando cambia fecha o schedule: recalcula slots ──────────
  useEffect(() => {
    if (!initDone) return
    loadDayAvailability()
  }, [selectedDate, activeSchedule, initDone])

  async function loadDayAvailability() {
    // Sin schedule → no hay doctor seleccionado todavía (caso ADMIN)
    if (!activeSchedule) {
      setScheduleSlots([])
      setSlotsReady(true)
      return
    }

    const effectiveDoctorId = doctorId
    if (!effectiveDoctorId || !selectedDate) {
      setScheduleSlots([])
      setSlotsReady(true)
      return
    }

    setLoadingSlots(true)
    setSlotsReady(false)
    try {
      const slots = buildScheduleSlots(activeSchedule, selectedDate)
      setScheduleSlots(slots)

      // Citas ya ocupadas en ese día para ese doctor
      const [sy, sm, sd] = selectedDate.split('-').map(Number)
      const fromDate = new Date(sy!, sm! - 1, sd!, 0, 0, 0)
      const toDate   = new Date(sy!, sm! - 1, sd!, 23, 59, 59)
      const res = await api.appointments.list({
        doctorId: effectiveDoctorId,
        from: fromDate.toISOString(),
        to:   toDate.toISOString(),
      }) as { data: any[] }

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
    } catch (e) {
      console.error('Error al cargar disponibilidad:', e)
    } finally {
      setLoadingSlots(false)
      setSlotsReady(true)
    }
  }

  // ── Búsqueda de pacientes ─────────────────────────────────────
  useEffect(() => {
    if (patientSearch.length >= 2 && patientMode === 'search') searchPatients()
    else setPatients([])
  }, [patientSearch, patientMode])

  async function searchPatients() {
    try {
      const res = await api.patients.list({ q: patientSearch, limit: '10' }) as { data: Patient[] }
      setPatients(res.data)
    } catch {}
  }

  const catalogComplaints = useMemo(() => {
    const doc = doctors.find(d => d.id === doctorId) ?? doctors[0]
    return getComplaints(doc?.specialty)
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

  // ── Clase visual de cada slot ─────────────────────────────────
  function slotClass(slot: string): string {
    const past   = isPastSlot(slot, selectedDate)
    const booked = bookedSet.has(slot)
    const sel    = selectedTime === slot
    if (sel)    return 'bg-blue-600 text-white font-semibold border border-blue-600 shadow-sm'
    if (booked) return 'bg-gray-100 text-gray-400 cursor-not-allowed line-through border border-gray-200'
    if (past)   return 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
    return 'bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-400 border border-gray-200 cursor-pointer'
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (userRole !== 'DOCTOR' && !doctorId) {
      setError('Selecciona un doctor para la cita')
      return
    }
    if (!selectedTime) {
      setError('Selecciona un horario disponible')
      return
    }

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

  const isAdminRole = userRole === 'ADMIN' || userRole === 'STAFF'

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

          {/* ── DOCTOR (solo ADMIN/STAFF — el DOCTOR siempre tiene el suyo pre-seleccionado) ── */}
          {isAdminRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Doctor <span className="text-red-500">*</span>
              </label>
              {!initDone ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando doctores...
                </div>
              ) : (
                <select
                  value={doctorId}
                  onChange={e => {
                    setDoctorId(e.target.value)
                    setSelectedTime('')
                    setSlotsReady(false)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Seleccionar doctor —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName}{d.specialty ? ` — ${d.specialty}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── FECHA ── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <SpanishDatePicker value={selectedDate} min={todayLocal} onChange={date => {
              setSelectedDate(date)
              setSelectedTime('')
              setSlotsReady(false)
            }} />
          </div>

          {/* ── HORARIOS ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Hora de inicio
              </label>
              {loadingSlots && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            </div>

            {!initDone || loadingSlots ? (
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : isAdminRole && !doctorId ? (
              <p className="text-sm text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                Selecciona un doctor para ver los horarios disponibles.
              </p>
            ) : !slotsReady ? null
            : scheduleSlots.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Sin horario laboral este día.
              </p>
            ) : (
              <>
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
                <div className="grid grid-cols-6 gap-1">
                  {scheduleSlots.map(slot => (
                    <button key={slot} type="button"
                      disabled={bookedSet.has(slot) || isPastSlot(slot, selectedDate)}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-1.5 rounded-lg text-xs transition-colors ${slotClass(slot)}`}>
                      {slot}
                    </button>
                  ))}
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
            <button type="submit" disabled={loading || !selectedTime || (isAdminRole && !doctorId)}
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
