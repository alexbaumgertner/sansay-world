import type { EmailAdapter, SendEmailOptions } from 'payload'

function stringifyTo(to: SendEmailOptions['to']): string {
  if (!to) return 'unknown'
  if (typeof to === 'string') return to
  if (Array.isArray(to)) {
    return to
      .map((entry) => (typeof entry === 'string' ? entry : entry.address))
      .join(', ')
  }
  return to.address
}

/**
 * Outside production, rewrite every recipient to PREVIEW_MAIL_RECIPIENT so a
 * preview deployment can never email a real client.
 */
export function withRecipientGuard(adapter: EmailAdapter): EmailAdapter {
  return ({ payload }) => {
    const inner = adapter({ payload })
    return {
      ...inner,
      sendEmail: async (message) => {
        if (process.env.VERCEL_ENV === 'production') {
          return inner.sendEmail(message)
        }

        const previewRecipient = process.env.PREVIEW_MAIL_RECIPIENT?.trim()
        if (!previewRecipient) {
          throw new Error('PREVIEW_MAIL_RECIPIENT is required outside production')
        }

        const env = process.env.VERCEL_ENV ?? 'development'
        const originalTo = stringifyTo(message.to)
        const subject = message.subject ?? ''

        return inner.sendEmail({
          ...message,
          to: previewRecipient,
          cc: undefined,
          bcc: undefined,
          subject: `[${env} → ${originalTo}] ${subject}`,
        })
      },
    }
  }
}
