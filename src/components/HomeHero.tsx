import Image from 'next/image'
import type { Home, Media as MediaDoc } from '@/payload-types'
import { BrandMark } from '@/components/BrandMark'
import { t } from '@/lib/copy'

type HomeHeroProps = {
  home: Home
}

/**
 * Opening screen: full-bleed cover (when set), fixed-alpha scrim, brand mark,
 * essence, and CTA. Server component — no client JS (FR-001–FR-017).
 */
export function HomeHero({ home }: HomeHeroProps) {
  const cover = home.coverImage
  const hasCover = Boolean(cover) && typeof cover === 'object' && Boolean((cover as MediaDoc).url)
  const coverDoc = hasCover ? (cover as MediaDoc) : null

  return (
    <section
      id="home-hero"
      className="relative isolate flex min-h-opening flex-col overflow-hidden bg-ink justify-end md:justify-center"
    >
      {coverDoc?.url && (
        <Image
          src={coverDoc.url}
          alt=""
          fill
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover -z-20"
        />
      )}

      <div aria-hidden="true" className="cover-scrim-text pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="cover-scrim-top pointer-events-none absolute inset-0 -z-10" />

      <div className="relative z-0 flex max-h-[55%] w-full max-w-xl flex-col items-start gap-6 px-6 pb-16 pt-24 md:max-h-none md:max-w-[40vw] md:pb-24 md:pt-28">
        <BrandMark name={home.name} />
        <p className="max-w-xl text-2xl text-neutral-100">{home.essenceSentence}</p>
        <a
          href="#disciplines"
          className="rounded bg-tone-live px-6 py-3 font-heading text-ink"
        >
          {t('home.ctaToDisciplines')}
        </a>
      </div>
    </section>
  )
}
