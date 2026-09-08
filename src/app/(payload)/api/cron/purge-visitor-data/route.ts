import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import config from '@payload-config'
import { VISITOR_AUTH } from '@/lib/auth/visitor/constants'
import { countLiveSessions } from '@/lib/auth/visitor/session'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await getPayload({ config })
  const retentionCutoff = new Date(Date.now() - VISITOR_AUTH.RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const throttleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const expiredSessions = await payload.find({
      collection: 'visitor-sessions',
      where: {
        or: [
          { expiresAt: { less_than: retentionCutoff } },
          { revokedAt: { less_than: retentionCutoff } },
        ],
      },
      limit: 1000,
      overrideAccess: true,
    })

    for (const session of expiredSessions.docs) {
      await payload.delete({ collection: 'visitor-sessions', id: session.id, overrideAccess: true })
    }

    const expiredCodes = await payload.find({
      collection: 'login-codes',
      where: {
        or: [
          { expiresAt: { less_than: retentionCutoff } },
          { consumedAt: { less_than: retentionCutoff } },
          { supersededAt: { less_than: retentionCutoff } },
        ],
      },
      limit: 1000,
      overrideAccess: true,
    })

    for (const code of expiredCodes.docs) {
      await payload.delete({ collection: 'login-codes', id: code.id, overrideAccess: true })
    }

    await payload.db.drizzle.execute(
      sql`DELETE FROM login_throttle WHERE window_ends < ${throttleCutoff}`,
    )

    const visitors = await payload.find({ collection: 'visitors', limit: 1000, overrideAccess: true })
    for (const visitor of visitors.docs) {
      const live = await countLiveSessions(payload, visitor.id)
      if (live !== visitor.activeSessionCount) {
        await payload.update({
          collection: 'visitors',
          id: visitor.id,
          data: { activeSessionCount: live },
          overrideAccess: true,
        })
      }
      const { blockedUntil } = await import('@/lib/auth/visitor/throttle').then((m) =>
        m.readBlockState(payload, visitor.email),
      )
      if ((visitor.blockedUntil ?? null) !== (blockedUntil?.toISOString() ?? null)) {
        await payload.update({
          collection: 'visitors',
          id: visitor.id,
          data: { blockedUntil: blockedUntil?.toISOString() ?? null },
          overrideAccess: true,
        })
      }
    }

    payload.logger.info(
      {
        purgedSessions: expiredSessions.totalDocs,
        purgedCodes: expiredCodes.totalDocs,
      },
      'purge-visitor-data completed',
    )

    return Response.json({
      ok: true,
      purgedSessions: expiredSessions.totalDocs,
      purgedCodes: expiredCodes.totalDocs,
    })
  } catch (err) {
    payload.logger.error({ err }, 'purge-visitor-data failed')
    return Response.json({ ok: false }, { status: 500 })
  }
}
