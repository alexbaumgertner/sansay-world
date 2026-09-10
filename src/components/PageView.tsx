import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { t } from '@/lib/copy'
import type { Page, Media as MediaDoc } from '@/payload-types'

/**
 * Ordinary page renderer. The hidden "Friends" story (FR-023 to FR-025) is
 * just a document here with `showInNav`/`includeInSitemap`/`noindex` set —
 * nothing in this component treats it as a special case.
 */
export function PageView({ page }: { page: Page }) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-4xl">{page.title}</h1>

      {page.noindex && (
        <p className="mt-4 rounded border border-white/20 bg-ink-raised p-4 text-sm opacity-80">
          {t('friends.unadvertisedNotice')}
        </p>
      )}

      {page.chapters?.map((chapter, i) => (
        <section key={i} className="mt-10">
          {chapter.heading && <h2 className="text-2xl">{chapter.heading}</h2>}
          <div className="prose prose-invert mt-3 opacity-90">
            <RichText data={chapter.body} />
          </div>
          {chapter.photos && chapter.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {chapter.photos.map((photo, j) => {
                const p = photo as MediaDoc
                return typeof photo === 'object' ? (
                  <div key={j} className="relative aspect-video overflow-hidden rounded">
                    <Image
                      src={p.sizes?.gallery?.url ?? p.url ?? ''}
                      alt={p.alt ?? ''}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : null
              })}
            </div>
          )}
        </section>
      ))}
    </article>
  )
}
