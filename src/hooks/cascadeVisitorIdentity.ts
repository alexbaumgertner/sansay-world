import type { CollectionAfterDeleteHook } from 'payload'
import type { Enquiry } from '@/payload-types'
import { revokeAllSessions } from '@/lib/auth/visitor/session'
import { deleteThrottleKeysForAddress } from '@/lib/auth/visitor/throttle'

export const cascadeVisitorIdentity: CollectionAfterDeleteHook<Enquiry> = async ({ doc, req }) => {
  const email = doc.submitterEmail
  if (!email) return doc

  const remaining = await req.payload.find({
    collection: 'enquiries',
    where: { submitterEmail: { equals: email } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  if (remaining.totalDocs > 0) return doc

  const visitors = await req.payload.find({
    collection: 'visitors',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
    req,
  })

  const visitor = visitors.docs[0]
  if (!visitor) return doc

  await revokeAllSessions(visitor.id, 'identity_removed')
  await deleteThrottleKeysForAddress(req.payload, email)

  await req.payload.delete({
    collection: 'visitors',
    id: visitor.id,
    overrideAccess: true,
    req,
  })

  return doc
}
