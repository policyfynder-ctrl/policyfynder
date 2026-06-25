// Shared shell for all auth routes (/login, /signup, /reset-password):
// a centered, single-column container.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">{children}</main>
  )
}
