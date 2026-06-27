import type { NextConfig } from 'next'

// Safe, broadly-compatible security headers applied to every route. We intentionally
// avoid a strict Content-Security-Policy for now (CSP tuning is deferred — it risks
// breaking Supabase/Next inline scripts and needs dedicated testing). Everything here
// is non-breaking and recommended for production.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains (effective once served over HTTPS).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disallow MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disallow being framed by other origins (clickjacking protection).
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Send only the origin on cross-origin requests.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down powerful browser features the app does not use.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false, // do not advertise the framework
  compress: true,
  images: {
    // Add approved external logo/image hosts here when needed (e.g. a CDN for
    // partner logos). Left empty: M14 partner tiles are text/local assets only.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
