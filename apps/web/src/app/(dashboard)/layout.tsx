'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { AppShell } from '@/components/layout/app-shell'
import { warmupApi, getUserRole } from '@/lib/api'
import { createBrowserClient } from '@supabase/ssr'
import { ShieldAlert, X, Loader2 } from 'lucide-react'

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
      warmupApi()

      try {
        const role = await getUserRole()
        if (role !== 'ADMIN' && role !== 'DOCTOR') return

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

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  const banner = showMfaBanner ? (
    <div className="flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5">
      <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
      <p className="flex-1 text-sm text-foreground">
        <strong>Configura la verificación en dos pasos (MFA)</strong> para proteger el acceso a los expedientes clínicos.{' '}
        <button
          onClick={() => router.push('/mfa-setup')}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Configurar ahora
        </button>
      </p>
      <button
        onClick={dismissBanner}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : null

  return (
    <AppShell sidebar={<SidebarNav />} banner={banner}>
      {children}
    </AppShell>
  )
}
