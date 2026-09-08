import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

/**
 * `metadataBase` resolves every relative metadata URL below this segment into
 * an absolute one. Messengers and crawlers reject relative og:image values,
 * so this is what makes a shared link unfurl at all (FR-027).
 */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
