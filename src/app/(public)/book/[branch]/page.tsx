import { notFound } from 'next/navigation'
import { getBranchByCode, getAvailableSlots, getActiveProducts } from '@/services/booking'
import { BookingForm } from '@/components/features/appointments/BookingForm'

export const metadata = { title: 'Book an appointment — PolicyFynder' }

// Public booking page. No auth guard (it lives in the (public) route group).
// Reads run as the anonymous client; the submit is handled by /api/book.
export default async function BookPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch: branchCode } = await params

  const branch = await getBranchByCode(branchCode)
  if (!branch) notFound()

  const [slots, products] = await Promise.all([getAvailableSlots(branch.id), getActiveProducts()])

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 space-y-1">
        <p className="text-muted-foreground text-sm font-medium">PolicyFynder · {branch.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Book an appointment</h1>
        <p className="text-muted-foreground text-sm">
          Pick a time that works for you and share your details. A relationship manager will be
          assigned automatically.
        </p>
      </header>

      <BookingForm branchCode={branch.code} slots={slots} products={products} />
    </main>
  )
}
