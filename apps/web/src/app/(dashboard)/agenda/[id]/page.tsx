'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import {
  ArrowLeft, User, Phone, Calendar, Clock, Stethoscope,
  MapPin, FileText, ReceiptText, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ClipboardList,
} from 'lucide-react'

// ── Tipos ────────────────────────────────────────────────────────
type AppointmentStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN'
  | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED:   'Agendada',
  CONFIRMED:   'Confirmada',
  CHECKED_IN:  'Check-in',
  IN_PROGRESS: 'En consulta',
  COMPLETED:   'Completada',
  CANCELLED:   'Cancelada',
  NO_SHOW:     'No asistió',
}

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-700',
  CONFIRMED:   'bg-green-100 text-green-700',
  CHECKED_IN:  'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED:   'bg-gray-100 text-gray-600',
  CANCELLED:   'bg-red-100 text-red-700',
  NO_SHOW:     'bg-red-100 text-red-700',
}

const MODE_LABEL: Record<string, string> = {
  IN_PERSON:   'Presencial',
  TELEMEDICINE:'Telemedicina',
  HOME_VISIT:  'Visita a domicilio',
}

// ── Acciones disponibles por status ─────────────────────────────
type Action = {
  label: string
  nextStatus: AppointmentStatus
  style: string
  icon: React.ReactNode
}

