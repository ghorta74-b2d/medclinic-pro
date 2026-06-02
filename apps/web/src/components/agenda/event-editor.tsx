'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, CalendarClock, Ban, Check, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, localDateStr } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  STATUS_LABELS,
  BLOCK_REASON_LABELS,
  type AppointmentStatus,
  type AppointmentMode,
  type BlockReason,
} from 'medclinic-shared'
import { getComplaints, type AgendaItem } from './lib'

const MODE_LABELS: Record<AppointmentMode, string> = {
  IN_PERSON: 'Presencial',
  TELEMEDICINE: 'Telemedicina',
  HOME_VISIT: 'Visita a domicilio',
}
const MODE_OPTIONS: AppointmentMode[] = ['IN_PERSON', 'TELEMEDICINE', 'HOME_VISIT']

interface EditorDoctor {
  id: string
  firstName: string
  lastName: string
  specialty?: string
}

interface PatientHit {
  id: string
  firstName: string
  lastName: string
  phone: string
}

export interface EditorTarget {
  mode: 'create' | 'edit'
  kind: 'appointment' | 'block'
  start: Date
  end: Date
  item?: AgendaItem
}

interface EventEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: EditorTarget | null
  doctors: EditorDoctor[]
  /** Médico forzado (filtro por médico o rol DOCTOR). Si existe, no se puede cambiar al crear. */
  lockedDoctorId: string | null
  /** ADMIN/STAFF: puede reasignar una cita a otro médico (al editar). */
  canReassign: boolean
  onSaved: () => void
}

function timeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW',
]
const REASON_OPTIONS: BlockReason[] = ['VACATION', 'MEAL', 'PERSONAL', 'OTHER']
// Estados en los que aún tiene sentido "Confirmar"
const CONFIRMABLE = new Set<AppointmentStatus>(['SCHEDULED'])

type PatientMode = 'search' | 'new'

