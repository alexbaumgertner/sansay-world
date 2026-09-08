import type { CollectionAfterChangeHook } from 'payload'
import { dispatchEnquiry } from '@/lib/delivery/dispatch'
import type { Enquiry } from '@/payload-types'

/**
 * See contracts/notification-delivery.md. Fires only on create. Never
 * throws — a delivery failure is logged and surfaced on the document, and
 * MUST NOT cancel the stored enquiry (Constitution VI, FR-015/FR-016).
 *
 * `context.skipNotify` is REQUIRED on the follow-up update below. Without
 * it, that update re-enters this same `afterChange` hook and recurses
 * infinitely — this is the single most likely implementation bug in the
 * whole feature, called out explicitly rather than left as folklore.
 */
export const notifyOnEnquiry: CollectionAfterChangeHook<Enquiry> = async ({ doc, operation, req, context }) => {
  if (operation !== 'create') return doc
  if (context.skipNotify) return doc

  try {
    const outcomes = await dispatchEnquiry(doc)
    const deliveryFailed = Object.values(outcomes).some((o) => o.status === 'failed')

    await req.payload.update({
      collection: 'enquiries',
      id: doc.id,
      data: { delivery: outcomes, deliveryFailed },
      context: { skipNotify: true },
      req,
    })
  } catch (err) {
    // Dispatch itself is designed to never throw, but if something upstream
    // still does, swallow it here too — the enquiry document must survive
    // regardless (Constitution VI).
    req.payload.logger.error({ err, enquiryId: doc.id }, 'notifyOnEnquiry failed unexpectedly')
  }

  return doc
}
