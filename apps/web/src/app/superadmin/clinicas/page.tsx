'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Building2, Plus, Search, ChevronRight, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClinicRow {
  id: string
  name: string
  email: string
  phone: string
  plan: string
  isActive: boolean
  createdAt: string
  _count: { doctors: number; patients: number }
}

const PLAN_LABELS: Record<string, string> = { FREE: 'Free', STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-700 text-gray-300',
  STARTER: 'bg-blue-900 text-blue-300',
  PRO: 'bg-purple-900 text-purple-300',
  ENTERPRISE: 'bg-yellow-900 text-yellow-300',
}

export default function ClinicasPage() {
  const [clinics, setClinics] = useState<ClinicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params['q'] = search
      const res = await (api as any).superadmin.listClinics(params) as { data: ClinicRow[] }
      setClinics(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => {
    // Show skeleton only on first load or when search changes
    const t = setTimeout(() => load(true), search ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function toggleActive(clinic: ClinicRow) {
    setTogglingId(clinic.id)
    try {
      await (api as any).superadmin.updateClinic(clinic.id, { isActive: !clinic.isActive })
      await load(false)
    } catch { alert('Error al actualizar') }
    finally { setTogglingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clínicas</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clinics.length} clínica{clinics.length !== 1 ? 's' : ''} registrada{clinics.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/superadmin/clinicas/nueva"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nueva clínica
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" placeholder="Buscar por nombre o email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr>
              {['Clínica', 'Plan', 'Médicos', 'Pacientes', 'Alta', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : clinics.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-500 text-sm">
                {search ? `No se encontraron clínicas para "${search}"` : 'No hay clínicas registradas'}
              </td></tr>
            ) : clinics.map((clinic) => (
              <tr key={clinic.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-900 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{clinic.name}</p>
                      <p className="text-xs text-gray-400">{clinic.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PLAN_COLORS[clinic.plan] ?? 'bg-gray-700 text-gray-300')}>
                    {PLAN_LABELS[clinic.plan] ?? clinic.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{clinic._count.doctors}</td>
                <td className="px-4 py-3 text-sm text-gray-300">{clinic._count.patients}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatDate(clinic.createdAt)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(clinic)} disabled={togglingId === clinic.id}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50">
                    {togglingId === clinic.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      : clinic.isActive
                      ? <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-green-400">Activa</span></>
                      : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400">Inactiva</span></>
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/superadmin/clinicas/${clinic.id}`}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium">
                    Gestionar <ChevronRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
