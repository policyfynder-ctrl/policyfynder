import { APP_VERSION, getCommitSha, LATEST_DB_MIGRATION, isProduction } from '@/lib/appInfo'

// Build-identity badge for staff/support, shown only in production (NODE_ENV).
// Surfaces version / commit / DB migration so "what's actually deployed?" is
// answerable at a glance during troubleshooting. No secrets, non-sensitive.
export function ProductionBanner() {
  if (!isProduction()) return null
  return (
    <div className="border-border bg-muted/40 text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-1.5 text-xs">
      <span className="bg-teal/15 text-teal rounded px-1.5 py-0.5 font-medium">Production</span>
      <span>v{APP_VERSION}</span>
      <span>commit {getCommitSha()}</span>
      <span>DB {LATEST_DB_MIGRATION}</span>
    </div>
  )
}
