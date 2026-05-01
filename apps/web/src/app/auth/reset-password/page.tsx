'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, ShieldCheck, Lock, CheckCircle, ArrowRight } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth-split-layout'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const inputClass = 'w-full px-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3730a3] focus:border-transparent transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const btnClass = 'w-full bg-[#3730a3] hover:bg-[#312e81] disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2'

const FEATURES = [
  { icon: <ShieldCheck className="w-4 h-4 text-white" />, text: 'Mínimo 8 caracteres requeridos' },
  { icon: <Lock className="w-4 h-4 text-white" />, text: 'Cifrado de extremo a extremo' },
  { icon: <CheckCircle className="w-4 h-4 text-white" />, text: 'Cambio inmediato y seguro' },
]

const LAYOUT_PROPS = {
  headline: 'Crea una contraseña segura.',
  subline: 'Protege tu cuenta con una contraseña única que solo tú conozcas.',
  features: FEATURES,
}

type PageState = 'checking' | 'invalid' | 'form' | 'loading' | 'success'

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: '', width: '0%' }
  const strong = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw)
  const medium = pw.length >= 8
  if (strong) return { label: 'Fuerte', color: 'bg-green-500', width: '100%' }
  if (medium) return { label: 'Media', color: 'bg-yellow-400', width: '60%' }
  return { label: 'Débil', color: 'bg-red-400', width: '30%' }
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [pageState, setPageState] = useState<PageState>('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(3)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!token) { setPageState('invalid'); return }

    fetch(`${API_URL}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { valid: boolean }) => setPageState(data.valid ? 'form' : 'invalid'))
      .catch(() => setPageState('invalid'))
  }, [token])

  useEffect(() => {
    if (pageState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(countdownRef.current!); router.push('/login'); return 0 }
          return c - 1
        })
      }, 1000)
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [pageState, router])

  const passwordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const canSubmit = passwordValid && passwordsMatch
  const strength = getPasswordStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPageState('loading')
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No se pudo actualizar la contraseña. Intenta de nuevo.')
        setPageState('form')
        return
      }

      setPageState('success')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setPageState('form')
    }
  }

  // ── Checking ───────────────────────────────────────────────────────────────
  if (pageState === 'checking') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enlace no válido</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Este enlace ya no es válido. Puede haber expirado o ya fue utilizado.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/forgot-password"
            className="w-full bg-[#3730a3] hover:bg-[#312e81] text-white font-semibold py-3.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            Solicitar un nuevo enlace <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <AuthSplitLayout {...LAYOUT_PROPS}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
          <p className="text-sm text-gray-500">Tu contraseña fue actualizada correctamente.</p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-600">
          Serás redirigido al inicio de sesión en{' '}
          <span className="font-semibold text-gray-900">{countdown}s</span>…
        </div>
      </AuthSplitLayout>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <AuthSplitLayout {...LAYOUT_PROPS}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva contraseña</h1>
        <p className="text-sm text-gray-500">Mínimo 8 caracteres, una mayúscula y un número.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className={labelClass}>Nueva contraseña</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <p className={`text-xs font-medium ${strength.label === 'Fuerte' ? 'text-green-600' : strength.label === 'Media' ? 'text-yellow-600' : 'text-red-500'}`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className={labelClass}>Confirmar contraseña</label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">{error}</p>
        )}

        <button type="submit" disabled={!canSubmit || pageState === 'loading'} className={btnClass}>
          {pageState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {pageState === 'loading' ? 'Guardando…' : <>Establecer contraseña <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </AuthSplitLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
