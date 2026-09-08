'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { enquirySchema, type EnquiryInput } from '@/lib/validation/enquiry'
import { getHomeContent } from '@/lib/data/home'

export type EnquiryResult =
  | { ok: true; replyWindowCopy: string }
  | { ok: false; error: 'validation' | 'bot_detected' | 'storage_error' }

/**
 * See contracts/enquiry-submit.md for the required order of operations.
 * Step order matters: bot check → validate → create → return success →
 * (Payload's afterChange hook dispatches delivery independently).
 */
export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  // 1. Bot check — a filled honeypot never becomes a stored enquiry (FR-017).
  if (input.honeypot) {
    return { ok: false, error: 'bot_detected' }
  }

  // 2. Validate.
  const parsed = enquirySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'validation' }
  }

  // 3. Create — this write is the durable record (Constitution VI).
  const payload = await getPayload({ config })
  try {
    await payload.create({
      collection: 'enquiries',
      data: {
        name: parsed.data.name,
        preferredContactMethod: parsed.data.preferredContactMethod,
        desiredDate: parsed.data.desiredDate,
        jobDescription: parsed.data.jobDescription,
        discipline: parsed.data.disciplineId,
      },
    })
  } catch (err) {
    payload.logger.error({ err }, 'Failed to store enquiry')
    return { ok: false, error: 'storage_error' }
  }

  // 4. Confirm — independent of any delivery outcome (FR-016).
  const home = await getHomeContent()
  return { ok: true, replyWindowCopy: home.replyWindowCopy }
}
