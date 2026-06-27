// Compact hero for marketing sub-pages (About, Contact, Claims, legal).
export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-brand-navy text-brand-navy-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="text-brand-navy-foreground/80 mt-3 max-w-2xl text-lg leading-relaxed">{subtitle}</p>
        )}
      </div>
    </section>
  )
}
