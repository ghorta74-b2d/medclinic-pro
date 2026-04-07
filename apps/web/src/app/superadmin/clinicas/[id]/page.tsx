'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import {
  Building2, User, Plus, Mail, ChevronLeft, Loader2,
  CheckCircle, XCircle, RefreshCw, Save, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Doctor {
  id: string
  firstName: string
  lastName: string
  email: string
  specialty: string
  licenseNumber: string
  isActive: boolean
  authUserId?: string
  createdAt: string
}

interface ClinicDetail {
  id: string
  name: string
  email: string
  phone: string
  rfc?: string
  address?: string
  plan: string
  isActive: boolean
  createdAt: string
  doctors: Doctor[]
  _count: { patients: number; appointments: number; invoices: number }
}

const PLAN_OPTIONS = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [clinic, setClinic] = useState<ClinicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', rfc: '', plan: '' })
  const [newDoctor, setNewDoctor] = useState({ firstName: '', lastName: '', email: '', specialty: '', licenseNumber: '', role: 'DOCTOR' })
  const [addingDoctor, setAddingDoctor] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await (api as any).superadmin.getClinic(id) as { data: ClinicDetail }
      setClinic(res.data)
      setForm({ name: res.data.name, phone: res.data.phone, email: res.data.email, address: res.data.address ?? '', rfc: res.data.rfc ?? '', plan: res.data.plan })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    try {
      await (api as any).superadmin.updateClinic(id, form)
      setEditMode(false)
      load()
    } catch { alert('Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleToggleClinic() {
    if (!clinic) return
    await (api as any).superadmin.updateClinic(id, { isActive: !clinic.isActive })
    load()
  }

  async function handleAddDoctor() {
    setAddingDoctor(true)
    try {
      await (api as any).superadmin.addDoctor(id, newDoctor)
      setShowAddDoctor(false)
      setNewDoctor({ firstName: '', lastName: '', email: '', specialty: '', licenseNumber: '', role: 'DOCTOR' })
      load()
      alert(`Invitación enviada a ${newDoctor.email}`)
    } catch (err) { alert(err instanceof Error ? err.message : 'Error') }
    finally { setAddingDoctor(false) }
  }

  async function handleResendInvite(doctor: Doctor) {
    setResendingId(doctor.id)
    try {
      await (api as any).superadmin.resendInvite(id, doctor.id)
      alert(`Invitación reenviada a ${doctor.email}`)
    } catch { alert('Error al reenviar') }
    finally { setResendingId(null) }
  }

  async function handleToggleDoctor(doctor: Doctor) {
    await (api as any).superadmin.updateDoctor(doctor.id, { isActive: !doctor.isActive })
    load()
  }

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  )
  if (!clinic) return (
    <div className="p-6 text-center text-gray-400">Clínica no encontrada</div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">{clinic.name}</h1>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              clinic.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300')}>
              {clinic.isActive ? 'Activa' : 'Inactiva'}
            </span>
            <span className="text-xs bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full font-medium">{clinic.plan}</span>
          </div>
          <p className="text-sm text-gray-400">{clinic.email} · Alta: {formatDate(clinic.createdAt)}</p>
        </div>
        <button onClick={handleToggleClinic}
          className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
            clinic.isActive ? 'border-red-700 text-red-400 hover:bg-red-900/30' : 'border-green-700 text-green-400 hover:bg-green-900/30')}>
          {clinic.isActive ? 'Desactivar' : 'Activar'} clínica
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Médicos', value: clinic.doctors.length, icon: User },
          { label: 'Pacientes', value: clinic._count.patients, icon: Users },
          { label: 'Citas totales', value: clinic._count.appointments, icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Clinic info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" /> Información de la clínica
          </h2>
          {!editMode
            ? <button onClick={() => setEditMode(true)} className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 px-3 py-1 rounded-lg">Editar</button>
            : <div className="flex gap-2">
                <button onClick={() => { setEditMode(false); setForm({ name:clinic.name, phone:clinic.phone, email:clinic.email, address:clinic.address??'', rfc:clinic.rfc??'', plan:clinic.plan }) }}
                  className="text-xs text-gray-400 border border-gray-700 px-3 py-1 rounded-lg hover:bg-gray-800">Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                </button>
              </div>
          }
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key:'name', label:'Nombre' },
            { key:'phone', label:'Teléfono' },
            { key:'email', label:'Email' },
            { key:'rfc', label:'RFC' },
            { key:'address', label:'Dirección' },
          ].map(({ key, label }) => (
            <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              {editMode
                ? <input value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({...form, [key]: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500" />
                : <p className="text-sm text-gray-200">{clinic[key as keyof ClinicDetail] as string || '—'}</p>
              }
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plan</label>
            {editMode
              ? <select value={form.plan} onChange={(e) => setForm({...form, plan: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500">
                  {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              : <p className="text-sm text-purple-300 font-semibold">{clinic.plan}</p>
            }
          </div>
        </div>
      </div>

      {/* Doctors */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-purple-400" /> Médicos ({clinic.doctors.length})
          </h2>
          <button onClick={() => setShowAddDoctor(!showAddDoctor)}
            className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium">
            <Plus className="w-3.5 h-3.5" /> Agregar médico
          </button>
        </div>

        {/* Add doctor form */}
        {showAddDoctor && (
          <div className="px-5 py-4 border-b border-gray-800 bg-gray-800/50">
            <p className="text-xs font-semibold text-gray-300 mb-3">Nuevo médico — se enviará invitación por email</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { key:'firstName', label:'Nombre', placeholder:'María' },
                { key:'lastName', label:'Apellido', placeholder:'González' },
                { key:'email', label:'Email', placeholder:'dra@clinica.mx' },
                { key:'specialty', label:'Especialidad', placeholder:'Ginecología' },
                { key:'licenseNumber', label:'Cédula', placeholder:'1234567' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input value={newDoctor[key as keyof typeof newDoctor]}
                    onChange={(e) => setNewDoctor({...newDoctor, [key]: e.target.value})}
                    placeholder={placeholder}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select value={newDoctor.role} onChange={(e) => setNewDoctor({...newDoctor, role: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500">
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddDoctor} disabled={addingDoctor || !newDoctor.email || !newDoctor.firstName}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg font-medium">
                {addingDoctor ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                Crear y enviar invitación
              </button>
              <button onClick={() => setShowAddDoctor(false)}
                className="text-xs text-gray-400 border border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-800">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Doctors table */}
        <table className="w-full">
          <thead className="bg-gray-800/30">
            <tr>
              {['Médico', 'Especialidad', 'Cédula', 'Invitación', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {clinic.doctors.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">No hay médicos. Agrega el primero.</td></tr>
            ) : clinic.doctors.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
                      {doc.firstName[0]}{doc.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{doc.firstName} {doc.lastName}</p>
                      <p className="text-xs text-gray-400">{doc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">{doc.specialty}</td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{doc.licenseNumber}</td>
                <td className="px-4 py-3">
                  {doc.authUserId ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full',
                    doc.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300')}>
                    {doc.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {!doc.authUserId && (
                      <button onClick={() => handleResendInvite(doc)} disabled={resendingId === doc.id}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-800 px-2 py-1 rounded-lg disabled:opacity-50">
                        {resendingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Reenviar
                      </button>
                    )}
                    <button onClick={() => handleToggleDoctor(doc)}
                      className={cn('text-xs px-2 py-1 rounded-lg border transition-colors',
                        doc.isActive ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-green-800 text-green-400 hover:bg-green-900/30')}>
                      {doc.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
