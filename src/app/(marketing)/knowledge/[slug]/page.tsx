import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Prose } from '@/components/features/marketing/Prose'
import { JsonLd } from '@/components/seo/JsonLd'
import { getArticle, articleSlugs, formatArticleDate } from '@/lib/knowledge'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

export function generateStaticParams() {
  return articleSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const a = getArticle(slug)
  if (!a) return {}
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/knowledge/${a.slug}` },
    openGraph: { type: 'article', title: a.title, description: a.excerpt, publishedTime: a.date },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          datePublished: article.date,
          articleSection: article.category,
          author: { '@type': 'Organization', name: 'PolicyFynder' },
          publisher: { '@type': 'Organization', name: 'PolicyFynder' },
          mainEntityOfPage: `${siteUrl}/knowledge/${article.slug}`,
        }}
      />
      <header className="bg-brand-navy text-brand-navy-foreground">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <Link
            href="/knowledge"
            className="text-brand-navy-foreground/70 hover:text-brand-navy-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" /> Knowledge Centre
          </Link>
          <div className="text-brand-navy-foreground/70 text-xs font-medium tracking-wide uppercase">
            {article.category}
          </div>
          <h1 className="font-heading mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="text-brand-navy-foreground/70 mt-3 text-sm">
            {formatArticleDate(article.date)} · {article.readingMinutes} min read
          </p>
        </div>
      </header>

      <Prose>
        {article.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2>{s.heading}</h2>}
            {s.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
            {s.bullets && (
              <ul>
                {s.bullets.map((b, k) => (
                  <li key={k}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </Prose>

      <section className="border-border/60 border-t">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 px-4 py-10">
          <h2 className="font-heading text-xl font-semibold">Have questions about your cover?</h2>
          <p className="text-muted-foreground text-sm">
            Book a free consultation and a relationship manager will help you decide.
          </p>
          <Button
            render={
              <Link href="/book">
                Book Free Consultation <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </section>
    </article>
  )
}
