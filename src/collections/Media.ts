import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * When BLOB_READ_WRITE_TOKEN is set (always on Vercel — payload.config.ts
 * throws otherwise), the Vercel Blob plugin takes over and forces
 * `disableLocalStorage: true`. With no token — the default for local dev
 * against a Docker Postgres — Payload writes uploads (original + every
 * imageSize) to `<repo>/media`, which is git-ignored. This keeps dev uploads
 * out of the production Blob store, the same isolation the Docker DB gives.
 */
const hasBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

/**
 * Images only. In production, files live in Vercel Blob via the storage plugin
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
    disableLocalStorage: hasBlobStorage,
    staticDir: path.resolve(dirname, '../../media'),
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
