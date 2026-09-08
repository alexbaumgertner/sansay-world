import { getPayload } from 'payload'
import config from '@payload-config'
import { issueCode } from '@/lib/auth/visitor/codes'
import { lexicalParagraph } from '../fixtures/cms'

let payloadInstance: Promise<Awaited<ReturnType<typeof getPayload>>> | null = null

async function payload() {
  payloadInstance ??= getPayload({ config })
  return payloadInstance
}

export async function seedVisitorWithEnquiry(email: string, suffix: string) {
  const p = await payload()
  const discipline = await p.create({
    collection: 'disciplines',
    data: {
      name: `E2E visitor ${suffix}`,
      slug: `e2e-visitor-${suffix}`,
      strapline: 'test',
      description: lexicalParagraph('test'),
      tone: 'digital',
      order: 998,
      published: true,
    },
  })

  const enquiry = await p.create({
    collection: 'enquiries',
    data: {
      name: `Visitor test ${suffix}`,
      submitterEmail: email,
      preferredContactMethod: 'email',
      jobDescription: `Job ${suffix}`,
      discipline: discipline.id,
      status: 'new',
      submittedAt: new Date().toISOString(),
    },
    overrideAccess: true,
    context: { skipNotify: true },
  })

  const visitor = await p.create({
    collection: 'visitors',
    data: {
      email,
      firstSeenAt: new Date().toISOString(),
      activeSessionCount: 0,
    },
    overrideAccess: true,
  })

  return { disciplineId: discipline.id, enquiryId: enquiry.id, visitorId: visitor.id }
}

export async function issueKnownLoginCode(visitorId: string): Promise<string> {
  const { code } = await issueCode(visitorId)
  return code
}

export async function expireLatestCode(visitorId: string): Promise<void> {
  const p = await payload()
  const codes = await p.find({
    collection: 'login-codes',
    where: { visitor: { equals: visitorId } },
    sort: '-issuedAt',
    limit: 1,
    overrideAccess: true,
  })
  const code = codes.docs[0]
  if (!code) throw new Error('No login code to expire')
  await p.update({
    collection: 'login-codes',
    id: code.id,
    data: { expiresAt: new Date(Date.now() - 60_000).toISOString() },
    overrideAccess: true,
  })
}

export async function cleanupVisitorAuth(ids: {
  disciplineId?: string
  enquiryIds?: string[]
  visitorId?: string
}) {
  const p = await payload()
  for (const enquiryId of ids.enquiryIds ?? []) {
    try {
      await p.delete({ collection: 'enquiries', id: enquiryId, overrideAccess: true })
    } catch {
      // already removed by cascade
    }
  }
  if (ids.visitorId) {
    try {
      await p.delete({ collection: 'visitors', id: ids.visitorId, overrideAccess: true })
    } catch {
      // cascade
    }
  }
  if (ids.disciplineId) {
    try {
      await p.delete({ collection: 'disciplines', id: ids.disciplineId })
    } catch {
      // fine
    }
  }
}
