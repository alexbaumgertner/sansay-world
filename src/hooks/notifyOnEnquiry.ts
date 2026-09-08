import type { CollectionAfterChangeHook } from 'payload'
import { dispatchEnquiry } from '@/lib/delivery/dispatch'
import { sendVisitorAck } from '@/lib/delivery/visitor-mail'
import type { ChannelResult } from '@/lib/delivery/types'
import type { Enquiry } from '@/payload-types'

export const notifyOnEnquiry: CollectionAfterChangeHook<Enquiry> = async ({ doc, operation, req, context }) => {
  if (operation !== 'create') return doc
  if (context.skipNotify) return doc

  try {
    const [ownerSettled, ackSettled] = await Promise.allSettled([
      dispatchEnquiry(doc),
      doc.submitterEmail ? sendVisitorAck(doc) : Promise.resolve(),
    ])

    const outcomes =
      ownerSettled.status === 'fulfilled'
        ? ownerSettled.value
        : ({ email: { status: 'failed', attemptedAt: new Date().toISOString(), error: 'dispatch failed' }, telegram: { status: 'disabled' } } as Awaited<
            ReturnType<typeof dispatchEnquiry>
          >)

    let visitorAck: ChannelResult = { status: 'disabled' }
    if (doc.submitterEmail) {
      if (ackSettled.status === 'fulfilled') {
        visitorAck = { status: 'sent', attemptedAt: new Date().toISOString() }
      } else {
        visitorAck = {
          status: 'failed',
          attemptedAt: new Date().toISOString(),
          error: ackSettled.reason instanceof Error ? ackSettled.reason.message : String(ackSettled.reason),
        }
      }
    }

    const deliveryFailed = Object.values(outcomes).some((o) => o.status === 'failed')

    await req.payload.update({
      collection: 'enquiries',
      id: doc.id,
      data: {
        delivery: { ...outcomes, visitorAck },
        deliveryFailed,
      },
      context: { skipNotify: true },
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err, enquiryId: doc.id }, 'notifyOnEnquiry failed unexpectedly')
  }

  return doc
}
