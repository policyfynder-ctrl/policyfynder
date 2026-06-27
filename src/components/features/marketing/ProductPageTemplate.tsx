import Link from 'next/link'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaqAccordion } from '@/components/features/marketing/FaqAccordion'
import { JsonLd } from '@/components/seo/JsonLd'
import type { InsuranceCategory } from '@/lib/insurance'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

// Shared layout for the six insurance product pages. Content is data-driven from
// insuranceCategories; the CTA carries the category into the booking flow via
// /book?interest=<slug> so the slot form pre-selects it.
export function ProductPageTemplate({ category }: { category: InsuranceCategory }) {
  const Icon = category.icon
  const bookHref = `/book?interest=${category.slug}`

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Insurance', item: `${siteUrl}/insurance` },
            { '@type': 'ListItem', position: 2, name: category.name, item: `${siteUrl}/insurance/${category.slug}` },
          ],
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: category.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* Hero */}
      <section className="bg-brand-navy text-brand-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <Link
            href="/insurance"
            className="text-brand-navy-foreground/70 hover:text-brand-navy-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" /> All insurance
          </Link>
          <div className="max-w-2xl">
            <span className="bg-brand-foreground/10 flex size-12 items-center justify-center rounded-xl">
              <Icon className="size-7" />
            </span>
            <h1 className="font-heading mt-5 text-4xl font-extrabold tracking-tight">{category.name}</h1>
            <p className="text-brand-navy-foreground/80 mt-3 text-lg">{category.tagline}</p>
            <p className="text-brand-navy-foreground/70 mt-4 leading-relaxed">{category.heroDescription}</p>
            <div className="mt-8">
              <Button
                size="lg"
                className="h-11 px-6 text-base"
                render={
                  <Link href={bookHref}>
                    Book Free Consultation <ArrowRight className="size-4" />
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Coverage + benefits */}
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">What’s covered</h2>
          <ul className="mt-6 space-y-3">
            {category.coverage.map((c) => (
              <li key={c} className="flex items-start gap-3">
                <span className="bg-teal/10 text-teal mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight">Why choose us</h2>
          <div className="mt-6 space-y-4">
            {category.benefits.map((b) => (
              <div key={b.title} className="border-border bg-card rounded-xl border p-5 shadow-sm">
                <h3 className="font-heading font-semibold">{b.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 border-border/60 border-y">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Common questions</h2>
          <div className="mt-8">
            <FaqAccordion items={category.faqs} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center">
          <h2 className="font-heading max-w-2xl text-2xl font-bold tracking-tight">
            Get the right {category.name.toLowerCase()} for you
          </h2>
          <p className="text-brand-foreground/85 max-w-xl">
            Book a free consultation and a relationship manager will help you compare and choose.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="h-11 px-6 text-base"
            render={
              <Link href={bookHref}>
                Book Free Consultation <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </section>
    </>
  )
}
