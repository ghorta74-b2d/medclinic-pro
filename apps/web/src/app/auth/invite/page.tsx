'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, ArrowRight } from 'lucide-react'

// Singleton — must NOT be inside the component to avoid losing the in-memory
// session that setSession() stores between renders.
const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

const inputClass =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors'

type State = 'loading' | 'password' | 'expired' | 'resent'

export default function InvitePage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')

  // Password-setup form
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  // Resend form
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)

    // Supabase puts error info in the hash when the OTP expires
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
      // No hash — check if they already have a session from a previous click
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0071e3] mx-auto mb-3" />
          <p className="text-sm text-gray-400">Verificando enlace…</p>
        </div>
      </div>
    )
  }

  // ── Confirmation: link resent ──────────────────────────────────────────────
  if (state === 'resent') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-8 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="Mediaclinic" className="h-11 w-auto object-contain" />
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Enlace enviado</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              Enviamos un nuevo enlace de activación a
            </p>
            <p className="text-base font-semibold text-gray-900 mb-8">{resendEmail}</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Revisa tu bandeja de entrada y sigue el enlace para activar tu cuenta. El enlace expira en 24 horas.
              <br /><br />
              Si no lo encuentras, revisa tu carpeta de{' '}
              <span className="text-gray-500 font-medium">spam o correos no deseados</span>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Expired / error: resend form ───────────────────────────────────────────
  if (state === 'expired') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-8 py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="Mediaclinic" className="h-11 w-auto object-contain" />
        </header>
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-sm w-full">
            <div className="mb-10">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">El enlace expiró</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                No te preocupes. Escribe tu correo y te enviamos uno nuevo al instante.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-5">
              <div>
                <label htmlFor="resendEmail" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
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
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {resendError}
                </p>
              )}

              <button
                type="submit"
                disabled={resendLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold text-sm px-4 py-3.5 rounded-xl transition-colors"
              >
                {resendLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                  : <>Reenviar enlace <ArrowRight className="w-4 h-4" /></>}
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

  // ── Password setup ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-8 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-color.svg" alt="Mediaclinic" className="h-11 w-auto object-contain" />
      </header>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-sm w-full">
          <div className="mb-10">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Crea tu contraseña</h1>
            <p className="text-gray-400 text-sm">Elige una contraseña segura para activar tu cuenta.</p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nueva contraseña
              </label>
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
              <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirmar contraseña
              </label>
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
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {pwError}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold text-sm px-4 py-3.5 rounded-xl transition-colors mt-2"
            >
              {pwLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Activando…</>
                : <>Activar mi cuenta <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
