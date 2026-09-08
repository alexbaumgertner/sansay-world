import { getPayload } from 'payload'
import config from '@payload-config'
import { normalizeEmail } from '@/lib/auth/visitor/normalize-email'

export async function hasAttributedEnquiry(email: string): Promise<boolean> {
  const payload = await getPayload({ config })
  const normalized = normalizeEmail(email)
  const result = await payload.find({
    collection: 'enquiries',
    where: { submitterEmail: { equals: normalized } },
    limit: 1,
    overrideAccess: true,
  })
  return result.totalDocs > 0
}

export async function findVisitorByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const payload = await getPayload({ config })
  const normalized = normalizeEmail(email)
  const result = await payload.find({
    collection: 'visitors',
    where: { email: { equals: normalized } },
    limit: 1,
    overrideAccess: true,
  })
  const doc = result.docs[0]
  if (!doc) return null
  return { id: doc.id, email: doc.email }
}

export async function findOrCreateVisitor(email: string): Promise<{ id: string; email: string }> {
  const payload = await getPayload({ config })
  const normalized = normalizeEmail(email)
  const existing = await findVisitorByEmail(normalized)
  if (existing) return existing

  const doc = await payload.create({
    collection: 'visitors',
    data: {
      email: normalized,
      firstSeenAt: new Date().toISOString(),
      activeSessionCount: 0,
    },
    overrideAccess: true,
  })

  return { id: doc.id, email: doc.email }
}
