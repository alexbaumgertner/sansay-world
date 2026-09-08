import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '@payload-config'
import { VISITOR_AUTH } from './constants'

function codeSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is required')
  return secret
}

export function hashCode(code: string): string {
  return createHmac('sha256', codeSecret()).update(code).digest('hex')
}

export function generateNumericCode(): string {
  const n = randomInt(0, 1_000_000)
  return n.toString().padStart(VISITOR_AUTH.CODE_LENGTH, '0')
}

export function codesMatch(storedHash: string, submittedCode: string): boolean {
  const submittedHash = hashCode(submittedCode)
  try {
    return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(submittedHash, 'hex'))
  } catch {
    return false
  }
}

async function getPayloadInstance() {
  return getPayload({ config })
}

export async function supersedeOutstandingCodes(visitorId: string): Promise<void> {
  const payload = await getPayloadInstance()
  const now = new Date().toISOString()
  const outstanding = await payload.find({
    collection: 'login-codes',
    where: {
      and: [
        { visitor: { equals: visitorId } },
        { consumedAt: { exists: false } },
        { supersededAt: { exists: false } },
        { expiresAt: { greater_than: now } },
      ],
    },
    limit: 100,
    overrideAccess: true,
  })

  for (const code of outstanding.docs) {
    await payload.update({
      collection: 'login-codes',
      id: code.id,
      data: { supersededAt: now },
      overrideAccess: true,
    })
  }
}

export async function issueCode(visitorId: string): Promise<{ code: string; id: string }> {
  const payload = await getPayloadInstance()
  await supersedeOutstandingCodes(visitorId)

  const code = generateNumericCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + VISITOR_AUTH.CODE_TTL_SECONDS * 1000)

  const doc = await payload.create({
    collection: 'login-codes',
    data: {
      visitor: visitorId,
      codeHash: hashCode(code),
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      attemptCount: 0,
    },
    overrideAccess: true,
  })

  return { code, id: doc.id }
}

export type UsableCodeState = 'usable' | 'expired' | 'none'

export async function findUsableCodeForVisitor(visitorId: string): Promise<
  | { state: 'none' }
  | { state: 'expired' }
  | { state: 'usable'; id: string; codeHash: string; attemptCount: number }
> {
  const payload = await getPayloadInstance()
  const now = new Date().toISOString()

  const recent = await payload.find({
    collection: 'login-codes',
    where: {
      and: [{ visitor: { equals: visitorId } }, { consumedAt: { exists: false } }, { supersededAt: { exists: false } }],
    },
    sort: '-issuedAt',
    limit: 1,
    overrideAccess: true,
  })

  const doc = recent.docs[0]
  if (!doc) return { state: 'none' }
  if (doc.expiresAt && doc.expiresAt <= now) return { state: 'expired' }
  return {
    state: 'usable',
    id: doc.id,
    codeHash: doc.codeHash,
    attemptCount: doc.attemptCount ?? 0,
  }
}

export async function consumeCode(codeId: string): Promise<boolean> {
  const payload = await getPayloadInstance()
  const result = await payload.db.drizzle.execute(
    sql`
      UPDATE login_codes
      SET consumed_at = now()
      WHERE id = ${codeId}::uuid
        AND consumed_at IS NULL
        AND superseded_at IS NULL
        AND expires_at > now()
      RETURNING id
    `,
  )
  return result.rows.length > 0
}

export async function incrementAttemptCount(codeId: string): Promise<void> {
  const payload = await getPayloadInstance()
  const doc = await payload.findByID({
    collection: 'login-codes',
    id: codeId,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'login-codes',
    id: codeId,
    data: { attemptCount: (doc.attemptCount ?? 0) + 1 },
    overrideAccess: true,
  })
}
