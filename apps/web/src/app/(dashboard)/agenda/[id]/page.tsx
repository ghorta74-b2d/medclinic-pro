'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, sessionCache, getOwnDoctorId, getUserRole } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import {
  ArrowLeft, User, Phone, Calendar, Clock, Stethoscope,
  MapPin, FileText, ReceiptText, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ClipboardList, UserCheck, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  SCHEDULED:   'bg-primary/15 text-primary',
  CONFIRMED:   'bg-success/15 text-success',
  CHECKED_IN:  'bg-warning/15 text-warning',
  IN_PROGRESS: 'bg-warning/15 text-warning',
  COMPLETED:   'bg-muted text-muted-foreground',
  CANCELLED:   'bg-destructive/15 text-destructive',
  NO_SHOW:     'bg-destructive/15 text-destructive',
}

const MODE_LABEL: Record<string, string> = {
  IN_PERSON:   'Presencial',
  TELEMEDICINE:'Telemedicina',
  HOME_VISIT:  'Visita a domicilio',
}

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
        { label: 'Confirmar cita', nextStatus: 'CONFIRMED',   style: 'bg-success hover:bg-success/90 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Cancelar',       nextStatus: 'CANCELLED',   style: 'border border-red-300 text-destructive hover:bg-destructive/10', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'CONFIRMED':
      return [
        { label: 'Registrar llegada', nextStatus: 'CHECKED_IN', style: 'bg-warning hover:bg-warning/90 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'Cancelar',          nextStatus: 'CANCELLED',  style: 'border border-red-300 text-destructive hover:bg-destructive/10', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'CHECKED_IN':
      return [
        { label: 'Iniciar consulta', nextStatus: 'IN_PROGRESS', style: 'bg-warning hover:bg-warning/90 text-white', icon: <Stethoscope className="w-4 h-4" /> },
        { label: 'Cancelar',         nextStatus: 'CANCELLED',   style: 'border border-red-300 text-destructive hover:bg-destructive/10', icon: <XCircle className="w-4 h-4" /> },
      ]
    case 'IN_PROGRESS':
      return [
        { label: 'Completar consulta', nextStatus: 'COMPLETED', style: 'bg-primary hover:bg-primary/90 text-white', icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: 'No asistió',         nextStatus: 'NO_SHOW',   style: 'border border-border text-muted-foreground hover:bg-muted/50', icon: <AlertTriangle className="w-4 h-4" /> },
      ]
    default:
      return []
  }
}

// ── Subcomponent: Reassign panel (ADMIN only) ───────────────────
function ReassignPanel({
  appt,
  clinicDoctors,
  onReassigned,
}: {
  appt: any
  clinicDoctors: { id: string; firstName: string; lastName: string; specialty?: string | null }[]
  onReassigned: () => void
}) {
  const [open, setOpen] = useState(false)
  const [newDoctorId, setNewDoctorId] = useState('')
  const [newDate, setNewDate] = useState(new Date(appt.startsAt).toLocaleDateString('sv-SE'))
  const [slots, setSlots] = useState<{ startsAt: string; endsAt: string; available: boolean }[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ startsAt: string; endsAt: string } | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const otherDoctors = clinicDoctors.filter(d => d.id !== appt.doctorId)

  async function loadSlots(doctorId: string, date: string) {
    if (!doctorId || !date) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const res = await api.appointments.availability(doctorId, date) as { data: typeof slots }
      setSlots(res.data.filter(s => s.available))
    } catch { setSlots([]) }
    finally { setLoadingSlots(false) }
  }

  useEffect(() => {
    if (newDoctorId && newDate) loadSlots(newDoctorId, newDate)
  }, [newDoctorId, newDate])

  async function handleReassign() {
    if (!newDoctorId) { setError('Selecciona un médico'); return }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string> = { doctorId: newDoctorId }
      if (selectedSlot) {
        body['startsAt'] = selectedSlot.startsAt
        body['endsAt'] = selectedSlot.endsAt
      }
      await api.appointments.update(appt.id, body)
      setOpen(false)
      onReassigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reasignar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted/50 hover:border-border transition-colors">
        <RefreshCw className="w-4 h-4" />
        Reasignar cita
      </button>
    )
  }

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Reasignar a otro médico</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground/80 text-xs">Cancelar</button>
      </div>

      {/* Doctor selector */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Médico</label>
        <select
          value={newDoctorId}
          onChange={e => setNewDoctorId(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">Seleccionar médico...</option>
          {otherDoctors.map(d => (
            <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}{d.specialty ? ` · ${d.specialty}` : ''}</option>
          ))}
        </select>
      </div>

      {/* Date for new slot */}
      {newDoctorId && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Available slots */}
      {newDoctorId && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">
            Horario <span className="font-normal text-muted-foreground">(opcional — si no seleccionas, se mantiene el horario actual)</span>
          </label>
          {loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando disponibilidad...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay slots disponibles para esa fecha</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {slots.map(s => {
                const isSelected = selectedSlot?.startsAt === s.startsAt
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    onClick={() => setSelectedSlot(isSelected ? null : s)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                      isSelected
                        ? 'bg-primary text-white border-primary'
                        : 'bg-card text-foreground/80 border-border hover:border-primary'
                    )}>
                    {formatTime(s.startsAt)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={handleReassign}
        disabled={!newDoctorId || saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {saving ? 'Reasignando...' : 'Confirmar reasignación'}
      </button>
    </div>
  )
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
  const [showTakeoverModal, setShowTakeoverModal] = useState(false)
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const [error, setError] = useState('')

  // Current user info (role-aware behavior)
  const [userRole, setUserRole] = useState<string | null>(() => sessionCache.getRole())
  const [ownDoctorId, setOwnDoctorId] = useState<string | null>(() => sessionCache.getDoctorId())
  const [roleReady, setRoleReady] = useState<boolean>(() => !!sessionCache.getRole())
  const [clinicDoctors, setClinicDoctors] = useState<{ id: string; firstName: string; lastName: string; specialty?: string | null }[]>([])

  useEffect(() => {
    load()
    // Resolve role and doctorId synchronously from cache, then async from JWT
    const cachedRole = sessionCache.getRole()
    const cachedDid  = sessionCache.getDoctorId()

    if (cachedRole) {
      setUserRole(cachedRole)
      setRoleReady(true)
    }
    if (cachedDid) {
      setOwnDoctorId(cachedDid)
    }

    // Always re-derive from JWT in background to keep cache warm
    getUserRole().then(r => {
      if (r) {
        sessionCache.setRole(r)
        setUserRole(r)
        setRoleReady(true)
      }
    })
    getOwnDoctorId().then(myId => {
      if (myId) {
        // STAFF has no personal appointment ownership — don't pollute their cache
        const role = sessionCache.getRole()
        if (role !== 'STAFF') sessionCache.setDoctorId(myId)
        setOwnDoctorId(myId)
      }
    })
  }, [id])

  // Load clinic doctors for ADMIN / STAFF reassignment
  useEffect(() => {
    const role = sessionCache.getRole()
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'STAFF') {
      api.configuracion.doctors().then((res: unknown) => {
        setClinicDoctors((res as { data: { id: string; firstName: string; lastName: string; specialty?: string | null }[] }).data ?? [])
      }).catch(() => {})
    }
  }, [userRole])

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

    // Feature 1: Navigate to patient expediente with new consulta open on IN_PROGRESS
    if (nextStatus === 'IN_PROGRESS') {
      const isOwnAppt = appt?.doctorId === ownDoctorId
      const role = userRole ?? sessionCache.getRole()

      // Feature 2: Takeover — ADMIN viewing another doctor's appointment
      if (!isOwnAppt && (role === 'ADMIN' || role === 'SUPER_ADMIN')) {
        setShowTakeoverModal(true)
        return
      }

      // Own appointment → start consultation + go to expediente
      setActionLoading(nextStatus)
      setError('')
      try {
        await api.appointments.update(id, { status: 'IN_PROGRESS' })
        if (appt?.patient?.id) {
          sessionStorage.setItem('_open_new_consulta', id)
          router.push(`/pacientes/${appt.patient.id}`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al iniciar consulta')
        setActionLoading(null)
      }
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

  async function handleTakeover() {
    setTakeoverLoading(true)
    setError('')
    try {
      await api.appointments.update(id, { takeover: true })
      setShowTakeoverModal(false)
      if (appt?.patient?.id) {
        sessionStorage.setItem('_open_new_consulta', id)
        router.push(`/pacientes/${appt.patient.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al tomar la cita')
      setShowTakeoverModal(false)
    } finally {
      setTakeoverLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Detalle de cita" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </>
    )
  }

  if (error && !appt) {
    return (
      <>
        <Header title="Detalle de cita" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => router.back()} className="text-primary hover:underline text-sm">
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
  const role = userRole ?? sessionCache.getRole()
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  // STAFF can also reassign appointments (they manage the clinic schedule)
  const canReassign = isAdmin || role === 'STAFF'
  // Conservative: if ownDoctorId is null (SUPER_ADMIN/STAFF or not yet loaded),
  // this is never "your own" appointment — always require takeover confirmation.
  const isOwnAppt = ownDoctorId !== null && appt.doctorId === ownDoctorId

  return (
    <>
      <Header
        title="Detalle de cita"
        subtitle={patient ? `${patient.firstName} ${patient.lastName}` : ''}
      />

      {/* Takeover modal */}
      {showTakeoverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-warning/15 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cita de otro médico</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta cita está asignada a <strong>Dr. {doctor?.firstName} {doctor?.lastName}</strong>.
                  Se notificará al doctor y quedará registrado en el log.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTakeoverModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/50">
                Cancelar
              </button>
              <button
                onClick={handleTakeover}
                disabled={takeoverLoading}
                className="flex-1 py-2.5 bg-warning hover:bg-warning/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                {takeoverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Atender paciente
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* Back + Status */}
          <div className="flex items-center justify-between">
            <button onClick={() => router.push('/agenda')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Agenda
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {/* ── Paciente ── */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">
                    {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                  </p>
                  {patient?.phone && (
                    <a href={`tel:${patient.phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-0.5">
                      <Phone className="w-3 h-3" /> {patient.phone}
                    </a>
                  )}
                </div>
              </div>
              {patient?.id && (
                <button
                  onClick={() => router.push(`/pacientes/${patient.id}`)}
                  className="text-xs text-primary hover:text-primary font-medium border border-primary px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0">
                  Ver expediente
                </button>
              )}
            </div>
          </div>

          {/* ── Detalles de la cita ── */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Información de la cita</h3>

            <div className="grid grid-cols-2 gap-4">
              <Detail icon={<Calendar className="w-4 h-4 text-primary" />} label="Fecha">
                {formatDate(appt.startsAt, 'EEEE d MMM yyyy')}
              </Detail>
              <Detail icon={<Clock className="w-4 h-4 text-primary" />} label="Horario">
                {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
                <span className="text-xs text-muted-foreground ml-1">({durationMins} min)</span>
              </Detail>
              <Detail icon={<Stethoscope className="w-4 h-4 text-primary" />} label="Doctor">
                {doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : '—'}
                {doctor?.specialty && <span className="block text-xs text-muted-foreground">{doctor.specialty}</span>}
                {isAdmin && !isOwnAppt && (
                  <span className="block text-xs text-warning font-medium mt-0.5">Asignado a otro médico</span>
                )}
              </Detail>
              <Detail icon={<MapPin className="w-4 h-4 text-primary" />} label="Modalidad">
                {MODE_LABEL[appt.mode] ?? appt.mode}
              </Detail>
              {appt.appointmentType && (
                <Detail icon={<ClipboardList className="w-4 h-4 text-primary" />} label="Tipo">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: appt.appointmentType.color }} />
                    {appt.appointmentType.name}
                  </span>
                </Detail>
              )}
              {appt.chiefComplaint && (
                <Detail icon={<FileText className="w-4 h-4 text-primary" />} label="Motivo">
                  {appt.chiefComplaint}
                </Detail>
              )}
            </div>

            {appt.cancellationReason && (
              <div className="bg-destructive/10 border border-red-200 rounded-lg px-3 py-2 text-sm text-destructive">
                <span className="font-medium">Motivo de cancelación:</span> {appt.cancellationReason}
              </div>
            )}
            {appt.internalNotes && (
              <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground/80">
                <span className="font-medium">Notas internas:</span> {appt.internalNotes}
              </div>
            )}
          </div>

          {/* ── Nota clínica & Factura ── */}
          {(appt.clinicalNote || appt.invoice) && (
            <div className="grid grid-cols-2 gap-3">
              {appt.clinicalNote && (
                <button onClick={() => router.push(`/expediente/${appt.clinicalNote.id}`)}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-primary hover:bg-primary/10 transition-colors text-left">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Nota clínica</p>
                    <p className="text-xs text-muted-foreground capitalize">{appt.clinicalNote.status?.toLowerCase()}</p>
                  </div>
                </button>
              )}
              {appt.invoice && (
                <button onClick={() => router.push(`/cobros`)}
                  className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 hover:border-success hover:bg-success/10 transition-colors text-left">
                  <ReceiptText className="w-5 h-5 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Factura</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.invoice.status} · ${appt.invoice.total?.toLocaleString('es-MX')} MXN
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ── Acciones ── */}
          {!isFinal && (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Acciones</h3>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              {showCancelForm && (
                <div className="space-y-2">
                  <label className="block text-sm text-foreground/80 font-medium">Motivo de cancelación</label>
                  <input type="text" value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Ej. Paciente canceló por viaje..."
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-destructive" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancelForm(false)}
                      className="flex-1 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted/50">
                      Atrás
                    </button>
                    <button onClick={() => handleAction('CANCELLED')}
                      disabled={!!actionLoading}
                      className="flex-1 py-2 text-sm bg-destructive hover:bg-destructive/90 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionLoading === 'CANCELLED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirmar cancelación
                    </button>
                  </div>
                </div>
              )}

              {!showCancelForm && (
                <div className="flex gap-2 flex-wrap">
                  {/* Wait for role to load before rendering sensitive action buttons */}
                  {!roleReady ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cargando...
                    </div>
                  ) : status === 'CHECKED_IN' && isAdmin && !isOwnAppt ? (
                    /* ADMIN/SUPER_ADMIN viewing another doctor's CHECKED_IN appointment */
                    <>
                      <button
                        onClick={() => setShowTakeoverModal(true)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-warning hover:bg-warning/90 text-white transition-colors disabled:opacity-50">
                        <UserCheck className="w-4 h-4" />
                        Atender cita
                      </button>
                      <button
                        onClick={() => handleAction('CANCELLED')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-300 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    actions.map(action => (
                      <button key={action.nextStatus}
                        onClick={() => handleAction(action.nextStatus)}
                        disabled={!!actionLoading}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}>
                        {actionLoading === action.nextStatus
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : action.icon}
                        {action.label}
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Feature 3: ADMIN / STAFF can reassign appointment */}
              {canReassign && !showCancelForm && (
                <div className="pt-2 border-t border-border">
                  <ReassignPanel
                    appt={appt}
                    clinicDoctors={clinicDoctors}
                    onReassigned={load}
                  />
                </div>
              )}
            </div>
          )}

          {isFinal && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Esta cita está cerrada</p>
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
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <div className="text-sm text-foreground mt-0.5">{children}</div>
      </div>
    </div>
  )
}
