'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const inputClass =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent focus:bg-white transition-colors'

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
      .then((data: { valid: boolean }) => {
        setPageState(data.valid ? 'form' : 'invalid')
      })
      .catch(() => setPageState('invalid'))
  }, [token])

  useEffect(() => {
    if (pageState === 'success') {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current!)
            router.push('/login')
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [pageState, router])

  const passwordValid = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const canSubmit = passwordValid && passwordsMatch

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

  const strength = getPasswordStrength(password)

  // ── Checking ───────────────────────────────────────────────────────────────
  if (pageState === 'checking') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900">Enlace no válido</h2>
            <p className="text-sm text-gray-500">
              Este enlace ya no es válido. Puede haber expirado o ya fue utilizado.
            </p>
          </div>
          <Link
            href="/auth/forgot-password"
            className="inline-block w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm"
          >
            Solicitar un nuevo enlace
          </Link>
          <Link
            href="/login"
            className="block text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900">¡Contraseña actualizada!</h2>
            <p className="text-sm text-gray-500">Tu contraseña fue actualizada correctamente.</p>
          </div>
          <p className="text-sm text-gray-400">
            Serás redirigido al login en {countdown}…
          </p>
        </div>
      </div>
    )
  }

  // ── Form (default) ────────────────────────────────────────────────────────
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Nueva contraseña</h1>
            <p className="text-sm text-gray-500">Mínimo 8 caracteres, una mayúscula y un número.</p>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nueva contraseña
            </label>
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

            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className={`text-xs font-medium ${
                  strength.label === 'Fuerte' ? 'text-green-600' :
                  strength.label === 'Media' ? 'text-yellow-600' : 'text-red-500'
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Confirmar contraseña
            </label>
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
            <p className="text-red-600 text-sm bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || pageState === 'loading'}
            className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 mt-2"
          >
            {pageState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pageState === 'loading' ? 'Guardando…' : 'Establecer nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
