import { describe, expect, it } from 'vitest'
import { dispatchEnquiry } from '@/lib/delivery/dispatch'
import type { Channel } from '@/lib/delivery/types'
import type { Enquiry } from '@/payload-types'

const fakeEnquiry = {} as Enquiry

function channel(name: 'email' | 'telegram', behavior: 'sent' | 'throws' | 'disabled'): Channel {
  return {
    name,
    isEnabled: () => behavior !== 'disabled',
    send: async () => {
      if (behavior === 'throws') throw new Error(`${name} exploded`)
    },
  }
}

describe('dispatchEnquiry', () => {
  it('records both channels as sent when both succeed', async () => {
    const result = await dispatchEnquiry(fakeEnquiry, [channel('email', 'sent'), channel('telegram', 'sent')])
    expect(result.email.status).toBe('sent')
    expect(result.telegram.status).toBe('sent')
  })

  it('never throws when a channel throws, and still records the other channel (Constitution VI)', async () => {
    await expect(
      dispatchEnquiry(fakeEnquiry, [channel('email', 'throws'), channel('telegram', 'sent')]),
    ).resolves.toBeDefined()

    const result = await dispatchEnquiry(fakeEnquiry, [channel('email', 'throws'), channel('telegram', 'sent')])
    expect(result.email.status).toBe('failed')
    if (result.email.status === 'failed') {
      expect(result.email.error).toContain('email exploded')
    }
    expect(result.telegram.status).toBe('sent')
  })

  it('records disabled — not failed — when a channel is not configured (FR-014)', async () => {
    const result = await dispatchEnquiry(fakeEnquiry, [channel('email', 'sent'), channel('telegram', 'disabled')])
    expect(result.telegram.status).toBe('disabled')
  })

  it('one channel throwing never prevents the other from being attempted', async () => {
    let telegramWasCalled = false
    const telegram: Channel = {
      name: 'telegram',
      isEnabled: () => true,
      send: async () => {
        telegramWasCalled = true
      },
    }
    await dispatchEnquiry(fakeEnquiry, [channel('email', 'throws'), telegram])
    expect(telegramWasCalled).toBe(true)
  })
})
