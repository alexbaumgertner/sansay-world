import type { GlobalConfig } from 'payload'
import { adminOnly } from '@/lib/access'

/** Owner-editable landing-page copy (FR-001, FR-002, FR-016). Singleton by construction — a global. */
export const HomePage: GlobalConfig = {
  slug: 'home',
  admin: { description: 'Текст и фото главной страницы.' },
  access: {
    read: () => true,
    update: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'SanSay' },
    {
      name: 'essenceSentence',
      type: 'text',
      required: true,
      admin: { description: 'Одна фраза, например: «Я играю, снимаю, паяю, строю».' },
    },
    { name: 'aboutPhoto', type: 'upload', relationTo: 'media' },
    {
      name: 'bioParagraphs',
      type: 'array',
      minRows: 2,
      maxRows: 3,
      admin: { description: '2–3 абзаца биографии.' },
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
    {
      name: 'replyWindowCopy',
      type: 'text',
      required: true,
      defaultValue: 'в течение двух рабочих дней',
      admin: { description: 'Показывается в подтверждении после отправки заявки.' },
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
