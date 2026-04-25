'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { sessionCache } from '@/lib/api'
import {
  Calendar,
  Users,
  CreditCard,
  Settings,
  Video,
  LayoutDashboard,
  LogOut,
  Brain,
  type LucideIcon,
} from 'lucide-react'

const TOGGLE_EVENT = 'toggle-sidebar'

type NavItem = { href: string; label: string; icon: LucideIcon }
type NavSection = { label: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    label: 'General',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/pacientes', label: 'Pacientes', icon: Users },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/cobros', label: 'Cobros', icon: CreditCard },
      { href: '/telemedicina', label: 'Telemedicina', icon: Video },
      { href: '/consulta-ia', label: 'Consulta con IA', icon: Brain },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

const STAFF_ALLOWED = ['/dashboard', '/agenda', '/pacientes', '/cobros']

export function SidebarNav() {
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
        /* default DOCTOR */
      }
    }
    getSession()
  }, [])

  useEffect(() => {
    function handleToggle() { setIsOpen(o => !o) }
    document.addEventListener(TOGGLE_EVENT, handleToggle)
    return () => document.removeEventListener(TOGGLE_EVENT, handleToggle)
  }, [])

  useEffect(() => { setIsOpen(false) }, [pathname])

  const isStaff = userRole === 'STAFF'

  const visibleSections: NavSection[] = isStaff
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i => STAFF_ALLOWED.includes(i.href)),
      })).filter(s => s.items.length > 0)
    : SECTIONS

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

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground'
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop spacer */}
      <div className="hidden lg:block w-60 shrink-0" />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
          <Image
            src="/logo-white.svg"
            alt="MedClinic Pro"
            width={120}
            height={32}
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {visibleSections.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && 'mt-6')}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-3 space-y-0.5 shrink-0">
          {BOTTOM_ITEMS.map(item => <NavLink key={item.href} item={item} />)}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-sidebar-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
