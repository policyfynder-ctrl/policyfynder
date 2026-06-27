import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Only run the session refresh / auth-redirect on routes where the session
  // matters. Public marketing pages, the booking funnel, and API routes (which
  // do their own auth) are excluded — this keeps marketing TTFB/CWV fast by
  // avoiding a Supabase getUser() call on every public request.
  matcher: ['/dashboard/:path*', '/login', '/signup', '/reset-password'],
}
