import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { SignOutButton } from '@/components/SignOutButton'
import { VISITOR_COOKIE } from '@/lib/auth/visitor/cookie'
import { resolveSession } from '@/lib/auth/visitor/session'

export const dynamic = 'force-dynamic'

export default async function ProtectedStatusLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(VISITOR_COOKIE)?.value
  const visitor = token ? await resolveSession(token) : null
  if (!visitor) {
    redirect('/status/sign-in?ended=1')
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <SignOutButton />
      </div>
      {children}
    </div>
  )
}
