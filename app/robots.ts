// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/checkout/', '/thank-you', '/profile'],
    },
    sitemap: 'https://bushal.vercel.app/sitemap.xml',
  }
}