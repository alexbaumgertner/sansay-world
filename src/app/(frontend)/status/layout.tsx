import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function StatusLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
}
