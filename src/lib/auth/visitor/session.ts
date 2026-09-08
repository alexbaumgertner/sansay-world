import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { VISITOR_AUTH } from './constants'
import { hashToken } from './hash'

async function getPayloadInstance() {
  return getPayload({ config })
}

export async function mintSession(visitorId: string): Promise<string> {
  const payload = await getPayloadInstance()
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + VISITOR_AUTH.SESSION_TTL_SECONDS * 1000)

  await payload.create({
    collection: 'visitor-sessions',
    data: {
      visitor: visitorId,
      tokenHash,
      sessionStartedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
    overrideAccess: true,
  })

  const visitor = await payload.findByID({
    collection: 'visitors',
    id: visitorId,
    overrideAccess: true,
  })

  const liveCount = await countLiveSessions(payload, visitorId)

  await payload.update({
    collection: 'visitors',
    id: visitorId,
    data: {
      activeSessionCount: liveCount,
      lastSignedInAt: now.toISOString(),
    },
    overrideAccess: true,
  })

  return token
}

export async function resolveSession(token: string): Promise<{ id: string; email: string } | null> {
  const payload = await getPayloadInstance()
  const tokenHash = hashToken(token)
  const now = new Date().toISOString()

  const sessions = await payload.find({
    collection: 'visitor-sessions',
    where: {
      and: [
        { tokenHash: { equals: tokenHash } },
        { revokedAt: { exists: false } },
        { expiresAt: { greater_than: now } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })

  const session = sessions.docs[0]
  if (!session) return null

  const visitorId = typeof session.visitor === 'string' ? session.visitor : session.visitor?.id
  if (!visitorId) return null

  const visitor = await payload.findByID({
    collection: 'visitors',
    id: visitorId,
    overrideAccess: true,
  })

  return { id: visitor.id, email: visitor.email }
}

export async function revokeSession(token: string, reason: 'signed_out' | 'revoked_by_owner' | 'identity_removed' = 'signed_out'): Promise<void> {
  const payload = await getPayloadInstance()
  const tokenHash = hashToken(token)
  const sessions = await payload.find({
    collection: 'visitor-sessions',
    where: { tokenHash: { equals: tokenHash } },
    limit: 1,
    overrideAccess: true,
  })
  const session = sessions.docs[0]
  if (!session || session.revokedAt) return

  const visitorId = typeof session.visitor === 'string' ? session.visitor : session.visitor?.id

  await payload.update({
    collection: 'visitor-sessions',
    id: session.id,
    data: {
      revokedAt: new Date().toISOString(),
      endedReason: reason,
    },
    overrideAccess: true,
  })

  if (visitorId) {
    const liveCount = await countLiveSessions(payload, visitorId)
    await payload.update({
      collection: 'visitors',
      id: visitorId,
      data: { activeSessionCount: liveCount },
      overrideAccess: true,
    })
  }
}

export async function revokeAllSessions(visitorId: string, reason: 'revoked_by_owner' | 'identity_removed' = 'revoked_by_owner'): Promise<void> {
  const payload = await getPayloadInstance()
  const now = new Date().toISOString()

  const live = await payload.find({
    collection: 'visitor-sessions',
    where: {
      and: [
        { visitor: { equals: visitorId } },
        { revokedAt: { exists: false } },
        { expiresAt: { greater_than: now } },
      ],
    },
    limit: 1000,
    overrideAccess: true,
  })

  for (const session of live.docs) {
    await payload.update({
      collection: 'visitor-sessions',
      id: session.id,
      data: {
        revokedAt: new Date().toISOString(),
        endedReason: reason,
      },
      overrideAccess: true,
    })
  }

  await payload.update({
    collection: 'visitors',
    id: visitorId,
    data: { activeSessionCount: 0 },
    overrideAccess: true,
  })
}

export async function countLiveSessions(payload: Awaited<ReturnType<typeof getPayload>>, visitorId: string): Promise<number> {
  const now = new Date().toISOString()
  const result = await payload.find({
    collection: 'visitor-sessions',
    where: {
      and: [
        { visitor: { equals: visitorId } },
        { revokedAt: { exists: false } },
        { expiresAt: { greater_than: now } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  })
  return result.totalDocs
}
