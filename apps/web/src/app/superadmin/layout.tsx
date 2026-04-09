import Link from 'next/link'
import { Shield, LayoutDashboard, Building2 } from 'lucide-react'
import { LogoutButton } from './logout-button'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top navbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">MedClinic Pro</p>
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Super Admin</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-6">
            <Link href="/superadmin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link href="/superadmin/clinicas"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Building2 className="w-4 h-4" />
              Clínicas
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            SA
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
