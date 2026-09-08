import { afterEach, describe, expect, it, vi } from 'vitest'
import { sql } from '@payloadcms/db-postgres'
import {
  clearFailedAttempts,
  consumeRequestQuota,
  getOriginFromForwarded,
  recordFailedAttempt,
  throttleKey,
} from '@/lib/auth/visitor/throttle'
import { VISITOR_AUTH } from '@/lib/auth/visitor/constants'
import { hasDatabase, testPayload } from './helpers/payload'

describe('throttle helpers', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(getOriginFromForwarded('203.0.113.1, 10.0.0.1')).toBe('203.0.113.1')
  })

  it('collapses missing header to unknown', () => {
    expect(getOriginFromForwarded(null)).toBe('unknown')
  })
})

describe.skipIf(!hasDatabase)('throttle counters (database)', () => {
  const runId = Date.now().toString(36)
  const addrKey = throttleKey('addr', `throttle-${runId}@example.com`)
  const originKey = throttleKey('origin', `origin-${runId}`)

  afterEach(async () => {
    const payload = await testPayload()
    await payload.db.drizzle.execute(sql`DELETE FROM login_throttle WHERE key IN (${addrKey}, ${originKey})`)
  })

  it('allows requests up to the per-address limit then rate-limits', async () => {
    const payload = await testPayload()
    for (let i = 0; i < VISITOR_AUTH.REQUESTS_PER_ADDRESS; i++) {
      const verdict = await consumeRequestQuota(
        payload,
        addrKey,
        VISITOR_AUTH.REQUESTS_PER_ADDRESS,
        VISITOR_AUTH.ADDRESS_WINDOW_SECONDS,
      )
      expect(verdict.allowed).toBe(true)
    }
    const limited = await consumeRequestQuota(
      payload,
      addrKey,
      VISITOR_AUTH.REQUESTS_PER_ADDRESS,
      VISITOR_AUTH.ADDRESS_WINDOW_SECONDS,
    )
    expect(limited.allowed).toBe(false)
    if (!limited.allowed && limited.reason !== 'unavailable') {
      expect(limited.reason).toBe('rate_limited')
    }
  })

  it('locks out after failed-attempt threshold', async () => {
    const payload = await testPayload()
    const email = `fail-${runId}@example.com`
    for (let i = 0; i < VISITOR_AUTH.MAX_FAILED_ATTEMPTS; i++) {
      await recordFailedAttempt(payload, email)
    }
    const locked = await recordFailedAttempt(payload, email)
    expect(locked.allowed).toBe(false)
    if (!locked.allowed && locked.reason !== 'unavailable') {
      expect(locked.reason).toBe('locked_out')
    }
  })

  it('clears failed attempts on success path', async () => {
    const payload = await testPayload()
    const email = `clear-${runId}@example.com`
    await recordFailedAttempt(payload, email)
    await clearFailedAttempts(payload, email)
    const again = await recordFailedAttempt(payload, email)
    expect(again.allowed).toBe(true)
  })

  it('returns unavailable when SQL throws (FR-063)', async () => {
    const payload = await testPayload()
    const broken = {
      ...payload,
      db: {
        ...payload.db,
        drizzle: {
          execute: vi.fn().mockRejectedValue(new Error('db down')),
        },
      },
    } as unknown as typeof payload
    const verdict = await consumeRequestQuota(
      broken,
      addrKey,
      VISITOR_AUTH.REQUESTS_PER_ADDRESS,
      VISITOR_AUTH.ADDRESS_WINDOW_SECONDS,
    )
    expect(verdict).toEqual({ allowed: false, reason: 'unavailable' })
  })
})
