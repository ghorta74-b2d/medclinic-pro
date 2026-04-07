'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Building2, Users, User, Calendar, Plus, ChevronRight, TrendingUp, Loader2 } from 'lucide-react'

interface PlatformStats {
  clinicCount: number
  doctorCount: number
  patientCount: number
  appointmentMonthCount: number
  recentClinics: Array<{
    id: string
    name: string
    plan: string
    isActive: boolean
    createdAt: string
    _count: { doctors: number; patients: number }
  }>
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700',
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(api as any).superadmin.stats()
      .then((res: any) => { setStats(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const kpis = [
    { label: 'Clínicas activas', value: stats?.clinicCount ?? 0, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-800' },
    { label: 'Médicos registrados', value: stats?.doctorCount ?? 0, icon: User, color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-800' },
    { label: 'Pacientes totales', value: stats?.patientCount ?? 0, icon: Users, color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-800' },
    { label: 'Citas este mes', value: stats?.appointmentMonthCount ?? 0, icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-800' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Vista global de todas las clínicas en MedClinic Pro</p>
        </div>
        <Link href="/superadmin/clinicas/nueva"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Nueva clínica
        </Link>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{label}</p>
                </div>
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent clinics */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Clínicas recientes</h2>
          <Link href="/superadmin/clinicas"
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
            Ver todas <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {stats?.recentClinics.map((clinic) => (
            <Link key={clinic.id} href={`/superadmin/clinicas/${clinic.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/50 transition-colors">
              <div className="w-9 h-9 bg-purple-900 rounded-xl flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{clinic.name}</p>
                <p className="text-xs text-gray-400">
                  {clinic._count.doctors} médico{clinic._count.doctors !== 1 ? 's' : ''} ·{' '}
                  {clinic._count.patients} paciente{clinic._count.patients !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[clinic.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                  {clinic.plan}
                </span>
                <div className={`w-2 h-2 rounded-full ${clinic.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                <p className="text-xs text-gray-500">{formatDate(clinic.createdAt)}</p>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </div>
            </Link>
          ))}
          {!loading && !stats?.recentClinics.length && (
            <p className="text-center text-sm text-gray-500 py-10">No hay clínicas registradas aún</p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/superadmin/clinicas/nueva', icon: Building2, label: 'Dar de alta nueva clínica', desc: 'Crea clínica + primer médico admin en 2 minutos', color: 'border-purple-700 hover:border-purple-500' },
          { href: '/superadmin/clinicas', icon: Users, label: 'Gestionar clínicas', desc: 'Ver, editar, activar o desactivar clínicas', color: 'border-blue-700 hover:border-blue-500' },
          { href: '/dashboard', icon: TrendingUp, label: 'Ir al panel clínico', desc: 'Vista de la plataforma como doctor/admin', color: 'border-green-700 hover:border-green-500' },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}
            className={`bg-gray-900 border ${color} rounded-xl p-4 transition-colors group`}>
            <Icon className="w-6 h-6 text-purple-400 mb-3" />
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
