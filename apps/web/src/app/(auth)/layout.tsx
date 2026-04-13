import { Roboto } from 'next/font/google'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={roboto.className}>
      {children}
    </div>
  )
}
