'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { DayStats } from '@/components/agenda/day-stats'
import { DayView } from '@/components/agenda/day-view'
import { WeekView } from '@/components/agenda/week-view'
import { MonthView } from '@/components/agenda/month-view'
import { DoctorLegend } from '@/components/agenda/doctor-legend'
import { EventEditor, type EditorTarget } from '@/components/agenda/event-editor'
import { api, getUserRole, getOwnDoctorId, sessionCache, invalidateAgendaCache } from '@/lib/api'
import { formatDate, cn, localDateStr } from '@/lib/utils'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useToast } from '@/components/ui/use-toast'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Loader2, Users } from 'lucide-react'
import type { Appointment, ScheduleBlock } from 'medclinic-shared'
import {
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  buildAgendaItems,
  weekDaysFor,
  isSameLocalDay,
  dateAtMinutes,
  type AgendaItem,
} from '@/components/agenda/lib'

type ViewMode = 'dia' | 'semana' | 'mes'
interface Doctor { id: string; firstName: string; lastName: string; specialty?: string }

const HOUR12 = false // es-MX → 24h
const START_HOUR = DEFAULT_START_HOUR
const END_HOUR = DEFAULT_END_HOUR

function getWeekRange(date: Date) {
  const days = weekDaysFor(date, 1)
  const start = new Date(days[0]!)
  const end = new Date(days[6]!); end.setHours(23, 59, 59, 999)
  return { start, end }
}
function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function AgendaShell() {
  const isDesktop = useIsDesktop()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('dia')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)

  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [roleReady, setRoleReady] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)

  const isStaff = userRole === 'STAFF'
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  const showDoctor = !selectedDoctorId && (isStaff || isAdmin)
  const lockedDoctorId = selectedDoctorId
  const dateStr = localDateStr(selectedDate)

  // ── Rol (re-verificado desde el JWT en cada montaje) ────────
  useEffect(() => {
    async function init() {
      try {
        const role = await getUserRole()
        if (!role) return
        const cachedRole = sessionCache.getRole()
        if (cachedRole && cachedRole !== role) sessionCache.clear()
        sessionCache.setRole(role)
        setUserRole(role)

        if (role === 'DOCTOR') {
          const myId = await getOwnDoctorId()
          if (myId) { sessionCache.setDoctorId(myId); setSelectedDoctorId(myId) }
        } else {
          sessionCache.clearDoctorId()
          setSelectedDoctorId(null)
          setDoctorsLoading(true)
          api.configuracion.doctors()
            .then((res) => setDoctors((res as { data: Doctor[] }).data ?? []))
            .catch(() => {})
            .finally(() => setDoctorsLoading(false))
        }
      } catch {
        // Fallback: vista global sin filtro
      } finally {
        setRoleReady(true)
      }
    }
    init()
  }, [])

  // ── Carga (citas + bloqueos) con stale-while-revalidate ─────
  const loadData = useCallback(async () => {
    if (!roleReady) return
    let from: Date, to: Date
    if (viewMode === 'dia') {
      from = new Date(selectedDate); from.setHours(0, 0, 0, 0)
      to = new Date(selectedDate); to.setHours(23, 59, 59, 999)
    } else if (viewMode === 'semana') {
      const r = getWeekRange(selectedDate); from = r.start; to = r.end
    } else {
      const r = getMonthRange(selectedDate); from = r.start; to = r.end
    }

    const params: Record<string, string> = { from: from.toISOString(), to: to.toISOString() }
    if (selectedDoctorId) params['doctorId'] = selectedDoctorId

    const aptKey = `_apt_${selectedDoctorId ?? 'all'}_${dateStr}_${viewMode}`
    const blkKey = `_blk_${selectedDoctorId ?? 'all'}_${dateStr}_${viewMode}`
    try {
      const rawA = sessionStorage.getItem(aptKey)
      const rawB = sessionStorage.getItem(blkKey)
      if (rawA) {
        const { data, ts } = JSON.parse(rawA) as { data: Appointment[]; ts: number }
        if (Date.now() - ts < 3 * 60 * 1000) { setAppointments(data); setLoading(false) }
      }
      if (rawB) {
        const { data } = JSON.parse(rawB) as { data: ScheduleBlock[]; ts: number }
        setBlocks(data)
      }
    } catch {}

    try {
      const [aptRes, blkRes] = await Promise.all([
        api.appointments.list(params) as Promise<{ data: Appointment[] }>,
        api.blocks.list(params) as Promise<{ data: ScheduleBlock[] }>,
      ])
      setAppointments(aptRes.data)
      setBlocks(blkRes.data)
      try {
        sessionStorage.setItem(aptKey, JSON.stringify({ data: aptRes.data, ts: Date.now() }))
        sessionStorage.setItem(blkKey, JSON.stringify({ data: blkRes.data, ts: Date.now() }))
      } catch {}
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode, selectedDoctorId, roleReady, dateStr])

  useEffect(() => { loadData() }, [loadData])

  const items = useMemo(() => buildAgendaItems(appointments, blocks), [appointments, blocks])

  // Médicos presentes en la vista (para la leyenda de colores)
  const legendDoctors = useMemo<Doctor[]>(() => {
    if (!showDoctor) return []
    const map = new Map<string, Doctor>()
    for (const a of appointments) {
      if (a.doctor && !map.has(a.doctorId)) {
        map.set(a.doctorId, { id: a.doctorId, firstName: a.doctor.firstName, lastName: a.doctor.lastName, specialty: a.doctor.specialty })
      }
    }
    return Array.from(map.values())
  }, [appointments, showDoctor])

  // ── Reprogramación optimista (move / resize) ────────────────
  const reschedule = useCallback(async (item: AgendaItem, start: Date, end: Date) => {
    const startsAt = start.toISOString()
    const endsAt = end.toISOString()
    if (item.kind === 'appointment') {
      const prev = appointments
      setAppointments((list) => list.map((a) => (a.id === item.id ? { ...a, startsAt, endsAt } : a)))
      try {
        await api.appointments.update(item.id, { startsAt, endsAt })
        invalidateAgendaCache()
      } catch (e) {
        setAppointments(prev)
        toast({ variant: 'destructive', title: 'No se pudo mover la cita', description: e instanceof Error ? e.message : undefined })
      }
    } else {
      const prev = blocks
      setBlocks((list) => list.map((b) => (b.id === item.id ? { ...b, startsAt, endsAt } : b)))
      try {
        await api.blocks.update(item.id, { startsAt, endsAt })
        invalidateAgendaCache()
      } catch (e) {
        setBlocks(prev)
        toast({ variant: 'destructive', title: 'No se pudo mover el bloqueo', description: e instanceof Error ? e.message : undefined })
      }
    }
  }, [appointments, blocks, toast])

  // ── Handlers de la rejilla ──────────────────────────────────
  const handleCreate = useCallback((start: Date, end: Date) => {
    setEditorTarget({ mode: 'create', kind: 'appointment', start, end })
    setEditorOpen(true)
  }, [])
  const handleActivate = useCallback((item: AgendaItem) => {
    setEditorTarget({ mode: 'edit', kind: item.kind, start: item.start, end: item.end, item })
    setEditorOpen(true)
  }, [])
  const openNew = useCallback(() => {
    const start = dateAtMinutes(selectedDate, START_HOUR * 60)
    const end = dateAtMinutes(selectedDate, START_HOUR * 60 + 30)
    setEditorTarget({ mode: 'create', kind: 'appointment', start, end })
    setEditorOpen(true)
  }, [selectedDate])

  function navigate(direction: 'prev' | 'next') {
    const d = new Date(selectedDate)
    if (viewMode === 'dia') d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1))
    else if (viewMode === 'semana') d.setDate(d.getDate() + (direction === 'prev' ? -7 : 7))
    else d.setMonth(d.getMonth() + (direction === 'prev' ? -1 : 1))
    setSelectedDate(d)
  }

  const isToday = isSameLocalDay(selectedDate, new Date())
  const subtitle = viewMode === 'dia'
    ? formatDate(selectedDate, "EEEE, d 'de' MMMM yyyy")
    : viewMode === 'semana'
    ? (() => { const { start, end } = getWeekRange(selectedDate); return `${formatDate(start, 'd MMM')} – ${formatDate(end, 'd MMM yyyy')}` })()
    : formatDate(selectedDate, 'MMMM yyyy')

  const gridProps = {
    items,
    startHour: START_HOUR,
    endHour: END_HOUR,
    hour12: HOUR12,
    showDoctor,
    enabled: !loading,
    onMove: reschedule,
    onResize: reschedule,
    onActivate: handleActivate,
  }

  return (
    <>
      <Header
        title="Agenda"
        subtitle={subtitle}
        actions={
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva cita</span>
          </button>
        }
      />

      <div className="flex-1 space-y-4 overflow-auto p-3 sm:p-6">
        {/* Controles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="rounded-lg p-2 transition-colors hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', isToday ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              Hoy
            </button>
            <button onClick={() => navigate('next')} className="rounded-lg p-2 transition-colors hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
              className="ml-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
            {(['dia', 'semana', 'mes'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', viewMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80')}
              >
                {mode === 'dia' ? 'Día' : mode === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          {(isStaff || isAdmin) && (
            <div className="flex items-center">
              {doctorsLoading ? (
                <span className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando médicos…
                </span>
              ) : doctors.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedDoctorId ?? ''}
                    onChange={(e) => setSelectedDoctorId(e.target.value || null)}
                    className="min-w-[180px] cursor-pointer appearance-none rounded-lg border border-border bg-card py-1.5 pl-8 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Todos los médicos</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>Dr. {doc.firstName} {doc.lastName}</option>
                    ))}
                  </select>
                  <Users className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Contadores (los bloqueos NO suman) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DayStats appointments={appointments} />
        </div>

        {/* Leyenda de médicos */}
        {showDoctor && legendDoctors.length > 0 && <DoctorLegend doctors={legendDoctors} />}

        {/* Vistas */}
        {viewMode === 'dia' && (
          <DayView selectedDate={selectedDate} {...gridProps} onCreate={handleCreate} onNew={openNew} />
        )}

        {viewMode === 'semana' && (
          isDesktop ? (
            <WeekView
              referenceDate={selectedDate}
              {...gridProps}
              onCreate={handleCreate}
              onDayClick={(date) => { setSelectedDate(date); setViewMode('dia') }}
            />
          ) : (
            <MobileWeek
              referenceDate={selectedDate}
              selectedDate={selectedDate}
              onPickDay={setSelectedDate}
            >
              <DayView selectedDate={selectedDate} {...gridProps} onCreate={handleCreate} onNew={openNew} />
            </MobileWeek>
          )
        )}

        {viewMode === 'mes' && (
          <MonthView
            referenceDate={selectedDate}
            items={items}
            hour12={HOUR12}
            showDoctor={showDoctor}
            onDayClick={(date) => { setSelectedDate(date); setViewMode('dia') }}
            onActivate={handleActivate}
          />
        )}
      </div>

      <EventEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        target={editorTarget}
        doctors={doctors.length > 0 ? doctors : legendDoctors}
        lockedDoctorId={lockedDoctorId}
        canReassign={isAdmin || isStaff}
        onSaved={() => { invalidateAgendaCache(); loadData() }}
      />
    </>
  )
}

// Vista Semana en móvil: tira de días (selector) + Día de la fecha elegida.
function MobileWeek({
  referenceDate,
  selectedDate,
  onPickDay,
  children,
}: {
  referenceDate: Date
  selectedDate: Date
  onPickDay: (d: Date) => void
  children: React.ReactNode
}) {
  const days = weekDaysFor(referenceDate, 1)
  const abbr = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const active = isSameLocalDay(d, selectedDate)
          const today = isSameLocalDay(d, new Date())
          return (
            <button
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg py-2 text-xs transition-colors',
                active ? 'bg-primary text-white' : today ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span>{abbr[i]}</span>
              <span className="text-sm font-semibold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}
