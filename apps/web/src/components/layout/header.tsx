'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { calculateAge, getInitials } from '@/lib/utils'
import type { Patient, Appointment } from 'medclinic-shared'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

interface SearchResults {
  patients: Patient[]
  appointments: Appointment[]
}

function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const [pRes] = await Promise.allSettled([
        api.patients.list({ q, limit: '5' }) as Promise<{ data: Patient[] }>,
      ])
      setResults({
        patients: pRes.status === 'fulfilled' ? pRes.value.data : [],
        appointments: [],
      })
    } catch { setResults(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const hasResults = results && (results.patients.length > 0 || results.appointments.length > 0)

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-72">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar pacientes, citas, recetas..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
        />
        {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />}
        {query && !loading && (
          <button onClick={() => { setQuery(''); setResults(null) }}>
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          ) : !hasResults ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No se encontraron resultados para &quot;{query}&quot;
            </p>
          ) : (
            <div>
              {results!.patients.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    Pacientes
                  </p>
                  {results!.patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => {
                        router.push(`/pacientes/${patient.id}`)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {getInitials(patient.firstName, patient.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {patient.phone}
                          {patient.dateOfBirth ? ` · ${calculateAge(patient.dateOfBirth)} años` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <GlobalSearch />
        {actions}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          Dr
        </div>
      </div>
    </header>
  )
}
