import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { VISITOR_AUTH } from './constants'
import { normalizeEmail } from './normalize-email'

export type ThrottleKeyKind = 'addr' | 'origin' | 'fail'

export type ThrottleVerdict =
  | { allowed: true; count: number }
  | { allowed: false; retryAt: Date; reason: 'rate_limited' | 'locked_out' }
  | { allowed: false; reason: 'unavailable' }

function hashAddress(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex')
}

export function throttleKey(kind: ThrottleKeyKind, value: string): string {
  if (kind === 'origin') return `origin:${value}`
  const hashed = kind === 'addr' || kind === 'fail' ? hashAddress(value) : value
  return `${kind}:${hashed}`
}

type UpsertRow = {
  count: number
  window_ends: Date
  blocked_until: Date | null
}

async function atomicUpsert(
  payload: Payload,
  key: string,
  windowSeconds: number,
  setBlockedOnLimit?: { limit: number; blockSeconds: number },
): Promise<UpsertRow> {
  const result = await payload.db.drizzle.execute(
    sql`
      INSERT INTO login_throttle (key, count, window_ends)
      VALUES (${key}, 1, now() + (${windowSeconds}::text || ' seconds')::interval)
      ON CONFLICT (key) DO UPDATE
        SET count = CASE
              WHEN login_throttle.window_ends < now() THEN 1
              ELSE login_throttle.count + 1
            END,
            window_ends = CASE
              WHEN login_throttle.window_ends < now() THEN now() + (${windowSeconds}::text || ' seconds')::interval
              ELSE login_throttle.window_ends
            END,
            blocked_until = CASE
              WHEN login_throttle.window_ends < now() THEN NULL
              WHEN ${setBlockedOnLimit?.limit ?? 0} > 0
                AND login_throttle.count + 1 >= ${setBlockedOnLimit?.limit ?? 0}
                THEN now() + (${setBlockedOnLimit?.blockSeconds ?? 0}::text || ' seconds')::interval
              ELSE login_throttle.blocked_until
            END
      RETURNING count, window_ends, blocked_until
    `,
  )

  const row = result.rows[0] as UpsertRow
  return row
}

async function readRow(payload: Payload, key: string): Promise<UpsertRow | null> {
  const result = await payload.db.drizzle.execute(
    sql`SELECT count, window_ends, blocked_until FROM login_throttle WHERE key = ${key}`,
  )
  if (!result.rows.length) return null
  return result.rows[0] as UpsertRow
}

export async function consumeRequestQuota(
  payload: Payload,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<ThrottleVerdict> {
  try {
    const row = await atomicUpsert(payload, key, windowSeconds)
    if (row.blocked_until && new Date(row.blocked_until) > new Date()) {
      return { allowed: false, retryAt: new Date(row.blocked_until), reason: 'locked_out' }
    }
    if (row.count > limit) {
      return { allowed: false, retryAt: new Date(row.window_ends), reason: 'rate_limited' }
    }
    return { allowed: true, count: row.count }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export async function recordFailedAttempt(payload: Payload, email: string): Promise<ThrottleVerdict> {
  const key = throttleKey('fail', email)
  try {
    const row = await atomicUpsert(payload, key, VISITOR_AUTH.LOCKOUT_SECONDS, {
      limit: VISITOR_AUTH.MAX_FAILED_ATTEMPTS,
      blockSeconds: VISITOR_AUTH.LOCKOUT_SECONDS,
    })

    await mirrorBlockedUntil(payload, email, row.blocked_until)

    if (row.blocked_until && new Date(row.blocked_until) > new Date()) {
      return { allowed: false, retryAt: new Date(row.blocked_until), reason: 'locked_out' }
    }
    return { allowed: true, count: row.count }
  } catch {
    return { allowed: false, reason: 'unavailable' }
  }
}

export async function clearFailedAttempts(payload: Payload, email: string): Promise<void> {
  const key = throttleKey('fail', email)
  try {
    await payload.db.drizzle.execute(sql`DELETE FROM login_throttle WHERE key = ${key}`)
    await mirrorBlockedUntil(payload, email, null)
  } catch {
    // best-effort
  }
}

export async function readBlockState(
  payload: Payload,
  email: string,
): Promise<{ blockedUntil: Date | null }> {
  const key = throttleKey('fail', email)
  try {
    const row = await readRow(payload, key)
    if (!row?.blocked_until) return { blockedUntil: null }
    const blockedUntil = new Date(row.blocked_until)
    if (blockedUntil <= new Date()) return { blockedUntil: null }
    return { blockedUntil }
  } catch {
    return { blockedUntil: null }
  }
}

export async function isAddressLockedOut(payload: Payload, email: string): Promise<Date | null> {
  const { blockedUntil } = await readBlockState(payload, email)
  return blockedUntil
}

export async function deleteThrottleKeysForAddress(payload: Payload, email: string): Promise<void> {
  const addrKey = throttleKey('addr', email)
  const failKey = throttleKey('fail', email)
  try {
    await payload.db.drizzle.execute(
      sql`DELETE FROM login_throttle WHERE key IN (${addrKey}, ${failKey})`,
    )
  } catch {
    // best-effort during cascade
  }
}

async function mirrorBlockedUntil(
  payload: Payload,
  email: string,
  blockedUntil: Date | null,
): Promise<void> {
  const normalized = normalizeEmail(email)
  const visitors = await payload.find({
    collection: 'visitors',
    where: { email: { equals: normalized } },
    limit: 1,
    overrideAccess: true,
  })
  const visitor = visitors.docs[0]
  if (!visitor) return
  await payload.update({
    collection: 'visitors',
    id: visitor.id,
    data: { blockedUntil: blockedUntil?.toISOString() ?? null },
    overrideAccess: true,
  })
}

export function getOriginFromForwarded(forwarded: string | null): string {
  if (!forwarded) return 'unknown'
  return forwarded.split(',')[0]?.trim() || 'unknown'
}
