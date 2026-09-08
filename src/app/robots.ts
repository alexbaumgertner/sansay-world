import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSiteUrl } from '@/lib/site-url'

/**
 * Cached by default like any Route Handler, which meant flagging a page
 * `noindex` in the admin did not reach robots.txt until the next deploy
 * (FR-028).
 */
export const dynamic = 'force-dynamic'

/**
 * Disallows /admin, /api, and every page flagged `noindex` — looked up from
 * the data, not a hardcoded slug, so renaming the Friends page keeps it
 * excluded (contracts/sitemap-robots.md).
 *
 * Lives at the app root rather than inside the (frontend) route group: only
 * here does Next.js 16 map this file to the `/robots.txt` route (unlike
 * sitemap.ts, which resolves correctly from within a route group too).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getSiteUrl()
  const payload = await getPayload({ config })
  const noindexPages = await payload.find({
    collection: 'pages',
    where: { noindex: { equals: true } },
    limit: 100,
  })

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', ...noindexPages.docs.map((p) => `/${p.slug}/`)],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
