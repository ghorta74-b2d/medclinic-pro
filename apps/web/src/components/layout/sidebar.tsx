'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { sessionCache } from '@/lib/api'
import {
  Calendar, Users, CreditCard,
  Settings, Video, LayoutDashboard, LogOut, Brain,
} from 'lucide-react'

// Dispatched by Header hamburger button
const TOGGLE_EVENT = 'toggle-sidebar'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/agenda',       label: 'Agenda',          icon: Calendar },
  { href: '/pacientes',    label: 'Pacientes',       icon: Users },
  { href: '/cobros',       label: 'Cobros',          icon: CreditCard },
  { href: '/telemedicina', label: 'Telemedicina',    icon: Video },
  { href: '/consulta-ia',  label: 'Consulta con IA', icon: Brain },
]

const BOTTOM_ITEMS = [
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

// Routes accessible to STAFF role only
const STAFF_ALLOWED = ['/dashboard', '/agenda', '/pacientes', '/cobros']

export function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('DOCTOR')
  const [isOpen, setIsOpen] = useState(false)

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

  // Listen for hamburger toggle from Header
  useEffect(() => {
    function handleToggle() { setIsOpen(o => !o) }
    document.addEventListener(TOGGLE_EVENT, handleToggle)
    return () => document.removeEventListener(TOGGLE_EVENT, handleToggle)
  }, [])

  // Close drawer on route change (mobile nav)
  useEffect(() => { setIsOpen(false) }, [pathname])

  const isStaff = userRole === 'STAFF'

  const visibleItems = isStaff
    ? NAV_ITEMS.filter(item => STAFF_ALLOWED.includes(item.href))
    : NAV_ITEMS

  const visibleBottom = BOTTOM_ITEMS

  async function handleLogout() {
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
      )
      sessionCache.clear()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      sessionCache.clear()
      window.location.href = '/login'
    }
  }

  const navLink = (item: typeof NAV_ITEMS[0]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors',
          isActive
            ? 'bg-white/12 text-white'
            : 'text-white/55 hover:bg-white/8 hover:text-white'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile overlay — closes drawer on tap outside */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Spacer — reserves layout space on desktop so main content doesn't expand under sidebar */}
      <div className="hidden lg:block w-48 shrink-0" />

      <aside className={cn(
        'w-48 bg-[#0D1B2E] text-white flex flex-col z-50',
        // Always fixed so mobile drawer and desktop sticky behave the same way
        'fixed inset-y-0 left-0 h-full transition-transform duration-200',
        // Mobile: slide in/out; desktop: always visible
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/8 shrink-0">
          <img
            src="/logo-white.svg"
            alt="MediaClinic"
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(navLink)}
        </nav>

        {/* Bottom — always visible, never pushed out of viewport */}
        <div className="px-3 py-4 border-t border-white/8 space-y-0.5 shrink-0">
          {visibleBottom.map(navLink)}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-white/55 hover:bg-white/8 hover:text-red-400 transition-colors w-full text-left">
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
