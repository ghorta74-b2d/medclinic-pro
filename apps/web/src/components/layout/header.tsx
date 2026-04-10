'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, X, Loader2, Mail, Phone, Save } from 'lucide-react'
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

interface UserProfile {
  initials: string
  fullName: string
  email: string
  phone: string
}

function ProfileModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
      )
      const updates: { email?: string; data?: { phone?: string } } = {}
      if (email !== profile.email) updates.email = email
      if (phone !== profile.phone) updates.data = { phone }
      const { error: err } = await supabase.auth.updateUser(updates)
      if (err) { setError(err.message); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = email !== profile.email || phone !== profile.phone

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Mi perfil</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#4E2DD2] rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
              {profile.initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{profile.fullName}</p>
              <p className="text-xs text-gray-400 mt-0.5">Cuenta activa</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Correo electrónico
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#4E2DD2] focus-within:ring-1 focus-within:ring-[#4E2DD2]/20">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 text-sm text-gray-900 focus:outline-none bg-transparent"
                placeholder="correo@ejemplo.com"
              />
            </div>
            {email !== profile.email && (
              <p className="text-xs text-amber-600 mt-1">
                Se enviará un correo de confirmación a la nueva dirección.
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Celular
            </label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#4E2DD2] focus-within:ring-1 focus-within:ring-[#4E2DD2]/20">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 text-sm text-gray-900 focus:outline-none bg-transparent"
                placeholder="+52 55 0000 0000"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full flex items-center justify-center gap-2 bg-[#4E2DD2] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserAvatar() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { createBrowserClient } = await import('@supabase/ssr')
        const supabase = createBrowserClient(
          process.env['NEXT_PUBLIC_SUPABASE_URL']!,
          process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
        )
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const meta = session.user.user_metadata ?? {}
        const firstName: string = meta['firstName'] ?? ''
        const lastName: string  = meta['lastName']  ?? ''
        setProfile({
          initials: getInitials(firstName, lastName) || (session.user.email?.[0]?.toUpperCase() ?? '?'),
          fullName: `${firstName} ${lastName}`.trim() || session.user.email ?? '',
          email: session.user.email ?? '',
          phone: (meta['phone'] as string) ?? '',
        })
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const initials = profile?.initials ?? '?'

  return (
    <>
      <button
        onClick={() => setShowProfile(true)}
        className="w-8 h-8 bg-[#4E2DD2] rounded-full flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
        title="Mi perfil"
      >
        {initials}
      </button>
      {showProfile && profile && (
        <ProfileModal profile={profile} onClose={() => setShowProfile(false)} />
      )}
    </>
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
        <UserAvatar />
      </div>
    </header>
  )
}
