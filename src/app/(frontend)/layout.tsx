import type { ReactNode } from 'react'
import { Nav } from '@/components/Nav'
import { t } from '@/lib/copy'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-tone-digital focus:px-3 focus:py-2 focus:text-ink">
        {t('a11y.skipToContent')}
      </a>
      <header>
        <Nav />
      </header>
      <main id="main">{children}</main>
    </>
  )
}
