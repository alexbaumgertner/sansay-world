import { resendAdapter } from '@payloadcms/email-resend'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

let loggedTier: string | null = null

function logTier(name: string) {
  if (loggedTier !== name) {
    loggedTier = name
    console.info(`[email] Using tier: ${name}`)
  }
}

/**
 * Three-tier selection: Resend when RESEND_API_KEY is set, SMTP when
 * SMTP_HOST is set, Ethereal when neither is. Empty string counts as absent.
 */
export async function buildEmailAdapter(): Promise<EmailAdapter> {
  const defaultFromAddress = process.env.RESEND_FROM_ADDRESS ?? 'noreply@example.com'
  const defaultFromName = 'SanSay'

  if (process.env.RESEND_API_KEY) {
    logTier('resend')
    return resendAdapter({
      apiKey: process.env.RESEND_API_KEY,
      defaultFromAddress,
      defaultFromName,
    })
  }

  if (process.env.SMTP_HOST) {
    logTier('smtp')
    return await nodemailerAdapter({
      defaultFromAddress,
      defaultFromName,
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      },
    })
  }

  logTier('ethereal')
  return await nodemailerAdapter()
}
