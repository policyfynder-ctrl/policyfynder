import { listActiveBranches, getAvailableSlots, getActiveProducts } from '@/services/booking'
import { BookingForm } from '@/components/features/appointments/BookingForm'

export const metadata = { title: 'Book your free consultation' }

// Public booking entry. Branches are intentionally hidden from customers — the system
// assigns the branch internally (and /api/book then picks the least-busy eligible RM
// within it). A ?interest=<slug> from a product-page CTA pre-selects that category.
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string }>
}) {
  const { interest } = await searchParams
  const branches = await listActiveBranches()
  const branch = branches[0] // internal assignment; never surfaced in the UI

  if (!branch) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Book your free consultation</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Booking is temporarily unavailable. Please check back soon or contact us.
        </p>
      </main>
    )
  }

  const [slots, products] = await Promise.all([getAvailableSlots(branch.id), getActiveProducts()])
  const initialInterests = interest && products.some((p) => p.slug === interest) ? [interest] : []

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 space-y-1">
        <p className="text-brand text-sm font-medium">PolicyFynder</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Book your free consultation</h1>
        <p className="text-muted-foreground text-sm">
          Pick a time that works for you and share a few details. A relationship manager will be
          assigned to you automatically — no cost, no obligation.
        </p>
      </header>

      <BookingForm
        branchCode={branch.code}
        slots={slots}
        products={products}
        initialInterests={initialInterests}
      />
    </main>
  )
}
