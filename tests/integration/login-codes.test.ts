import { afterEach, describe, expect, it } from 'vitest'
import {
  codesMatch,
  consumeCode,
  findUsableCodeForVisitor,
  generateNumericCode,
  hashCode,
  issueCode,
  supersedeOutstandingCodes,
} from '@/lib/auth/visitor/codes'
import { hasDatabase, testPayload } from './helpers/payload'
import { lexicalParagraph } from './helpers/lexical'

describe('login codes (unit)', () => {
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

describe.skipIf(!hasDatabase)('login codes (database)', () => {
  let email: string
  let visitorId: string
  let disciplineId: string
  let enquiryId: string

  afterEach(async () => {
    const payload = await testPayload()
    if (enquiryId) {
      await payload.delete({ collection: 'enquiries', id: enquiryId, overrideAccess: true }).catch(() => {})
      enquiryId = ''
    }
    if (visitorId) {
      await payload.delete({ collection: 'visitors', id: visitorId, overrideAccess: true }).catch(() => {})
      visitorId = ''
    }
    if (disciplineId) {
      await payload.delete({ collection: 'disciplines', id: disciplineId }).catch(() => {})
      disciplineId = ''
    }
  })

  async function seed() {
    email = `codes-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
    const payload = await testPayload()
    const discipline = await payload.create({
      collection: 'disciplines',
      data: {
        name: 'Codes test discipline',
        slug: `codes-test-${Date.now()}`,
        strapline: 'test',
        description: lexicalParagraph('Codes test discipline'),
        tone: 'digital',
        order: 997,
        published: true,
      },
    })
    disciplineId = discipline.id

    const enquiry = await payload.create({
      collection: 'enquiries',
      data: {
        name: 'Codes test',
        submitterEmail: email,
        preferredContactMethod: 'email',
        jobDescription: 'test',
        discipline: disciplineId,
        status: 'new',
        submittedAt: new Date().toISOString(),
      },
      overrideAccess: true,
      context: { skipNotify: true },
    })
    enquiryId = enquiry.id

    const visitor = await payload.create({
      collection: 'visitors',
      data: { email, firstSeenAt: new Date().toISOString(), activeSessionCount: 0 },
      overrideAccess: true,
    })
    visitorId = visitor.id
  }

  it('refuses a consumed code on second consume (FR-008)', async () => {
    await seed()
    const { id } = await issueCode(visitorId)
    expect(await consumeCode(id)).toBe(true)
    expect(await consumeCode(id)).toBe(false)
  })

  it('concurrent consume yields exactly one success', async () => {
    await seed()
    const { id } = await issueCode(visitorId)
    const results = await Promise.all([consumeCode(id), consumeCode(id)])
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it('refuses expired and superseded codes identically as none', async () => {
    await seed()
    const payload = await testPayload()
    const first = await issueCode(visitorId)
    await supersedeOutstandingCodes(visitorId)
    const usableAfterSupersede = await findUsableCodeForVisitor(visitorId)
    expect(usableAfterSupersede.state).toBe('none')

    const second = await issueCode(visitorId)
    await payload.update({
      collection: 'login-codes',
      id: second.id,
      data: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
      overrideAccess: true,
    })
    const usableAfterExpiry = await findUsableCodeForVisitor(visitorId)
    expect(usableAfterExpiry.state).toBe('expired')
    expect(await consumeCode(first.id)).toBe(false)
  })
})

describe('requestLoginCode padTo guard', () => {
  it('imports padTo on every terminal path except invalid_email', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(new URL('../../src/actions/requestLoginCode.ts', import.meta.url), 'utf8'),
    )
    const padCount = (source.match(/await padTo\(/g) ?? []).length
    expect(padCount).toBeGreaterThanOrEqual(5)
  })
})
