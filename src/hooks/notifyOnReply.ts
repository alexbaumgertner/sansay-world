import type { CollectionAfterChangeHook } from 'payload'
import type { Enquiry } from '@/payload-types'
import { sendReplyNotice } from '@/lib/delivery/visitor-mail'
import type { ChannelResult } from '@/lib/delivery/types'

export const notifyOnReply: CollectionAfterChangeHook<Enquiry> = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'update') return doc
  if (context.skipNotify) return doc

  const hadReply = Boolean(previousDoc?.ownerReply?.trim())
  const hasReply = Boolean(doc.ownerReply?.trim())
  const email = doc.submitterEmail

  if (!hasReply || hadReply || doc.replyNotifiedAt || !email) return doc

  let visitorAckResult: ChannelResult
  try {
    await sendReplyNotice(email)
    visitorAckResult = { status: 'sent', attemptedAt: new Date().toISOString() }
  } catch (err) {
    visitorAckResult = {
      status: 'failed',
      attemptedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const updateData: Partial<Enquiry> = {
    delivery: {
      ...doc.delivery,
      replyNotice: visitorAckResult,
    },
  }

  if (visitorAckResult.status === 'sent') {
    updateData.replyNotifiedAt = visitorAckResult.attemptedAt
  }

  try {
    await req.payload.update({
      collection: 'enquiries',
      id: doc.id,
      data: updateData,
      context: { skipNotify: true },
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err, enquiryId: doc.id }, 'notifyOnReply failed unexpectedly')
  }

  return doc
}
