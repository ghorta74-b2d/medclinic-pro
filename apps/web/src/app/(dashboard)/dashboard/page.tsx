'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api, getUserRole, getOwnDoctorId, sessionCache, readCache, writeCache } from '@/lib/api'
import { formatTime, formatCurrency, formatDate } from '@/lib/utils'
import {
  Users, TrendingUp, DollarSign, Plus, UserPlus,
  FileText, Link2, Video, MessageSquare, Bot, Loader2,
  ChevronRight, ChevronDown, CreditCard, Building2, UserX
} from 'lucide-react'
import { NewAppointmentDialog } from '@/components/agenda/new-appointment-dialog'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'
import type { Appointment } from 'medclinic-shared'
import { STATUS_LABELS } from 'medclinic-shared'
import { cn } from '@/lib/utils'
import { PeriodNavigator, computePeriod, type Granularity } from '@/components/ui/period-navigator'
import { KpiCard, pctChange } from '@/components/ui/kpi-card'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DashboardStats {
  totalBilled: number
  totalCollected: number
  pendingAmount: number
  revenueToday: number
  completedCount: number
  noShowCount: number
  apptTotal: number
  totalBilledPrev?: number
  totalCollectedPrev?: number
  hasPrev?: boolean
}

interface DashboardResponse { data: DashboardStats }
interface TrendPoint { month: string; collected: number; billed: number }
interface TrendResponse { data: TrendPoint[] }

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: 'bg-primary',
  CONFIRMED: 'bg-success',
  CHECKED_IN: 'bg-warning',
  IN_PROGRESS: 'bg-warning',
  COMPLETED: 'bg-muted-foreground',
  CANCELLED: 'bg-destructive',
  NO_SHOW: 'bg-destructive',
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y ?? 2000, (m ?? 1) - 1, 1)
  return d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-56 text-xs text-muted-foreground/60">Sin datos de tendencia</div>
  }
  const rows = data.map(d => ({ ...d, label: monthLabel(d.month) }))
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))' }}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            formatter={(v) => [formatCurrency(Number(v)), 'Cobrado']}
          />
          <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#collectedFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
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
  const [granularity, setGranularity] = useState<Granularity>('mes')
  const [anchor, setAnchor] = useState<Date>(() => new Date())

  const today = new Date()
  const period = useMemo(() => computePeriod(granularity, anchor), [granularity, anchor])

  const load = useCallback(async () => {
    if (!roleReady) return

    const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayLocal); todayEnd.setHours(23, 59, 59, 999)
    const todayStr = todayLocal.toLocaleDateString('sv-SE')
    const effectiveDoctor = userRole === 'ADMIN' ? selectedFilterDoctorId : ownDoctorId
    const cacheKey = `_dash_${effectiveDoctor ?? 'all'}_${granularity}_${period.from.toLocaleDateString('sv-SE')}_${todayStr}`

    const cached = readCache<{ appointments: Appointment[]; stats: DashboardStats; trend: TrendPoint[] }>(cacheKey)
    if (cached) {
      setAppointments(cached.appointments)
      setStats(cached.stats)
      setTrend(cached.trend ?? [])
      setLoading(false)
    }

    try {
      // Operational "today" panel — always today, independent of the selected period
      const aptParams: Record<string, string> = { from: todayLocal.toISOString(), to: todayEnd.toISOString() }
      if (effectiveDoctor) aptParams['doctorId'] = effectiveDoctor

      const dashParams: Record<string, string> = {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        prevFrom: period.prevFrom.toISOString(),
        prevTo: period.prevTo.toISOString(),
        todayUtc: todayLocal.toISOString(),
        chartFromUtc: period.from.toISOString(),
        chartToUtc: period.to.toISOString(),
      }
      if (effectiveDoctor) dashParams['doctorId'] = effectiveDoctor

      const trendParams: Record<string, string> = { months: '6' }
      if (effectiveDoctor) trendParams['doctorId'] = effectiveDoctor

      const [aptsRes, dashRes, trendRes] = await Promise.allSettled([
        api.appointments.list(aptParams) as Promise<{ data: Appointment[] }>,
        api.dashboard.stats(dashParams) as Promise<DashboardResponse>,
        api.billing.trend(trendParams) as Promise<TrendResponse>,
      ])

      const newApts  = aptsRes.status === 'fulfilled' ? aptsRes.value.data : null
      const newStats = dashRes.status === 'fulfilled' ? dashRes.value.data : null
      const newTrend = trendRes.status === 'fulfilled' ? trendRes.value.data : null
      if (newApts)  setAppointments(newApts)
      if (newStats) setStats(newStats)
      if (newTrend) setTrend(newTrend)
      if (newApts && newStats) writeCache(cacheKey, { appointments: newApts, stats: newStats, trend: newTrend ?? [] })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [ownDoctorId, roleReady, userRole, selectedFilterDoctorId, granularity, period])

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

  const unconfirmed = appointments.filter(a => a.status === 'SCHEDULED').length
  const noShowRate = stats?.apptTotal ? Math.round((stats.noShowCount / stats.apptTotal) * 100) : 0

  const kpis = [
    {
      label: 'Cobrado',
      value: loading && !stats ? '—' : formatCurrency(stats?.totalCollected ?? 0),
      sub: 'En el período',
      icon: DollarSign, color: 'text-success', bg: 'bg-success/10',
      delta: stats?.hasPrev ? pctChange(stats?.totalCollected ?? 0, stats?.totalCollectedPrev ?? 0) : null,
    },
    {
      label: 'Facturado',
      value: loading && !stats ? '—' : formatCurrency(stats?.totalBilled ?? 0),
      sub: `Pendiente: ${formatCurrency(stats?.pendingAmount ?? 0)}`,
      icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10',
      delta: stats?.hasPrev ? pctChange(stats?.totalBilled ?? 0, stats?.totalBilledPrev ?? 0) : null,
    },
    {
      label: 'Pacientes atendidos',
      value: loading && !stats ? '—' : String(stats?.completedCount ?? 0),
      sub: `${stats?.apptTotal ?? 0} citas en total`,
      icon: Users, color: 'text-primary', bg: 'bg-primary/10',
      delta: null,
    },
    {
      label: 'Tasa de no-show',
      value: loading && !stats ? '—' : `${noShowRate}%`,
      sub: `${stats?.noShowCount ?? 0} no asistieron`,
      icon: UserX, color: 'text-warning', bg: 'bg-warning/10',
      delta: null,
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

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={todayStr}
      />

      <div className="flex-1 p-3 sm:p-6 overflow-auto space-y-4 sm:space-y-6">

        {/* Period navigator + doctor filter */}
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <PeriodNavigator
            granularity={granularity}
            anchor={anchor}
            onChange={(g, a) => { setGranularity(g); setAnchor(a) }}
          />
          {userRole === 'ADMIN' && doctors.length > 0 && (
            <div className="relative">
              <select
                value={selectedFilterDoctorId ?? ''}
                onChange={e => setSelectedFilterDoctorId(e.target.value || null)}
                className="appearance-none bg-card border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[200px]"
              >
                <option value="">Clínica completa</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}{d.id === ownDoctorId ? ' (tú)' : ''}
                  </option>
                ))}
              </select>
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        {/* Revenue trend — last 6 months */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Tendencia de ingresos — últimos 6 meses</h2>
            <button onClick={() => router.push('/cobros')}
              className="text-xs text-primary hover:text-primary/80 font-medium">
              Ver cobros
            </button>
          </div>
          <TrendChart data={trend} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column — today's operational panel */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Próximas consultas de hoy</h2>
                  {unconfirmed > 0 && (
                    <span className="text-xs font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full">
                      {unconfirmed} por confirmar
                    </span>
                  )}
                </div>
                <button onClick={() => router.push('/agenda')}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                  Ver agenda <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {loading && appointments.length === 0 ? (
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
