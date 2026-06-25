// Public, unauthenticated pages (e.g. the booking form). No auth guard, no
// dashboard chrome — just a clean centered canvas.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/30 min-h-screen">{children}</div>
}
