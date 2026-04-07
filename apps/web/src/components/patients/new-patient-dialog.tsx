'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { X } from 'lucide-react'

interface NewPatientDialogProps {
  onClose: () => void
  onCreated: () => void
}

export function NewPatientDialog({ onClose, onCreated }: NewPatientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    bloodType: 'UNKNOWN',
    curp: '',
    address: '',
    city: '',
    state: '',
    allergies: '',
    chronicConditions: '',
    emergencyName: '',
    emergencyPhone: '',
    privacyConsent: false,
    dataConsent: false,
  })

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.privacyConsent || !form.dataConsent) {
      setError('El paciente debe aceptar el aviso de privacidad y el consentimiento de datos')
      return
    }

    setLoading(true)
    setError('')

    try {
      await api.patients.create({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        gender: form.gender || undefined,
        bloodType: form.bloodType || 'UNKNOWN',
        curp: form.curp || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        allergies: form.allergies ? form.allergies.split(',').map((s) => s.trim()) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map((s) => s.trim()) : [],
        emergencyName: form.emergencyName || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        privacyConsentAt: form.privacyConsent ? new Date().toISOString() : undefined,
        dataConsentAt: form.dataConsent ? new Date().toISOString() : undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar paciente')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Registrar nuevo paciente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Datos personales</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nombre(s) *</label>
                <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apellidos *</label>
                <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>WhatsApp (con lada) *</label>
                <input required placeholder="+521234567890" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Correo electrónico</label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fecha de nacimiento</label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sexo</label>
                <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputClass}>
                  <option value="">Sin especificar</option>
                  <option value="FEMALE">Femenino</option>
                  <option value="MALE">Masculino</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Grupo sanguíneo</label>
                <select value={form.bloodType} onChange={(e) => set('bloodType', e.target.value)} className={inputClass}>
                  {['UNKNOWN','A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG'].map((bt) => (
                    <option key={bt} value={bt}>{bt.replace('_', '').replace('POS', '+').replace('NEG', '-').replace('UNKNOWN', 'Desconocido')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>CURP</label>
                <input maxLength={18} value={form.curp} onChange={(e) => set('curp', e.target.value.toUpperCase())} className={inputClass} placeholder="18 caracteres" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Domicilio</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Medical background */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Antecedentes médicos</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Alergias (separadas por comas)</label>
                <input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Penicilina, Sulfa..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Enfermedades crónicas (separadas por comas)</label>
                <input value={form.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} placeholder="Diabetes, Hipertensión..." className={inputClass} />
              </div>
            </div>
          </div>

          {/* Emergency contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Contacto de emergencia</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nombre</label>
                <input value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Consent — LFPDPPP */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Consentimiento — LFPDPPP</h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacyConsent}
                onChange={(e) => set('privacyConsent', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs text-gray-700">
                El paciente ha recibido y aceptado el <strong>Aviso de Privacidad</strong> de la clínica conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.dataConsent}
                onChange={(e) => set('dataConsent', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-xs text-gray-700">
                El paciente otorga su <strong>consentimiento para el tratamiento de sus datos personales sensibles</strong> (datos de salud) con fines de atención médica.
              </span>
            </label>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Registrando...' : 'Registrar paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
