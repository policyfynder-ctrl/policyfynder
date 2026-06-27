import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { insuranceCategories } from '@/lib/insurance'

// Insurance categories grid — used on the landing page and the /insurance hub.
export function CategoryGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {insuranceCategories.map((c) => {
        const Icon = c.icon
        return (
          <Link
            key={c.slug}
            href={`/insurance/${c.slug}`}
            className="group border-border bg-card hover:border-brand/40 relative flex flex-col gap-3 rounded-xl border p-6 shadow-sm transition-colors"
          >
            <span className="bg-brand/10 text-brand flex size-11 items-center justify-center rounded-lg">
              <Icon className="size-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-semibold">{c.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{c.summary}</p>
            </div>
            <span className="text-brand mt-auto inline-flex items-center gap-1 text-sm font-medium">
              Learn more
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
