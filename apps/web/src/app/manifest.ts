import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mediaclinic',
    short_name: 'Mediaclinic',
    description: 'Software de gestión para clínicas médicas en México',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#438EE8',
    lang: 'es-MX',
    scope: '/',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
