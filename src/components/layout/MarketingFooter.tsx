import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { insuranceCategories } from '@/lib/insurance'

// Public site footer: sitemap columns + legal + entry points. Server component.
export function MarketingFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-border/60 bg-muted/30 mt-24 border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="text-brand size-6" />
            <span className="font-heading text-lg tracking-tight">PolicyFynder</span>
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Find, compare, and manage insurance with a dedicated relationship manager at every step.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Insurance</h2>
          <ul className="space-y-2 text-sm">
            {insuranceCategories.map((c) => (
              <li key={c.slug}>
                <Link href={`/insurance/${c.slug}`} className="text-muted-foreground hover:text-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Company</h2>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'About Us', href: '/about' },
              { label: 'Claims Assistance', href: '/claims' },
              { label: 'Knowledge Centre', href: '/knowledge' },
              { label: 'Contact Us', href: '/contact' },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted-foreground hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Get started</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/book" className="text-muted-foreground hover:text-foreground">
                Book Free Consultation
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Customer Login
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                RM / Admin Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs sm:flex-row">
          <p>© {year} PolicyFynder. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms &amp; Conditions
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground">
              Data Deletion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
