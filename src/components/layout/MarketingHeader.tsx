'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { insuranceCategories } from '@/lib/insurance'

const navLinks = [
  { label: 'Insurance', href: '/insurance' },
  { label: 'Claims', href: '/claims' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

// Public site header. Sticky, responsive: full nav on desktop, a slide-down menu on
// mobile. CTAs funnel into the existing flows — /book (booking) and /login (auth).
export function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
          <ShieldCheck className="text-brand size-6" />
          <span className="font-heading text-lg tracking-tight">PolicyFynder</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/')
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="lg" render={<Link href="/login">Customer Login</Link>} />
          <Button size="lg" render={<Link href="/book">Book Free Consultation</Link>} />
        </div>

        <button
          type="button"
          className="text-foreground inline-flex size-9 items-center justify-center rounded-md md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-border/60 bg-background border-t md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <div className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
              Insurance
            </div>
            {insuranceCategories.map((c) => (
              <Link
                key={c.slug}
                href={`/insurance/${c.slug}`}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm"
              >
                {c.name}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="outline" render={<Link href="/login" onClick={() => setOpen(false)}>Customer Login</Link>} />
              <Button render={<Link href="/book" onClick={() => setOpen(false)}>Book Free Consultation</Link>} />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