export function EventEditor({ open, onOpenChange, target, doctors, lockedDoctorId, canReassign, onSaved }: EventEditorProps) {
  const isDesktop = useIsDesktop()
  const router = useRouter()
  const { toast } = useToast()
  const doctorRef = useRef<HTMLSelectElement>(null)

  const [kind, setKind] = useState<'appointment' | 'block'>('appointment')
  const [doctorId, setDoctorId] = useState('')
  const [origDoctorId, setOrigDoctorId] = useState('')
  const [mode, setMode] = useState<AppointmentMode>('IN_PERSON')
  const [dateStr, setDateStr] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('09:30')

  // Paciente
  const [patientMode, setPatientMode] = useState<PatientMode>('search')
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<PatientHit[]>([])
  const [newFirst, setNewFirst] = useState('')
  const [newLast, setNewLast] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // Cita
  const [chief, setChief] = useState('')
  const [motivoOther, setMotivoOther] = useState(false)
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED')

  // Bloqueo
  const [reason, setReason] = useState<BlockReason>('OTHER')
  const [note, setNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = target?.mode === 'edit'

  // Inicializar al abrir / cambiar target
  useEffect(() => {
    if (!open || !target) return
    setError(null)
    setKind(target.kind)
    // En edición usamos el médico real de la cita (para poder reasignar);
    // al crear, el médico filtrado/propio.
    setDoctorId(target.item?.doctorId ?? lockedDoctorId ?? '')
    setOrigDoctorId(target.item?.doctorId ?? '')
    setDateStr(localDateStr(target.start))
    setStartTime(timeStr(target.start))
    setEndTime(timeStr(target.end))
    setPatientMode('search')
    setPatientSearch('')
    setPatients([])
    setNewFirst(''); setNewLast(''); setNewPhone('')

    if (target.kind === 'appointment') {
      const a = target.item?.appointment
      setPatientId(a?.patientId ?? '')
      setPatientName(a?.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '')
      const cc = a?.chiefComplaint ?? ''
      setChief(cc)
      setMotivoOther(cc !== '' && !getComplaints(a?.doctor?.specialty).includes(cc))
      setStatus((a?.status as AppointmentStatus) ?? 'SCHEDULED')
      setMode((a?.mode as AppointmentMode) ?? 'IN_PERSON')
    } else {
      const b = target.item?.block
      setReason(b?.reason ?? 'OTHER')
      setNote(b?.note ?? '')
    }
  }, [open, target, lockedDoctorId])

  // Búsqueda de pacientes
  useEffect(() => {
    if (kind !== 'appointment' || patientMode !== 'search' || patientSearch.trim().length < 2) {
      setPatients([]); return
    }
    let cancelled = false
    const t = setTimeout(() => {
      api.patients.list({ q: patientSearch, limit: '8' })
        .then((res) => { if (!cancelled) setPatients((res as { data: PatientHit[] }).data ?? []) })
        .catch(() => {})
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [patientSearch, kind, patientMode])

  // Foco inicial en médico (campo obligatorio en "Todos los médicos")
  useEffect(() => {
    if (open && !lockedDoctorId && !isEdit) {
      const id = setTimeout(() => doctorRef.current?.focus(), 80)
      return () => clearTimeout(id)
    }
  }, [open, lockedDoctorId, isEdit])

  function composeRange(): { startsAt: string; endsAt: string } | null {
    const start = new Date(`${dateStr}T${startTime}:00`)
    const end = new Date(`${dateStr}T${endTime}:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null
    return { startsAt: start.toISOString(), endsAt: end.toISOString() }
  }

  // El médico es editable al crear (sin filtro) o al editar una cita si el rol
  // puede reasignar. Editarlo en una cita existente dispara la reasignación.
  const doctorEditable =
    (!isEdit && !lockedDoctorId) ||
    (isEdit && kind === 'appointment' && canReassign)
  const effectiveDoctor = doctorEditable ? doctorId : (lockedDoctorId ?? doctorId)
  const isReassigning = isEdit && kind === 'appointment' && origDoctorId !== '' && doctorId !== origDoctorId
  const selectedDoctor = doctors.find((d) => d.id === effectiveDoctor)
  const complaints = getComplaints(selectedDoctor?.specialty)

  /** Resuelve el patientId: si es paciente nuevo, lo crea primero. */
  async function resolvePatientId(): Promise<string | null> {
    if (patientMode === 'search') {
      if (!patientId) { setError('Selecciona el paciente.'); return null }
      return patientId
    }
    const first = newFirst.trim()
    const last = newLast.trim()
    const digits = newPhone.replace(/\D/g, '')
    if (!first || !last) { setError('Captura nombre y apellido del paciente.'); return null }
    if (digits.length !== 10) { setError('El teléfono debe tener 10 dígitos.'); return null }
    const res = (await api.patients.create({
      firstName: first, lastName: last, phone: `+52${digits}`,
    })) as { data: { id: string } }
    return res.data.id
  }

  async function handleSave() {
    setError(null)
    if (!effectiveDoctor) { setError('Selecciona el médico.'); doctorRef.current?.focus(); return }
    const range = composeRange()
    if (!range) { setError('La hora de fin debe ser posterior a la de inicio.'); return }
    // No permitir agendar en horarios que ya pasaron (solo al crear)
    if (!isEdit && new Date(range.startsAt).getTime() < Date.now()) {
      setError('No se pueden agendar citas en un horario que ya pasó.')
      return
    }

    setSaving(true)
    try {
      if (kind === 'appointment') {
        if (isEdit && target?.item) {
          await api.appointments.update(target.item.id, {
            doctorId: effectiveDoctor,
            startsAt: range.startsAt,
            endsAt: range.endsAt,
            chiefComplaint: chief || undefined,
            mode,
            status,
          })
        } else {
          const pid = await resolvePatientId()
          if (!pid) { setSaving(false); return }
          await api.appointments.create({
            patientId: pid,
            doctorId: effectiveDoctor,
            startsAt: range.startsAt,
            endsAt: range.endsAt,
            chiefComplaint: chief || undefined,
            mode,
          })
        }
      } else {
        if (isEdit && target?.item) {
          await api.blocks.update(target.item.id, {
            startsAt: range.startsAt, endsAt: range.endsAt, reason, note: note || undefined,
          })
        } else {
          await api.blocks.create({
            doctorId: effectiveDoctor, startsAt: range.startsAt, endsAt: range.endsAt, reason, note: note || undefined,
          })
        }
      }
      toast({
        variant: 'success',
        title: kind === 'block'
          ? 'Bloqueo guardado'
          : isReassigning ? 'Cita reasignada' : 'Cita guardada',
        description: isReassigning ? 'Se notificó a ambos médicos.' : undefined,
      })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    if (!target?.item) return
    setSaving(true)
    setError(null)
    try {
      await api.appointments.update(target.item.id, { status: 'CONFIRMED' })
      toast({ variant: 'success', title: 'Cita confirmada' })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar.')
    } finally { setSaving(false) }
  }

  async function handleCancelAppointment() {
    if (!target?.item) return
    setSaving(true)
    try {
      await api.appointments.update(target.item.id, { status: 'CANCELLED', cancellationReason: 'Cancelada desde la agenda' })
      toast({ title: 'Cita cancelada' })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar.')
    } finally { setSaving(false) }
  }

  async function handleDeleteBlock() {
    if (!target?.item) return
    setSaving(true)
    try {
      await api.blocks.remove(target.item.id)
      toast({ title: 'Bloqueo eliminado' })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar.')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const labelCls = 'mb-1 block text-xs font-medium text-muted-foreground'

  const title = isEdit
    ? kind === 'appointment' ? 'Editar cita' : 'Editar bloqueo'
    : 'Nueva cita'

  const body = (
    <div className="space-y-3">
      {/* Toggle Cita / Bloqueo (solo al crear) */}
      {!isEdit && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['appointment', 'block'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                kind === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {k === 'appointment' ? <CalendarClock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              {k === 'appointment' ? 'Cita' : 'Bloqueo'}
            </button>
          ))}
        </div>
      )}

      {/* Médico — obligatorio. Editable al reasignar (edición de cita). */}
      <div>
        <label className={labelCls}>{isEdit && kind === 'appointment' && canReassign ? 'Médico (reasignar)' : 'Médico *'}</label>
        {doctorEditable ? (
          <select ref={doctorRef} value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
            <option value="">Selecciona un médico…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
            ))}
          </select>
        ) : (
          <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {(() => {
              const d = doctors.find((x) => x.id === effectiveDoctor)
              return d ? `Dr. ${d.firstName} ${d.lastName}` : 'Médico asignado'
            })()}
          </div>
        )}
        {isReassigning && (
          <p className="mt-1 text-xs text-warning">Al guardar se reasigna la cita y se notifica a ambos médicos.</p>
        )}
      </div>

      {/* Paciente (cita) */}
      {kind === 'appointment' && (
        <div className="relative">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Paciente *</label>
            {!isEdit && !patientName && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setPatientMode('search'); setError(null) }}
                  className={cn('rounded px-1.5 py-0.5', patientMode === 'search' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => { setPatientMode('new'); setError(null) }}
                  className={cn('rounded px-1.5 py-0.5', patientMode === 'new' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
                >
                  + Nuevo
                </button>
              </div>
            )}
          </div>

          {patientName ? (
            <div className="flex items-center justify-between rounded-md border border-input bg-surface px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{patientName}</span>
              {!isEdit && (
                <button type="button" onClick={() => { setPatientId(''); setPatientName('') }} className="text-xs text-primary hover:underline">
                  Cambiar
                </button>
              )}
            </div>
          ) : patientMode === 'search' ? (
            <>
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Buscar por nombre…"
                className={inputCls}
              />
              {patients.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
                  {patients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setPatientId(p.id); setPatientName(`${p.firstName} ${p.lastName}`); setPatients([]); setPatientSearch('') }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>{p.firstName} {p.lastName}</span>
                      <span className="text-xs text-muted-foreground">{p.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="Nombre" className={inputCls} />
              <input value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Apellido" className={inputCls} />
              <div className="col-span-2 flex items-center rounded-md border border-input bg-surface px-3 focus-within:ring-2 focus-within:ring-primary">
                <span className="text-sm text-muted-foreground">+52</span>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  placeholder="10 dígitos"
                  className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fecha + horas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1">
          <label className={labelCls}>Fecha</label>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Inicio</label>
          <input type="time" step={1800} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Fin</label>
          <input type="time" step={1800} value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Campos específicos de cita */}
      {kind === 'appointment' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Modalidad</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as AppointmentMode)} className={inputCls}>
                {MODE_OPTIONS.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className={labelCls}>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Motivo de consulta</label>
            {motivoOther ? (
              <div className="space-y-1">
                <input autoFocus value={chief} onChange={(e) => setChief(e.target.value)} placeholder="Escribe el motivo" className={inputCls} />
                <button type="button" onClick={() => { setMotivoOther(false); setChief('') }} className="text-xs text-primary hover:underline">
                  Elegir de la lista
                </button>
              </div>
            ) : (
              <select
                value={complaints.includes(chief) ? chief : ''}
                onChange={(e) => { if (e.target.value === '__other__') { setMotivoOther(true); setChief('') } else setChief(e.target.value) }}
                className={inputCls}
              >
                <option value="">Sin especificar</option>
                {complaints.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__other__">Otro…</option>
              </select>
            )}
          </div>
        </>
      )}

      {/* Campos específicos de bloqueo */}
      {kind === 'block' && (
        <>
          <div>
            <label className={labelCls}>Motivo</label>
            <select value={reason} onChange={(e) => setReason(e.target.value as BlockReason)} className={inputCls}>
              {REASON_OPTIONS.map((r) => <option key={r} value={r}>{BLOCK_REASON_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nota</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Ver detalle completo (iniciar consulta, check-in, tomar la cita, expediente) */}
      {isEdit && kind === 'appointment' && target?.item && (
        <button
          type="button"
          onClick={() => { onOpenChange(false); router.push(`/agenda/${target.item!.id}`) }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" /> Ver detalle (iniciar consulta, check-in, expediente)
        </button>
      )}

      {/* Confirmar (cita agendada) */}
      {isEdit && kind === 'appointment' && CONFIRMABLE.has(status) && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Confirmar cita
        </button>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1">
        {isEdit && kind === 'appointment' && (
          <button type="button" onClick={handleCancelAppointment} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
            <Ban className="h-4 w-4" /> Cancelar cita
          </button>
        )}
        {isEdit && kind === 'block' && (
          <button type="button" onClick={handleDeleteBlock} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        )}
        <button type="button" onClick={() => onOpenChange(false)} className="ml-auto rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Cerrar
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto p-4 pb-8">
        <SheetHeader className="mb-3"><SheetTitle>{title}</SheetTitle></SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}
