import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mediaclinic.mx',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Las URLs adicionales (city pages, blog, producto) se agregarán en la fase 2
  ]
}
