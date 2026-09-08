import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildEmailAdapter } from '@/lib/email/adapter'
import { withRecipientGuard } from '@/lib/email/recipient-guard'

describe('email adapter tier selection', () => {
  const env = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  it('selects resend when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 're_test'
    delete process.env.SMTP_HOST
    const adapter = await buildEmailAdapter()
    expect(adapter({ payload: {} as never }).name).toBe('resend-rest')
  })

  it('selects nodemailer when only SMTP_HOST is set', async () => {
    delete process.env.RESEND_API_KEY
    process.env.SMTP_HOST = 'smtp.example.com'
    const adapter = await buildEmailAdapter()
    expect(adapter({ payload: {} as never }).name).toBe('nodemailer')
  })

  it('selects ethereal when neither key is set', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST
    const adapter = await buildEmailAdapter()
    expect(adapter({ payload: {} as never }).name).toBe('nodemailer')
  })

  it('resend wins when both are set', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.SMTP_HOST = 'smtp.example.com'
    const adapter = await buildEmailAdapter()
    expect(adapter({ payload: {} as never }).name).toBe('resend-rest')
  })
})

describe('recipient guard', () => {
  const env = process.env

  afterEach(() => {
    process.env = env
  })

  it('rewrites recipients outside production', async () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.PREVIEW_MAIL_RECIPIENT = 'owner@test.com'
    const inner = vi.fn(() => ({
      name: 'test',
      defaultFromAddress: 'a@b.c',
      defaultFromName: 'T',
      sendEmail: vi.fn(async (msg) => msg),
    }))
    const guarded = withRecipientGuard(inner as never)({ payload: {} as never })
    const result = (await guarded.sendEmail({ to: 'client@example.com', subject: 'Hi' })) as {
      to: string
      subject: string
    }
    expect(result.to).toBe('owner@test.com')
    expect(result.subject).toContain('client@example.com')
  })

  it('throws when PREVIEW_MAIL_RECIPIENT is missing outside production', async () => {
    process.env.VERCEL_ENV = 'preview'
    delete process.env.PREVIEW_MAIL_RECIPIENT
    const inner = vi.fn(() => ({
      name: 'test',
      defaultFromAddress: 'a@b.c',
      defaultFromName: 'T',
      sendEmail: vi.fn(),
    }))
    const guarded = withRecipientGuard(inner as never)({ payload: {} as never })
    await expect(guarded.sendEmail({ to: 'client@example.com' })).rejects.toThrow(/PREVIEW_MAIL_RECIPIENT/)
  })
})
