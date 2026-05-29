'use client'

import { useState, useEffect, useMemo } from 'react'
import { getUserRole } from '@/lib/api'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Save, Plus, Loader2, Mail, UserCheck, UserX, RefreshCw, Shield, Stethoscope, Pencil, Trash2, Check, X, MoreHorizontal, TrendingUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EcgLoader } from '@/components/ui/ecg-loader'

type TabId = 'clinica' | 'usuarios' | 'horarios' | 'tipos-cita' | 'catalogo' | 'plantillas' | 'whatsapp' | 'pagos' | 'privacidad'

const TABS: { id: TabId; label: string }[] = [
  { id: 'clinica',     label: 'Perfil clínica' },
  { id: 'usuarios',    label: 'Usuarios' },
  { id: 'horarios',    label: 'Horarios' },
  { id: 'catalogo',    label: 'Catálogo' },
  { id: 'plantillas',  label: 'Plantillas' },
  { id: 'whatsapp',    label: 'WhatsApp' },
  { id: 'pagos',       label: 'Pagos' },
  { id: 'privacidad',  label: 'Privacidad' },
]

// ── Clinic Profile ──────────────────────────────────────────────
function ClinicTab() {
  const [form, setForm] = useState({ name: '', rfc: '', phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.configuracion.getClinic()
      .then((res: any) => res?.data && setForm(f => ({ ...f, ...res.data })))
      .catch(() => {})
  }, [])

  const fields = [
    { key: 'name',    label: 'Nombre de la clínica', placeholder: 'Clínica Integral de la Mujer' },
    { key: 'rfc',     label: 'RFC',                   placeholder: 'CIM240115ABC' },
    { key: 'phone',   label: 'Teléfono',               placeholder: '+52 55 1234 5678' },
    { key: 'email',   label: 'Email',                  placeholder: 'contacto@clinica.mx' },
    { key: 'address', label: 'Dirección',              placeholder: 'Av. Insurgentes Sur 1234, CDMX' },
  ]

  return (
    <div className="max-w-lg space-y-4">
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
          <input type="text" value={form[key as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      ))}
      <button disabled={saving}
        onClick={() => {
          setSaving(true)
          api.configuracion.updateClinic(form)
            .then(() => alert('Guardado'))
            .catch((e: any) => alert(e.message ?? 'Error'))
            .finally(() => setSaving(false))
        }}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </button>
    </div>
  )
}

// ── Plan badge ────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  esencial:     'Esencial',
  profesional:  'Profesional',
  clinica:      'Clínica',
  'clinica-plus': 'Clínica Plus',
  // backward-compat
  BASIC:        'Esencial',
  PRO:          'Profesional',
  ENTERPRISE:   'Clínica',
}
const PLAN_COLORS: Record<string, string> = {
  esencial:     'bg-blue-500/15 text-blue-400',
  profesional:  'bg-primary/15 text-primary',
  clinica:      'bg-yellow-500/15 text-yellow-400',
  'clinica-plus': 'bg-green-500/15 text-green-400',
  BASIC:        'bg-blue-500/15 text-blue-400',
  PRO:          'bg-primary/15 text-primary',
  ENTERPRISE:   'bg-yellow-500/15 text-yellow-400',
}

// ── Plan definitions (must match API LIMITS) ─────────────────────
const PLAN_ORDER = ['esencial', 'profesional', 'clinica', 'clinica-plus']
const PLAN_CANONICAL: Record<string, string> = { BASIC: 'esencial', PRO: 'profesional', ENTERPRISE: 'clinica' }

const UPGRADE_PLANS = [
  { id: 'esencial',    name: 'Esencial',     monthly: 1299, doctors: 2,   staff: 1,  features: ['2 médicos', '1 administrativo', 'Agenda', 'Recetas', 'Cobros'] },
  { id: 'profesional', name: 'Profesional',  monthly: 2499, doctors: 5,   staff: 2,  features: ['5 médicos', '2 administrativos', 'WhatsApp', 'IA', 'Facturación'] },
  { id: 'clinica',     name: 'Clínica',      monthly: 4999, doctors: 20,  staff: 5,  features: ['20 médicos', '5 administrativos', 'Soporte prioritario', 'API access'] },
]

