import type { Enquiry } from '@/payload-types'
import type { Channel, ChannelResult } from './types'
import { emailChannel } from './email'
import { telegramChannel } from './telegram'

const defaultChannels: Channel[] = [emailChannel, telegramChannel]

/**
 * Runs every channel independently via `Promise.allSettled` so one channel's
 * rejection can never prevent or abort the other's attempt (Constitution
 * VI / FR-015). Never throws — the caller (the afterChange hook) relies on
 * that to keep a stored enquiry stored no matter what delivery does.
 *
 * `channels` is injectable (defaulting to the real email/Telegram pair) so
 * this function can be exercised in tests without a database or network.
 */
export async function dispatchEnquiry(
  enquiry: Enquiry,
  channels: Channel[] = defaultChannels,
): Promise<Record<'email' | 'telegram', ChannelResult>> {
  const settled = await Promise.allSettled(
    channels.map(async (channel): Promise<[Channel['name'], ChannelResult]> => {
      if (!channel.isEnabled()) {
        return [channel.name, { status: 'disabled' }]
      }
      try {
        await channel.send(enquiry)
        return [channel.name, { status: 'sent', attemptedAt: new Date().toISOString() }]
      } catch (err) {
        return [
          channel.name,
          {
            status: 'failed',
            attemptedAt: new Date().toISOString(),
            error: err instanceof Error ? err.message : String(err),
          },
        ]
      }
    }),
  )

  const results = {} as Record<'email' | 'telegram', ChannelResult>
  for (const outcome of settled) {
    // Every mapped promise resolves (errors are caught inside), so `outcome`
    // is always 'fulfilled' — this guard is defense-in-depth, not the
    // expected path.
    if (outcome.status === 'fulfilled') {
      const [name, result] = outcome.value
      results[name] = result
    }
  }
  return results
}
