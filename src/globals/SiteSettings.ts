import type { GlobalConfig } from 'payload'
import { adminOnly } from '@/lib/access'

/**
 * Note: the Telegram enable/disable flag deliberately lives in an
 * environment variable (`TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`), not here
 * — that was the owner's explicit direction (FR-014). See research.md for
 * the recorded trade-off (env-var toggle needs a redeploy to take effect).
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  admin: { description: 'Общие настройки сайта.' },
  access: {
    read: adminOnly,
    update: adminOnly,
  },
  fields: [
    {
      name: 'ownerNotificationEmail',
      type: 'email',
      required: true,
      admin: { description: 'Куда приходят уведомления о заявках (обязательный канал).' },
    },
  ],
}
