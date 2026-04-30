'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const inputClass =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors'

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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-color.svg"
            alt="Mediaclinic"
            className="mx-auto mb-4 h-12 w-auto object-contain"
          />
          <p className="text-gray-400 text-sm">Plataforma de gestión clínica</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 mb-2">
              <h1 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h1>
              <p className="text-sm text-gray-500">
                Ingresa tu correo y te enviaremos las instrucciones.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Correo electrónico
              </label>
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
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Enviando…' : 'Enviar instrucciones'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
            >
              ← Volver al inicio de sesión
            </Link>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">Revisa tu correo</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Si el correo está registrado, recibirás las instrucciones en unos minutos.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-sm text-[#0071e3] hover:underline"
            >
              ← Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
