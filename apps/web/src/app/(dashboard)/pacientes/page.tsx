'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { api, readCache, writeCache } from '@/lib/api'
import { formatDate, formatCurrency, getInitials, calculateAge } from '@/lib/utils'
import { Search, Plus } from 'lucide-react'
import type { Patient } from 'medclinic-shared'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'
import { cn } from '@/lib/utils'

interface PatientRow extends Patient {
  _count?: { appointments: number }
  nextAppointment?: { startsAt: string; doctor?: { firstName: string; lastName: string } } | null
  pendingBalance?: number
  insurance?: { provider: string; policyNumber?: string } | null
}

interface PatientsResponse {
  data: PatientRow[]
  pagination: { total: number; pages: number; page: number }
}

export default function PacientesPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [letter, setLetter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    const params: Record<string, string> = { page: String(page), limit: '20' }
    if (search) params['q'] = search
    else if (letter) params['letter'] = letter

    // Stale-while-revalidate: show cached list instantly on return visits
    // Only cache non-search page-1 (the most common landing state)
    const cacheKey = `_pts_${page}_${search}_${letter ?? ''}`
    if (!search || page === 1) {
      const cached = readCache<PatientsResponse>(cacheKey)
      if (cached) {
        setPatients(cached.data)
        setTotalPages(cached.pagination.pages)
        setTotal(cached.pagination.total)
        setLoading(false)
      }
    }

    // Always fetch fresh data in background
    try {
      const res = await api.patients.list(params) as PatientsResponse
      setPatients(res.data)
      setTotalPages(res.pagination.pages)
      setTotal(res.pagination.total)
      writeCache(cacheKey, res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search, letter])

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  return (
    <>
      <Header
        title="Pacientes"
        subtitle={`${total} pacientes registrados`}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo paciente
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-auto">
        {/* Search */}
        <div className="relative mb-3 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o CURP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLetter(null); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alphabet filter */}
        <div className="flex flex-wrap gap-x-0.5 gap-y-1 mb-5">
          <button
            onClick={() => { setLetter(null); setSearch(''); setPage(1) }}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors',
              letter === null && !search
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
            <button
              key={l}
              onClick={() => { setLetter(l); setSearch(''); setPage(1) }}
              className={cn(
                'w-7 py-1 text-xs font-medium rounded transition-colors text-center',
                letter === l
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Edad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aseguradora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Próxima cita</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-500 text-sm">
                    {search ? `No se encontraron pacientes para "${search}"` : 'No hay pacientes registrados'}
                  </td>
                </tr>
              ) : (
                patients.map((patient) => {
                  const hasPendingBalance = (patient.pendingBalance ?? 0) > 0
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => router.push(`/pacientes/${patient.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {/* Patient name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                            {getInitials(patient.firstName, patient.lastName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {[patient.lastName, patient.secondLastName, patient.firstName].filter(Boolean).join(' ')}
                            </p>
                            {patient.curp && (
                              <p className="text-xs text-gray-400 font-mono">{patient.curp}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">{patient.phone}</p>
                        {patient.email && (
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{patient.email}</p>
                        )}
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700">
                          {patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} años` : '—'}
                        </p>
                      </td>

                      {/* Insurance */}
                      <td className="px-4 py-3">
                        {patient.insurance ? (
                          <div>
                            <p className="text-sm text-gray-800 font-medium">{patient.insurance.provider}</p>
                            {patient.insurance.policyNumber && (
                              <p className="text-xs text-gray-400 font-mono">{patient.insurance.policyNumber}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sin seguro</span>
                        )}
                      </td>

                      {/* Next appointment */}
                      <td className="px-4 py-3">
                        {patient.nextAppointment ? (
                          <div>
                            <p className="text-sm text-gray-800">
                              {formatDate(patient.nextAppointment.startsAt, 'd MMM, HH:mm')}
                            </p>
                            {patient.nextAppointment.doctor && (
                              <p className="text-xs text-gray-400">
                                {patient.nextAppointment.doctor.firstName} {patient.nextAppointment.doctor.lastName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3">
                        {hasPendingBalance ? (
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(patient.pendingBalance ?? 0)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          patient.isActive !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {patient.isActive !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                  Anterior
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewPatientDialog
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load() }}
        />
      )}
    </>
  )
}
