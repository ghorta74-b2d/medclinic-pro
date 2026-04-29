'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const PLAN_LABELS: Record<string, string> = {
  esencial: 'Esencial',
  profesional: 'Profesional',
  clinica: 'Clínica',
}

const inputClass =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors'

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

  // ── Estado: correo enviado ─────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-8 py-6">
          <img src="/logo-color.svg" alt="MedClinic" className="h-11 w-auto object-contain" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            {/* Check mark */}
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-gray-900 mb-3">¡Todo listo!</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Enviamos el acceso a
            </p>
            <p className="text-base font-semibold text-gray-900 mb-8">{form.adminEmail}</p>

            <div className="bg-gray-50 rounded-2xl px-6 py-4 text-left mb-10">
              <p className="text-xs text-gray-400 mb-1">Próximos pasos</p>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>Revisa tu bandeja de entrada</li>
                <li>Haz clic en "Activar mi cuenta"</li>
                <li>Establece tu contraseña</li>
              </ol>
            </div>

            <Link
              href="https://mediaclinic.mx"
              className="inline-flex items-center gap-1.5 text-sm text-[#0071e3] hover:underline"
            >
              Volver al inicio <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Estado: formulario ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-8 py-6">
        <img src="/logo-color.svg" alt="MedClinic" className="h-11 w-auto object-contain" />
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full">

          {/* Hero */}
          <div className="mb-10">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              ¡Pago exitoso!
            </h1>
            <p className="text-gray-400 text-sm">
              {PLAN_LABELS[plan] ? `Plan ${PLAN_LABELS[plan]} · ` : ''}Configura tu cuenta en 30 segundos.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="clinicName" className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="adminEmail" className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                className={inputClass}
              />
              <p className="mt-2 text-xs text-gray-400">
                Recibirá el enlace de activación en este correo.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold text-sm px-4 py-3.5 rounded-xl transition-colors mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Configurando…</>
              ) : (
                <>Configurar mi cuenta <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@mediaclinic.mx" className="text-[#0071e3] hover:underline">
              Contáctanos
            </a>
          </p>
        </div>
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
