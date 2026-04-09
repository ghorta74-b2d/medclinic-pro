'use client'

import { useState, useEffect } from 'react'
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input type="text" value={form[key as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </button>
    </div>
  )
}

// ── Plan badge ────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  BASIC:      'bg-gray-100 text-gray-700',
  PRO:        'bg-blue-100 text-blue-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
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

  async function handleResend(user: any) {
    setActionId(user.id + '_resend')
    try {
      await api.configuracion.resendInvite(user.id)
      alert(`Invitación reenviada a ${user.email}`)
    } catch (e: any) {
      alert(e.message ?? 'Error')
    } finally {
      setActionId(null)
    }
  }

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>

  const plan = data?.plan ?? 'BASIC'
  const limits = data?.limits ?? { DOCTOR: 1, STAFF: 1 }
  const doctors = (data?.users ?? []).filter((u: any) => u.role === 'DOCTOR' || u.role === 'ADMIN')
  const staff   = (data?.users ?? []).filter((u: any) => u.role === 'STAFF')

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Plan quota summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Usuarios de tu plan</h3>
          <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full', PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-700')}>
            Plan {plan}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-800">Médicos</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{data?.doctorCount ?? 0}<span className="text-sm font-normal text-blue-400"> / {limits.DOCTOR}</span></p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
              <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ((data?.doctorCount ?? 0) / limits.DOCTOR) * 100)}%` }} />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-800">Administrativos</p>
            </div>
            <p className="text-2xl font-bold text-orange-700">{data?.staffCount ?? 0}<span className="text-sm font-normal text-orange-400"> / {limits.STAFF}</span></p>
            <div className="w-full bg-orange-200 rounded-full h-1.5 mt-2">
              <div className="h-1.5 bg-orange-500 rounded-full" style={{ width: `${Math.min(100, ((data?.staffCount ?? 0) / limits.STAFF) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Equipo</h3>
          <button onClick={() => { setShowInvite(true); setError('') }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            <Plus className="w-3.5 h-3.5" /> Invitar usuario
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[...doctors, ...staff].map((user: any) => {
              const isPending = !user.authUserId
              const isDoctor = user.role === 'DOCTOR' || user.role === 'ADMIN'
              return (
                <tr key={user.id} className={cn('hover:bg-gray-50', !user.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                    {user.specialty && <p className="text-xs text-gray-400">{user.specialty}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {isDoctor ? <Stethoscope className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {user.role === 'ADMIN' ? 'Admin' : isDoctor ? 'Médico' : 'Administrativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                        <Mail className="w-3 h-3" /> Pendiente
                      </span>
                    ) : user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        <UserX className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <button
                          onClick={() => handleResend(user)}
                          disabled={actionId === user.id + '_resend'}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50 flex items-center gap-1">
                          {actionId === user.id + '_resend' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Reenviar
                        </button>
                      )}
                      {user.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={actionId === user.id}
                          className={cn('text-xs hover:underline disabled:opacity-50', user.isActive ? 'text-red-500' : 'text-green-600')}>
                          {actionId === user.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : user.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {(data?.users ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No hay usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Invitar nuevo usuario</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'DOCTOR', label: 'Médico', desc: 'Acceso completo a la plataforma', icon: Stethoscope, color: 'border-blue-400 bg-blue-50' },
              { value: 'STAFF',  label: 'Administrativo', desc: 'Dashboard, Agenda, Pacientes y Cobros', icon: Shield, color: 'border-orange-400 bg-orange-50' },
            ].map(opt => (
              <button key={opt.value}
                onClick={() => setForm(f => ({ ...f, role: opt.value }))}
                className={cn('text-left p-3 rounded-xl border-2 transition-all',
                  form.role === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300')}>
                <div className="flex items-center gap-2 mb-1">
                  <opt.icon className={cn('w-4 h-4', form.role === opt.value
                    ? (opt.value === 'DOCTOR' ? 'text-blue-600' : 'text-orange-600')
                    : 'text-gray-400')} />
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                </div>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* Quota warning */}
          {form.role === 'DOCTOR' && (data?.doctorCount ?? 0) >= limits.DOCTOR && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              ⚠️ Has alcanzado el límite de médicos de tu plan ({limits.DOCTOR}). Actualiza tu plan para agregar más.
            </div>
          )}
          {form.role === 'STAFF' && (data?.staffCount ?? 0) >= limits.STAFF && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
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
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleInvite} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Enviar invitación
            </button>
            <button onClick={() => { setShowInvite(false); setError('') }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
          <p className="text-xs text-gray-400">El usuario recibirá un email con un link para activar su cuenta.</p>
        </div>
      )}

      {/* Plan info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Límites por plan</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { plan: 'BASIC',      doctors: 1, staff: 1 },
            { plan: 'PRO',        doctors: 4, staff: 1 },
            { plan: 'ENTERPRISE', doctors: 15, staff: 5 },
          ].map(p => (
            <div key={p.plan} className={cn(
              'rounded-lg p-3 border',
              plan === p.plan ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            )}>
              <p className={cn('text-xs font-bold mb-1', plan === p.plan ? 'text-blue-700' : 'text-gray-500')}>{p.plan}</p>
              <p className="text-xs text-gray-600">{p.doctors} médico{p.doctors > 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-600">{p.staff} administrativo{p.staff > 1 ? 's' : ''}</p>
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
    const val = cfg[day]
    if (Array.isArray(val) && val.length > 0) {
      result[day] = { enabled: true, start: val[0].start ?? '09:00', end: val[0].end ?? '18:00' }
    } else if (val === undefined || val === null) {
      result[day] = { ...defaults[day]!, enabled: false }
    }
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

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-800">Horario de atención semanal</p>
          <p className="text-xs text-gray-500 mt-0.5">Define los días y horas en que se pueden agendar citas</p>
        </div>
        <div className="divide-y divide-gray-100">
          {DAYS.map(({ key, label }) => {
            const day = week[key] ?? { enabled: false, start: '09:00', end: '18:00' }
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                {/* Toggle */}
                <button type="button" onClick={() => toggleDay(key)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${day.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${day.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                {/* Día */}
                <span className={`w-24 text-sm font-medium ${day.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
                {/* Horas */}
                {day.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select value={day.start} onChange={e => setDayTime(key, 'start', e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-xs text-gray-400">a</span>
                    <select value={day.end} onChange={e => setDayTime(key, 'end', e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Duración de consulta */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-800 mb-1">Duración de consulta por defecto</p>
        <p className="text-xs text-gray-500 mb-3">Tiempo que se bloquea en agenda por cada cita</p>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map(d => (
            <button key={d} type="button" onClick={() => setDuration(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                duration === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}>
              {d < 60 ? `${d} min` : d === 60 ? '1 hora' : `${d/60} horas`}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
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
  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
  return (
    <div className="max-w-2xl space-y-3">
      {types.map((t, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{t.name}</p>
            <p className="text-xs text-gray-400">{t.durationMinutes} min · ${t.price} MXN</p>
          </div>
          {t.description && <p className="text-xs text-gray-500 max-w-xs truncate">{t.description}</p>}
        </div>
      ))}
      {types.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay tipos de cita configurados</p>}
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

  const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (loading) return <div className="flex py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Servicios que aparecen en el selector al crear una factura</p>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
          <Plus className="w-3.5 h-3.5" /> Agregar servicio
        </button>
      </div>

      {/* New service form */}
      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Nuevo servicio</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
              <input value={newForm.name} onChange={(e) => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Consulta de primera vez" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio (MXN) *</label>
              <input type="text" inputMode="decimal" value={newForm.price}
                onChange={(e) => setNewForm(f => ({ ...f, price: e.target.value.replace(/[^0-9.]/g, '') }))}
                placeholder="800" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <input value={newForm.category} onChange={(e) => setNewForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Consulta" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IVA</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
                <button type="button" onClick={() => setNewForm(f => ({ ...f, taxRate: '0' }))}
                  className={cn('flex-1 py-1.5 text-center font-medium transition-colors',
                    newForm.taxRate === '0' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                  No
                </button>
                <button type="button" onClick={() => setNewForm(f => ({ ...f, taxRate: '0.16' }))}
                  className={cn('flex-1 py-1.5 text-center font-medium transition-colors',
                    newForm.taxRate === '0.16' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
                  16%
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newForm.name || !newForm.price}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar
            </button>
            <button onClick={() => setShowNew(false)}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Services table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Servicio', 'Categoría', 'Precio', 'IVA', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((s) => editId === s.id ? (
              <tr key={s.id} className="bg-blue-50">
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
                  <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs w-20">
                    <button type="button" onClick={() => setEditForm(f => ({ ...f, taxRate: '0' }))}
                      className={cn('flex-1 py-1.5 text-center font-medium',
                        editForm.taxRate === '0' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500')}>No</button>
                    <button type="button" onClick={() => setEditForm(f => ({ ...f, taxRate: '0.16' }))}
                      className={cn('flex-1 py-1.5 text-center font-medium',
                        editForm.taxRate === '0.16' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500')}>16%</button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => handleUpdate(s.id)} disabled={saving}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{s.category ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">${Number(s.price).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                    Number(s.taxRate) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
                    {Number(s.taxRate) > 0 ? '16%' : 'Sin IVA'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button onClick={() => {
                      setEditId(s.id)
                      setEditForm({ name: s.name, price: String(Number(s.price)), category: s.category ?? '', taxRate: String(Number(s.taxRate)) })
                    }}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <p className="text-sm text-gray-400 mb-3">Sin servicios en el catálogo</p>
                  <button onClick={handleSeedDefaults} disabled={seeding}
                    className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
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
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Configura las credenciales de la Meta WhatsApp Business API para habilitar el agente de WhatsApp.
      </div>
      {[
        { key: 'waPhoneNumberId', label: 'Phone Number ID',     placeholder: '1234567890',    type: 'text'     },
        { key: 'waBearerToken',   label: 'Bearer Token',        placeholder: 'EAAxxxxxxx...', type: 'password' },
        { key: 'waVerifyToken',   label: 'Verify Token (webhook)', placeholder: 'mi-token-secreto', type: 'password' },
      ].map(({ key, label, placeholder, type }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input type={type} value={config[key as keyof typeof config]}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL del webhook</label>
        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono">/api/webhooks/whatsapp</div>
      </div>
      <button onClick={() => { setSaving(true); setTimeout(() => { alert('Guardado'); setSaving(false) }, 600) }} disabled={saving}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
        Conecta Stripe para generar ligas de pago y recibir notificaciones de pagos completados.
      </div>
      {[
        { label: 'Stripe Secret Key',      placeholder: 'sk_live_xxxxxxxxxxxx' },
        { label: 'Stripe Webhook Secret',  placeholder: 'whsec_xxxxxxxxxxxx' },
      ].map(({ label, placeholder }) => (
        <div key={label}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input type="password" placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL del webhook de Stripe</label>
        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 font-mono">/api/webhooks/stripe</div>
      </div>
      <button disabled={saving} onClick={() => { setSaving(true); setTimeout(() => { alert('Guardado'); setSaving(false) }, 600) }}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
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
        <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">{t.name}</p>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activa</span>
          </div>
          <textarea defaultValue={t.msg} rows={2}
            className="w-full text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50" />
        </div>
      ))}
      <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
        <Save className="w-4 h-4" /> Guardar plantillas
      </button>
    </div>
  )
}

// ── Privacidad ────────────────────────────────────────────────────
function PrivacidadTab() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">LFPDPPP — Ley Federal de Protección de Datos</h3>
        <div className="space-y-3">
          {[
            { label: 'Consentimiento de datos personales', desc: 'Requerir aceptación al registrar paciente' },
            { label: 'Consentimiento WhatsApp', desc: 'Solicitar autorización para enviar mensajes' },
            { label: 'Retención NOM-004', desc: 'Conservar expedientes mínimo 5 años' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <div className="w-9 h-5 bg-green-500 rounded-full shrink-0 flex items-center justify-end px-0.5 cursor-pointer">
                <div className="w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">URL del aviso de privacidad</h3>
        <input type="url" placeholder="https://tuclinica.mx/privacidad"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<TabId>('clinica')
  const TabComponent = TAB_COMPONENTS[activeTab]
  return (
    <>
      <Header title="Configuración" subtitle="Administra los ajustes de tu clínica" />
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {tab.label}
            </button>
          ))}
        </div>
        <TabComponent />
      </div>
    </>
  )
}
