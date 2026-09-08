import { getPayload } from 'payload'
import config from '@payload-config'
import type { Enquiry } from '@/payload-types'
import type { Channel } from './types'

/**
 * FR-013 — the mandatory channel. Sent via Payload's configured email
 * adapter (Resend) to `site-settings.ownerNotificationEmail`.
 */
export const emailChannel: Channel = {
  name: 'email',
  isEnabled: () => true, // mandatory — no configuration turns it off
  async send(enquiry: Enquiry) {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'site-settings' })
    const disciplineName =
      typeof enquiry.discipline === 'object' ? enquiry.discipline.name : String(enquiry.discipline)

    if (!settings.ownerNotificationEmail) {
      throw new Error('ownerNotificationEmail is not configured in site-settings')
    }

    await payload.sendEmail({
      to: settings.ownerNotificationEmail,
      subject: `Новая заявка: ${disciplineName} — ${enquiry.name}`,
      text: [
        `Направление: ${disciplineName}`,
        `Имя: ${enquiry.name}`,
        `Контакт: ${enquiry.preferredContactMethod}`,
        enquiry.desiredDate ? `Желаемая дата: ${enquiry.desiredDate}` : null,
        `Задача: ${enquiry.jobDescription}`,
        '',
        `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/admin/collections/enquiries/${enquiry.id}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })
  },
}
