import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Nav } from '@/components/Nav'
import { t } from '@/lib/copy'
import { getSiteUrl } from '@/lib/site-url'
import '../globals.css'

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

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-tone-digital focus:px-3 focus:py-2 focus:text-ink"
        >
          {t('a11y.skipToContent')}
        </a>
        <header>
          <Nav />
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  )
}
