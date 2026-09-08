import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getNeighbours } from '@/lib/data/disciplines'
import { getWorkSamplesForDiscipline } from '@/lib/data/work-samples'
import { Gallery } from '@/components/Gallery'
import { EnquiryForm } from '@/components/EnquiryForm'
import { t } from '@/lib/copy'
import type { Discipline } from '@/payload-types'

/** FR-006 to FR-011: heading/strapline/description, gallery, scoped enquiry form, and navigation. */
export async function DisciplineView({ discipline }: { discipline: Discipline }) {
  const [samples, { prev, next }] = await Promise.all([
    getWorkSamplesForDiscipline(discipline.id),
    getNeighbours(discipline),
  ])

  return (
    <article className="px-6 py-12">
      <h1 className="text-4xl">{discipline.name}</h1>
      <p className="mt-2 text-xl opacity-80">{discipline.strapline}</p>
      <div className="prose prose-invert mt-6 max-w-2xl opacity-90">
        <RichText data={discipline.description} />
      </div>

      <section className="mt-12">
        <Gallery samples={samples} />
      </section>

      <section className="mt-12 max-w-md">
        <EnquiryForm disciplineId={discipline.id} disciplineName={discipline.name} />
      </section>

      <nav className="mt-16 flex items-center justify-between text-sm">
        <Link href="/" className="underline">
          {t('discipline.backHome')}
        </Link>
        <div className="flex gap-4">
          {prev && (
            <Link href={`/${prev.slug}`} className="underline">
              ← {prev.name}
            </Link>
          )}
          {next && (
            <Link href={`/${next.slug}`} className="underline">
              {next.name} →
            </Link>
          )}
        </div>
      </nav>
    </article>
  )
}
