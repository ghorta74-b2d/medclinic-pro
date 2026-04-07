'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Building2, User, Check, ChevronRight, Loader2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'clinica' | 'admin' | 'plan' | 'confirmar'

const STEPS: { id: Step; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'clinica', label: 'Datos de la clínica', icon: Building2 },
  { id: 'admin', label: 'Médico administrador', icon: User },
  { id: 'plan', label: 'Plan', icon: Check },
]

const PLANS = [
  { id: 'FREE', name: 'Free', price: '$0 / mes', features: ['1 médico', '50 pacientes', 'Sin WhatsApp'], color: 'border-gray-600' },
  { id: 'STARTER', name: 'Starter', price: '$499 / mes', features: ['3 médicos', '500 pacientes', 'WhatsApp básico'], color: 'border-blue-500', popular: false },
  { id: 'PRO', name: 'Pro', price: '$999 / mes', features: ['Médicos ilimitados', 'Pacientes ilimitados', 'WhatsApp + Voz IA', 'Telemedicina'], color: 'border-purple-500', popular: true },
  { id: 'ENTERPRISE', name: 'Enterprise', price: 'Precio especial', features: ['Todo lo de Pro', 'SLA garantizado', 'Onboarding dedicado'], color: 'border-yellow-500' },
]

export default function NuevaClinicaPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('clinica')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [clinic, setClinic] = useState({
    name: '', rfc: '', phone: '', email: '', address: '',
  })
  const [admin, setAdmin] = useState({
    firstName: '', lastName: '', email: '', specialty: '', licenseNumber: '',
  })
  const [plan, setPlan] = useState('PRO')

  const stepIndex = ['clinica', 'admin', 'plan'].indexOf(step)

  function validateClinic() {
    return clinic.name.trim() && clinic.phone.trim() && clinic.email.trim()
  }
  function validateAdmin() {
    return admin.firstName.trim() && admin.lastName.trim() && admin.email.trim() && admin.specialty.trim() && admin.licenseNumber.trim()
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      await (api as any).superadmin.createClinic({ clinic: { ...clinic, plan }, admin })
      setSuccess(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear la clínica')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16 text-center">
        <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">¡Clínica creada exitosamente!</h2>
        <p className="text-gray-400 text-sm mb-2">
          Se envió un email de invitación a <strong className="text-white">{admin.email}</strong>
        </p>
        <p className="text-gray-500 text-xs mb-8">
          El médico deberá hacer clic en el link del email para activar su cuenta y establecer contraseña.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/superadmin/clinicas')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
            Ver todas las clínicas
          </button>
          <button onClick={() => { setSuccess(false); setStep('clinica'); setClinic({ name:'',rfc:'',phone:'',email:'',address:'' }); setAdmin({ firstName:'',lastName:'',email:'',specialty:'',licenseNumber:'' }) }}
            className="border border-gray-700 text-gray-300 hover:bg-gray-800 px-5 py-2 rounded-lg text-sm font-medium">
            Crear otra
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nueva clínica</h1>
        <p className="text-sm text-gray-400 mt-1">Alta completa en 3 pasos. Se envía invitación automática al médico.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.id
          const isDone = ['clinica', 'admin', 'plan'].indexOf(step) > i
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  isDone ? 'bg-green-500 text-white' : isActive ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500')}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn('text-sm font-medium hidden sm:block', isActive ? 'text-white' : isDone ? 'text-green-400' : 'text-gray-500')}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-px mx-3', isDone ? 'bg-green-500' : 'bg-gray-700')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">

        {/* STEP 1: Clinic data */}
        {step === 'clinica' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" /> Datos de la clínica
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Nombre de la clínica *</label>
                <input value={clinic.name} onChange={(e) => setClinic({...clinic, name: e.target.value})}
                  placeholder="Clínica Integral de la Mujer"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              {[
                { key:'phone', label:'Teléfono *', placeholder:'+52 55 1234 5678', col: '' },
                { key:'email', label:'Email de la clínica *', placeholder:'contacto@clinica.mx', col: '' },
                { key:'rfc', label:'RFC', placeholder:'CIM240115ABC', col: '' },
                { key:'address', label:'Dirección', placeholder:'Av. Insurgentes Sur 1234, CDMX', col: '' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input value={clinic[key as keyof typeof clinic]}
                    onChange={(e) => setClinic({...clinic, [key]: e.target.value})}
                    placeholder={placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setStep('admin')} disabled={!validateClinic()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Admin doctor */}
        {step === 'admin' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" /> Médico administrador
            </h2>
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 text-xs text-blue-300 flex items-start gap-2">
              <Mail className="w-4 h-4 shrink-0 mt-0.5" />
              Se enviará un email de invitación a este médico para que active su cuenta.
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key:'firstName', label:'Nombre *', placeholder:'Mariana' },
                { key:'lastName', label:'Apellido *', placeholder:'López García' },
                { key:'email', label:'Email *', placeholder:'dra.lopez@clinica.mx' },
                { key:'specialty', label:'Especialidad *', placeholder:'Ginecología y Obstetricia' },
                { key:'licenseNumber', label:'Cédula profesional *', placeholder:'1234567' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className={key === 'email' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input value={admin[key as keyof typeof admin]}
                    onChange={(e) => setAdmin({...admin, [key]: e.target.value})}
                    placeholder={placeholder}
                    type={key === 'email' ? 'email' : 'text'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep('clinica')}
                className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800">
                Atrás
              </button>
              <button onClick={() => setStep('plan')} disabled={!validateAdmin()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Plan */}
        {step === 'plan' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Selecciona el plan</h2>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  className={cn('text-left p-4 rounded-xl border-2 transition-colors relative',
                    plan === p.id ? `${p.color} bg-gray-800` : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800')}>
                  {p.popular && (
                    <span className="absolute -top-2 right-3 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">Popular</span>
                  )}
                  <p className="text-sm font-bold text-white">{p.name}</p>
                  <p className="text-xs text-purple-300 font-semibold mt-0.5">{p.price}</p>
                  <ul className="mt-2 space-y-1">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-green-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  {plan === p.id && (
                    <div className="absolute top-3 right-3 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-gray-800 rounded-xl p-4 mt-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen</p>
              <div className="flex justify-between"><span className="text-gray-400">Clínica</span><span className="text-white font-medium">{clinic.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Admin</span><span className="text-white">{admin.firstName} {admin.lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Invitación a</span><span className="text-purple-300">{admin.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Plan</span><span className="text-white font-semibold">{plan}</span></div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep('admin')}
                className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800">
                Atrás
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : <><Check className="w-4 h-4" /> Crear clínica y enviar invitación</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
