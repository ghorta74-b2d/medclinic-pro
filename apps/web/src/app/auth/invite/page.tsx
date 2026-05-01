'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, ArrowRight, Users, ShieldCheck, Sparkles } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth-split-layout'

const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'

const FEATURES = [
  { icon: <Users className="w-4 h-4 text-white" />, text: 'Acceso inmediato al panel clínico' },
  { icon: <ShieldCheck className="w-4 h-4 text-white" />, text: 'Datos protegidos y cifrados' },
  { icon: <Sparkles className="w-4 h-4 text-white" />, text: 'Asistente IA disponible desde el inicio' },
]

const LAYOUT_PROPS = {
  headline: 'Tu equipo te está esperando.',
  subline: 'Activa tu cuenta y comienza a colaborar con tu clínica desde el primer día.',
  features: FEATURES,
}

type State = 'loading' | 'password' | 'expired' | 'resent'

export default function InvitePage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    if (params.get('error') || params.get('error_code')) {
      setState('expired')
      return
    }

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data }) => {
          if (data.session) {
            window.history.replaceState(null, '', window.location.pathname)
            setState('password')
          } else {
            setState('expired')
          }
        })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setState(session ? 'password' : 'expired')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setPwError('Las contraseñas no coinciden'); return }
    if (password.length < 8) { setPwError('Mínimo 8 caracteres'); return }
    setPwLoading(true)
    setPwError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPwError(error.message)
      setPwLoading(false)
    } else {
      router.replace('/agenda')
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setResendLoading(true)
    setResendError('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://medclinic-api.vercel.app'
      const res = await fetch(`${apiUrl}/api/checkout/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al reenviar')
      setState('resent')
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setResendLoading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">Verificando enlace…</p>
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Link resent ────────────────────────────────────────────────────────────
  if (state === 'resent') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enlace enviado</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Enviamos un nuevo enlace de activación a tu correo.
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-600">
            Enviado a: <span className="font-semibold text-gray-900">{resendEmail}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Revisa tu bandeja de entrada. El enlace expira en 24 horas. Si no lo encuentras, revisa tu carpeta de spam.
          </p>
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (state === 'expired') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">El enlace expiró</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            No te preocupes. Escribe tu correo y te enviamos uno nuevo al instante.
          </p>
        </div>

        <form onSubmit={handleResend} className="space-y-5">
          <div>
            <label htmlFor="resendEmail" className={labelClass}>Correo electrónico</label>
            <input
              id="resendEmail"
              type="email"
              required
              placeholder="admin@tuclinica.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          {resendError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{resendError}</p>
          )}

          <button type="submit" disabled={resendLoading} className={btnClass}>
            {resendLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <>Reenviar enlace <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          ¿Necesitas ayuda?{' '}
          <a href="mailto:soporte@mediaclinic.mx" className="text-[#3730a3] hover:underline">Contáctanos</a>
        </p>
      </AuthSplitLayout>
    )
  }

  // ── Password setup ─────────────────────────────────────────────────────────
  return (
    <AuthSplitLayout {...LAYOUT_PROPS}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crea tu contraseña</h1>
        <p className="text-sm text-gray-500">Elige una contraseña segura para activar tu cuenta.</p>
      </div>

      <form onSubmit={handleSetPassword} className="space-y-5">
        <div>
          <label htmlFor="password" className={labelClass}>Nueva contraseña</label>
          <input
            id="password"
            type="password"
            required
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm" className={labelClass}>Confirmar contraseña</label>
          <input
            id="confirm"
            type="password"
            required
            placeholder="Repite la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        {pwError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{pwError}</p>
        )}

        <button type="submit" disabled={pwLoading} className={btnClass}>
          {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Activando…</> : <>Activar mi cuenta <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </AuthSplitLayout>
  )
}
