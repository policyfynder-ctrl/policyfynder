// Form-level status banners (one failure, one success). Render nothing when empty.

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </div>
  )
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {message}
    </div>
  )
}
