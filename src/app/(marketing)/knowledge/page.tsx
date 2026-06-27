import { PageHero } from '@/components/features/marketing/PageHero'
import { ArticleCard } from '@/components/features/marketing/ArticleCard'
import { articles } from '@/lib/knowledge'

export const metadata = {
  title: 'Knowledge Centre',
  description:
    'Plain-language guides to health, motor, life, and travel insurance — from the PolicyFynder team.',
}

export default function KnowledgePage() {
  return (
    <>
      <PageHero
        title="Knowledge Centre"
        subtitle="Clear, jargon-free guides to help you make confident insurance decisions."
      />
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    </>
  )
}
