import { UserMenu } from './UserMenu'
import { RoleBadge } from './RoleBadge'
import type { Viewer } from '@/services/roles'

// Top bar: brand (mobile only — sidebar carries it on desktop), the viewer's
// role, and the profile menu.
export function Header({ viewer }: { viewer: Viewer }) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 backdrop-blur md:px-6">
      <span className="font-semibold tracking-tight md:hidden">PolicyFynder</span>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block">
          <RoleBadge role={viewer.primaryRole} />
        </div>
        <UserMenu fullName={viewer.fullName} email={viewer.email} role={viewer.primaryRole} />
      </div>
    </header>
  )
}
