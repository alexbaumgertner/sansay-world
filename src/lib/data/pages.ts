import { getPayload } from 'payload'
import config from '@payload-config'
import type { Page } from '@/payload-types'

/** Pages flagged for navigation only. The Friends page sets `showInNav: false` and never appears here (FR-024). */
export async function getPublishedNavPages(): Promise<Page[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { published: { equals: true }, showInNav: { equals: true } },
    limit: 50,
  })
  return result.docs
}

/** Pages included in the sitemap. The Friends page sets `includeInSitemap: false` (FR-028). */
export async function getSitemapPages(): Promise<Page[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { published: { equals: true }, includeInSitemap: { equals: true } },
    limit: 200,
  })
  return result.docs
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug }, published: { equals: true } },
    limit: 1,
  })
  return result.docs[0] ?? null
}
