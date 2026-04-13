'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api, getUserRole, getOwnDoctorId } from '@/lib/api'
import { formatTime, formatCurrency, formatDate } from '@/lib/utils'
import {
  Users, TrendingUp, Clock, Plus, UserPlus,
  FileText, Link2, Video, MessageSquare, Bot, Loader2,
  ChevronRight, CreditCard
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
  SCHEDULED: 'bg-blue-400',
  CONFIRMED: 'bg-green-400',
  CHECKED_IN: 'bg-yellow-400',
  IN_PROGRESS: 'bg-orange-400',
  COMPLETED: 'bg-gray-300',
  CANCELLED: 'bg-red-300',
  NO_SHOW: 'bg-red-300',
}

// Simple SVG bar chart for revenue
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
          // Use T12:00:00 to avoid UTC midnight shifting day label in Mexico timezone
          const label = new Date(`${d.date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={BAR_W} height={barH}
                rx={4} fill="#3B82F6" fillOpacity={0.85} />
              <text x={x + BAR_W / 2} y={H + 16}
                textAnchor="middle" fontSize={10} fill="#9CA3AF">
                {label}
              </text>
              {d.amount > 0 && (
                <text x={x + BAR_W / 2} y={y - 4}
                  textAnchor="middle" fontSize={9} fill="#6B7280">
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
  const [userRole, setUserRole] = useState<string | null>(null)
  // ownDoctorId: seteado solo para DOCTOR/ADMIN — filtra su propia agenda
  const [ownDoctorId, setOwnDoctorId] = useState<string | null>(null)

  const today = new Date()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = new Date(today)
      from.setHours(0, 0, 0, 0)
      const to = new Date(today)
      to.setHours(23, 59, 59, 999)

      // Client-side UTC boundaries so server respects local timezone
      const todayLocal = new Date(); todayLocal.setHours(0, 0, 0, 0)
      const chart7Local = new Date(todayLocal); chart7Local.setDate(todayLocal.getDate() - 6)

      // Filtrar por doctor propio si aplica (se setea en el efecto de init del rol)
      const aptParams: Record<string, string> = { from: from.toISOString(), to: to.toISOString() }
      if (ownDoctorId) aptParams['doctorId'] = ownDoctorId

      const [aptsRes, dashRes] = await Promise.allSettled([
        api.appointments.list(aptParams) as Promise<{ data: Appointment[] }>,
        api.dashboard.stats({
          todayUtc: todayLocal.toISOString(),
          chartFromUtc: chart7Local.toISOString(),
        }) as Promise<DashboardResponse>,
      ])

      if (aptsRes.status === 'fulfilled') setAppointments(aptsRes.value.data)
      if (dashRes.status === 'fulfilled') setStats(dashRes.value.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [ownDoctorId])

  // Detecta rol y doctor propio — DOCTOR/ADMIN ven solo su propia agenda
  useEffect(() => {
    async function initRole() {
      try {
        const role = await getUserRole()
        setUserRole(role)
        if (role !== 'STAFF') {
          // DOCTOR y ADMIN ven solo sus propias citas
          const [ownId, schedRes] = await Promise.allSettled([
            getOwnDoctorId(),
            api.configuracion.getSchedule() as Promise<{ data: { doctorId: string } }>,
          ])
          const fromJwt = ownId.status === 'fulfilled' ? ownId.value : null
          const fromSched = schedRes.status === 'fulfilled' ? schedRes.value.data.doctorId : null
          const myId = fromJwt ?? fromSched
          if (myId) setOwnDoctorId(myId)
        }
      } catch {
        // Sin filtro si hay error — el usuario ve todo (safe fallback)
      }
    }
    initRole()
  }, [])

  useEffect(() => { load() }, [load])

  const todayStr = formatDate(today, "EEEE, d 'de' MMMM yyyy")
  const upcomingApts = appointments
    .filter(a => !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(a.status))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 6)

  // Fallback stats from appointments if API not available
  const patientsToday = stats?.patientsToday ?? upcomingApts.length
  const unconfirmed = stats?.unconfirmedCount ?? appointments.filter(a => a.status === 'SCHEDULED').length

  const kpis = [
    {
      label: 'Pacientes hoy',
      value: loading ? '—' : String(patientsToday),
      sub: stats?.patientsTodayDelta != null ? `+${stats.patientsTodayDelta} vs ayer` : `${appointments.length} citas`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Ingresos del día',
      value: loading ? '—' : formatCurrency(stats?.revenueToday ?? 0),
      sub: stats?.revenueTodayDelta != null ? `+${stats.revenueTodayDelta}% vs promedio` : 'En tiempo real',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-100',
    },
    {
      label: 'Citas por confirmar',
      value: loading ? '—' : String(unconfirmed),
      sub: 'Requieren confirmación',
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
    },
    {
      label: 'Ingresos del mes',
      value: loading ? '—' : formatCurrency(stats?.totalCollected ?? 0),
      sub: 'Acumulado del mes',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
    },
  ]

  // ADMIN = clinic administrator, STAFF = Administrativo in UI — both get admin layout
  const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

  const quickActions = isAdmin
    ? [
        { label: 'Nueva cita',      icon: Plus,        color: 'bg-blue-600 hover:bg-blue-700 text-white',    onClick: () => setShowNewApt(true) },
        { label: 'Nuevo paciente',  icon: UserPlus,    color: 'bg-green-600 hover:bg-green-700 text-white',  onClick: () => setShowNewPat(true) },
        { label: 'Registrar pago',  icon: CreditCard,  color: 'bg-purple-600 hover:bg-purple-700 text-white', onClick: () => router.push('/cobros') },
        { label: 'Link de pago',    icon: Link2,       color: 'bg-orange-500 hover:bg-orange-600 text-white', onClick: () => router.push('/cobros') },
        { label: 'Enviar WhatsApp', icon: MessageSquare, color: 'bg-emerald-600 hover:bg-emerald-700 text-white', onClick: () => {} },
      ]
    : [
        { label: 'Nueva cita',      icon: Plus,        color: 'bg-blue-600 hover:bg-blue-700 text-white',    onClick: () => setShowNewApt(true) },
        { label: 'Nuevo paciente',  icon: UserPlus,    color: 'bg-green-600 hover:bg-green-700 text-white',  onClick: () => setShowNewPat(true) },
        { label: 'Nota clínica',    icon: FileText,    color: 'bg-purple-600 hover:bg-purple-700 text-white', onClick: () => router.push('/expediente') },
        { label: 'Liga de pago',    icon: Link2,       color: 'bg-orange-500 hover:bg-orange-600 text-white', onClick: () => router.push('/cobros') },
        { label: 'Telemedicina',    icon: Video,       color: 'bg-teal-600 hover:bg-teal-700 text-white',    onClick: () => router.push('/telemedicina') },
        { label: 'Enviar WhatsApp', icon: MessageSquare, color: 'bg-emerald-600 hover:bg-emerald-700 text-white', onClick: () => {} },
      ]

  // Build chart in local timezone from raw API payments (avoids UTC vs local day mismatch)
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

      <div className="flex-1 p-6 overflow-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className={`bg-white rounded-xl border ${kpi.border} p-4 shadow-sm`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{kpi.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  </div>
                  <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: appointments + chart */}
          <div className="xl:col-span-2 space-y-6">
            {/* Upcoming appointments */}
            <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Próximas consultas de hoy</h2>
                <button onClick={() => router.push('/agenda')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  Ver agenda <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              ) : upcomingApts.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No hay citas pendientes hoy</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcomingApts.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => router.push(`/agenda`)}
                      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-14 text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{formatTime(apt.startsAt)}</p>
                      </div>
                      <div className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[apt.status] ?? 'bg-gray-300')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {apt.doctor ? `${apt.doctor.firstName} ${apt.doctor.lastName}` : ''}{apt.chiefComplaint ? ` · ${apt.chiefComplaint}` : ''}
                        </p>
                      </div>
                      <span className={cn(
                        'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
                        apt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        apt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'CHECKED_IN' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] ?? apt.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Ingresos últimos 7 días</h2>
                <button onClick={() => router.push('/cobros')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Ver cobros
                </button>
              </div>
              <RevenueChart data={chartData} />
            </div>
          </div>

          {/* Right column: quick actions + AI feed */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-white rounded-xl border border-gray-300 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Acciones rápidas</h2>
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
              <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Asistente IA · Actividad reciente</h2>
                </div>
                <div className="px-4 py-8 text-center">
                  <Bot className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs text-gray-400">Sin actividad reciente</p>
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button onClick={() => router.push('/asistente-ia')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
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
