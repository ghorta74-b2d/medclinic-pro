import React from 'react'

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/* ── Pre-built schema factories ── */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Mediaclinic',
    url: 'https://mediaclinic.mx',
    logo: 'https://mediaclinic.mx/icon-512.png',
    description: 'Software de gestión para clínicas y consultorios médicos en México.',
    areaServed: { '@type': 'Country', name: 'México' },
    sameAs: [
      /* agregar perfiles oficiales cuando existan: LinkedIn, X, Facebook, Instagram */
    ],
  }
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Mediaclinic',
    applicationCategory: 'MedicalApplication',
    operatingSystem: 'Web',
    description:
      'Plataforma SaaS de gestión médica con expediente clínico electrónico, agenda en línea, recetas digitales y consultas asistidas por IA.',
    url: 'https://mediaclinic.mx',
    inLanguage: 'es-MX',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'MXN',
      url: 'https://mediaclinic.mx/#planes',
    },
  }
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mediaclinic',
    url: 'https://mediaclinic.mx',
    inLanguage: 'es-MX',
  }
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}
