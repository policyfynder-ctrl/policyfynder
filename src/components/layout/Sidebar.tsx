import Link from 'next/link'
import { buildNavItems } from '@/lib/nav'
import { NavLink } from './NavLink'

// Role-aware sidebar. Receives the viewer's permission strings (from
// get_user_permissions) and renders only the nav items those permissions allow,
// via buildNavItems(). Permissions the user lacks are never rendered — the menu
// itself is the first layer of the navigation guard.
export function Sidebar({ permissions, role }: { permissions: string[]; role?: string | null }) {
  const items = buildNavItems(new Set(permissions), role)

  return (
    <aside className="border-border bg-background hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <div className="border-border flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          PolicyFynder
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </nav>
    </aside>
  )
}
