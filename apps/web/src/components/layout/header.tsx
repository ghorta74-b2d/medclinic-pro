'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, X, Loader2, Mail, Phone, Save, RefreshCw, CheckCheck, Menu, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { calculateAge, getInitials } from '@/lib/utils'
import type { Patient, Appointment } from 'medclinic-shared'
import { cn } from '@/lib/utils'

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

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

  function closeMobile() {
    setMobileOpen(false)
    setQuery('')
    setResults(null)
  }

  const hasResults = results && (results.patients.length > 0 || results.appointments.length > 0)

  const ResultsList = () => (
    <>
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
                    closeMobile()
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
    </>
  )

  return (
    <>
      {/* ── Mobile search overlay ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200">
            <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Buscar pacientes, citas..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                autoFocus
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-full"
              />
              {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-400 shrink-0" />}
              {query && !loading && (
                <button onClick={() => { setQuery(''); setResults(null) }}>
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          {query.length >= 2 && (
            <div className="flex-1 overflow-y-auto">
              <ResultsList />
            </div>
          )}
        </div>
      )}

      {/* ── Desktop search (hidden below sm) ───────────────────────── */}
      <div ref={ref} className="relative hidden sm:block">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 sm:w-52 lg:w-72">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar pacientes, citas..."
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
          <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            <ResultsList />
          </div>
        )}
      </div>

      {/* ── Mobile search icon button (hidden above sm) ─────────────── */}
      <button
        className="sm:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        onClick={() => setMobileOpen(true)}
        aria-label="Buscar"
      >
        <Search className="w-5 h-5" />
      </button>
    </>
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

// ── NotificationCenter ─────────────────────────────────────────────────────────
interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  resourceType?: string
  resourceId?: string
  read: boolean
  createdAt: string
}

const NOTIF_ICON_COLOR: Record<string, string> = {
  APPOINTMENT_TAKEOVER:        'bg-orange-100 text-orange-600',
  APPOINTMENT_REASSIGNED_FROM: 'bg-yellow-100 text-yellow-700',
  APPOINTMENT_REASSIGNED_TO:   'bg-blue-100 text-blue-600',
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs} h`
  return `Hace ${Math.floor(hrs / 24)} días`
}

function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Poll unread count every 30s
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.notifications.unreadCount() as { data: { count: number } }
      setUnreadCount(res.data.count)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Load full list when opened
  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.notifications.list()
      .then((res: unknown) => {
        setNotifications((res as { data: AppNotification[] }).data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function markAllRead() {
    await api.notifications.markAllRead().catch(() => {})
    setNotifications(n => n.map(x => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  async function handleClick(notif: AppNotification) {
    if (!notif.read) {
      await api.notifications.markRead(notif.id).catch(() => {})
      setNotifications(n => n.map(x => x.id === notif.id ? { ...x, read: true } : x))
      setUnreadCount(c => Math.max(0, c - 1))
    }
    if (notif.resourceType === 'Appointment' && notif.resourceId) {
      setOpen(false)
      router.push(`/agenda/${notif.resourceId}`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full px-4 py-3 text-left flex items-start gap-3 hover:bg-gray-50 transition-colors',
                      !n.read && 'bg-blue-50/50'
                    )}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', NOTIF_ICON_COLOR[n.type] ?? 'bg-gray-100 text-gray-500')}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-semibold text-gray-900 truncate', !n.read && 'text-blue-900')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
          fullName: `${firstName} ${lastName}`.trim() || (session.user.email ?? ''),
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
    <header className="bg-white border-b border-gray-200">
      {/* ── Main row ──────────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 lg:px-6 py-3 flex items-center gap-2 sm:gap-3">
        {/* Hamburger — visible only below lg */}
        <button
          className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg shrink-0 text-gray-600"
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          aria-label="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>

        {/* Right group: search + actions (desktop) + notifications + avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          <GlobalSearch />
          {/* Actions inline — desktop only */}
          {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
          <NotificationCenter />
          <UserAvatar />
        </div>
      </div>

      {/* ── Actions second row — mobile only ──────────────────────── */}
      {actions && (
        <div className="sm:hidden px-3 pb-3 flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
