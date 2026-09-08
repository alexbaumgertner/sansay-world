import { describe, expect, it } from 'vitest'
import { hashCode, codesMatch, generateNumericCode } from '@/lib/auth/visitor/codes'

describe('login codes', () => {
  it('generates a six-digit code', () => {
    const code = generateNumericCode()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('compares codes with timing-safe equality', () => {
    process.env.PAYLOAD_SECRET = 'test-secret-for-hmac'
    const code = '123456'
    const stored = hashCode(code)
    expect(codesMatch(stored, code)).toBe(true)
    expect(codesMatch(stored, '000000')).toBe(false)
  })

  it('never stores plaintext in hash output', () => {
    process.env.PAYLOAD_SECRET = 'test-secret-for-hmac'
    const code = '654321'
    expect(hashCode(code)).not.toBe(code)
  })
})
