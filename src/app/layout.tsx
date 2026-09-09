import type { ReactNode } from 'react'

/**
 * Passthrough root — do not wrap with <html>/<body> here.
 * (frontend)/layout.tsx owns the public document; (payload)/layout.tsx
 * uses Payload's RootLayout for /admin. Nesting html tags causes hydration errors.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
