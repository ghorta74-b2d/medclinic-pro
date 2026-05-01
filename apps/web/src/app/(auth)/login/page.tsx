'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, ShieldCheck, Activity, Sparkles, ArrowRight } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth-split-layout'

const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'

const FEATURES = [
  { icon: <Activity className="w-4 h-4 text-white" />, text: 'Expediente clínico inteligente' },
  { icon: <ShieldCheck className="w-4 h-4 text-white" />, text: 'Datos cifrados y cumplimiento NOM-024' },
  { icon: <Sparkles className="w-4 h-4 text-white" />, text: 'Asistente IA con WhatsApp integrado' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    if (role === 'SUPER_ADMIN') router.push('/superadmin')
    else if (role === 'ADMIN' || role === 'STAFF') router.push('/dashboard')
    else router.push('/agenda')
  }

  return (
    <AuthSplitLayout
      headline="Bienvenido a la nueva era de tu clínica."
      subline="Gestiona pacientes, agenda, expediente clínico y cobros desde una sola plataforma elegante, segura y diseñada para LATAM."
      features={FEATURES}
    >
      {!mfaStep ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inicia sesión</h1>
            <p className="text-sm text-gray-500">Accede a tu panel clínico.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Contraseña
                </label>
                <a href="/auth/forgot-password" className="text-xs text-[#3730a3] hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
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

            <button type="submit" disabled={loading} className={btnClass + ' mt-2'}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Ingresando…' : <>Ingresar al panel <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mb-8">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
              <ShieldCheck className="w-5 h-5 text-[#3730a3]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación en dos pasos</h1>
            <p className="text-sm text-gray-500">Ingresa el código de 6 dígitos de tu app de autenticación.</p>
          </div>

          <form onSubmit={handleMfaVerify} className="space-y-5">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={mfaOtp}
              onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors"
            />

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl text-center">{error}</p>
            )}

            <button type="submit" disabled={loading || mfaOtp.length !== 6} className={btnClass}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Verificando…' : 'Verificar código'}
            </button>

            <button
              type="button"
              onClick={() => { setMfaStep(false); setMfaOtp(''); setError('') }}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Volver
            </button>
          </form>
        </>
      )}
    </AuthSplitLayout>
  )
}
