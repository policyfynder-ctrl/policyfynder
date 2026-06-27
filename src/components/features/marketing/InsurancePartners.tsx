import Image from 'next/image'
import { partners } from '@/lib/partners'

// "Our Insurance Partners" — logo-ready grid. Each tile shows an approved logo image
// when `logo` is set, otherwise a polished text placeholder (no invented logos).
export function InsurancePartners() {
  return (
    <section className="bg-surface-blue border-border/60 border-y">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Our Insurance Partners</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-sm">
            We work with leading insurers across life, health, motor, and general insurance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {partners.map((p) => (
            <div
              key={p.name}
              className="border-border/70 bg-card flex h-20 items-center justify-center rounded-xl border px-3 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              {p.logo ? (
                <Image
                  src={p.logo}
                  alt={`${p.name} logo`}
                  width={120}
                  height={40}
                  className="max-h-10 w-auto object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              ) : (
                <span className="text-muted-foreground text-sm font-semibold">{p.name}</span>
              )}
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          Insurance products are offered through our empanelled insurance partners.
        </p>
      </div>
    </section>
  )
}
