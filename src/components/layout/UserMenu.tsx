import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { RoleBadge } from './RoleBadge'
import type { UserRoleName } from '@/types'

function initials(name: string | null, email: string | null): string {
  const src = name?.trim() || email || '?'
  const parts = src.split(/\s+/).filter(Boolean)
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : src.slice(0, 2)
  return chars.toUpperCase()
}

// Profile menu: avatar + name in the bar, expanding to email, role, and sign-out.
// Uses a native <details> so it needs no client JS to open/close.
export function UserMenu({
  fullName,
  email,
  role,
}: {
  fullName: string | null
  email: string | null
  role: UserRoleName | null
}) {
  return (
    <details className="group relative">
      <summary className="hover:bg-muted flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 [&::-webkit-details-marker]:hidden">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-medium">
          {initials(fullName, email)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-medium">{fullName ?? 'Account'}</span>
          <span className="text-muted-foreground block text-xs leading-tight">{email}</span>
        </span>
      </summary>

      <div className="border-border bg-popover text-popover-foreground absolute right-0 z-20 mt-2 w-60 rounded-lg border p-3 shadow-md">
        <div className="border-border space-y-1.5 border-b pb-3">
          <p className="text-sm font-medium">{fullName ?? 'Account'}</p>
          <p className="text-muted-foreground truncate text-xs">{email}</p>
          <div className="pt-1">
            <RoleBadge role={role} />
          </div>
        </div>
        <div className="pt-3">
          <LogoutButton />
        </div>
      </div>
    </details>
  )
}
