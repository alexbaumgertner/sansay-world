import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

/**
 * Images only. Files are stored in Vercel Blob via the storage plugin
 * registered in payload.config.ts — never on the serverless filesystem.
 *
 * `alt` is REQUIRED: this is the concrete mechanism behind FR-031's
 * accessibility baseline. A frontend convention would decay the first time
 * the owner uploads in a hurry; a required CMS field cannot be skipped.
 *
 * Read access is public: media carries no sensitive data and is only ever
 * reachable via a reference from an already access-controlled public
 * document (a discipline, work sample, page, etc.).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    description: 'Фотографии для сайта. Текст «alt» обязателен для доступности.',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    // Never write to the serverless filesystem — Vercel Blob is the only store.
    // (Also set by @payloadcms/storage-vercel-blob when the plugin is enabled.)
    disableLocalStorage: true,
    mimeTypes: ['image/*'],
    adminThumbnail: 'thumbnail',
    imageSizes: [
      { name: 'thumbnail', width: 300, height: undefined },
      { name: 'card', width: 640, height: undefined },
      { name: 'gallery', width: 1200, height: undefined },
      { name: 'og', width: 1200, height: 630, crop: 'center' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Опишите изображение — это обязательно для доступности.' },
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
}
