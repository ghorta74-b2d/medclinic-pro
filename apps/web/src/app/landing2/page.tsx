import type { Metadata } from 'next'
import Landing2Client from './landing2-client'

export const metadata: Metadata = {
  metadataBase: new URL('https://mediaclinic.mx'),
  title: { absolute: 'Software para Clínicas Médicas en México | Mediaclinic' },
  description:
    'Software de gestión médica con expediente clínico electrónico, agenda en línea, recetas digitales y consultas asistidas por IA. Cumple NOM-004 y LFPDPPP.',
  keywords: [
    'software para clínicas médicas México',
    'software de gestión médica',
    'sistema para consultorio médico',
    'expediente clínico electrónico México',
    'software para consultorios médicos',
    'plataforma de gestión médica',
    'sistema de citas médicas en línea',
    'software médico con inteligencia artificial',
    'software NOM-004',
    'LFPDPPP',
    'facturación CFDI médica',
  ],
  authors: [{ name: 'Mediaclinic' }],
  creator: 'Mediaclinic',
  publisher: 'Mediaclinic',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    // Actualizar a '/' cuando esta landing reemplace el home
    canonical: 'https://mediaclinic.mx',
    languages: {
      'es-MX': 'https://mediaclinic.mx',
      'es': 'https://mediaclinic.mx',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://mediaclinic.mx',
    siteName: 'Mediaclinic',
    title: 'Software para Clínicas Médicas en México | Mediaclinic',
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
    title: 'Software para Clínicas Médicas en México | Mediaclinic',
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
}

export default function Landing2Page() {
  return <Landing2Client />
}
