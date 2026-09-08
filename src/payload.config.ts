import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { resendAdapter } from '@payloadcms/email-resend'
import { ru } from '@payloadcms/translations/languages/ru'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from '@/collections/Users'
import { Media } from '@/collections/Media'
import { Disciplines } from '@/collections/Disciplines'
import { WorkSamples } from '@/collections/WorkSamples'
import { Enquiries } from '@/collections/Enquiries'
import { Pages } from '@/collections/Pages'
import { HomePage } from '@/globals/HomePage'
import { SiteSettings } from '@/globals/SiteSettings'
import { getSiteUrl } from '@/lib/site-url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: getSiteUrl(),
  admin: {
    user: Users.slug,
    // FR-029 — the admin UI the owner works in every day is Russian.
    meta: { titleSuffix: ' — SanSay' },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: 'ru',
  },
  collections: [Disciplines, WorkSamples, Enquiries, Pages, Media, Users],
  globals: [HomePage, SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    idType: 'uuid', // matches data-model.md — every collection uses a uuid primary key
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
    migrationDir: path.resolve(dirname, '../migrations'),
  }),
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.RESEND_FROM_ADDRESS ?? 'noreply@example.com',
        defaultFromName: 'SanSay',
      })
    : undefined,
  plugins: [
    vercelBlobStorage({
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN ?? '',
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    }),
  ],
  sharp,
})
