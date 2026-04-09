'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, formatRelative, getInitials, calculateAge, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, Calendar, Droplets, AlertTriangle,
  FileText, Pill, FlaskConical, ChevronRight, Clock, Pencil, X, Check, Loader2,
} from 'lucide-react'
import type { Patient, ClinicalNote, Appointment, Prescription, LabResult } from 'medclinic-shared'
import { GENDER_LABELS, BLOOD_TYPE_LABELS, STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'

// ── Phone helpers ──────────────────────────────────────────────────────────────
function extractPhone(phone: string): { prefix: string; digits: string } {
  if (phone.startsWith('+52')) return { prefix: '+52', digits: phone.slice(3) }
  if (phone.startsWith('52') && phone.length === 12) return { prefix: '+52', digits: phone.slice(2) }
  return { prefix: '+52', digits: phone.replace(/\D/g, '').slice(-10) }
}

// ── EditPatientModal ───────────────────────────────────────────────────────────
function EditPatientModal({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientWithCount
  onClose: () => void
  onSaved: (updated: PatientWithCount) => void
}) {
  const { digits: initDigits } = extractPhone(patient.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [phoneDigits, setPhoneDigits] = useState(initDigits)
  const [form, setForm] = useState({
    firstName:         patient.firstName,
    lastName:          patient.lastName,
    email:             patient.email ?? '',
    dateOfBirth:       patient.dateOfBirth ? patient.dateOfBirth.toString().slice(0, 10) : '',
    gender:            patient.gender ?? '',
    bloodType:         patient.bloodType ?? 'UNKNOWN',
    curp:              patient.curp ?? '',
    address:           patient.address ?? '',
    city:              patient.city ?? '',
    state:             patient.state ?? '',
    allergies:         patient.allergies.join(', '),
    chronicConditions: patient.chronicConditions.join(', '),
    currentMedications:patient.currentMedications.join(', '),
    emergencyName:     patient.emergencyName ?? '',
    emergencyPhone:    patient.emergencyPhone ?? '',
    notes:             (patient as any).notes ?? '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (phoneDigits.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.patients.update(patient.id, {
        firstName:          form.firstName.trim(),
        lastName:           form.lastName.trim(),
        phone:              `+52${phoneDigits}`,
        email:              form.email || undefined,
        dateOfBirth:        form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        gender:             form.gender || undefined,
        bloodType:          form.bloodType || 'UNKNOWN',
        curp:               form.curp || undefined,
        address:            form.address || undefined,
        city:               form.city || undefined,
        state:              form.state || undefined,
        allergies:          form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronicConditions:  form.chronicConditions ? form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        currentMedications: form.currentMedications ? form.currentMedications.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyName:      form.emergencyName || undefined,
        emergencyPhone:     form.emergencyPhone || undefined,
        notes:              form.notes || undefined,
      }) as { data: PatientWithCount }
      onSaved(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Editar paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">

          {/* Datos personales */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Nombre(s) *</label>
                <input required value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Apellidos *</label>
                <input required value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>WhatsApp *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600 font-medium select-none">+52</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="5512345678"
                    value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                  <p className="text-xs text-amber-600 mt-0.5">{10 - phoneDigits.length} dígitos restantes</p>
                )}
              </div>
              <div>
                <label className={lbl}>Correo electrónico</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Fecha de nacimiento</label>
                <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Sexo</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                  <option value="">Sin especificar</option>
                  <option value="FEMALE">Femenino</option>
                  <option value="MALE">Masculino</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Grupo sanguíneo</label>
                <select value={form.bloodType} onChange={e => set('bloodType', e.target.value)} className={inp}>
                  {['UNKNOWN','A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG'].map(bt => (
                    <option key={bt} value={bt}>
                      {bt === 'UNKNOWN' ? 'Desconocido' : bt.replace('_POS', '+').replace('_NEG', '-')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>CURP</label>
                <input maxLength={18} value={form.curp} onChange={e => set('curp', e.target.value.toUpperCase())} placeholder="18 caracteres" className={inp} />
              </div>
            </div>
          </section>

          {/* Domicilio */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Domicilio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Dirección</label>
                <input value={form.address} onChange={e => set('address', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Ciudad</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Estado</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} className={inp} />
              </div>
            </div>
          </section>

          {/* Antecedentes médicos */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Antecedentes médicos</h3>
            <div className="space-y-3">
              <div>
                <label className={lbl}>Alergias <span className="font-normal text-gray-400">(separadas por comas)</span></label>
                <input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicilina, Sulfa..." className={inp} />
              </div>
              <div>
                <label className={lbl}>Enfermedades crónicas <span className="font-normal text-gray-400">(separadas por comas)</span></label>
                <input value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} placeholder="Diabetes, Hipertensión..." className={inp} />
              </div>
              <div>
                <label className={lbl}>Medicamentos actuales <span className="font-normal text-gray-400">(separados por comas)</span></label>
                <input value={form.currentMedications} onChange={e => set('currentMedications', e.target.value)} placeholder="Metformina 500mg, Losartán..." className={inp} />
              </div>
              <div>
                <label className={lbl}>Notas internas</label>
                <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inp} resize-none`} placeholder="Observaciones del expediente..." />
              </div>
            </div>
          </section>

          {/* Contacto de emergencia */}
          <section>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contacto de emergencia</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Nombre</label>
                <input value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Teléfono</label>
                <input value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} className={inp} />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface PatientWithCount extends Patient {
  insurances: unknown[]
  _count: { appointments: number; clinicalNotes: number; prescriptions: number; labResults: number }
}

interface Timeline {
  appointments: Appointment[]
  notes: ClinicalNote[]
  prescriptions: Prescription[]
  labResults: LabResult[]
}

type Tab = 'overview' | 'timeline' | 'expediente' | 'recetas' | 'lab'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientWithCount | null>(null)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    loadPatient()
    loadTimeline()
  }, [id])

  async function loadPatient() {
    try {
      const res = await api.patients.get(id) as { data: PatientWithCount }
      setPatient(res.data)
    } catch { router.push('/pacientes') }
    finally { setLoading(false) }
  }

  async function loadTimeline() {
    try {
      const res = await api.patients.timeline(id) as { data: Timeline }
      setTimeline(res.data)
    } catch {}
  }

  if (loading || !patient) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Resumen', icon: <FileText className="w-4 h-4" /> },
    { key: 'timeline', label: 'Historial', icon: <Clock className="w-4 h-4" /> },
    { key: 'expediente', label: 'Expediente', icon: <FileText className="w-4 h-4" /> },
    { key: 'recetas', label: 'Recetas', icon: <Pill className="w-4 h-4" /> },
    { key: 'lab', label: 'Laboratorio', icon: <FlaskConical className="w-4 h-4" /> },
  ]

  return (
    <>
      <Header
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} años · ${patient.gender ? GENDER_LABELS[patient.gender] : ''}` : ''}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              onClick={() => router.push('/pacientes')}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        {/* Patient hero */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 text-xl font-bold shrink-0">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />{patient.phone}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />{patient.email}
                  </span>
                )}
                {patient.dateOfBirth && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />{formatDate(patient.dateOfBirth)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />{BLOOD_TYPE_LABELS[patient.bloodType]}
                </span>
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-red-700 font-medium">
                    Alergias: {patient.allergies.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 shrink-0">
              {[
                { label: 'Citas', value: patient._count.appointments },
                { label: 'Notas', value: patient._count.clinicalNotes },
                { label: 'Recetas', value: patient._count.prescriptions },
                { label: 'Lab', value: patient._count.labResults },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b border-gray-100 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab patient={patient} />}
          {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
          {activeTab === 'expediente' && (
            <NotesTab patientId={id} notes={timeline?.notes ?? []} onRefresh={loadTimeline} />
          )}
          {activeTab === 'recetas' && (
            <PrescriptionsTab patientId={id} prescriptions={timeline?.prescriptions ?? []} />
          )}
          {activeTab === 'lab' && (
            <LabTab patientId={id} results={timeline?.labResults ?? []} onRefresh={loadTimeline} />
          )}
        </div>
      </div>

      {showEdit && patient && (
        <EditPatientModal
          patient={patient}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setPatient(prev => prev ? { ...prev, ...updated } : updated)
            setShowEdit(false)
          }}
        />
      )}
    </>
  )
}

function OverviewTab({ patient }: { patient: PatientWithCount }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Background */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Antecedentes médicos</h3>
        <dl className="space-y-3">
          {[
            { label: 'Alergias', value: patient.allergies.join(', ') || 'Ninguna conocida' },
            { label: 'Enfermedades crónicas', value: patient.chronicConditions.join(', ') || 'Ninguna' },
            { label: 'Medicamentos actuales', value: patient.currentMedications.join(', ') || 'Ninguno' },
            { label: 'Cirugías previas', value: 'Ninguna' },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium text-gray-500">{item.label}</dt>
              <dd className="text-sm text-gray-800 mt-0.5">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Personal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Datos personales</h3>
        <dl className="space-y-3">
          {[
            { label: 'CURP', value: patient.curp || '—' },
            { label: 'Domicilio', value: [patient.address, patient.city, patient.state].filter(Boolean).join(', ') || '—' },
            { label: 'Contacto emergencia', value: patient.emergencyName ? `${patient.emergencyName} (${patient.emergencyPhone})` : '—' },
            { label: 'Registro', value: formatDateTime(patient.createdAt) },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium text-gray-500">{item.label}</dt>
              <dd className="text-sm text-gray-800 mt-0.5">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

function TimelineTab({ timeline }: { timeline: Timeline | null }) {
  if (!timeline) return <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>

  // Merge all events with timestamps
  const events = [
    ...timeline.appointments.map((a) => ({ type: 'appointment' as const, date: new Date(a.startsAt), data: a })),
    ...timeline.notes.map((n) => ({ type: 'note' as const, date: new Date(n.createdAt), data: n })),
    ...timeline.prescriptions.map((p) => ({ type: 'prescription' as const, date: new Date(p.createdAt), data: p })),
    ...timeline.labResults.map((l) => ({ type: 'lab' as const, date: new Date(l.createdAt), data: l })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  if (events.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No hay historial clínico registrado</div>
  }

  const ICONS = {
    appointment: <Calendar className="w-4 h-4 text-blue-600" />,
    note: <FileText className="w-4 h-4 text-green-600" />,
    prescription: <Pill className="w-4 h-4 text-purple-600" />,
    lab: <FlaskConical className="w-4 h-4 text-orange-600" />,
  }

  const LABELS = {
    appointment: 'Cita',
    note: 'Nota clínica',
    prescription: 'Receta',
    lab: 'Resultado de lab',
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={i} className="flex gap-4 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-gray-200 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
            {ICONS[event.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">{LABELS[event.type]}</span>
              <span className="text-xs text-gray-400">{formatRelative(event.date)}</span>
            </div>
            {event.type === 'appointment' && (
              <p className="text-sm text-gray-800 mt-0.5">
                {STATUS_LABELS[(event.data as Appointment).status]}
                {(event.data as Appointment).chiefComplaint && ` · ${(event.data as Appointment).chiefComplaint}`}
              </p>
            )}
            {event.type === 'note' && (
              <p className="text-sm text-gray-800 mt-0.5">
                {(event.data as ClinicalNote).chiefComplaint || 'Nota sin motivo especificado'}
                {' '}
                <span className="text-xs text-gray-400">({(event.data as ClinicalNote).status})</span>
              </p>
            )}
            {event.type === 'prescription' && (
              <p className="text-sm text-gray-800 mt-0.5">
                {(event.data as Prescription).items?.length ?? 0} medicamento(s)
              </p>
            )}
            {event.type === 'lab' && (
              <p className="text-sm text-gray-800 mt-0.5">{(event.data as LabResult).title}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center" />
        </div>
      ))}
    </div>
  )
}

function NotesTab({ patientId, notes, onRefresh }: { patientId: string; notes: ClinicalNote[]; onRefresh: () => void }) {
  const router = useRouter()
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => router.push(`/expedientes/nuevo?patientId=${patientId}`)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Nueva nota
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          No hay notas clínicas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{note.chiefComplaint || 'Sin motivo especificado'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. {note.doctor?.firstName} {note.doctor?.lastName} · {formatDate(note.createdAt)}
                  </p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  note.status === 'SIGNED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                )}>
                  {note.status === 'SIGNED' ? 'Firmada' : 'Borrador'}
                </span>
              </div>
              {note.diagnoses?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {note.diagnoses.map((d: {code: string; description: string}, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {d.code} · {d.description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PrescriptionsTab({ patientId, prescriptions }: { patientId: string; prescriptions: Prescription[] }) {
  return (
    <div>
      {prescriptions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          No hay recetas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-500">
                    Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} · {formatDate(rx.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {rx.pdfUrl && (
                    <a href={rx.pdfUrl} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline">
                      Ver PDF
                    </a>
                  )}
                  {rx.sentViaWhatsApp && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Enviada</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {rx.items?.map((item, i) => (
                  <p key={i} className="text-sm text-gray-800">
                    <span className="font-medium">{item.medicationName}</span>
                    {' '}<span className="text-gray-500">{item.dose} · {item.frequency} · {item.duration}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LabTab({ patientId, results, onRefresh }: { patientId: string; results: LabResult[]; onRefresh: () => void }) {
  return (
    <div>
      {results.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border border-gray-100">
          No hay resultados de laboratorio
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <FlaskConical className="w-8 h-8 text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500">{r.laboratoryName} · {formatDate(r.createdAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  r.status === 'NOTIFIED' ? 'bg-green-100 text-green-700' :
                  r.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' :
                  r.status === 'RECEIVED' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {r.status === 'NOTIFIED' ? 'Notificado' :
                   r.status === 'REVIEWED' ? 'Revisado' :
                   r.status === 'RECEIVED' ? 'Recibido' : 'Pendiente'}
                </span>
                {(r.fileUrl || r.externalUrl) && (
                  <a href={r.fileUrl ?? r.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-blue-600 hover:underline">
                    Ver
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
