import type { Enquiry } from '@/payload-types'
import type { Channel } from './types'

/**
 * FR-014 — the whole toggle is "are both env vars present." No code change
 * is needed to turn this channel on or off; see research.md for the
 * documented redeploy-to-apply caveat.
 */
export const telegramChannel: Channel = {
  name: 'telegram',
  isEnabled: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  async send(enquiry: Enquiry) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    const disciplineName =
      typeof enquiry.discipline === 'object' ? enquiry.discipline.name : String(enquiry.discipline)

    const text = [
      `🎨 Новая заявка: ${disciplineName}`,
      `Имя: ${enquiry.name}`,
      `Контакт: ${enquiry.preferredContactMethod}`,
      enquiry.desiredDate ? `Дата: ${enquiry.desiredDate}` : null,
      `Задача: ${enquiry.jobDescription}`,
    ]
      .filter(Boolean)
      .join('\n')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`Telegram API responded ${res.status}: ${await res.text()}`)
      }
    } finally {
      clearTimeout(timeout)
    }
  },
}
