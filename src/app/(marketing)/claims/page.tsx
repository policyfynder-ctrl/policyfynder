import Link from 'next/link'
import { PhoneCall, FileText, Search, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/features/marketing/PageHero'

export const metadata = {
  title: 'Claims Assistance',
  description:
    'PolicyFynder helps you file and follow up on insurance claims — your relationship manager guides you through every step.',
}

const steps = [
  { icon: PhoneCall, title: 'Tell us what happened', description: 'Contact your relationship manager as soon as possible. We’ll confirm what’s covered.' },
  { icon: FileText, title: 'Gather documents', description: 'We give you a clear checklist so nothing is missed — bills, reports, forms, and photos.' },
  { icon: Search, title: 'We file & follow up', description: 'We submit the claim to the insurer and chase it on your behalf until it’s resolved.' },
  { icon: CheckCircle2, title: 'Get settled', description: 'We keep you updated through assessment and settlement, and explain every decision.' },
]

export default function ClaimsPage() {
  return (
    <>
      <PageHero
        title="Claims assistance"
        subtitle="A claim is the moment insurance really matters. We make sure you’re not facing it alone."
      />

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight">How claims work with us</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="border-border bg-card flex gap-4 rounded-xl border p-6 shadow-sm">
                <span className="bg-brand/10 text-brand flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-6" />
                </span>
                <div>
                  <div className="text-muted-foreground text-xs font-medium">Step {i + 1}</div>
                  <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{s.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center">
          <h2 className="font-heading max-w-2xl text-2xl font-bold tracking-tight">Need help with a claim?</h2>
          <p className="text-brand-foreground/85 max-w-xl">
            Existing customers can reach their relationship manager directly. New to PolicyFynder?
            Get in touch and we’ll point you the right way.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-11 px-6 text-base" render={<Link href="/contact">Contact us</Link>} />
            <Button
              size="lg"
              variant="outline"
              className="text-brand-foreground border-brand-foreground/30 hover:bg-brand-foreground/10 hover:text-brand-foreground h-11 bg-transparent px-6 text-base"
              render={
                <Link href="/login">
                  Customer login <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
        </div>
      </section>
    </>
  )
}
