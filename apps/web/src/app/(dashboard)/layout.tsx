import { Roboto } from 'next/font/google'
import { Sidebar } from '@/components/layout/sidebar'

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
  return (
    <div className={`flex min-h-screen bg-gray-50 ${roboto.className}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
