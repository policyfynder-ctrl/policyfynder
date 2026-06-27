import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryGrid } from '@/components/features/marketing/CategoryGrid'

export const metadata = {
  title: 'Insurance',
  description:
    'Explore health, motor, life, travel, commercial, and group insurance with PolicyFynder — compare cover and get a dedicated relationship manager.',
}

export default function InsuranceHubPage() {
  return (
    <>
      <section className="bg-brand-navy text-brand-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight">Insurance for every need</h1>
            <p className="text-brand-navy-foreground/80 mt-4 text-lg leading-relaxed">
              Whether it’s protecting your health, your vehicle, your family, or your business — we
              help you compare cover and choose with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <CategoryGrid />
      </section>

      <section className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center">
          <h2 className="font-heading max-w-2xl text-2xl font-bold tracking-tight">
            Not sure which cover you need?
          </h2>
          <p className="text-brand-foreground/85 max-w-xl">
            Book a free consultation and a relationship manager will guide you to the right plan.
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
