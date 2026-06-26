import { redirect } from 'next/navigation'
import { getCurrentViewer } from '@/services/roles'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

// Dashboard shell + auth guard. Middleware blocks unauthenticated requests; this
// is the server-side backstop and the single place the viewer (identity + roles +
// permissions) is resolved for the whole shell.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getCurrentViewer()
  if (!viewer) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar permissions={viewer.permissions} role={viewer.primaryRole} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header viewer={viewer} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
