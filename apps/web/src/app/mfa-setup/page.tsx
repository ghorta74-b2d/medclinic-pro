'use client'

/**
 * /mfa-setup — Enrolamiento TOTP para ADMIN y DOCTOR
 *
 * Flujo:
 *  1. supabase.auth.mfa.enroll({ factorType: 'totp' }) → QR + secret
 *  2. Usuario escanea con Google Authenticator / Authy
 *  3. Ingresa el código de 6 dígitos
 *  4. mfa.challenge() + mfa.verify() → factor queda VERIFIED
 *  5. Redirige al dashboard
 *
 * Solo accesible para ADMIN y DOCTOR autenticados.
 * STAFF y usuarios sin sesión son redirigidos.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { ShieldCheck, Loader2, Copy, CheckCircle2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'

const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

export default function MfaSetupPage() {
  const router = useRouter()

  const [step, setStep] = useState<'loading' | 'qr' | 'verify' | 'done'>('loading')
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')   // data:image/svg+xml URI
  const [secret, setSecret] = useState('')   // manual entry fallback
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function initMfa() {
      // Verify session and role
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      const role = session.user?.user_metadata?.role as string | undefined
      if (role === 'STAFF' || role === 'SUPER_ADMIN') {
        router.replace('/dashboard')
        return
      }

      // Check if MFA already enrolled
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verified = factors?.totp?.find((f) => f.status === 'verified')
      if (verified) {
        // Already enrolled — go to dashboard
        router.replace('/dashboard')
        return
      }

      // Enroll new TOTP factor
      const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'MedClinic Pro',
      })

      if (enrollError || !enrollment) {
        setError('Error al iniciar el enrolamiento MFA. Intenta de nuevo.')
        setStep('qr')
        return
      }

      setFactorId(enrollment.id)
      setQrCode(enrollment.totp.qr_code)
      setSecret(enrollment.totp.secret)
      setStep('qr')
    }

    initMfa()
  }, [router])

  async function handleVerify() {
    if (otp.length !== 6) {
      setError('El código debe tener exactamente 6 dígitos')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challenge) throw challengeError ?? new Error('No se pudo crear el desafío MFA')

      // Verify code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: otp,
      })
      if (verifyError) throw verifyError

      setStep('done')
      setTimeout(() => router.replace('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto. Verifica la hora de tu dispositivo.')
    } finally {
      setLoading(false)
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">MFA configurado</h2>
          <p className="text-gray-500 text-sm">Redirigiendo al dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Configurar autenticación MFA</h1>
          <p className="text-sm text-gray-500">
            Requerido para médicos y administradores — protege el acceso a expedientes clínicos.
          </p>
        </div>

        {step === 'qr' && (
          <>
            {/* Instrucciones */}
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Descarga <strong>Google Authenticator</strong> o <strong>Authy</strong> en tu teléfono</li>
              <li>Escanea el código QR con la app</li>
              <li>Ingresa el código de 6 dígitos que aparece</li>
            </ol>

            {/* QR Code */}
            {qrCode ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="QR code MFA"
                  className="w-48 h-48 border border-gray-200 rounded-xl p-2"
                />
                {/* Manual entry */}
                <div className="w-full">
                  <p className="text-xs text-gray-500 mb-1 text-center">¿No puedes escanear? Ingresa el código manual:</p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <code className="text-xs text-gray-700 flex-1 break-all">{secret}</code>
                    <button type="button" onClick={copySecret} className="shrink-0 text-gray-400 hover:text-blue-600">
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep('verify'); setError('') }}
              disabled={!qrCode}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Ya escaneé el código →
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-gray-600 text-center">
              Ingresa el código de 6 dígitos que aparece en tu app de autenticación.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {error && (
                <p className="text-red-600 text-xs text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Verificando…' : 'Verificar y activar MFA'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('qr'); setOtp(''); setError('') }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Volver al QR
              </button>
            </div>
          </>
        )}

        {error && step === 'qr' && (
          <p className="text-red-600 text-xs text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Skip — solo para desarrollo / demo */}
        <p className="text-xs text-gray-400 text-center">
          <a href="/dashboard" className="hover:underline">Configurar más tarde</a>
        </p>
      </div>
    </div>
  )
}
