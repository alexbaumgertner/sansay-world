import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDisciplineBySlug } from '@/lib/data/disciplines'
import { getPageBySlug } from '@/lib/data/pages'
import { DisciplineView } from '@/components/DisciplineView'
import { PageView } from '@/components/PageView'
import type { Media as MediaDoc } from '@/payload-types'

type Props = { params: Promise<{ slug: string }> }

/**
 * Disciplines and ordinary pages (including the hidden Friends page) share
 * one flat URL namespace, so Next.js's router requires a single dynamic
 * segment here rather than two competing ones. A discipline match takes
 * priority; the admin is responsible for not colliding a page slug with a
 * discipline slug (a routine content-modeling constraint, not a code one).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const discipline = await getDisciplineBySlug(slug)
  if (discipline) {
    const ogImage = discipline.seo?.ogImage ?? discipline.coverImage
    return {
      title: discipline.seo?.title || discipline.name,
      description: discipline.seo?.description || discipline.strapline,
      openGraph: {
        title: discipline.seo?.title || discipline.name,
        description: discipline.seo?.description || discipline.strapline,
        images:
          ogImage && typeof ogImage === 'object'
            ? [(ogImage as MediaDoc).sizes?.og?.url ?? (ogImage as MediaDoc).url ?? '']
            : undefined,
      },
    }
  }

  const page = await getPageBySlug(slug)
  if (page) {
    return {
      title: page.seo?.title || page.title,
      description: page.seo?.description || undefined,
      // Belt-and-suspenders alongside sitemap/robots exclusion (FR-028).
      robots: page.noindex ? { index: false, follow: false } : undefined,
    }
  }

  return {}
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params

  const discipline = await getDisciplineBySlug(slug)
  if (discipline) return <DisciplineView discipline={discipline} />

  const page = await getPageBySlug(slug)
  if (page) return <PageView page={page} />

  notFound()
}
