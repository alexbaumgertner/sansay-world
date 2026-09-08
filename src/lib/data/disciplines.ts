import { getPayload } from 'payload'
import config from '@payload-config'
import type { Discipline } from '@/payload-types'

async function payload() {
  return getPayload({ config })
}

/**
 * The one place the site reads its list of disciplines. Nav, home cards, and
 * the enquiry form's topic field all call this — none of them hold a
 * hardcoded discipline name, slug, or id (Constitution Principle II).
 *
 * Deliberately uncached: this reads Postgres on every request, so a Save in
 * the admin is live on the very next request with nothing to invalidate.
 */
export async function getPublishedDisciplines(): Promise<Discipline[]> {
  const p = await payload()
  const result = await p.find({
    collection: 'disciplines',
    where: { published: { equals: true } },
    sort: 'order',
    limit: 200,
  })
  return result.docs
}

export async function getDisciplineBySlug(slug: string): Promise<Discipline | null> {
  const p = await payload()
  const result = await p.find({
    collection: 'disciplines',
    where: { slug: { equals: slug }, published: { equals: true } },
    limit: 1,
  })
  return result.docs[0] ?? null
}

/** Previous/next discipline by `order`, for the "neighbouring disciplines" links (FR-011). */
export async function getNeighbours(current: Discipline): Promise<{ prev: Discipline | null; next: Discipline | null }> {
  const all = await getPublishedDisciplines()
  const index = all.findIndex((d) => d.id === current.id)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? all[index - 1] : null,
    next: index < all.length - 1 ? all[index + 1] : null,
  }
}
