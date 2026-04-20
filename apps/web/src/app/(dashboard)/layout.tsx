'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Roboto } from 'next/font/google'
import { Sidebar } from '@/components/layout/sidebar'
import { warmupApi, getUserRole } from '@/lib/api'
import { createBrowserClient } from '@supabase/ssr'
import { ShieldAlert, X, Loader2 } from 'lucide-react'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

// Singleton Supabase client para el check MFA
const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
)

// Key para suprimir el banner durante 24h si el usuario lo cierra
const MFA_DISMISSED_KEY = '_mc_mfa_dismissed'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [showMfaBanner, setShowMfaBanner] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // ── Auth guard: redirige al login si no hay sesión activa ────────────
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
      } catch {
        window.location.href = '/login'
        return
      }

      setAuthChecked(true)

      // Pre-warm serverless para que el primer request al API sea rápido
      warmupApi()

      // ── MFA check: solo para ADMIN y DOCTOR ─────────────────────────────
      try {
        const role = await getUserRole()
        if (role !== 'ADMIN' && role !== 'DOCTOR') return

        // Si el usuario ya cerró el banner hoy, no molestar de nuevo
        const dismissed = sessionStorage.getItem(MFA_DISMISSED_KEY)
        if (dismissed) return

        const { data: factors } = await supabase.auth.mfa.listFactors()
        const hasVerified = factors?.totp?.some((f) => f.status === 'verified')
        if (!hasVerified) {
          setShowMfaBanner(true)
        }
      } catch {
        // No bloquear el dashboard por un fallo en el check de MFA
      }
    }

    init()
  }, [])

  function dismissBanner() {
    setShowMfaBanner(false)
    sessionStorage.setItem(MFA_DISMISSED_KEY, '1')
  }

  // Muestra spinner mientras se verifica la sesión — evita flash del dashboard sin auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen bg-gray-50 ${roboto.className}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Banner MFA — visible solo para ADMIN/DOCTOR sin MFA configurado */}
        {showMfaBanner && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 z-40">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">
              <strong>Configura la verificación en dos pasos (MFA)</strong> para proteger el acceso a los expedientes clínicos.{' '}
              <button
                onClick={() => router.push('/mfa-setup')}
                className="underline font-medium hover:text-amber-900"
              >
                Configurar ahora
              </button>
            </p>
            <button onClick={dismissBanner} className="text-amber-400 hover:text-amber-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