function getActions(status: AppointmentStatus): Action[] {
  switch (status) {
    case 'SCHEDULED':
      return [
        { label: 'Confirmar cita', nextStatus: 'CONFIRMED',   style: 'bg-green-600 hover:bg-green-700 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Cancelar',       nextStatus: 'CANCELLED',   style: 'border border-red-300 text-red-600 hover:bg-red-50', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'CONFIRMED':
      return [
        { label: 'Registrar llegada', nextStatus: 'CHECKED_IN', style: 'bg-yellow-500 hover:bg-yellow-600 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Cancelar',          nextStatus: 'CANCELLED',  style: 'border border-red-300 text-red-600 hover:bg-red-50', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'CHECKED_IN':
      return [
        { label: 'Iniciar consulta', nextStatus: 'IN_PROGRESS', style: 'bg-orange-500 hover:bg-orange-600 text-white', icon: <Stethoscope className="w-4 h-4" /> },
        { label: 'Cancelar',         nextStatus: 'CANCELLED',   style: 'border border-red-300 text-red-600 hover:bg-red-50', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'IN_PROGRESS':
      return [
        { label: 'Completar consulta', nextStatus: 'COMPLETED', style: 'bg-blue-600 hover:bg-blue-700 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'No asistió',         nextStatus: 'NO_SHOW',   style: 'border border-gray-300 text-gray-600 hover:bg-gray-50', icon: <AlertTriangle className="w-4 h-4" /> },
      ]
    default:
      return []
  }
}

// ── Página ───────────────────────────────────────────────────────
export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [appt, setAppt] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    try {
      const res = await api.appointments.get(id) as { data: any }
      setAppt(res.data)
    } catch {
      setError('No se pudo cargar la cita')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(nextStatus: AppointmentStatus) {
    if (nextStatus === 'CANCELLED' && !showCancelForm) {
      setShowCancelForm(true)
      return
    }
    setActionLoading(nextStatus)
    setError('')
    try {
      await api.appointments.update(id, {
        status: nextStatus,
        ...(nextStatus === 'CANCELLED' && cancelReason ? { cancellationReason: cancelReason } : {}),
      })
      await load()
      setShowCancelForm(false)
      setCancelReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la cita')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Detalle de cita" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </>
    )
  }

  if (error && !appt) {
    return (
      <>
        <Header title="Detalle de cita" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-500">{error}</p>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm">
            ← Volver a la agenda
          </button>
        </div>
      </>
    )
  }

  const status = appt.status as AppointmentStatus
  const actions = getActions(status)
  const patient = appt.patient
  const doctor  = appt.doctor
  const start   = new Date(appt.startsAt)
  const end     = new Date(appt.endsAt)
  const durationMins = Math.round((end.getTime() - start.getTime()) / 60_000)

  const isFinal = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status)

  return (
    <>
      <Header
        title="Detalle de cita"
        subtitle={patient ? `${patient.firstName} ${patient.lastName}` : ''}
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Back + Status */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/agenda')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Agenda
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {/* ── Paciente ── */}
          <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">
                    {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                  </p>
                  {patient?.phone && (
                    <a href={`tel:${patient.phone}`}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mt-0.5">
                      <Phone className="w-3 h-3" /> {patient.phone}
                    </a>
                  )}
                </div>
              </div>
              {patient?.id && (
                <button
                  onClick={() => router.push(`/pacientes/${patient.id}`)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0">
                  Ver expediente
                </button>
              )}
            </div>
          </div>

          {/* ── Detalles de la cita ── */}
          <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Información de la cita</h3>

            <div className="grid grid-cols-2 gap-4">
              <Detail icon={<Calendar className="w-4 h-4 text-blue-500" />} label="Fecha">
                {formatDate(appt.startsAt, 'EEEE d MMM yyyy')}
              </Detail>
              <Detail icon={<Clock className="w-4 h-4 text-blue-500" />} label="Horario">
                {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
                <span className="text-xs text-gray-400 ml-1">({durationMins} min)</span>
              </Detail>
              <Detail icon={<Stethoscope className="w-4 h-4 text-blue-500" />} label="Doctor">
                {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '—'}
                {doctor?.specialty && <span className="block text-xs text-gray-400">{doctor.specialty}</span>}
              </Detail>
              <Detail icon={<MapPin className="w-4 h-4 text-blue-500" />} label="Modalidad">
                {MODE_LABEL[appt.mode] ?? appt.mode}
              </Detail>
              {appt.appointmentType && (
                <Detail icon={<ClipboardList className="w-4 h-4 text-blue-500" />} label="Tipo">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: appt.appointmentType.color }} />
                    {appt.appointmentType.name}
                  </span>
                </Detail>
              )}
              {appt.chiefComplaint && (
                <Detail icon={<FileText className="w-4 h-4 text-blue-500" />} label="Motivo">
                  {appt.chiefComplaint}
                </Detail>
              )}
            </div>

            {appt.cancellationReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                <span className="font-medium">Motivo de cancelación:</span> {appt.cancellationReason}
              </div>
            )}
            {appt.internalNotes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                <span className="font-medium">Notas internas:</span> {appt.internalNotes}
              </div>
            )}
          </div>

          {/* ── Nota clínica & Factura ── */}
          {(appt.clinicalNote || appt.invoice) && (
            <div className="grid grid-cols-2 gap-3">
              {appt.clinicalNote && (
                <button onClick={() => router.push(`/expediente/${appt.clinicalNote.id}`)}
                  className="bg-white rounded-xl border border-gray-300 shadow-sm p-4 flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Nota clínica</p>
                    <p className="text-xs text-gray-400 capitalize">{appt.clinicalNote.status?.toLowerCase()}</p>
                  </div>
                </button>
              )}
              {appt.invoice && (
                <button onClick={() => router.push(`/cobros`)}
                  className="bg-white rounded-xl border border-gray-300 shadow-sm p-4 flex items-center gap-3 hover:border-green-300 hover:bg-green-50 transition-colors text-left">
                  <ReceiptText className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Factura</p>
                    <p className="text-xs text-gray-400">
                      {appt.invoice.status} · ${appt.invoice.total?.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ── Acciones ── */}
          {!isFinal && (
            <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acciones</h3>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              {showCancelForm && (
                <div className="space-y-2">
                  <label className="block text-sm text-gray-700 font-medium">Motivo de cancelación</label>
                  <input type="text" value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Ej. Paciente canceló por viaje..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancelForm(false)}
                      className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                      Atrás
                    </button>
                    <button onClick={() => handleAction('CANCELLED')}
                      disabled={!!actionLoading}
                      className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionLoading === 'CANCELLED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirmar cancelación
                    </button>
                  </div>
                </div>
              )}

              {!showCancelForm && (
                <div className="flex gap-2 flex-wrap">
                  {actions.map(action => (
                    <button key={action.nextStatus}
                      onClick={() => handleAction(action.nextStatus)}
                      disabled={!!actionLoading}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}>
                      {actionLoading === action.nextStatus
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isFinal && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">Esta cita está cerrada</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ── Componente auxiliar ──────────────────────────────────────────
function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <div className="text-sm text-gray-900 mt-0.5">{children}</div>
      </div>
    </div>
  )
}
