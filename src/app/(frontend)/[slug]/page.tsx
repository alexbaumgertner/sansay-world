import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDisciplineBySlug } from '@/lib/data/disciplines'
import { getPageBySlug } from '@/lib/data/pages'
import { DisciplineView } from '@/components/DisciplineView'
import { PageView } from '@/components/PageView'
import { buildMetadata } from '@/lib/seo'

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
    return buildMetadata({
      title: discipline.seo?.title || discipline.name,
      description: discipline.seo?.description || discipline.strapline,
      image: discipline.seo?.ogImage ?? discipline.coverImage,
    })
  }

  const page = await getPageBySlug(slug)
  if (page) {
    return buildMetadata({
      title: page.seo?.title || page.title,
      description: page.seo?.description,
      image: page.seo?.ogImage,
      // Belt-and-suspenders alongside sitemap/robots exclusion (FR-028).
      noindex: Boolean(page.noindex),
    })
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
