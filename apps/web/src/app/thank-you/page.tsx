'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const PLAN_LABELS: Record<string, string> = {
  esencial: 'Esencial',
  profesional: 'Profesional',
  clinica: 'Clínica',
}

function ThankYouContent() {
  const params = useSearchParams()
  const plan = params.get('plan') ?? ''
  const sessionId = params.get('session_id') ?? ''

  const [form, setForm] = useState({
    clinicName: '',
    firstName: '',
    lastName: '',
    adminEmail: '',
  })
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

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            ¡Invitación enviada!
          </h1>
          <p className="text-gray-500 mb-2">
            Enviamos el acceso a
          </p>
          <p className="font-semibold text-gray-900 mb-6">{form.adminEmail}</p>
          <p className="text-sm text-gray-400 mb-8">
            Revisa tu bandeja de entrada y sigue el enlace para activar tu cuenta.
            El enlace expira en 24 horas.
          </p>
          <Link
            href="https://mediaclinic.mx"
            className="inline-flex items-center gap-2 text-sm text-[#0071e3] hover:underline"
          >
            Volver al inicio <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <h1 className="text-2xl font-semibold text-gray-900">¡Pago exitoso!</h1>
            {PLAN_LABELS[plan] && (
              <span className="inline-block bg-[#0071e3] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                Plan {PLAN_LABELS[plan]}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Configura tu cuenta. Solo toma 30 segundos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la clínica
            </label>
            <input
              id="clinicName"
              name="clinicName"
              type="text"
              required
              placeholder="Clínica San Ángel"
              value={form.clinicName}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="Ana"
                value={form.firstName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Apellido
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="García"
                value={form.lastName}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email del administrador
            </label>
            <input
              id="adminEmail"
              name="adminEmail"
              type="email"
              required
              placeholder="admin@tuclinica.com"
              value={form.adminEmail}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Aquí recibirás el enlace de activación de tu cuenta.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white font-medium text-sm px-4 py-3 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Configurando…
              </>
            ) : (
              <>
                Configurar mi cuenta
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ¿Necesitas ayuda?{' '}
          <a href="mailto:soporte@mediaclinic.mx" className="text-[#0071e3] hover:underline">
            Contáctanos
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  )
}
