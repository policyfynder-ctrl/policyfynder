import { NextResponse } from 'next/server'
import { APP_VERSION, getCommitSha, LATEST_DB_MIGRATION } from '@/lib/appInfo'

// Health / uptime endpoint (Milestone 15). Public, no auth, no secrets.
// Returns liveness + build identity. An optional shallow DB check runs only when
// ?db=1 is passed (keeps the default response fast and side-effect free for
// frequent uptime pings). The DB check is a HEAD count on a public-readable table
// — it never returns data and never touches anything sensitive.

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const withDb = url.searchParams.get('db') === '1'

  const body: Record<string, unknown> = {
    status: 'ok',
    version: APP_VERSION,
    commit: getCommitSha(),
    migration: LATEST_DB_MIGRATION,
    timestamp: new Date().toISOString(),
  }

  if (withDb) {
    try {
      // Lazy import so the default ping has zero DB dependency.
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { error } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      body.db = error ? 'error' : 'ok'
      if (error) body.status = 'degraded'
    } catch {
      body.db = 'error'
      body.status = 'degraded'
    }
  }

  return NextResponse.json(body, { status: body.status === 'ok' ? 200 : 503 })
}
