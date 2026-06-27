import type { Metadata } from 'next'
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Heading face for the public website (mapped to --font-heading in globals.css).
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://policyfynder.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PolicyFynder — Insurance made simple',
    template: '%s — PolicyFynder',
  },
  description:
    'PolicyFynder helps you find, compare, and manage health, motor, life, travel, commercial, and group insurance — with a dedicated relationship manager at every step.',
  applicationName: 'PolicyFynder',
  openGraph: {
    type: 'website',
    siteName: 'PolicyFynder',
    title: 'PolicyFynder — Insurance made simple',
    description:
      'Find, compare, and manage insurance with a dedicated relationship manager. Book a free consultation today.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PolicyFynder — Insurance made simple',
    description: 'Find, compare, and manage insurance with a dedicated relationship manager.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
