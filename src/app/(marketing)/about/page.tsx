import Link from 'next/link'
import { Compass, Handshake, ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/features/marketing/PageHero'

export const metadata = {
  title: 'About Us',
  description:
    'PolicyFynder is an insurance brokerage that helps individuals, families, and businesses find and manage the right cover — with a dedicated relationship manager.',
}

const values = [
  { icon: Compass, title: 'Advice you can trust', description: 'We recommend what fits your needs, not what pays us most.' },
  { icon: Handshake, title: 'A relationship, not a transaction', description: 'One dedicated manager who knows you, from first quote to every renewal.' },
  { icon: ShieldCheck, title: 'There when it matters', description: 'We stand beside you at claim time — the moment insurance really counts.' },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About PolicyFynder"
        subtitle="We make insurance simple, honest, and human — so you’re properly protected without the jargon."
      />

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Our mission</h2>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Insurance is something everyone needs but few enjoy buying. Policies are dense, options are
          overwhelming, and the moment you need to claim is often the most stressful. PolicyFynder
          exists to change that. We help you compare cover across insurers in plain language, choose
          the plan that genuinely fits, and stay protected with on-time renewals and real claims
          support — all through a single relationship manager who knows your situation.
        </p>
      </section>

      <section className="bg-muted/30 border-border/60 border-y">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight">What we stand for</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {values.map((v) => {
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
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Let’s find your cover</h2>
        <p className="text-muted-foreground max-w-xl">
          Book a free consultation and see how simple insurance can be.
        </p>
        <Button
          size="lg"
          className="h-11 px-6 text-base"
          render={
            <Link href="/book">
              Book Free Consultation <ArrowRight className="size-4" />
            </Link>
          }
        />
      </section>
    </>
  )
}
