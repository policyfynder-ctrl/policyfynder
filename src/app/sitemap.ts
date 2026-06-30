import type { MetadataRoute } from 'next'
import { categorySlugs } from '@/lib/insurance'
import { articleSlugs } from '@/lib/knowledge'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

// Public marketing sitemap. Dashboard/auth/booking/api are intentionally excluded
// (private or non-indexable funnels).
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    '',
    '/insurance',
    '/about',
    '/contact',
    '/claims',
    '/knowledge',
    '/privacy',
    '/terms',
    '/data-deletion',
  ]
  const categoryPaths = categorySlugs.map((s) => `/insurance/${s}`)
  const articlePaths = articleSlugs.map((s) => `/knowledge/${s}`)

  return [...staticPaths, ...categoryPaths, ...articlePaths].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/insurance') ? 0.8 : 0.6,
  }))
}
