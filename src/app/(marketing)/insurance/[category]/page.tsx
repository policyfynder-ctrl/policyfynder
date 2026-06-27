import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductPageTemplate } from '@/components/features/marketing/ProductPageTemplate'
import { getCategory, categorySlugs } from '@/lib/insurance'

// SSG: pre-render all six product pages at build time.
export function generateStaticParams() {
  return categorySlugs.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const c = getCategory(category)
  if (!c) return {}
  return {
    title: c.name,
    description: c.summary,
    alternates: { canonical: `/insurance/${c.slug}` },
    openGraph: { title: `${c.name} — PolicyFynder`, description: c.summary },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const c = getCategory(category)
  if (!c) notFound()
  return <ProductPageTemplate category={c} />
}
