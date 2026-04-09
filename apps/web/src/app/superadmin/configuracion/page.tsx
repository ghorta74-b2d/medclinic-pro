'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import {
  Shield, Users, Plus, Search, Loader2, CheckCircle,
  XCircle, Mail, RefreshCw, Ban, UserCheck, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────
interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  lastSignInAt: string | null
  isBanned: boolean
  emailConfirmed: boolean
}

interface ClinicUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  specialty: string | null
  isActive: boolean
  authUserId: string | null
  createdAt: string
  clinic: { id: string; name: string }
}

interface Clinic { id: string; name: string }

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', DOCTOR: 'Doctor', STAFF: 'Staff',
}
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-900 text-purple-300',
  ADMIN: 'bg-blue-900 text-blue-300',
  DOCTOR: 'bg-teal-900 text-teal-300',
  STAFF: 'bg-gray-700 text-gray-300',
}

// ── Invite Superadmin Modal ────────────────────────────────────
function InviteAdminModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await (api as any).superadmin.inviteAdmin(form)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" /> Invitar Super Admin
        </h2>
        <p className="text-xs text-gray-400 mb-5">Se enviará un email de invitación con acceso total al sistema.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[{ key: 'firstName', label: 'Nombre', placeholder: 'María' },
              { key: 'lastName', label: 'Apellido', placeholder: 'López' }].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Correo electrónico</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="admin@medclinic.mx" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
          </div>

          {error && <p className="text-red-400 text-xs bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Enviando…' : 'Enviar invitación'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [tab, setTab] = useState<'admins' | 'users'>('admins')

  // Superadmins state
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)

  // Clinic users state
  const [users, setUsers] = useState<ClinicUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [clinicFilter, setClinicFilter] = useState('')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [togglingUser, setTogglingUser] = useState<string | null>(null)

  // ── Load admins ──────────────────────────────────────────────
  const loadAdmins = useCallback(async () => {
    setAdminsLoading(true)
    try {
      const res = await (api as any).superadmin.listAdmins() as { data: AdminUser[] }
      setAdmins(res.data)
    } catch (err) { console.error(err) }
    finally { setAdminsLoading(false) }
  }, [])

  // ── Load clinic users ────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const params: Record<string, string> = {}
      if (userSearch) params['q'] = userSearch
      if (clinicFilter) params['clinicId'] = clinicFilter
      const res = await (api as any).superadmin.listAllUsers(params) as { data: ClinicUser[] }
      setUsers(res.data)
    } catch (err) { console.error(err) }
    finally { setUsersLoading(false) }
  }, [userSearch, clinicFilter])

  // ── Load clinics for filter dropdown ────────────────────────
  const loadClinics = useCallback(async () => {
    try {
      const res = await (api as any).superadmin.listClinics() as { data: Clinic[] }
      setClinics(res.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadAdmins(); loadClinics() }, [loadAdmins, loadClinics])
  useEffect(() => {
    if (tab !== 'users') return
    const t = setTimeout(() => loadUsers(), userSearch ? 350 : 0)
    return () => clearTimeout(t)
  }, [tab, loadUsers, userSearch, clinicFilter])

  // ── Toggle admin ban ─────────────────────────────────────────
  async function toggleAdmin(admin: AdminUser) {
    setTogglingAdmin(admin.id)
    try {
      await (api as any).superadmin.updateAdmin(admin.id, { isBanned: !admin.isBanned })
      await loadAdmins()
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setTogglingAdmin(null) }
  }

  // ── Toggle clinic user active ────────────────────────────────
  async function toggleUser(user: ClinicUser) {
    setTogglingUser(user.id)
    try {
      await (api as any).superadmin.updateDoctor(user.id, { isActive: !user.isActive })
      setUsers(us => us.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setTogglingUser(null) }
  }

  // ── Resend invite ────────────────────────────────────────────
  async function resendInvite(user: ClinicUser) {
    setResendingId(user.id)
    try {
      await (api as any).superadmin.resendInvite(user.clinic.id, user.id)
      alert(`Invitación reenviada a ${user.email}`)
    } catch (err) { alert(err instanceof Error ? err.message : 'Error al reenviar') }
    finally { setResendingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración de usuarios</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestión de superadmins y usuarios de clínicas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { key: 'admins', label: 'Super Admins', icon: Shield },
          { key: 'users', label: 'Usuarios de Clínicas', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800')}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB: SUPER ADMINS ─────────────────────────────────── */}
      {tab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{admins.length} superadmin{admins.length !== 1 ? 's' : ''} registrado{admins.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Invitar superadmin
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                <tr>
                  {['Usuario', 'Estado', 'Email confirmado', 'Último acceso', 'Alta', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {adminsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : admins.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">No hay superadmins registrados</td></tr>
                ) : admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-900 rounded-full flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
                          {(admin.firstName[0] ?? admin.email[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {admin.firstName || admin.lastName ? `${admin.firstName} ${admin.lastName}`.trim() : '—'}
                          </p>
                          <p className="text-xs text-gray-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {admin.isBanned ? (
                        <span className="flex items-center gap-1 text-xs text-red-400"><XCircle className="w-3.5 h-3.5" /> Desactivado</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {admin.emailConfirmed
                        ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmado</span>
                        : <span className="text-xs text-yellow-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Pendiente</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {admin.lastSignInAt ? formatDate(admin.lastSignInAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(admin.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAdmin(admin)} disabled={togglingAdmin === admin.id}
                        className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50',
                          admin.isBanned
                            ? 'border-green-800 text-green-400 hover:bg-green-900/30'
                            : 'border-red-800 text-red-400 hover:bg-red-900/30')}>
                        {togglingAdmin === admin.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : admin.isBanned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        {admin.isBanned ? 'Activar' : 'Desactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: CLINIC USERS ─────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Buscar por nombre o email…"
                value={userSearch} onChange={e => setUserSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-64" />
            </div>
            <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500">
              <option value="">Todas las clínicas</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-sm text-gray-400 self-center">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                <tr>
                  {['Usuario', 'Clínica', 'Rol', 'Invitación', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    {userSearch || clinicFilter ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                  </td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-200">{user.clinic.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[user.role] ?? 'bg-gray-700 text-gray-300')}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.authUserId
                        ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Activo</span>
                        : <span className="flex items-center gap-1 text-xs text-yellow-400"><Mail className="w-3.5 h-3.5" /> Pendiente</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full',
                        user.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300')}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!user.authUserId && (
                          <button onClick={() => resendInvite(user)} disabled={resendingId === user.id}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-800 px-2 py-1 rounded-lg disabled:opacity-50">
                            {resendingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Reenviar
                          </button>
                        )}
                        <button onClick={() => toggleUser(user)} disabled={togglingUser === user.id}
                          className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50',
                            user.isActive ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-green-800 text-green-400 hover:bg-green-900/30')}>
                          {togglingUser === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && (
        <InviteAdminModal
          onClose={() => setShowInvite(false)}
          onDone={() => { setShowInvite(false); loadAdmins(); alert('Invitación enviada') }}
        />
      )}
    </div>
  )
}
