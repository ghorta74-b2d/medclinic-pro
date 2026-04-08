'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { formatDate, formatDateTime, formatRelative, getInitials, calculateAge, formatCurrency } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, Calendar, Droplets, AlertTriangle,
  FileText, Pill, FlaskConical, CreditCard, ChevronRight, Clock,
} from 'lucide-react'
import type { Patient, ClinicalNote, Appointment, Prescription, LabResult } from 'medclinic-shared'
import { GENDER_LABELS, BLOOD_TYPE_LABELS, STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'

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
          <button
            onClick={() => router.push('/pacientes')}
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
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
