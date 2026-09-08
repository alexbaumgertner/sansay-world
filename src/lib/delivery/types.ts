import type { Enquiry } from '@/payload-types'

export type ChannelResult =
  | { status: 'sent'; attemptedAt: string }
  | { status: 'failed'; attemptedAt: string; error: string }
  | { status: 'disabled' }

export type Channel = {
  name: 'email' | 'telegram'
  isEnabled(): boolean
  send(enquiry: Enquiry): Promise<void>
}
