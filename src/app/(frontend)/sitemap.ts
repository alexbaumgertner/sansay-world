import type { MetadataRoute } from 'next'
import { getPublishedDisciplines } from '@/lib/data/disciplines'
import { getSitemapPages } from '@/lib/data/pages'

const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

/**
 * Contains exactly: home, every published discipline, and every page with
 * `includeInSitemap: true`. The Friends page sets that flag false, so its
 * absence here is data-driven, not a hardcoded exclusion (FR-024, FR-028).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [disciplines, pages] = await Promise.all([getPublishedDisciplines(), getSitemapPages()])

  return [
    { url: baseUrl, changeFrequency: 'monthly', priority: 1 },
    ...disciplines.map((d) => ({
      url: `${baseUrl}/${d.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...pages.map((p) => ({
      url: `${baseUrl}/${p.slug}`,
      changeFrequency: 'yearly' as const,
      priority: 0.5,
    })),
  ]
}
