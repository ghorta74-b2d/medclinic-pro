'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, ShieldCheck } from 'lucide-react'

// Singleton — must NOT be inside the component to avoid re-creation on render
const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // MFA step — populated when signInWithPassword requires 2FA
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaOtp, setMfaOtp] = useState('')
  const [pendingRole, setPendingRole] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    // If session is null → user has TOTP enrolled and must pass the MFA challenge
    if (!data.session) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find((f) => f.status === 'verified')
      if (totpFactor) {
        setPendingRole(data.user?.user_metadata?.role ?? '')
        setMfaFactorId(totpFactor.id)
        setMfaStep(true)
        setLoading(false)
        return
      }
      // No factors → session should exist; fall through
    }

    redirectByRole(data.user?.user_metadata?.role)
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (mfaOtp.length !== 6) { setError('El código debe tener 6 dígitos'); return }
    setLoading(true)
    setError('')

    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (cErr || !challenge) throw cErr ?? new Error('No se pudo crear el desafío MFA')

      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaOtp,
      })
      if (vErr) throw vErr

      redirectByRole(pendingRole)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto. Verifica la hora del dispositivo.')
    } finally {
      setLoading(false)
    }
  }

  function redirectByRole(role?: string) {
    if (role === 'SUPER_ADMIN') {
      router.push('/superadmin')
    } else if (role === 'ADMIN' || role === 'STAFF') {
      router.push('/dashboard')
    } else {
      router.push('/agenda')
    }
  }

  const inputClass = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/logo-color.svg"
            alt="MedClinic Pro"
            className="mx-auto mb-4 h-12 w-auto object-contain"
          />
          <p className="text-gray-400 text-sm">Plataforma de gestión clínica</p>
        </div>

        {!mfaStep ? (
          // ── Paso 1: email + contraseña ────────────────────────────────────
          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        ) : (
          // ── Paso 2: código TOTP ────────────────────────────────────────────
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div className="text-center space-y-2 mb-2">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6 text-[#0071e3]" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Verificación en dos pasos</h2>
              <p className="text-sm text-gray-500">
                Ingresa el código de 6 dígitos de tu app de autenticación.
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={mfaOtp}
              onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors"
            />

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || mfaOtp.length !== 6}
              className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Verificando…' : 'Verificar'}
            </button>

            <button
              type="button"
              onClick={() => { setMfaStep(false); setMfaOtp(''); setError('') }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
