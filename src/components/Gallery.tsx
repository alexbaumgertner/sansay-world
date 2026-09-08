import Image from 'next/image'
import type { WorkSample, Media as MediaDoc } from '@/payload-types'
import { t } from '@/lib/copy'

/** No upper limit on sample count (FR-007); order is owner-controlled upstream. */
export function Gallery({ samples }: { samples: WorkSample[] }) {
  if (samples.length === 0) {
    return <p className="opacity-70">{t('discipline.gallery.empty')}</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {samples.map((sample) => {
        const image = sample.image
        const imageUrl =
          image && typeof image === 'object' ? (image as MediaDoc).sizes?.gallery?.url ?? (image as MediaDoc).url : undefined

        return (
          <li key={sample.id} className="rounded-lg bg-ink-raised p-4">
            {imageUrl && (
              <div className="relative mb-3 aspect-video overflow-hidden rounded">
                <Image
                  src={imageUrl}
                  alt={typeof image === 'object' ? (image as MediaDoc).alt ?? '' : ''}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h3 className="text-lg">{sample.title}</h3>
            <p className="mt-1 text-sm opacity-80">{sample.description}</p>
            {sample.externalVideoUrl && (
              <a
                href={sample.externalVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-tone-digital underline"
              >
                {t('discipline.gallery.watchVideo')}
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}
