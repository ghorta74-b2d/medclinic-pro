'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, CheckCircle, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { AuthSplitLayout } from '@/components/auth-split-layout'

const PLAN_LABELS: Record<string, string> = {
  esencial: 'Esencial',
  profesional: 'Profesional',
  clinica: 'Clínica',
}

const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'

const FEATURES = [
  { icon: <CheckCircle className="w-4 h-4 text-white" />, text: 'Pago procesado de forma segura' },
  { icon: <Users className="w-4 h-4 text-white" />, text: 'Invita a tu equipo sin costo adicional' },
  { icon: <Sparkles className="w-4 h-4 text-white" />, text: 'Soporte incluido en tu plan' },
]

const LAYOUT_PROPS = {
  headline: '¡Tu suscripción está activa!',
  subline: 'Configura tu clínica en 30 segundos y comienza a atender pacientes hoy mismo.',
  features: FEATURES,
}

function ThankYouContent() {
  const params = useSearchParams()
  const plan = params.get('plan') ?? ''
  const sessionId = params.get('session_id') ?? ''

  const [form, setForm] = useState({ clinicName: '', firstName: '', lastName: '', adminEmail: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://medclinic-api.vercel.app'
      const res = await fetch(`${apiUrl}/api/checkout/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al configurar la cuenta')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // ── Cuenta configurada ─────────────────────────────────────────────────────
  if (sent) {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Todo listo!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Enviamos el enlace de activación a tu correo.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-600">
            Enviado a: <span className="font-semibold text-gray-900">{form.adminEmail}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            El enlace expira en 24 horas. Si no lo encuentras, revisa tu carpeta de spam o correos no deseados.
          </p>
          <Link
            href="https://mediaclinic.mx"
            className="inline-flex items-center gap-1.5 text-sm text-[#3730a3] hover:underline"
          >
            Volver al inicio <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Formulario de configuración ────────────────────────────────────────────
  return (
    <AuthSplitLayout {...LAYOUT_PROPS}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Configura tu cuenta</h1>
        <p className="text-sm text-gray-500">
          {PLAN_LABELS[plan] ? `Plan ${PLAN_LABELS[plan]} · ` : ''}Listo en 30 segundos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="clinicName" className={labelClass}>Nombre de la clínica</label>
          <input
            id="clinicName"
            name="clinicName"
            type="text"
            required
            placeholder="Clínica San Ángel"
            value={form.clinicName}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={labelClass}>Nombre</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              placeholder="Ana"
              value={form.firstName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>Apellido</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              placeholder="García"
              value={form.lastName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="adminEmail" className={labelClass}>Email del administrador</label>
          <input
            id="adminEmail"
            name="adminEmail"
            type="email"
            required
            placeholder="admin@tuclinica.com"
            value={form.adminEmail}
            onChange={handleChange}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-gray-400">Recibirá el enlace de activación en este correo.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
        )}

        <button type="submit" disabled={loading} className={btnClass}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Configurando…</> : <>Configurar mi cuenta <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        ¿Necesitas ayuda?{' '}
        <a href="mailto:soporte@mediaclinic.mx" className="text-[#3730a3] hover:underline">Contáctanos</a>
      </p>
    </AuthSplitLayout>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  )
}
