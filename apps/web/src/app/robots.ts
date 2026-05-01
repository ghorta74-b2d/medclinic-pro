import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/_next/', '/auth/'],
      },
    ],
    sitemap: 'https://mediaclinic.mx/sitemap.xml',
    host: 'https://mediaclinic.mx',
  }
}
