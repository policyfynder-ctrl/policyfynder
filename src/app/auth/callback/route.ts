import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Exchanges the one-time `code` from email links (signup confirmation, password
// reset) for a session cookie, then forwards to `next`. The session-setting
// cookies are written by the server client during the exchange.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Invalid or expired link.
  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
