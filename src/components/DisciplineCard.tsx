import Link from 'next/link'
import Image from 'next/image'
import type { Discipline, Media as MediaDoc } from '@/payload-types'
import { firstSentences } from '@/lib/richtext'

/**
 * The accent is selected by the discipline's `tone` field — never a literal
 * hex value here (Constitution IV). `tone-live`/`tone-digital` are the
 * Tailwind tokens defined once in tailwind.config.ts.
 */
export function DisciplineCard({ discipline }: { discipline: Discipline }) {
  const accent = discipline.tone === 'live' ? 'border-tone-live' : 'border-tone-digital'
  const cardDescription = firstSentences(discipline.description)
  const cover = discipline.coverImage
  const coverUrl =
    cover && typeof cover === 'object' ? (cover as MediaDoc).sizes?.card?.url ?? (cover as MediaDoc).url : undefined

  return (
    <Link
      href={`/${discipline.slug}`}
      className={`block rounded-lg border-2 ${accent} bg-ink-raised p-5 transition hover:-translate-y-0.5`}
    >
      {coverUrl && (
        <div className="relative mb-4 aspect-video overflow-hidden rounded">
          <Image
            src={coverUrl}
            alt={typeof cover === 'object' ? (cover as MediaDoc).alt ?? '' : ''}
            fill
            className="object-cover"
          />
        </div>
      )}
      <h3 className="text-xl">{discipline.name}</h3>
      <p className="mt-1 text-sm opacity-80">{discipline.strapline}</p>
      {/* FR-003 — the card carries a one-to-two-sentence description too. */}
      {cardDescription && <p className="mt-2 text-sm opacity-70">{cardDescription}</p>}
    </Link>
  )
}
