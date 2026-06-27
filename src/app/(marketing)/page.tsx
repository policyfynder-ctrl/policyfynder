import Link from 'next/link'
import {
  ArrowRight,
  Search,
  GitCompare,
  Headset,
  ShieldCheck,
  Clock,
  BadgeCheck,
  PhoneCall,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryGrid } from '@/components/features/marketing/CategoryGrid'
import { Testimonials } from '@/components/features/marketing/Testimonials'
import { FaqAccordion } from '@/components/features/marketing/FaqAccordion'
import { InsurancePartners } from '@/components/features/marketing/InsurancePartners'
import { JsonLd } from '@/components/seo/JsonLd'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

export const metadata = {
  description:
    'PolicyFynder helps you find, compare, and manage insurance with a dedicated relationship manager. Book a free consultation today.',
}

const valueProps = [
  { icon: Search, title: 'Find the right cover', description: 'Tell us your needs — we surface plans that actually fit, not just the cheapest.' },
  { icon: GitCompare, title: 'Compare clearly', description: 'Cover, premiums, and exclusions side by side, in plain language.' },
  { icon: Headset, title: 'A real human', description: 'A dedicated relationship manager guides you from quote to claim.' },
]

const why = [
  { icon: ShieldCheck, title: 'Unbiased advice', description: 'We work for you, not a single insurer — so the recommendation fits your situation.' },
  { icon: Clock, title: 'On-time renewals', description: 'Automatic reminders mean your cover never lapses by accident.' },
  { icon: BadgeCheck, title: 'Claims support', description: 'When it matters most, your RM helps you file and follow up on claims.' },
  { icon: PhoneCall, title: 'One point of contact', description: 'No call centres — the same person who set up your cover handles it end to end.' },
]

const steps = [
  { n: '1', title: 'Book Free Consultation', description: 'Pick a time that suits you. A relationship manager is assigned automatically.' },
  { n: '2', title: 'Compare your options', description: 'We walk you through suitable plans, cover, and pricing — no pressure.' },
  { n: '3', title: 'Get covered & relax', description: 'Buy with confidence and let us handle renewals and claims.' },
]

const faqs = [
  { q: 'Does PolicyFynder charge me a fee?', a: 'No — our advisory service is free to you. We help you choose and manage the right cover across insurers.' },
  { q: 'Which types of insurance do you offer?', a: 'Health, motor, life, travel, commercial, and group insurance — for individuals, families, and businesses.' },
  { q: 'How do I get started?', a: 'Book a free consultation. A relationship manager will understand your needs and recommend suitable plans.' },
  { q: 'Can you help with claims?', a: 'Yes. Your relationship manager helps you file claims and follows up with the insurer on your behalf.' },
]

export default function LandingPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'PolicyFynder',
          url: siteUrl,
          description:
            'Insurance brokerage helping you find, compare, and manage health, motor, life, travel, commercial, and group insurance.',
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'PolicyFynder',
          url: siteUrl,
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* Hero */}
      <section className="from-brand-navy-deep to-brand-navy text-brand-navy-foreground relative overflow-hidden bg-gradient-to-b">
        {/* soft teal glow accent */}
        <div
          aria-hidden
          className="bg-teal/20 pointer-events-none absolute -top-24 -right-24 size-96 rounded-full blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <span className="bg-brand-foreground/10 ring-brand-foreground/15 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1">
              <ShieldCheck className="size-3.5" /> Free • unbiased • on your side
            </span>
            <h1 className="font-heading mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              The right insurance, with a <span className="text-teal">real person</span> to guide you
            </h1>
            <p className="text-brand-navy-foreground/80 mt-5 text-lg leading-relaxed">
              Compare health, motor, life, travel, commercial, and group cover — and get a dedicated
              relationship manager from quote to claim. No cost, no pressure.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-6 text-base" render={<Link href="/book">Book Free Consultation</Link>} />
              <Button
                size="lg"
                variant="outline"
                className="text-brand-navy-foreground border-brand-foreground/25 hover:bg-brand-foreground/10 hover:text-brand-navy-foreground h-11 bg-transparent px-6 text-base"
                render={<Link href="/insurance">Explore insurance</Link>}
              />
            </div>
            <p className="text-brand-navy-foreground/60 mt-4 text-sm">
              No spam. No pressure. A relationship manager will reach out to confirm.
            </p>
          </div>
        </div>
      </section>

      {/* Insurance partners */}
      <InsurancePartners />

      {/* Trust bar */}
      <section className="border-border/60 border-b">
        <div className="text-muted-foreground mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4">
          {[
            { stat: '6', label: 'Insurance categories' },
            { stat: 'Cashless', label: 'Network hospitals' },
            { stat: '1-on-1', label: 'Relationship manager' },
            { stat: 'Free', label: 'Advisory service' },
          ].map((t) => (
            <div key={t.label}>
              <div className="text-foreground font-heading text-2xl font-bold">{t.stat}</div>
              <div className="text-sm">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Value props */}
      <Section title="Insurance without the headache" subtitle="We make finding and managing cover genuinely simple.">
        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((v) => {
            const Icon = v.icon
            return (
              <div key={v.title} className="border-border bg-card rounded-xl border p-6 shadow-sm">
                <span className="bg-brand/10 text-brand mb-4 flex size-11 items-center justify-center rounded-lg">
                  <Icon className="size-6" />
                </span>
                <h3 className="font-heading text-lg font-semibold">{v.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{v.description}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Categories */}
      <Section title="Cover for every need" subtitle="Explore our insurance categories for individuals, families, and businesses.">
        <CategoryGrid />
      </Section>

      {/* How it works */}
      <section className="bg-muted/30 border-border/60 border-y">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading title="How it works" subtitle="Three simple steps to the right cover." />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="bg-brand text-brand-foreground font-heading flex size-10 items-center justify-center rounded-full text-lg font-bold">
                  {s.n}
                </div>
                <h3 className="font-heading mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why PolicyFynder */}
      <Section title="Why PolicyFynder" subtitle="A broker that works for you, not the insurer.">
        <div className="grid gap-4 sm:grid-cols-2">
          {why.map((w) => {
            const Icon = w.icon
            return (
              <div key={w.title} className="border-border bg-card flex gap-4 rounded-xl border p-6 shadow-sm">
                <span className="bg-teal/10 text-teal flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-semibold">{w.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{w.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Testimonials */}
      <Section title="Trusted by people like you" subtitle="What our customers say about working with PolicyFynder.">
        <Testimonials />
      </Section>

      {/* FAQ */}
      <Section title="Frequently asked questions" subtitle="Everything you need to know to get started.">
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={faqs} />
        </div>
      </Section>

      {/* CTA */}
      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
          <h2 className="font-heading max-w-2xl text-3xl font-bold tracking-tight">
            Ready to find the right cover?
          </h2>
          <p className="text-brand-foreground/85 max-w-xl">
            Book a free, no-obligation consultation. A relationship manager will help you compare and
            choose with confidence.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="h-11 px-6 text-base"
            render={
              <Link href="/book">
                Book Free Consultation <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      </section>
    </>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-3xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-2 text-base">{subtitle}</p>}
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <SectionHeading title={title} subtitle={subtitle} />
      <div className="mt-10">{children}</div>
    </section>
  )
}
