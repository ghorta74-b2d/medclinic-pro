'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api, getUserRole, getOwnDoctorId, sessionCache, readCache, writeCache } from '@/lib/api'
import { formatTime, formatCurrency, formatDate } from '@/lib/utils'
import {
  Users, TrendingUp, Clock, Plus, UserPlus,
  FileText, Link2, Video, MessageSquare, Bot, Loader2,
  ChevronRight, CreditCard, Stethoscope, Building2
} from 'lucide-react'
import { NewAppointmentDialog } from '@/components/agenda/new-appointment-dialog'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'
import type { Appointment, Invoice } from 'medclinic-shared'
import { STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'

interface DashboardStats {
  patientsToday: number
  patientsTodayDelta: number
  revenueToday: number
  revenueTodayDelta: number
  unconfirmedCount: number
  totalCollected: number
  payments7d?: { paidAt: string; amount: number }[]
}

interface DashboardResponse {
  data: DashboardStats
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-primary',
  CONFIRMED: 'bg-success',
  CHECKED_IN: 'bg-warning',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-muted-foreground',
  CANCELLED: 'bg-destructive',
  NO_SHOW: 'bg-destructive',
}

function RevenueChart({ data }: { data: { date: string; amount: number }[] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.amount), 1)
  const BAR_W = 32
  const GAP = 8
  const H = 80
  const total_w = data.length * (BAR_W + GAP) - GAP

  return (
    <div className="overflow-x-auto">
      <svg width={total_w} height={H + 28} className="block mx-auto">
        {data.map((d, i) => {
          const barH = Math.max((d.amount / max) * H, 4)
          const x = i * (BAR_W + GAP)
          const y = H - barH
          const label = new Date(`${d.date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={BAR_W} height={barH}
                rx={4} className="fill-primary" fillOpacity={0.85} />
              <text x={x + BAR_W / 2} y={H + 16}
                textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                {label}
              </text>
              {d.amount > 0 && (
                <text x={x + BAR_W / 2} y={y - 4}
                  textAnchor="middle" fontSize={9} className="fill-muted-foreground">
                  {d.amount >= 1000 ? `$${(d.amount / 1000).toFixed(0)}k` : `$${d.amount}`}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}


export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewApt, setShowNewApt] = useState(false)
  const [showNewPat, setShowNewPat] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(() => sessionCache.getRole())
  const [ownDoctorId, setOwnDoctorId] = useState<string | null>(() => sessionCache.getDoctorId())
  const [doctors, setDoctors] = useState<{ id: string; firstName: string; lastName: string; specialty?: string | null }[]>([])
  const [selectedFilterDoctorId, setSelectedFilterDoctorId] = useState<string | null>(
    () => sessionCache.getDoctorId()
  )
  const [roleReady, setRoleReady] = useState(() => !!sessionCache.getRole())

  const today = new Date()

  const load = useCallback(async () => {
    if (!roleReady) return

    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
    const todayStr = todayLocal.toLocaleDateString('sv-SE')
    const chart7Local = new Date(todayLocal); chart7Local.setDate(todayLocal.getDate() - 6)
    const effectiveDoctor = userRole === 'ADMIN' ? selectedFilterDoctorId : ownDoctorId
    const cacheKey = `_dash_${effectiveDoctor ?? 'all'}_${todayStr}`

    const cached = readCache<{ appointments: Appointment[]; stats: DashboardStats }>(cacheKey)
    if (cached) {
      setAppointments(cached.appointments)
      setStats(cached.stats)
      setLoading(false)
    }

    try {
      const from = new Date(todayLocal)
      const to = new Date(todayLocal); to.setHours(23, 59, 59, 999)

      const aptParams: Record<string, string> = { from: from.toISOString(), to: to.toISOString() }
      if (effectiveDoctor) aptParams['doctorId'] = effectiveDoctor

      const statsParams: Record<string, string> = {
        todayUtc: todayLocal.toISOString(),
        chartFromUtc: chart7Local.toISOString(),
      }
      if (effectiveDoctor) statsParams['doctorId'] = effectiveDoctor

      const [aptsRes, dashRes] = await Promise.allSettled([
        api.appointments.list(aptParams) as Promise<{ data: Appointment[] }>,
        api.dashboard.stats(statsParams) as Promise<DashboardResponse>,
      ])

      const newApts  = aptsRes.status === 'fulfilled' ? aptsRes.value.data  : null
      const newStats = dashRes.status === 'fulfilled' ? dashRes.value.data : null
      if (newApts)  setAppointments(newApts)
      if (newStats) setStats(newStats)
      if (newApts && newStats) writeCache(cacheKey, { appointments: newApts, stats: newStats })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [ownDoctorId, roleReady, userRole, selectedFilterDoctorId])

  useEffect(() => {
    if (sessionCache.getRole() === 'ADMIN' && doctors.length === 0) {
      api.configuracion.doctors().then((res: unknown) => {
        setDoctors((res as { data: { id: string; firstName: string; lastName: string; specialty?: string | null }[] }).data ?? [])
      }).catch(() => {})
    }

    if (sessionCache.getRole()) return

    async function initRole() {
      try {
        const role = await getUserRole()
        if (role) sessionCache.setRole(role)
        setUserRole(role)

        if (role !== 'STAFF') {
          const myId = await getOwnDoctorId()
          if (myId) {
            sessionCache.setDoctorId(myId)
            setOwnDoctorId(myId)
            setSelectedFilterDoctorId(myId)
            if (role === 'ADMIN') {
              const docsRes = await api.configuracion.doctors() as { data: { id: string; firstName: string; lastName: string; specialty?: string | null }[] }
              setDoctors(docsRes.data ?? [])
            }
          }
        }
      } catch {
        // Safe fallback
      } finally {
        setRoleReady(true)
      }
    }
    initRole()
  }, [doctors.length])

  useEffect(() => { load() }, [load])

  const todayStr = formatDate(today, "EEEE, d 'de' MMMM yyyy")
  const now = new Date()
  const ONGOING_WINDOW_MS = 60 * 60 * 1000
  const upcomingApts = appointments
    .filter(a => {
      if (['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(a.status)) return false
      return new Date(a.startsAt).getTime() >= now.getTime() - ONGOING_WINDOW_MS
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 6)

  const patientsToday = stats?.patientsToday ?? upcomingApts.length
  const unconfirmed = stats?.unconfirmedCount ?? appointments.filter(a => a.status === 'SCHEDULED').length

  const kpis = [
    {
      label: 'Pacientes hoy',
      value: loading ? '—' : String(patientsToday),
      sub: stats?.patientsTodayDelta != null ? `+${stats.patientsTodayDelta} vs ayer` : `${appointments.length} citas`,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Ingresos del día',
      value: loading ? '—' : formatCurrency(stats?.revenueToday ?? 0),
      sub: stats?.revenueTodayDelta != null ? `+${stats.revenueTodayDelta}% vs promedio` : 'En tiempo real',
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Citas por confirmar',
      value: loading ? '—' : String(unconfirmed),
      sub: 'Requieren confirmación',
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Ingresos del mes',
      value: loading ? '—' : formatCurrency(stats?.totalCollected ?? 0),
      sub: 'Acumulado del mes',
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

  const quickActions = isAdmin
    ? [
        { label: 'Nueva cita',      icon: Plus,        color: 'bg-primary hover:bg-primary/90 text-primary-foreground',     onClick: () => setShowNewApt(true) },
        { label: 'Nuevo paciente',  icon: UserPlus,    color: 'bg-success hover:bg-success/90 text-success-foreground',     onClick: () => setShowNewPat(true) },
        { label: 'Registrar pago',  icon: CreditCard,  color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground', onClick: () => router.push('/cobros') },
        { label: 'Link de pago',    icon: Link2,       color: 'bg-warning/15 hover:bg-warning/25 text-warning',              onClick: () => router.push('/cobros') },
        { label: 'Enviar WhatsApp', icon: MessageSquare, color: 'bg-success/15 hover:bg-success/25 text-success',            onClick: () => {} },
      ]
    : [
        { label: 'Nueva cita',      icon: Plus,        color: 'bg-primary hover:bg-primary/90 text-primary-foreground',     onClick: () => setShowNewApt(true) },
        { label: 'Nuevo paciente',  icon: UserPlus,    color: 'bg-success hover:bg-success/90 text-success-foreground',     onClick: () => setShowNewPat(true) },
        { label: 'Nota clínica',    icon: FileText,    color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground', onClick: () => router.push('/expediente') },
        { label: 'Liga de pago',    icon: Link2,       color: 'bg-warning/15 hover:bg-warning/25 text-warning',              onClick: () => router.push('/cobros') },
        { label: 'Telemedicina',    icon: Video,       color: 'bg-primary/15 hover:bg-primary/25 text-primary',              onClick: () => router.push('/telemedicina') },
        { label: 'Enviar WhatsApp', icon: MessageSquare, color: 'bg-success/15 hover:bg-success/25 text-success',            onClick: () => {} },
      ]

  const chartData = (() => {
    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
    const dayMap: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayLocal); d.setDate(d.getDate() - 6 + i)
      dayMap[d.toLocaleDateString('sv-SE')] = 0
    }
    for (const p of (stats?.payments7d ?? [])) {
      const key = new Date(p.paidAt).toLocaleDateString('sv-SE')
      if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + p.amount
    }
    return Object.entries(dayMap).map(([date, amount]) => ({ date, amount }))
  })()

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={todayStr}
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto space-y-4 sm:space-y-6">

        {/* Doctor filter — ADMIN only */}
        {userRole === 'ADMIN' && doctors.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Viendo datos de:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedFilterDoctorId(null)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                  selectedFilterDoctorId === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                )}>
                <Building2 className="w-3.5 h-3.5" />
                Clínica completa
              </button>
              {doctors.map(d => {
                const isOwn = d.id === ownDoctorId
                const isSelected = selectedFilterDoctorId === d.id
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedFilterDoctorId(d.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                    )}>
                    <Stethoscope className="w-3.5 h-3.5" />
                    {d.firstName} {d.lastName}
                    {isOwn && <span className={cn('text-xs ml-0.5', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>(tú)</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-sm font-medium text-foreground/80 mt-0.5">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                  </div>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                    <Icon className={cn('w-5 h-5', kpi.color)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Upcoming appointments */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Próximas consultas de hoy</h2>
                <button onClick={() => router.push('/agenda')}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                  Ver agenda <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : upcomingApts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No hay citas pendientes hoy</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {upcomingApts.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => router.push(`/agenda`)}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="w-14 text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">{formatTime(apt.startsAt)}</p>
                      </div>
                      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[apt.status] ?? 'bg-muted-foreground')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.doctor ? `${apt.doctor.firstName} ${apt.doctor.lastName}` : ''}{apt.chiefComplaint ? ` · ${apt.chiefComplaint}` : ''}
                        </p>
                      </div>
                      {(() => {
                        const isOngoing = new Date(apt.startsAt) <= now
                        if (isOngoing) {
                          return (
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-warning/15 text-warning flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse inline-block" />
                              En curso
                            </span>
                          )
                        }
                        return (
                          <span className={cn(
                            'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                            apt.status === 'CONFIRMED'  ? 'bg-success/15 text-success' :
                            apt.status === 'SCHEDULED'  ? 'bg-primary/15 text-primary' :
                            apt.status === 'CHECKED_IN' ? 'bg-warning/15 text-warning' :
                            'bg-muted text-muted-foreground'
                          )}>
                            {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] ?? apt.status}
                          </span>
                        )
                      })()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue chart */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Ingresos últimos 7 días</h2>
                <button onClick={() => router.push('/cobros')}
                  className="text-xs text-primary hover:text-primary/80 font-medium">
                  Ver cobros
                </button>
              </div>
              <RevenueChart data={chartData} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Acciones rápidas</h2>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className={cn(
                        'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-medium transition-colors',
                        action.color
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AI activity feed — hidden for ADMIN role */}
            {!isAdmin && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Asistente IA · Actividad reciente</h2>
                </div>
                <div className="px-4 py-8 text-center">
                  <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Sin actividad reciente</p>
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <button onClick={() => router.push('/asistente-ia')}
                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                    Ver todos los eventos <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewApt && (
        <NewAppointmentDialog
          defaultDate={today}
          onClose={() => setShowNewApt(false)}
          onCreated={() => { setShowNewApt(false); load() }}
        />
      )}
      {showNewPat && (
        <NewPatientDialog
          onClose={() => setShowNewPat(false)}
          onCreated={() => { setShowNewPat(false); load() }}
        />
      )}
    </>
  )
}
