import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mediaclinic.mx'),
  title: {
    default: 'Mediaclinic | Software para Clínicas Médicas en México',
    template: '%s | Mediaclinic',
  },
  description:
    'Software de gestión médica con expediente clínico electrónico, agenda en línea, recetas digitales y consultas asistidas por IA. Cumple NOM-004 y LFPDPPP.',
  keywords: [
    'software para clínicas médicas',
    'software de gestión médica',
    'expediente clínico electrónico',
    'sistema para consultorio médico',
    'software médico México',
    'agenda médica en línea',
    'recetas digitales',
    'NOM-004',
    'LFPDPPP',
  ],
  authors: [{ name: 'Mediaclinic' }],
  creator: 'Mediaclinic',
  publisher: 'Mediaclinic',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: 'https://mediaclinic.mx',
    languages: {
      'es-MX': 'https://mediaclinic.mx',
      es: 'https://mediaclinic.mx',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://mediaclinic.mx',
    siteName: 'Mediaclinic',
    title: 'Mediaclinic | Software para Clínicas Médicas en México',
    description:
      'Software de gestión médica con expediente clínico electrónico, agenda en línea, recetas digitales y consultas asistidas por IA. Cumple NOM-004 y LFPDPPP.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Mediaclinic — Software para Clínicas Médicas en México',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mediaclinic | Software para Clínicas Médicas en México',
    description:
      'Software de gestión médica con ECE, agenda, recetas y consultas asistidas por IA. Cumple NOM-004 y LFPDPPP.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'Ais0QGz0ru5bJUGyQV_xTQi2rtERB9SqNB51s0wFD2Y',
    other: { 'msvalidate.01': 'PLACEHOLDER_BING' }, // TODO: reemplazar con token real de Bing
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="medclinic-theme"
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
