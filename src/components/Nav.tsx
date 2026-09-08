import Link from 'next/link'
import { getPublishedDisciplines } from '@/lib/data/disciplines'
import { getPublishedNavPages } from '@/lib/data/pages'
import { t } from '@/lib/copy'

/**
 * Renders entirely from the `disciplines` collection and from pages flagged
 * `showInNav`. No discipline or page is ever named in this file — that is
 * the whole point (Constitution Principle II; FR-024 for hidden pages).
 */
export async function Nav() {
  const [disciplines, navPages] = await Promise.all([getPublishedDisciplines(), getPublishedNavPages()])

  return (
    <nav aria-label="Основная навигация" className="flex flex-wrap items-center gap-6 px-6 py-4">
      <Link href="/" className="font-heading text-lg">
        {t('nav.home')}
      </Link>
      {disciplines.map((d) => (
        <Link key={d.id} href={`/${d.slug}`} className="text-sm hover:underline">
          {d.name}
        </Link>
      ))}
      {navPages.map((p) => (
        <Link key={p.id} href={`/${p.slug}`} className="text-sm hover:underline">
          {p.title}
        </Link>
      ))}
    </nav>
  )
}
