'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { padTo } from '@/lib/auth/visitor/constant-time'
import { issueCode } from '@/lib/auth/visitor/codes'
import { findOrCreateVisitor, hasAttributedEnquiry } from '@/lib/auth/visitor/identity'
import { normalizeEmail } from '@/lib/auth/visitor/normalize-email'
import {
  consumeRequestQuota,
  getOriginFromForwarded,
  isAddressLockedOut,
  throttleKey,
} from '@/lib/auth/visitor/throttle'
import { sendLoginCode } from '@/lib/delivery/visitor-mail'
import { VISITOR_AUTH } from '@/lib/auth/visitor/constants'
import { loginEmailSchema } from '@/lib/validation/login'

export type RequestCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_email' }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number }
  | { ok: false; reason: 'locked_out'; retryAfterSeconds: number }
  | { ok: false; reason: 'delivery_failed' }
  | { ok: false; reason: 'unavailable' }

export async function requestLoginCode(email: string): Promise<RequestCodeResult> {
  const startedAt = Date.now()

  const parsed = loginEmailSchema.safeParse({ email })
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_email' }
  }

  const normalized = normalizeEmail(parsed.data.email)
  const payload = await getPayload({ config })

  const lockedUntil = await isAddressLockedOut(payload, normalized)
  if (lockedUntil) {
    await padTo(startedAt)
    return {
      ok: false,
      reason: 'locked_out',
      retryAfterSeconds: Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)),
    }
  }

  const headersList = await headers()
  const origin = getOriginFromForwarded(headersList.get('x-forwarded-for'))

  const originVerdict = await consumeRequestQuota(
    payload,
    throttleKey('origin', origin),
    VISITOR_AUTH.REQUESTS_PER_ORIGIN,
    VISITOR_AUTH.ORIGIN_WINDOW_SECONDS,
  )
  if (!originVerdict.allowed) {
    await padTo(startedAt)
    if (originVerdict.reason === 'unavailable') return { ok: false, reason: 'unavailable' }
    return {
      ok: false,
      reason: originVerdict.reason === 'locked_out' ? 'locked_out' : 'rate_limited',
      retryAfterSeconds: Math.max(0, Math.ceil((originVerdict.retryAt.getTime() - Date.now()) / 1000)),
    }
  }

  const addressVerdict = await consumeRequestQuota(
    payload,
    throttleKey('addr', normalized),
    VISITOR_AUTH.REQUESTS_PER_ADDRESS,
    VISITOR_AUTH.ADDRESS_WINDOW_SECONDS,
  )
  if (!addressVerdict.allowed) {
    await padTo(startedAt)
    if (addressVerdict.reason === 'unavailable') return { ok: false, reason: 'unavailable' }
    return {
      ok: false,
      reason: addressVerdict.reason === 'locked_out' ? 'locked_out' : 'rate_limited',
      retryAfterSeconds: Math.max(0, Math.ceil((addressVerdict.retryAt.getTime() - Date.now()) / 1000)),
    }
  }

  const attributed = await hasAttributedEnquiry(normalized)
  if (!attributed) {
    await padTo(startedAt)
    return { ok: true }
  }

  const visitor = await findOrCreateVisitor(normalized)
  const { code } = await issueCode(visitor.id)

  try {
    await sendLoginCode(normalized, code)
  } catch {
    await padTo(startedAt)
    return { ok: false, reason: 'delivery_failed' }
  }

  await padTo(startedAt)
  return { ok: true }
}
