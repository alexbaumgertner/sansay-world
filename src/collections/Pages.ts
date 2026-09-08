import type { CollectionConfig } from 'payload'
import { adminOnly, publishedOrAdmin } from '@/lib/access'

/**
 * Ordinary pages. The hidden "Friends" story (FR-023 to FR-025) is one
 * document here, not a special case in code — its hiddenness is entirely
 * data: `showInNav`, `includeInSitemap`, and `noindex` all default to the
 * *visible* behaviour, and the Friends document is the one that flips them.
 * See contracts/sitemap-robots.md.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    description: 'Обычные страницы сайта. Скрытая страница «Друзья» — одна из них.',
  },
  access: {
    read: publishedOrAdmin,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (value: string | null | undefined) => {
        if (!value) return 'Обязательное поле'
        return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)
          ? true
          : 'Только строчные латинские буквы, цифры и дефисы'
      },
    },
    {
      name: 'chapters',
      type: 'array',
      admin: { description: 'Главы — заголовок, текст, фотографии.' },
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'body', type: 'richText', required: true },
        { name: 'photos', type: 'upload', relationTo: 'media', hasMany: true },
      ],
    },
    { name: 'published', type: 'checkbox', defaultValue: true },
    {
      name: 'showInNav',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Выключите для страниц вне навигации (например, «Друзья»).' },
    },
    {
      name: 'includeInSitemap',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Выключите, чтобы страница не попадала в sitemap.xml.' },
    },
    {
      name: 'noindex',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Включите, чтобы запретить индексацию поисковиками.' },
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
