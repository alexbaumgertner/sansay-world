import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { ru } from '@payloadcms/translations/languages/ru'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from '@/collections/Users'
import { Visitors } from '@/collections/Visitors'
import { VisitorSessions } from '@/collections/VisitorSessions'
import { LoginCodes } from '@/collections/LoginCodes'
import { Media } from '@/collections/Media'
import { Disciplines } from '@/collections/Disciplines'
import { WorkSamples } from '@/collections/WorkSamples'
import { Enquiries } from '@/collections/Enquiries'
import { Pages } from '@/collections/Pages'
import { HomePage } from '@/globals/HomePage'
import { SiteSettings } from '@/globals/SiteSettings'
import { buildEmailAdapter } from '@/lib/email/adapter'
import { withRecipientGuard } from '@/lib/email/recipient-guard'
import { getSiteUrl } from '@/lib/site-url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const email = withRecipientGuard(await buildEmailAdapter())

export default buildConfig({
  serverURL: getSiteUrl(),
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' — SanSay' },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: 'ru',
  },
  collections: [
    Disciplines,
    WorkSamples,
    Enquiries,
    Pages,
    Media,
    Users,
    Visitors,
    VisitorSessions,
    LoginCodes,
  ],
  globals: [HomePage, SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    idType: 'uuid',
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
    migrationDir: path.resolve(dirname, '../migrations'),
    push: false,
  }),
  email,
  plugins: [
    vercelBlobStorage({
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN ?? '',
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    }),
  ],
  sharp,
})
