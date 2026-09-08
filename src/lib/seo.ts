import type { Metadata } from 'next'
import type { Media as MediaDoc } from '@/payload-types'

/**
 * Stable path of the generated fallback share image — see
 * src/app/(frontend)/og-default.png/route.tsx. Relative on purpose: the root
 * layout's `metadataBase` turns it into an absolute URL, which is what a
 * messenger needs when it unfurls a link (FR-027).
 */
export const DEFAULT_OG_IMAGE = '/og-default.png'

type ImageInput = MediaDoc | number | string | null | undefined

function imageUrl(image: ImageInput): string | null {
  if (!image || typeof image !== 'object') return null
  const media = image as MediaDoc
  return media.sizes?.og?.url ?? media.url ?? null
}

/**
 * One shape for the home page and every discipline page, so a share preview
 * never depends on which route built it.
 *
 * `description` is deliberately not defaulted: a meta description has to come
 * from real CMS copy, and inventing one would hide missing content rather
 * than surface it. The image is different — a branded fallback is a genuine
 * asset, and without one a page has no og:image at all until the owner
 * uploads media.
 */
export function buildMetadata({
  title,
  description,
  image,
  noindex,
}: {
  title: string
  description?: string | null
  image?: ImageInput
  noindex?: boolean
}): Metadata {
  const ogImage = imageUrl(image) ?? DEFAULT_OG_IMAGE
  const resolvedDescription = description?.trim() || undefined

  return {
    title,
    description: resolvedDescription,
    openGraph: {
      type: 'website',
      title,
      description: resolvedDescription,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDescription,
      images: [ogImage],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  }
}
