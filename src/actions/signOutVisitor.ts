'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { VISITOR_COOKIE } from '@/lib/auth/visitor/cookie'
import { revokeSession } from '@/lib/auth/visitor/session'

export async function signOutVisitor(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(VISITOR_COOKIE)?.value
  if (token) {
    await revokeSession(token, 'signed_out')
  }
  cookieStore.delete(VISITOR_COOKIE)
  redirect('/status/sign-in?signedout=1')
}
