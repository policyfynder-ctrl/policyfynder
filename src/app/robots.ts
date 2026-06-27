import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api', '/auth', '/login', '/signup', '/reset-password'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
