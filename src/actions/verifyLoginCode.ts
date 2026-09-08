'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  codesMatch,
  consumeCode,
  findUsableCodeForVisitor,
  incrementAttemptCount,
} from '@/lib/auth/visitor/codes'
import { VISITOR_COOKIE, visitorCookieOptions } from '@/lib/auth/visitor/cookie'
import { findVisitorByEmail } from '@/lib/auth/visitor/identity'
import { normalizeEmail } from '@/lib/auth/visitor/normalize-email'
import { mintSession } from '@/lib/auth/visitor/session'
import {
  clearFailedAttempts,
  isAddressLockedOut,
  recordFailedAttempt,
} from '@/lib/auth/visitor/throttle'
import { loginCodeSchema } from '@/lib/validation/login'

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: 'incorrect' }
  | { ok: false; reason: 'expired' }
  | { ok: false; reason: 'locked_out'; retryAfterSeconds: number }
  | { ok: false; reason: 'unavailable' }

export async function verifyLoginCode(email: string, code: string): Promise<VerifyCodeResult> {
  const parsed = loginCodeSchema.safeParse({ email, code })
  if (!parsed.success) {
    return { ok: false, reason: 'incorrect' }
  }

  const normalized = normalizeEmail(parsed.data.email)
  const payload = await getPayload({ config })

  const lockedUntil = await isAddressLockedOut(payload, normalized)
  if (lockedUntil) {
    return {
      ok: false,
      reason: 'locked_out',
      retryAfterSeconds: Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)),
    }
  }

  const visitor = await findVisitorByEmail(normalized)
  if (!visitor) {
    return { ok: false, reason: 'incorrect' }
  }

  const usable = await findUsableCodeForVisitor(visitor.id)
  if (usable.state === 'none') {
    return { ok: false, reason: 'incorrect' }
  }
  if (usable.state === 'expired') {
    return { ok: false, reason: 'expired' }
  }

  if (!codesMatch(usable.codeHash, parsed.data.code)) {
    await incrementAttemptCount(usable.id)
    const failVerdict = await recordFailedAttempt(payload, normalized)
    if (!failVerdict.allowed && failVerdict.reason !== 'unavailable') {
      return {
        ok: false,
        reason: 'locked_out',
        retryAfterSeconds: Math.max(0, Math.ceil((failVerdict.retryAt.getTime() - Date.now()) / 1000)),
      }
    }
    if (!failVerdict.allowed && failVerdict.reason === 'unavailable') {
      return { ok: false, reason: 'unavailable' }
    }
    return { ok: false, reason: 'incorrect' }
  }

  const consumed = await consumeCode(usable.id)
  if (!consumed) {
    return { ok: false, reason: 'incorrect' }
  }

  await clearFailedAttempts(payload, normalized)
  const token = await mintSession(visitor.id)

  const cookieStore = await cookies()
  cookieStore.set(VISITOR_COOKIE, token, visitorCookieOptions)

  redirect('/status')
}
