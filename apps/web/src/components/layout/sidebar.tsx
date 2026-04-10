'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Calendar, Users, Pill, FlaskConical, CreditCard,
  Settings, Video, LayoutDashboard, LogOut, Stethoscope, Bot,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/agenda',       label: 'Agenda',        icon: Calendar },
  { href: '/pacientes',    label: 'Pacientes',     icon: Users },
  { href: '/recetas',      label: 'Recetas',       icon: Pill },
  { href: '/resultados',   label: 'Resultados',    icon: FlaskConical },
  { href: '/cobros',       label: 'Cobros',        icon: CreditCard },
  { href: '/telemedicina', label: 'Telemedicina',  icon: Video },
  { href: '/asistente-ia', label: 'Asistente IA',  icon: Bot },
]

const BOTTOM_ITEMS = [
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

// Routes accessible to STAFF role only
const STAFF_ALLOWED = ['/dashboard', '/agenda', '/pacientes', '/cobros']

export function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('DOCTOR')

  useEffect(() => {
    async function getSession() {
      try {
        const { createBrowserClient } = await import('@supabase/ssr')
        const supabase = createBrowserClient(
          process.env['NEXT_PUBLIC_SUPABASE_URL']!,
          process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
        )
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.user_metadata?.role) {
          setUserRole(session.user.user_metadata.role)
        }
      } catch {
        // ignore — defaults to DOCTOR (full access)
      }
    }
    getSession()
  }, [])

  const isStaff = userRole === 'STAFF'

  const visibleItems = isStaff
    ? NAV_ITEMS.filter(item => STAFF_ALLOWED.includes(item.href))
    : NAV_ITEMS

  // Configuración is always visible (STAFF sees it too)
  const visibleBottom = BOTTOM_ITEMS

  async function handleLogout() {
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
      )
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#2B225F] text-white flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-[#3D3075]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#4E2DD2] rounded-xl flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none text-white">MedClinic Pro</p>
            <p className="text-xs text-[rgba(231,235,239,0.6)] mt-0.5">Gestión Clínica</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#E7EBEF] text-[#2B225F]'
                  : 'text-[rgba(231,235,239,0.7)] hover:bg-[#3D3075] hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — always visible, never pushed out of viewport */}
      <div className="px-3 py-4 border-t border-[#3D3075] space-y-0.5 shrink-0">
        {visibleBottom.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#E7EBEF] text-[#2B225F]'
                  : 'text-[rgba(231,235,239,0.7)] hover:bg-[#3D3075] hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[rgba(231,235,239,0.7)] hover:bg-[#3D3075] hover:text-red-300 transition-colors w-full text-left">
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
