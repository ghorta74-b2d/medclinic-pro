'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'

const AVISO_PRIVACIDAD = `
AVISO DE PRIVACIDAD SIMPLIFICADO

Con fundamento en los artículos 15 y 16 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), el responsable del tratamiento de sus datos personales es la clínica propietaria de este sistema (en adelante "la Clínica").

DATOS QUE RECABAMOS
Recabamos datos de identificación (nombre, CURP, fecha de nacimiento), datos de contacto (teléfono, correo electrónico, domicilio) y datos personales sensibles de salud (historial médico, diagnósticos, tratamientos, resultados de laboratorio y cualquier otra información relacionada con su estado de salud).

FINALIDADES DEL TRATAMIENTO
Sus datos personales son utilizados para: (i) brindarle atención médica integral; (ii) llevar su expediente clínico conforme a la NOM-004-SSA3-2012; (iii) enviarle notificaciones sobre citas y resultados; (iv) facturación y gestión administrativa de la Clínica.

TRANSFERENCIAS
Sus datos no serán transferidos a terceros sin su consentimiento, salvo las excepciones previstas en el artículo 37 de la LFPDPPP (autoridades de salud, obligaciones legales).

DERECHOS ARCO
Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales (derechos ARCO). Para ejercerlos, diríjase al responsable de privacidad de la Clínica.

CAMBIOS AL AVISO
Cualquier modificación a este aviso será notificada a través de los medios disponibles en la Clínica.
`.trim()

interface NewPatientDialogProps {
  onClose: () => void
  onCreated: () => void
}

// Normaliza los 10 dígitos a formato +52XXXXXXXXXX
function buildPhone(digits: string): string {
  return `+52${digits.replace(/\D/g, '').slice(0, 10)}`
}

export function NewPatientDialog({ onClose, onCreated }: NewPatientDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [showAviso, setShowAviso] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    secondLastName: '',
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

  function handlePhoneChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    setPhoneDigits(digits)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phoneDigits.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos')
      return
    }
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
        secondLastName: form.secondLastName || undefined,
        phone: buildPhone(phoneDigits),
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth ? (() => { const [y,m,d] = form.dateOfBirth.split('-').map(Number); return new Date(y!, m!-1, d!, 12).toISOString() })() : undefined,
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
                <label className={labelClass}>Apellido Paterno *</label>
                <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apellido Materno</label>
                <input value={form.secondLastName} onChange={(e) => set('secondLastName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>WhatsApp *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600 font-medium select-none">+52</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    placeholder="5512345678"
                    value={phoneDigits}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={10}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {phoneDigits.length > 0 && phoneDigits.length < 10 && (
                  <p className="text-xs text-amber-600 mt-0.5">{10 - phoneDigits.length} dígitos restantes</p>
                )}
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

          {/* Consentimiento — LFPDPPP */}
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-blue-50 px-4 py-3 flex items-center gap-2 border-b border-blue-100">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-semibold text-blue-900">Consentimiento — LFPDPPP</span>
              <span className="ml-auto text-xs text-red-600 font-medium">Requerido *</span>
            </div>

            {/* Aviso expandible */}
            <div className="bg-white px-4 py-3 space-y-3">
              <button
                type="button"
                onClick={() => setShowAviso(!showAviso)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {showAviso ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAviso ? 'Ocultar aviso de privacidad' : 'Ver aviso de privacidad completo'}
              </button>

              {showAviso && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {AVISO_PRIVACIDAD}
                  </pre>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.privacyConsent}
                  onChange={(e) => set('privacyConsent', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  El paciente ha recibido, leído y aceptado el <strong>Aviso de Privacidad</strong> de la clínica, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dataConsent}
                  onChange={(e) => set('dataConsent', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  El paciente otorga su <strong>consentimiento expreso para el tratamiento de sus datos personales sensibles</strong> (datos de salud, diagnósticos, tratamientos) con la finalidad exclusiva de recibir atención médica.
                </span>
              </label>
            </div>
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
