'use client'

import { useState, useEffect, useMemo } from 'react'
import { getUserRole } from '@/lib/api'
import { Header } from '@/components/layout/header'
import { api } from '@/lib/api'
import { Save, Plus, Loader2, Mail, UserCheck, UserX, RefreshCw, Shield, Stethoscope, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabId = 'clinica' | 'usuarios' | 'horarios' | 'tipos-cita' | 'catalogo' | 'plantillas' | 'whatsapp' | 'pagos' | 'privacidad'

const TABS: { id: TabId; label: string }[] = [
  { id: 'clinica',     label: 'Perfil clínica' },
  { id: 'usuarios',    label: 'Usuarios' },
  { id: 'horarios',    label: 'Horarios' },
  { id: 'tipos-cita',  label: 'Tipos de cita' },
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
const PLAN_COLORS: Record<string, string> = {
  BASIC:      'bg-muted text-foreground/80',
  PRO:        'bg-primary/15 text-primary',
  ENTERPRISE: 'bg-primary/15 text-primary',
}

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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'DOCTOR', specialty: '', licenseNumber: '' })
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', specialty: '' })
  const [callerRole, setCallerRole] = useState<string>('')

  useEffect(() => { getUserRole().then(r => setCallerRole(r ?? '')).catch(() => {}) }, [])

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
    try {
      await api.configuracion.updateUser(user.id, { isActive: !user.isActive })
      load()
    } catch (e: any) {
      alert(e.message ?? 'Error')
    } finally {
      setActionId(null)
    }
  }

  async function handleSaveEdit(user: any) {
    setActionId(user.id + '_edit')
    try {
      await api.configuracion.updateUser(user.id, editForm)
      setEditingId(null)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(user: any) {
    if (!confirm(`¿Eliminar a ${user.firstName} ${user.lastName}? Esta acción no se puede deshacer.`)) return
    setActionId(user.id + '_delete')
    try {
      await api.configuracion.deleteUser(user.id)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al eliminar')
    } finally {
      setActionId(null)
    }
  }

  async function handleChangeRole(user: any, newRole: 'DOCTOR' | 'ADMIN') {
    const label = newRole === 'ADMIN' ? 'Administrador' : 'Médico'
    if (!confirm(`¿Cambiar el rol de ${user.firstName} ${user.lastName} a ${label}?\n\nEl usuario deberá cerrar sesión y volver a entrar para ver los cambios.`)) return
    setActionId(user.id + '_role')
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

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>

  const plan = data?.plan ?? 'BASIC'
  const limits = data?.limits ?? { DOCTOR: 1, STAFF: 1 }
  const doctors = (data?.users ?? []).filter((u: any) => u.role === 'DOCTOR' || u.role === 'ADMIN')
  const staff   = (data?.users ?? []).filter((u: any) => u.role === 'STAFF')

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Feedback banner */}
      {error && (
        <div className={cn(
          'px-4 py-2.5 rounded-lg text-sm font-medium',
          error.startsWith('✓') ? 'bg-success/10 text-success border border-success/15' : 'bg-destructive/10 text-destructive border border-destructive/15'
        )}>
          {error}
        </div>
      )}

      {/* Plan quota summary */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Usuarios de tu plan</h3>
          <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', PLAN_COLORS[plan] ?? 'bg-muted text-foreground/80')}>
            Plan {plan}
          </span>
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
                  {used}<span className={cn('text-sm font-normal', full ? 'text-muted-foreground/60' : 'text-muted-foreground/60')}> / {max}</span>
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
                  {used}<span className={cn('text-sm font-normal', full ? 'text-muted-foreground/60' : 'text-muted-foreground/60')}> / {max}</span>
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

      {/* Users table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Equipo</h3>
          <button onClick={() => { setShowInvite(true); setError('') }}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Invitar usuario
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {[...doctors, ...staff].map((user: any) => {
              const isPending = !user.authUserId
              const isDoctor  = user.role === 'DOCTOR' || user.role === 'ADMIN'
              const isEditing = editingId === user.id
              return (
                <tr key={user.id} className={cn('hover:bg-muted/50', !user.isActive && 'opacity-50')}>
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
                          <input value={editForm.specialty} onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))}
                            className="w-full border border-primary rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Especialidad" />
                        )}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">{user.firstName} {user.lastName}</p>
                        {user.role === 'DOCTOR' && user.specialty && user.specialty.trim().length > 1 && (
                          <p className="text-xs text-muted-foreground">{user.specialty.trim()}</p>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      user.role === 'ADMIN' ? 'bg-primary/15 text-primary' :
                      isDoctor ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'
                    )}>
                      {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : isDoctor ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {user.role === 'ADMIN' ? 'Admin' : isDoctor ? 'Médico' : 'Administrativo'}
                    </span>
                  </td>
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
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSaveEdit(user)} disabled={actionId === user.id + '_edit'}
                          className="text-xs text-white bg-primary hover:bg-primary/90 px-2.5 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1">
                          {actionId === user.id + '_edit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Guardar
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground/80 px-2 py-1 rounded-lg border border-border">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {/* Fila primaria */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => { setEditingId(user.id); setEditForm({ firstName: user.firstName, lastName: user.lastName, specialty: user.specialty ?? '' }) }}
                            title="Editar nombre / especialidad"
                            className="text-muted-foreground hover:text-primary p-1 rounded">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResend(user)}
                            disabled={actionId === user.id + '_resend'}
                            className="text-xs text-primary hover:underline disabled:opacity-50 flex items-center gap-1">
                            {actionId === user.id + '_resend' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            {isPending ? 'Reenviar' : 'Reenviar acceso'}
                          </button>
                          {user.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={actionId === user.id}
                              className={cn('text-xs hover:underline disabled:opacity-50', user.isActive ? 'text-destructive' : 'text-success')}>
                              {actionId === user.id
                                ? <Loader2 className="w-3 h-3 animate-spin inline" />
                                : user.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                        {/* Fila secundaria — acciones de rol (solo ADMIN caller) */}
                        {callerRole === 'ADMIN' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.role === 'DOCTOR' && (
                              <button
                                onClick={() => handleChangeRole(user, 'ADMIN')}
                                disabled={actionId === user.id + '_role'}
                                title="Promover a Administrador"
                                className="text-xs text-primary hover:underline disabled:opacity-50 flex items-center gap-1">
                                {actionId === user.id + '_role' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                Hacer Admin
                              </button>
                            )}
                            {user.role === 'ADMIN' && (
                              <button
                                onClick={() => handleChangeRole(user, 'DOCTOR')}
                                disabled={actionId === user.id + '_role'}
                                title="Quitar permisos de Admin"
                                className="text-xs text-muted-foreground hover:text-primary hover:underline disabled:opacity-50 flex items-center gap-1">
                                {actionId === user.id + '_role' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
                                Quitar Admin
                              </button>
                            )}
                            {user.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleDelete(user)}
                                disabled={actionId === user.id + '_delete'}
                                title="Eliminar usuario"
                                className="text-muted-foreground hover:text-destructive p-1 rounded disabled:opacity-50">
                                {actionId === user.id + '_delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        )}
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

      {/* Invite form */}
      {showInvite && (
        <div className="bg-card rounded-xl border border-primary p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">Invitar nuevo usuario</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'DOCTOR', label: 'Médico',          desc: 'Acceso completo a la plataforma',       icon: Stethoscope, color: 'border-primary bg-primary/10',   activeColor: 'text-primary' },
              { value: 'STAFF',  label: 'Administrativo',  desc: 'Dashboard, Agenda, Pacientes y Cobros', icon: Shield,       color: 'border-warning bg-warning/10', activeColor: 'text-warning' },
              ...(callerRole === 'ADMIN' ? [
                { value: 'ADMIN',  label: 'Administrador',  desc: 'Gestión completa de la clínica y usuarios', icon: Shield, color: 'border-primary bg-primary/10', activeColor: 'text-primary' },
              ] : []),
            ].map(opt => (
              <button key={opt.value}
                onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                className={cn('text-left p-3 rounded-xl border-2 transition-all',
                  form.role === opt.value ? opt.color : 'border-border hover:border-border')}>
                <div className="flex items-center gap-2 mb-1">
                  <opt.icon className={cn('w-4 h-4', form.role === opt.value ? opt.activeColor : 'text-muted-foreground')} />
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Quota warning */}
          {form.role === 'DOCTOR' && (data?.doctorCount ?? 0) >= limits.DOCTOR && (
            <div className="bg-destructive/10 border border-destructive/15 rounded-lg px-3 py-2 text-xs text-destructive">
              ⚠️ Has alcanzado el límite de médicos de tu plan ({limits.DOCTOR}). Actualiza tu plan para agregar más.
            </div>
          )}
          {form.role === 'STAFF' && (data?.staffCount ?? 0) >= limits.STAFF && (
            <div className="bg-destructive/10 border border-destructive/15 rounded-lg px-3 py-2 text-xs text-destructive">
              ⚠️ Has alcanzado el límite de administrativos de tu plan ({limits.STAFF}). Actualiza tu plan para agregar más.
            </div>
          )}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'firstName',     label: 'Nombre',       placeholder: 'Mariana', required: true },
              { key: 'lastName',      label: 'Apellido',      placeholder: 'López',   required: true },
              { key: 'email',         label: 'Email',         placeholder: 'doc@clinica.mx', required: true },
              ...(form.role === 'DOCTOR' ? [
                { key: 'specialty',     label: 'Especialidad',  placeholder: 'Ginecología', required: false },
                { key: 'licenseNumber', label: 'Cédula profesional', placeholder: '1234567', required: false },
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
          <p className="text-xs text-muted-foreground">El usuario recibirá un email con un link para activar su cuenta.</p>
        </div>
      )}

      {/* Plan info */}
      <div className="bg-muted/50 rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Límites por plan</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { plan: 'BASIC',      doctors: 1, staff: 1 },
            { plan: 'PRO',        doctors: 4, staff: 1 },
            { plan: 'ENTERPRISE', doctors: 15, staff: 5 },
          ].map(p => (
            <div key={p.plan} className={cn(
              'rounded-lg p-3 border',
              plan === p.plan ? 'border-primary bg-primary/10' : 'border-border bg-card'
            )}>
              <p className={cn('text-xs font-bold mb-1', plan === p.plan ? 'text-primary' : 'text-muted-foreground')}>{p.plan}</p>
              <p className="text-xs text-muted-foreground">{p.doctors} médico{p.doctors > 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">{p.staff} administrativo{p.staff > 1 ? 's' : ''}</p>
            </div>
          ))}
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

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>

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
  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
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

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>

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
