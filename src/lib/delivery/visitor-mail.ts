import { getPayload } from 'payload'
import config from '@payload-config'
import { t } from '@/lib/copy'
import { absoluteUrl } from '@/lib/site-url'
import type { Enquiry } from '@/payload-types'

export async function sendLoginCode(email: string, code: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.sendEmail({
    to: email,
    subject: t('login.emailCodeSubject'),
    text: t('login.emailCodeBody', undefined, { code, minutes: '10', signInUrl: absoluteUrl('/status/sign-in') }),
  })
}

export async function sendVisitorAck(enquiry: Enquiry): Promise<void> {
  if (!enquiry.submitterEmail) return
  const payload = await getPayload({ config })
  await payload.sendEmail({
    to: enquiry.submitterEmail,
    subject: t('login.emailAckSubject'),
    text: t('login.emailAckBody', undefined, { signInUrl: absoluteUrl('/status/sign-in') }),
  })
}

export async function sendReplyNotice(email: string): Promise<void> {
  const payload = await getPayload({ config })
  await payload.sendEmail({
    to: email,
    subject: t('login.emailReplyNoticeSubject'),
    text: t('login.emailReplyNoticeBody', undefined, { signInUrl: absoluteUrl('/status/sign-in') }),
  })
}
