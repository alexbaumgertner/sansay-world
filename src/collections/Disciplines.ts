import type { CollectionConfig } from 'payload'
import { adminOnly, publishedOrAdmin } from '@/lib/access'

/**
 * The single source of truth behind Constitution Principle II: the public
 * nav, the home page's discipline cards, and the enquiry form's discipline
 * field all derive from this collection. No discipline name, slug, or id is
 * ever hardcoded elsewhere — see src/lib/data/disciplines.ts.
 *
 * No revalidation hook is needed: public pages read through the Local API on
 * every request (Next.js 16 renders dynamically by default unless a route
 * opts into `'use cache'`), so a Save in the admin is visible on the very
 * next request with no cache to invalidate — an even more direct fulfillment
 * of "no deploy needed" (Principle III / FR-022) than a tag-based approach.
 */
export const Disciplines: CollectionConfig = {
  slug: 'disciplines',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tone', 'order', 'published'],
    description: 'Направления работы (музыка, видео, 3D, гитары…). Список открыт для роста.',
  },
  access: {
    read: publishedOrAdmin,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Латиницей, через дефис. Используется в адресе страницы.' },
      validate: (value: string | null | undefined) => {
        if (!value) return 'Обязательное поле'
        return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
          ? true
          : 'Только строчные латинские буквы, цифры и дефисы'
      },
    },
    { name: 'strapline', type: 'text', required: true, admin: { description: 'Короткая фраза для карточки на главной.' } },
    { name: 'description', type: 'richText', required: true },
    {
      name: 'tone',
      type: 'select',
      required: true,
      options: [
        { label: 'Живое (тёплый акцент)', value: 'live' },
        { label: 'Цифровое (холодный акцент)', value: 'digital' },
      ],
    },
    { name: 'order', type: 'number', required: true, index: true, defaultValue: 0 },
    { name: 'published', type: 'checkbox', defaultValue: true },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
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
