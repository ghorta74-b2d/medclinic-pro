'use client'

import { useEffect } from 'react'
import { Roboto } from 'next/font/google'
import { Sidebar } from '@/components/layout/sidebar'
import { warmupApi } from '@/lib/api'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fire a lightweight /health ping as soon as the dashboard loads.
  // This pre-warms the Vercel serverless function so that by the time
  // the user navigates to Agenda / Cobros / Dashboard, the cold start
  // is already resolved and data loads in ~200ms instead of 5-8s.
  useEffect(() => {
    warmupApi()
  }, [])

  return (
    <div className={`flex min-h-screen bg-gray-50 ${roboto.className}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
