'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Lock, Mail, Clock, ArrowRight } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth-split-layout'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'

const FEATURES = [
  { icon: <Lock className="w-4 h-4 text-white" />, text: 'Proceso 100% seguro y cifrado' },
  { icon: <Mail className="w-4 h-4 text-white" />, text: 'Instrucciones enviadas a tu correo' },
  { icon: <Clock className="w-4 h-4 text-white" />, text: 'Enlace válido por 1 hora' },
]

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Silenciar errores de red — mostrar siempre el mensaje neutral
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  return (
    <AuthSplitLayout
      headline="Recupera el acceso a tu clínica."
      subline="Te enviamos las instrucciones para restablecer tu contraseña de forma segura."
      features={FEATURES}
    >
      {!submitted ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500">Ingresa tu correo y te enviaremos las instrucciones.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={labelClass}>Correo electrónico</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinica.com"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">{error}</p>
            )}

            <button type="submit" disabled={loading || !email} className={btnClass + ' mt-2'}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Enviando…' : <>Enviar instrucciones <ArrowRight className="w-4 h-4" /></>}
            </button>

            <Link href="/login" className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Volver al inicio de sesión
            </Link>
          </form>
        </>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Si el correo está registrado, recibirás las instrucciones en unos minutos. Revisa también tu carpeta de spam.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-600">
              Enviado a: <span className="font-semibold text-gray-900">{email}</span>
            </div>

            <Link
              href="/login"
              className="block text-center text-sm text-[#3730a3] hover:underline"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        </>
      )}
    </AuthSplitLayout>
  )
}
