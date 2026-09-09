import type { Metadata } from 'next'
import Image from 'next/image'
import { getPublishedDisciplines } from '@/lib/data/disciplines'
import { getHomeContent } from '@/lib/data/home'
import { DisciplineCard } from '@/components/DisciplineCard'
import { t } from '@/lib/copy'
import { buildMetadata } from '@/lib/seo'
import type { Media as MediaDoc } from '@/payload-types'

/**
 * Read from the CMS on every request. Without this the route is prerendered
 * at build time, so a discipline the owner publishes in the admin does not
 * reach the home page or the navigation until the next deploy — the exact
 * thing FR-022 and SC-005 forbid.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomeContent()

  return buildMetadata({
    title: home.seo?.title || home.name,
    description: home.seo?.description || home.essenceSentence,
    image: home.seo?.ogImage ?? home.aboutPhoto,
  })
}

/**
 * FR-001 to FR-004: name + essence + CTA fit within the first screen; the
 * about block and every discipline card are reachable within one further
 * scroll.
 */
export default async function HomePage() {
  const [home, disciplines] = await Promise.all([getHomeContent(), getPublishedDisciplines()])
  const aboutPhoto = home.aboutPhoto

  return (
    <div>
      {/* First screen — no scrolling required to identify the offer (SC-001). */}
      <section className="flex min-h-[90vh] flex-col items-start justify-center gap-6 px-6">
        <h1 className="text-5xl">{home.name}</h1>
        <p className="max-w-xl text-2xl opacity-90">{home.essenceSentence}</p>
        <a
          href="#disciplines"
          className="rounded bg-tone-live px-6 py-3 font-heading text-ink"
        >
          {t('home.ctaToDisciplines')}
        </a>
      </section>

      {/* About block (FR-002). */}
      <section className="grid grid-cols-1 items-center gap-8 px-6 py-16 md:grid-cols-2">
        {aboutPhoto && typeof aboutPhoto === 'object' && (
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              // About photo is ~half the viewport (often 1000px+ CSS, 2× on retina).
              // Prefer the original over `card` (640) / `gallery` (1200).
              src={
                (aboutPhoto as MediaDoc).url ??
                (aboutPhoto as MediaDoc).sizes?.gallery?.url ??
                (aboutPhoto as MediaDoc).sizes?.card?.url ??
                ''
              }
              alt={(aboutPhoto as MediaDoc).alt ?? ''}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              quality={85}
              className="object-cover"
            />
          </div>
        )}
        <div>
          <h2 className="mb-4 text-2xl">{t('home.aboutHeading')}</h2>
          {home.bioParagraphs?.map((p, i) => (
            <p key={i} className="mb-3 opacity-90">
              {p.text}
            </p>
          ))}
        </div>
      </section>

      {/* Every published discipline, one scroll from the top (FR-003, SC-002). */}
      <section id="disciplines" className="px-6 pb-16">
        <h2 className="mb-6 text-2xl">{t('home.disciplinesHeading')}</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {disciplines.map((d) => (
            <DisciplineCard key={d.id} discipline={d} />
          ))}
        </div>
      </section>
    </div>
  )
}