// ── Users / Team Management ──────────────────────────────────────
function UsuariosTab() {
  const [data, setData] = useState<{
    users: any[]
    plan: string
    limits: { DOCTOR: number; STAFF: number }
    doctorCount: number
    staffCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'DOCTOR', specialty: '', licenseNumber: '' })
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', specialty: '', licenseNumber: '' })
  const [callerRole, setCallerRole] = useState<string>('')
  const [menuPos, setMenuPos] = useState<{ id: string; top: number; right: number; user: any } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState('')

  useEffect(() => { getUserRole().then(r => setCallerRole(r ?? '')).catch(() => {}) }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuPos) return
    const handler = () => setMenuPos(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuPos])

  const load = () => {
    setLoading(true)
    api.configuracion.users()
      .then((res: any) => { setData(res?.data ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleInvite() {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Nombre, apellido y email son requeridos')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.configuracion.inviteUser(form)
      setShowInvite(false)
      setForm({ firstName: '', lastName: '', email: '', role: 'DOCTOR', specialty: '', licenseNumber: '' })
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al enviar invitación')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: any) {
    setActionId(user.id)
    setMenuPos(null)
    try {
      await api.configuracion.updateUser(user.id, { isActive: !user.isActive })
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error')
    } finally {
      setActionId(null)
    }
  }

  async function handleSaveEdit(user: any) {
    setActionId(user.id + '_edit')
    setError('')
    try {
      const res: any = await api.configuracion.updateUser(user.id, editForm)
      setEditingId(null)
      // If email was changed, confirm it actually updated
      const savedEmail = res?.data?.email ?? res?.email
      if (editForm.email && savedEmail && savedEmail !== editForm.email) {
        setError('Cambios guardados. El correo no se actualizó (reintenta en unos segundos).')
      } else {
        setError('✓ Cambios guardados')
      }
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(user: any) {
    setActionId(user.id + '_delete')
    setPendingDelete(null)
    setMenuPos(null)
    try {
      await api.configuracion.deleteUser(user.id)
      setError(`✓ ${user.firstName} ${user.lastName} eliminado`)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar')
    } finally {
      setActionId(null)
    }
  }

  async function handleChangeRole(user: any, newRole: 'DOCTOR' | 'ADMIN') {
    setActionId(user.id + '_role')
    setMenuPos(null)
    setError('')
    try {
      await api.configuracion.changeUserRole(user.id, newRole)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al cambiar rol')
    } finally {
      setActionId(null)
    }
  }

  async function handleResend(user: any) {
    setActionId(user.id + '_resend')
    setMenuPos(null)
    setError('')
    try {
      await api.configuracion.resendInvite(user.id)
      setError(`✓ Acceso reenviado a ${user.email}`)
    } catch (e: any) {
      setError(e.message ?? 'Error al reenviar')
    } finally {
      setActionId(null)
    }
  }

  async function handleUpgrade(planId: string) {
    setUpgradeLoading(planId)
    setUpgradeError('')
    try {
      const res: any = await api.configuracion.upgradeSession(planId, false)
      if (res?.data?.url) window.location.href = res.data.url
    } catch (e: any) {
      setUpgradeError(e.message ?? 'Error al iniciar el upgrade')
    } finally {
      setUpgradeLoading(null)
    }
  }

  if (loading) return <div className="py-8"><EcgLoader size={48} /></div>

  const plan = data?.plan ?? 'BASIC'
  const canonicalPlan = PLAN_CANONICAL[plan] ?? plan
  const currentPlanIdx = PLAN_ORDER.indexOf(canonicalPlan)
  const limits = data?.limits ?? { DOCTOR: 2, STAFF: 1 }
  // Only show active users — inactive (soft-deleted) have their access revoked and are hidden
  const activeUsers = (data?.users ?? []).filter((u: any) => u.isActive !== false)
  const doctors = activeUsers.filter((u: any) => u.role === 'DOCTOR' || u.role === 'ADMIN')
  const staff   = activeUsers.filter((u: any) => u.role === 'STAFF')
  const availableUpgrades = UPGRADE_PLANS.filter(p => PLAN_ORDER.indexOf(p.id) > currentPlanIdx)

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Feedback banner */}
      {error && (
        <div className={cn(
          'px-4 py-2.5 rounded-lg text-sm font-medium',
          error.startsWith('✓') ? 'bg-success/10 text-success border border-success/15' : 'bg-destructive/10 text-destructive border border-destructive/15'
        )}>
          {error}
          <button onClick={() => setError('')} className="float-right text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Plan quota summary */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Usuarios de tu plan</h3>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', PLAN_COLORS[plan] ?? 'bg-muted text-foreground/80')}>
              Plan {PLAN_LABELS[plan] ?? plan}
            </span>
            {callerRole === 'ADMIN' && availableUpgrades.length > 0 && (
              <button onClick={() => setShowUpgrade(v => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium border border-primary/30 hover:border-primary/60 px-2.5 py-0.5 rounded-full transition-colors">
                <TrendingUp className="w-3 h-3" /> Mejorar plan
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Médicos + Admins */}
          {(() => {
            const used = data?.doctorCount ?? 0
            const max  = limits.DOCTOR
            const pct  = Math.min(100, (used / max) * 100)
            const full = used >= max
            return (
              <div className={cn('rounded-lg p-3', full ? 'bg-destructive/10' : 'bg-primary/10')}>
                <div className="flex items-center gap-2 mb-1">
                  <Stethoscope className={cn('w-4 h-4', full ? 'text-destructive' : 'text-primary')} />
                  <p className={cn('text-xs font-medium', full ? 'text-destructive' : 'text-primary')}>Médicos y Admins</p>
                </div>
                <p className={cn('text-2xl font-bold', full ? 'text-destructive' : 'text-primary')}>
                  {used}<span className="text-sm font-normal text-muted-foreground/60"> / {max}</span>
                </p>
                <div className={cn('w-full rounded-full h-1.5 mt-2', full ? 'bg-destructive/15' : 'bg-primary/15')}>
                  <div className={cn('h-1.5 rounded-full transition-all', full ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
                </div>
                {full && <p className="text-xs text-destructive mt-1.5 font-medium">Límite alcanzado</p>}
              </div>
            )
          })()}
          {/* Administrativos STAFF */}
          {(() => {
            const used = data?.staffCount ?? 0
            const max  = limits.STAFF
            const pct  = Math.min(100, (used / max) * 100)
            const full = used >= max
            return (
              <div className={cn('rounded-lg p-3', full ? 'bg-destructive/10' : 'bg-warning/10')}>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className={cn('w-4 h-4', full ? 'text-destructive' : 'text-warning')} />
                  <p className={cn('text-xs font-medium', full ? 'text-destructive' : 'text-warning')}>Administrativos</p>
                </div>
                <p className={cn('text-2xl font-bold', full ? 'text-destructive' : 'text-warning')}>
                  {used}<span className="text-sm font-normal text-muted-foreground/60"> / {max}</span>
                </p>
                <div className={cn('w-full rounded-full h-1.5 mt-2', full ? 'bg-destructive/15' : 'bg-warning/15')}>
                  <div className={cn('h-1.5 rounded-full transition-all', full ? 'bg-destructive' : 'bg-warning')} style={{ width: `${pct}%` }} />
                </div>
                {full && <p className="text-xs text-destructive mt-1.5 font-medium">Límite alcanzado</p>}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Upgrade panel */}
      {showUpgrade && availableUpgrades.length > 0 && (
        <div className="bg-card rounded-xl border border-primary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Mejora tu plan</p>
              <p className="text-xs text-muted-foreground">Solo puedes hacer upgrade, no downgrade</p>
            </div>
            <button onClick={() => setShowUpgrade(false)} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          {upgradeError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{upgradeError}</p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {availableUpgrades.map(p => (
              <div key={p.id} className="border border-border rounded-xl p-4 space-y-3 hover:border-primary/50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xl font-bold text-primary mt-0.5">${p.monthly.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mes</span></p>
                </div>
                <ul className="space-y-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-success shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleUpgrade(p.id)} disabled={upgradeLoading === p.id}
                  className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {upgradeLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  Cambiar a {p.name}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Serás redirigido a Stripe para completar el pago de forma segura.</p>
        </div>
      )}

      {/* Users table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Equipo</h3>
          {callerRole === 'ADMIN' && (
            <button onClick={() => { setShowInvite(true); setError('') }}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              <Plus className="w-3.5 h-3.5" /> Invitar usuario
            </button>
          )}
        </div>

        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', ''].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {[...doctors, ...staff].map((user: any) => {
              const isPending = !user.authUserId
              const isDoctor  = user.role === 'DOCTOR' || user.role === 'ADMIN'
              const isEditing = editingId === user.id
              const isDeleting = actionId === user.id + '_delete'
              const confirmDel = pendingDelete === user.id

              return (
                <tr key={user.id} className={cn('hover:bg-muted/30 transition-colors', !user.isActive && 'opacity-50')}>
                  {/* Name cell */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                          <input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                            className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Nombre" />
                          <input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                            className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Apellido" />
                        </div>
                        {isDoctor && (
                          <div className="flex gap-1">
                            <input value={editForm.specialty} onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))}
                              className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Especialidad" />
                            <input value={editForm.licenseNumber} onChange={e => setEditForm(f => ({ ...f, licenseNumber: e.target.value }))}
                              className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Cédula" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                        {isDoctor && user.specialty && user.specialty.trim().length > 1 && (
                          <p className="text-xs text-muted-foreground">{user.specialty.trim()}</p>
                        )}
                        {isDoctor && user.licenseNumber && user.licenseNumber.trim().length > 0 && (
                          <p className="text-xs text-muted-foreground/60">Céd. {user.licenseNumber.trim()}</p>
                        )}
                      </>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {isEditing ? (
                      <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                        type="email"
                        className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="correo@clinica.mx" />
                    ) : user.email}
                  </td>

                  {/* Role badge */}
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      user.role === 'ADMIN' ? 'bg-violet-500/15 text-violet-400' :
                      isDoctor ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'
                    )}>
                      {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : isDoctor ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {user.role === 'ADMIN' ? 'Admin' : isDoctor ? 'Médico' : 'Administrativo'}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full">
                        <Mail className="w-3 h-3" /> Pendiente
                      </span>
                    ) : user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/15 px-2 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <UserX className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSaveEdit(user)} disabled={actionId === user.id + '_edit'}
                          className="text-xs text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
                          {actionId === user.id + '_edit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Guardar
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : confirmDel ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive font-medium">¿Eliminar?</span>
                        <button onClick={() => handleDelete(user)} disabled={isDeleting}
                          className="text-xs bg-destructive text-white px-2.5 py-1 rounded-lg hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1">
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          Sí, eliminar
                        </button>
                        <button onClick={() => setPendingDelete(null)}
                          className="text-xs border border-border px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-muted/50">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {/* Edit */}
                        <button
                          onClick={() => { setEditingId(user.id); setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email ?? '', specialty: user.specialty ?? '', licenseNumber: user.licenseNumber ?? '' }) }}
                          title="Editar"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Resend */}
                        <button onClick={() => handleResend(user)} disabled={actionId === user.id + '_resend'}
                          title="Reenviar acceso"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors disabled:opacity-50">
                          {actionId === user.id + '_resend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </button>
                        {/* More — fixed-position dropdown to avoid overflow-hidden clipping */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setMenuPos(menuPos?.id === user.id ? null : {
                              id: user.id,
                              top: rect.bottom + 4,
                              right: window.innerWidth - rect.right,
                              user,
                            })
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {(data?.users ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No hay usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Fixed-position dropdown — renders outside overflow-hidden table container */}
      {menuPos && (
        <div
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 50 }}
          className="w-52 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1"
          onClick={e => e.stopPropagation()}
        >
          {menuPos.user.role !== 'ADMIN' && (
            <button onClick={() => handleToggleActive(menuPos.user)} disabled={actionId === menuPos.user.id}
              className={cn('w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                menuPos.user.isActive ? 'text-warning' : 'text-success')}>
              {actionId === menuPos.user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : menuPos.user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {menuPos.user.isActive ? 'Desactivar' : 'Activar'}
            </button>
          )}
          {callerRole === 'ADMIN' && menuPos.user.role === 'DOCTOR' && (
            <button onClick={() => handleChangeRole(menuPos.user, 'ADMIN')} disabled={actionId === menuPos.user.id + '_role'}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 hover:bg-muted/50 transition-colors disabled:opacity-50">
              {actionId === menuPos.user.id + '_role' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
              Hacer Admin
            </button>
          )}
          {callerRole === 'ADMIN' && menuPos.user.role === 'ADMIN' && (
            <button onClick={() => handleChangeRole(menuPos.user, 'DOCTOR')} disabled={actionId === menuPos.user.id + '_role'}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 hover:bg-muted/50 transition-colors disabled:opacity-50">
              {actionId === menuPos.user.id + '_role' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
              Quitar Admin
            </button>
          )}
          {callerRole === 'ADMIN' && menuPos.user.role !== 'ADMIN' && (
            <>
              <div className="h-px bg-border/60 my-1" />
              <button onClick={() => { setPendingDelete(menuPos.user.id); setMenuPos(null) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar usuario
              </button>
            </>
          )}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="bg-card rounded-xl border border-primary p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">Invitar nuevo usuario</p>

          {/* Role selector */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'DOCTOR', label: 'Médico',         desc: 'Acceso completo',          icon: Stethoscope, color: 'border-primary bg-primary/10',  activeColor: 'text-primary' },
              { value: 'STAFF',  label: 'Administrativo', desc: 'Agenda, Pacientes, Cobros', icon: Shield,      color: 'border-warning bg-warning/10', activeColor: 'text-warning' },
              { value: 'ADMIN',  label: 'Administrador',  desc: 'Gestión completa',          icon: Shield,      color: 'border-primary bg-primary/10',  activeColor: 'text-primary' },
            ].map(opt => (
              <button key={opt.value}
                onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                className={cn('text-left p-3 rounded-xl border-2 transition-all',
                  form.role === opt.value ? opt.color : 'border-border hover:border-border/80')}>
                <div className="flex items-center gap-2 mb-1">
                  <opt.icon className={cn('w-4 h-4', form.role === opt.value ? opt.activeColor : 'text-muted-foreground')} />
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Quota warnings */}
          {form.role === 'DOCTOR' && (data?.doctorCount ?? 0) >= limits.DOCTOR && (
            <div className="bg-destructive/10 border border-destructive/15 rounded-lg px-3 py-2 text-xs text-destructive flex items-center justify-between">
              <span>⚠️ Límite de médicos alcanzado ({limits.DOCTOR}). Actualiza tu plan para agregar más.</span>
              <button onClick={() => { setShowInvite(false); setShowUpgrade(true) }}
                className="ml-2 underline font-medium whitespace-nowrap">Ver planes</button>
            </div>
          )}
          {form.role === 'STAFF' && (data?.staffCount ?? 0) >= limits.STAFF && (
            <div className="bg-destructive/10 border border-destructive/15 rounded-lg px-3 py-2 text-xs text-destructive flex items-center justify-between">
              <span>⚠️ Límite de administrativos alcanzado ({limits.STAFF}). Actualiza tu plan para agregar más.</span>
              <button onClick={() => { setShowInvite(false); setShowUpgrade(true) }}
                className="ml-2 underline font-medium whitespace-nowrap">Ver planes</button>
            </div>
          )}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'firstName',     label: 'Nombre',             placeholder: 'Mariana'        },
              { key: 'lastName',      label: 'Apellido',            placeholder: 'López'          },
              { key: 'email',         label: 'Email',               placeholder: 'doc@clinica.mx' },
              ...(form.role === 'DOCTOR' ? [
                { key: 'specialty',     label: 'Especialidad',      placeholder: 'Ginecología'    },
                { key: 'licenseNumber', label: 'Cédula profesional', placeholder: '1234567'       },
              ] : []),
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleInvite} disabled={saving}
              className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Enviar invitación
            </button>
            <button onClick={() => { setShowInvite(false); setError('') }}
              className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">El usuario recibirá un email para activar su cuenta.</p>
        </div>
      )}

      {/* Plan limits table */}
      <div className="bg-muted/50 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Límites por plan</p>
          {callerRole === 'ADMIN' && availableUpgrades.length > 0 && (
            <button onClick={() => setShowUpgrade(v => !v)}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Mejorar plan
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { id: 'esencial',    name: 'Esencial',    doctors: 2,   staff: 1,  price: '$1,299' },
            { id: 'profesional', name: 'Profesional', doctors: 5,   staff: 2,  price: '$2,499' },
            { id: 'clinica',     name: 'Clínica',     doctors: 20,  staff: 5,  price: '$4,999' },
            { id: 'clinica-plus', name: 'Clínica Plus', doctors: null, staff: null, price: 'A medida' },
          ].map(p => {
            const isCurrent = p.id === canonicalPlan
            const isLower = PLAN_ORDER.indexOf(p.id) < currentPlanIdx
            return (
              <div key={p.id} className={cn(
                'rounded-lg p-3 border transition-colors',
                isCurrent ? 'border-primary bg-primary/10' : isLower ? 'border-border bg-card opacity-50' : 'border-border bg-card'
              )}>
                <p className={cn('text-xs font-bold mb-1', isCurrent ? 'text-primary' : 'text-muted-foreground')}>{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.doctors !== null ? `${p.doctors} médico${p.doctors > 1 ? 's' : ''}` : 'Ilimitado'}</p>
                <p className="text-xs text-muted-foreground">{p.staff !== null ? `${p.staff} admin${p.staff > 1 ? 's' : ''}` : 'Ilimitado'}</p>
                <p className={cn('text-xs font-medium mt-1.5', isCurrent ? 'text-primary' : 'text-muted-foreground/70')}>{p.price}/mes</p>
                {isCurrent && <span className="text-xs text-primary font-semibold">← Tu plan</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Horarios ─────────────────────────────────────────────────────
const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]
const TIME_OPTIONS: string[] = (() => {
  const t: string[] = []
  for (let h = 6; h <= 22; h++) {
    t.push(`${String(h).padStart(2,'0')}:00`)
    if (h < 22) t.push(`${String(h).padStart(2,'0')}:30`)
  }
  return t
})()
const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90]

type DayConfig = { enabled: boolean; start: string; end: string }
type WeekConfig = Record<string, DayConfig>

// Map short key → long key for old DB format
const SHORT_TO_LONG: Record<string, string> = {
  mon: 'monday', tue: 'tuesday', wed: 'wednesday',
  thu: 'thursday', fri: 'friday', sat: 'saturday', sun: 'sunday',
}

function scheduleToWeek(cfg: any): WeekConfig {
  const defaults: Record<string, DayConfig> = {
    mon: { enabled: true,  start: '09:00', end: '19:00' },
    tue: { enabled: true,  start: '09:00', end: '19:00' },
    wed: { enabled: true,  start: '09:00', end: '19:00' },
    thu: { enabled: true,  start: '09:00', end: '19:00' },
    fri: { enabled: true,  start: '09:00', end: '19:00' },
    sat: { enabled: true,  start: '09:00', end: '15:00' },
    sun: { enabled: false, start: '09:00', end: '15:00' },
  }
  if (!cfg || typeof cfg !== 'object') return defaults
  const result: WeekConfig = { ...defaults }
  for (const day of DAYS.map(d => d.key)) {
    // Support both short ('mon') and long ('monday') key formats
    const val = cfg[day] ?? cfg[SHORT_TO_LONG[day] ?? '']
    if (Array.isArray(val) && val.length > 0) {
      // New format: { mon: [{ start, end }] }
      result[day] = { enabled: true, start: val[0].start ?? '09:00', end: val[0].end ?? '18:00' }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Old format: { monday: { start, end, enabled } }
      result[day] = { enabled: val.enabled !== false, start: val.start ?? '09:00', end: val.end ?? '18:00' }
    }
    // else: keep default
  }
  return result
}

function weekToSchedule(week: WeekConfig): Record<string, { start: string; end: string }[]> {
  const out: Record<string, { start: string; end: string }[]> = {}
  for (const [day, cfg] of Object.entries(week)) {
    if (cfg.enabled) out[day] = [{ start: cfg.start, end: cfg.end }]
  }
  return out
}

function HorariosTab() {
  const [week, setWeek] = useState<WeekConfig>({} as WeekConfig)
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.configuracion.getSchedule()
      .then((res: any) => {
        setWeek(scheduleToWeek(res?.data?.scheduleConfig))
        setDuration(res?.data?.consultationDuration ?? 30)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function toggleDay(day: string) {
    setWeek(w => ({ ...w, [day]: { ...w[day]!, enabled: !w[day]!.enabled } }))
  }

  function setDayTime(day: string, field: 'start' | 'end', value: string) {
    setWeek(w => ({ ...w, [day]: { ...w[day]!, [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await api.configuracion.updateSchedule({ scheduleConfig: weekToSchedule(week), consultationDuration: duration })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      alert(e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-8"><EcgLoader size={48} /></div>

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted border-b border-border">
          <p className="text-sm font-semibold text-foreground">Horario de atención semanal</p>
          <p className="text-xs text-muted-foreground mt-0.5">Define los días y horas en que se pueden agendar citas</p>
        </div>
        <div className="divide-y divide-border/50">
          {DAYS.map(({ key, label }) => {
            const day = week[key] ?? { enabled: false, start: '09:00', end: '18:00' }
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                {/* Toggle */}
                <button type="button" onClick={() => toggleDay(key)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 overflow-hidden ${day.enabled ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${day.enabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                </button>
                {/* Día */}
                <span className={`w-24 text-sm font-medium ${day.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                {/* Horas */}
                {day.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select value={day.start} onChange={e => setDayTime(key, 'start', e.target.value)}
                      className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-xs text-muted-foreground">a</span>
                    <select value={day.end} onChange={e => setDayTime(key, 'end', e.target.value)}
                      className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Duración de consulta */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-sm font-semibold text-foreground mb-1">Duración de consulta por defecto</p>
        <p className="text-xs text-muted-foreground mb-3">Tiempo que se bloquea en agenda por cada cita</p>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map(d => (
            <button key={d} type="button" onClick={() => setDuration(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                duration === d ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary'
              }`}>
              {d < 60 ? `${d} min` : d === 60 ? '1 hora' : `${d/60} horas`}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? '✓ Guardado' : 'Guardar horario'}
      </button>
    </div>
  )
}

// ── Appointment Types ────────────────────────────────────────────
function AppointmentTypesTab() {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.appointments.types()
      .then((res: any) => { setTypes(res?.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  if (loading) return <div className="py-8"><EcgLoader size={48} /></div>
  return (
    <div className="max-w-2xl space-y-3">
      {types.map((t, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.durationMinutes} min · ${t.price} MXN</p>
          </div>
          {t.description && <p className="text-xs text-muted-foreground max-w-xs truncate">{t.description}</p>}
        </div>
      ))}
      {types.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hay tipos de cita configurados</p>}
    </div>
  )
}

// ── Services Catalog ─────────────────────────────────────────────
const DEFAULT_SERVICES = [
  { name: 'Consulta primera vez',          price: 800,  category: 'Consulta',      taxRate: 0 },
  { name: 'Consulta de seguimiento',        price: 600,  category: 'Consulta',      taxRate: 0 },
  { name: 'Consulta de urgencia',           price: 1000, category: 'Consulta',      taxRate: 0 },
  { name: 'Telemedicina',                   price: 500,  category: 'Consulta',      taxRate: 0 },
  { name: 'Procedimiento en consultorio',   price: 1500, category: 'Procedimiento', taxRate: 0 },
]

function CatalogoTab() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '', taxRate: '0' })
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', price: '', category: '', taxRate: '0' })
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const load = () => {
    setLoading(true)
    api.billing.services()
      .then((res: any) => { setServices(res?.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleCreate() {
    if (!newForm.name || !newForm.price) return
    setSaving(true)
    try {
      await api.billing.createService({
        name: newForm.name,
        price: parseFloat(newForm.price),
        category: newForm.category || undefined,
        taxRate: parseFloat(newForm.taxRate) || 0,
      })
      setNewForm({ name: '', price: '', category: '', taxRate: '0' })
      setShowNew(false)
      load()
    } catch (e: any) { alert(e.message ?? 'Error') }
    finally { setSaving(false) }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    try {
      await api.billing.updateService(id, {
        name: editForm.name,
        price: parseFloat(editForm.price),
        category: editForm.category || undefined,
        taxRate: parseFloat(editForm.taxRate) || 0,
      })
      setEditId(null)
      load()
    } catch (e: any) { alert(e.message ?? 'Error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este servicio del catálogo?')) return
    try {
      await api.billing.deleteService(id)
      load()
    } catch (e: any) { alert(e.message ?? 'Error') }
  }

  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      await Promise.all(DEFAULT_SERVICES.map((s) => api.billing.createService(s)))
      load()
    } catch (e: any) { alert(e.message ?? 'Error') }
    finally { setSeeding(false) }
  }

  const inputCls = 'w-full border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'

  if (loading) return <div className="py-8"><EcgLoader size={48} /></div>

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Servicios que aparecen en el selector al crear una factura</p>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> Agregar servicio
        </button>
      </div>

      {/* New service form */}
      {showNew && (
        <div className="bg-primary/10 border border-primary rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nuevo servicio</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">Nombre *</label>
              <input value={newForm.name} onChange={(e) => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Consulta de primera vez" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Precio (MXN) *</label>
              <input type="text" inputMode="decimal" value={newForm.price}
                onChange={(e) => setNewForm(f => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="800" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Categoría</label>
              <input value={newForm.category} onChange={(e) => setNewForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Consulta" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">IVA</label>
              <div className="flex rounded-lg overflow-hidden border border-border text-sm">
                <button type="button" onClick={() => setNewForm(f => ({ ...f, taxRate: '0' }))}
                  className={cn('flex-1 py-1.5 text-center font-medium transition-colors',
                    newForm.taxRate === '0' ? 'bg-foreground/80 text-white' : 'bg-card text-muted-foreground hover:bg-muted/50')}>
                  No
                </button>
                <button type="button" onClick={() => setNewForm(f => ({ ...f, taxRate: '0.16' }))}
                  className={cn('flex-1 py-1.5 text-center font-medium transition-colors',
                    newForm.taxRate === '0.16' ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted/50')}>
                  16%
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newForm.name || !newForm.price}
              className="flex items-center gap-1.5 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
            <button onClick={() => setShowNew(false)}
              className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Services table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {['Servicio', 'Categoría', 'Precio', 'IVA', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {services.map((s) => editId === s.id ? (
              <tr key={s.id} className="bg-primary/10">
                <td className="px-4 py-2">
                  <input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls} />
                </td>
                <td className="px-4 py-2">
                  <input value={editForm.category} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Categoría" className={inputCls} />
                </td>
                <td className="px-4 py-2">
                  <input type="text" inputMode="decimal" value={editForm.price}
                    onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))}
                    className={inputCls} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex rounded-lg overflow-hidden border border-border text-xs w-20">
                    <button type="button" onClick={() => setEditForm(f => ({ ...f, taxRate: '0' }))}
                      className={cn('flex-1 py-1.5 text-center font-medium',
                        editForm.taxRate === '0' ? 'bg-foreground/80 text-white' : 'bg-card text-muted-foreground')}>No</button>
                    <button type="button" onClick={() => setEditForm(f => ({ ...f, taxRate: '0.16' }))}
                      className={cn('flex-1 py-1.5 text-center font-medium',
                        editForm.taxRate === '0.16' ? 'bg-primary text-white' : 'bg-card text-muted-foreground')}>16%</button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => handleUpdate(s.id)} disabled={saving}
                      className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted/50 text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={s.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{s.category ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-foreground/80">${Number(s.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                    Number(s.taxRate) > 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                    {Number(s.taxRate) > 0 ? '16%' : 'Sin IVA'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => {
                      setEditId(s.id)
                      setEditForm({ name: s.name, price: String(Number(s.price)), category: s.category ?? '', taxRate: String(Number(s.taxRate)) })
                    }}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-primary">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Sin servicios en el catálogo</p>
                  <button onClick={handleSeedDefaults} disabled={seeding}
                    className="flex items-center gap-2 mx-auto bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Cargar 5 servicios por defecto
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {services.length > 0 && (
        <button onClick={handleSeedDefaults} disabled={seeding}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 disabled:opacity-50">
          {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Agregar servicios por defecto
        </button>
      )}
    </div>
  )
}

// ── WhatsApp ─────────────────────────────────────────────────────
function WhatsAppTab() {
  const [config, setConfig] = useState({ waPhoneNumberId: '', waBearerToken: '', waVerifyToken: '' })
  const [saving, setSaving] = useState(false)
  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-primary/10 border border-primary rounded-lg p-3 text-sm text-primary">
        Configura las credenciales de la Meta WhatsApp Business API para habilitar el agente de WhatsApp.
      </div>
      {[
        { key: 'waPhoneNumberId', label: 'Phone Number ID',     placeholder: '1234567890',    type: 'text'     },
        { key: 'waBearerToken',   label: 'Bearer Token',        placeholder: 'EAAxxxxxxx...', type: 'password' },
        { key: 'waVerifyToken',   label: 'Verify Token (webhook)', placeholder: 'mi-token-secreto', type: 'password' },
      ].map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
          <input type={type} value={config[key as keyof typeof config]}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">URL del webhook</label>
        <div className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground font-mono">/api/webhooks/whatsapp</div>
      </div>
      <button onClick={() => { setSaving(true); setTimeout(() => { alert('Guardado'); setSaving(false) }, 600) }} disabled={saving}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
      </button>
    </div>
  )
}

// ── Pagos ─────────────────────────────────────────────────────────
function PagosTab() {
  const [saving, setSaving] = useState(false)
  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-success/10 border border-success/15 rounded-lg p-3 text-sm text-success">
        Conecta Stripe para generar ligas de pago y recibir notificaciones de pagos completados.
      </div>
      {[
        { label: 'Stripe Secret Key',      placeholder: 'sk_live_xxxxxxxxxxxx' },
        { label: 'Stripe Webhook Secret',  placeholder: 'whsec_xxxxxxxxxxxx' },
      ].map(({ label, placeholder }) => (
        <div key={label}>
          <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
          <input type="password" placeholder={placeholder}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">URL del webhook de Stripe</label>
        <div className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground font-mono">/api/webhooks/stripe</div>
      </div>
      <button disabled={saving} onClick={() => { setSaving(true); setTimeout(() => { alert('Guardado'); setSaving(false) }, 600) }}
        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
      </button>
    </div>
  )
}

// ── Plantillas ────────────────────────────────────────────────────
function PlantillasTab() {
  const templates = [
    { id: 'reminder_24h', name: 'Recordatorio 24 horas', msg: 'Hola {{nombre}}, te recordamos que tienes cita mañana {{fecha}} a las {{hora}} con {{doctor}}. ¿Confirmas tu asistencia?' },
    { id: 'reminder_1h',  name: 'Recordatorio 1 hora',   msg: 'Hola {{nombre}}, tu cita es en 1 hora ({{hora}}) con {{doctor}}. ¡Te esperamos!' },
    { id: 'confirmed',    name: 'Cita confirmada',        msg: 'Hola {{nombre}}, tu cita del {{fecha}} a las {{hora}} ha sido confirmada. ¡Hasta pronto!' },
    { id: 'prescription', name: 'Receta lista',           msg: 'Hola {{nombre}}, tu receta médica está lista. Descárgala aquí: {{url}}' },
    { id: 'result',       name: 'Resultado disponible',   msg: 'Hola {{nombre}}, tu resultado de {{estudio}} ya está disponible: {{url}}' },
    { id: 'payment',      name: 'Liga de pago',           msg: 'Hola {{nombre}}, tu estado de cuenta es de ${{monto}} MXN. Realiza tu pago aquí: {{url}}' },
  ]
  return (
    <div className="max-w-2xl space-y-3">
      {templates.map((t) => (
        <div key={t.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">{t.name}</p>
            <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full">Activa</span>
          </div>
          <textarea defaultValue={t.msg} rows={2}
            className="w-full text-xs text-muted-foreground border border-border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none bg-muted/50" />
        </div>
      ))}
      <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg">
        <Save className="w-4 h-4" /> Guardar plantillas
      </button>
    </div>
  )
}

// ── Privacidad ────────────────────────────────────────────────────
function PrivacidadTab() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">LFPDPPP — Ley Federal de Protección de Datos</h3>
        <div className="space-y-3">
          {[
            { label: 'Consentimiento de datos personales', desc: 'Requerir aceptación al registrar paciente' },
            { label: 'Consentimiento WhatsApp', desc: 'Solicitar autorización para enviar mensajes' },
            { label: 'Retención NOM-004', desc: 'Conservar expedientes mínimo 5 años' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground/80">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className="w-9 h-5 bg-success rounded-full shrink-0 flex items-center justify-end px-0.5 cursor-pointer">
                <div className="w-4 h-4 bg-card rounded-full shadow" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">URL del aviso de privacidad</h3>
        <input type="url" placeholder="https://tuclinica.mx/privacidad"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  clinica:     ClinicTab,
  usuarios:    UsuariosTab,
  horarios:    HorariosTab,
  'tipos-cita': AppointmentTypesTab,
  catalogo:    CatalogoTab,
  plantillas:  PlantillasTab,
  whatsapp:    WhatsAppTab,
  pagos:       PagosTab,
  privacidad:  PrivacidadTab,
}

const STAFF_TABS: TabId[] = ['horarios', 'catalogo']

export default function ConfiguracionPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const isStaff = userRole === 'STAFF'

  useEffect(() => {
    getUserRole().then(r => setUserRole(r))
  }, [])

  const visibleTabs = useMemo(
    () => isStaff ? TABS.filter(t => STAFF_TABS.includes(t.id)) : TABS,
    [isStaff]
  )

  const defaultTab: TabId = isStaff ? 'horarios' : 'clinica'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // Reset to a valid tab when role loads
  useEffect(() => {
    if (isStaff && !STAFF_TABS.includes(activeTab)) {
      setActiveTab('horarios')
    }
  }, [isStaff])

  const TabComponent = TAB_COMPONENTS[activeTab]

  return (
    <>
      <Header title="Configuración" subtitle="Administra los ajustes de tu clínica" />
      <div className="flex-1 p-3 sm:p-6 overflow-auto">
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 flex-wrap">
          {visibleTabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground/80')}>
              {tab.label}
            </button>
          ))}
        </div>
        <TabComponent />
      </div>
    </>
  )
}
