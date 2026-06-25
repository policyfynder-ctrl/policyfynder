// Presentational wrapper for the auth pages — title, optional description,
// the form, and an optional footer (e.g. "Don't have an account?").
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm text-balance">{description}</p>}
      </div>
      {children}
      {footer && <div className="text-muted-foreground text-center text-sm">{footer}</div>}
    </div>
  )
}
