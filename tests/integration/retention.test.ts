import { afterEach, describe, expect, it } from 'vitest'
import { sql } from '@payloadcms/db-postgres'
import { throttleKey } from '@/lib/auth/visitor/throttle'
import { VISITOR_AUTH } from '@/lib/auth/visitor/constants'
import { hasDatabase, testPayload } from './helpers/payload'
import { lexicalParagraph } from './helpers/lexical'

describe.skipIf(!hasDatabase)('visitor retention (SC-014)', () => {
  const runId = Date.now().toString(36)
  const email = `retention-${runId}@example.com`
  let disciplineId: string
  let enquiryId: string
  let visitorId: string

  afterEach(async () => {
    const payload = await testPayload()
    if (enquiryId) {
      await payload.delete({ collection: 'enquiries', id: enquiryId, overrideAccess: true }).catch(() => {})
    }
    if (visitorId) {
      await payload.delete({ collection: 'visitors', id: visitorId, overrideAccess: true }).catch(() => {})
    }
    if (disciplineId) {
      await payload.delete({ collection: 'disciplines', id: disciplineId }).catch(() => {})
    }
  })

  async function seedEnquiry() {
    const payload = await testPayload()
    const discipline = await payload.create({
      collection: 'disciplines',
      data: {
        name: `Retention ${runId}`,
        slug: `retention-${runId}`,
        strapline: 'test',
        description: lexicalParagraph('Retention test'),
        tone: 'digital',
        order: 996,
        published: true,
      },
    })
    disciplineId = discipline.id

    const enquiry = await payload.create({
      collection: 'enquiries',
      data: {
        name: 'Retention test',
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

    await payload.db.drizzle.execute(
      sql`INSERT INTO login_throttle (key, count, window_ends, blocked_until)
          VALUES (${throttleKey('fail', email)}, 5, now() + interval '1 hour', now() + interval '1 hour')
          ON CONFLICT (key) DO UPDATE SET blocked_until = now() + interval '1 hour'`,
    )

    return { payload, enquiry }
  }

  it('deleting the last attributed enquiry removes identity and throttle keys', async () => {
    const { payload, enquiry } = await seedEnquiry()
    await payload.delete({ collection: 'enquiries', id: enquiry.id, overrideAccess: true })

    const visitors = await payload.find({
      collection: 'visitors',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    expect(visitors.totalDocs).toBe(0)

    const throttle = await payload.db.drizzle.execute(
      sql`SELECT key FROM login_throttle WHERE key IN (${throttleKey('addr', email)}, ${throttleKey('fail', email)})`,
    )
    expect(throttle.rows).toHaveLength(0)
    visitorId = ''
    enquiryId = ''
  })

  it('finds sessions past the retention cutoff for purge (FR-059)', async () => {
    const payload = await testPayload()
    const expiredAt = new Date(
      Date.now() - (VISITOR_AUTH.RETENTION_DAYS + 2) * 24 * 60 * 60 * 1000,
    ).toISOString()
    const retentionCutoff = new Date(
      Date.now() - VISITOR_AUTH.RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const visitor = await payload.create({
      collection: 'visitors',
      data: { email: `purge-${runId}@example.com`, firstSeenAt: new Date().toISOString(), activeSessionCount: 0 },
      overrideAccess: true,
    })

    const session = await payload.create({
      collection: 'visitor-sessions',
      data: {
        visitor: visitor.id,
        tokenHash: `hash-${runId}`,
        sessionStartedAt: expiredAt,
        expiresAt: expiredAt,
      },
      overrideAccess: true,
    })

    const expired = await payload.find({
      collection: 'visitor-sessions',
      where: { expiresAt: { less_than: retentionCutoff } },
      limit: 10,
      overrideAccess: true,
    })
    expect(expired.docs.some((doc) => doc.id === session.id)).toBe(true)

    await payload.delete({ collection: 'visitor-sessions', id: session.id, overrideAccess: true })
    await payload.delete({ collection: 'visitors', id: visitor.id, overrideAccess: true })
  })
})
