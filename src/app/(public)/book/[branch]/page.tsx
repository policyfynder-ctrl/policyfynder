import { notFound } from 'next/navigation'
import { getBranchByCode, getAvailableSlots, getActiveProducts } from '@/services/booking'
import { BookingForm } from '@/components/features/appointments/BookingForm'

export const metadata = { title: 'Book an appointment — PolicyFynder' }

// Public booking page. No auth guard (it lives in the (public) route group).
// Reads run as the anonymous client; the submit is handled by /api/book.
// A ?interest=<slug> (e.g. from a product-page CTA) pre-selects that category.
export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ branch: string }>
  searchParams: Promise<{ interest?: string }>
}) {
  const { branch: branchCode } = await params
  const { interest } = await searchParams

  const branch = await getBranchByCode(branchCode)
  if (!branch) notFound()

  const [slots, products] = await Promise.all([getAvailableSlots(branch.id), getActiveProducts()])

  // Only honour an interest that maps to a real, active product.
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
