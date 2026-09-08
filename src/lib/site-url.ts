/**
 * The one place the public origin is resolved.
 *
 * `NEXT_PUBLIC_SERVER_URL` is operator-supplied, so it can arrive empty, or
 * as a bare host with no scheme. `??` only guards null/undefined, which let a
 * blank value through and produced relative `<loc></loc>` entries in
 * sitemap.xml and a relative `Sitemap:` line in robots.txt — both invalid,
 * and both silent. Every candidate here is validated before it is used, and
 * Vercel's own system variables act as a fallback so a deployment is never
 * left emitting relative absolute-URLs.
 */
function normalize(candidate: string | undefined): string | null {
  const value = candidate?.trim()
  if (!value) return null

  // A bare host ("example.com", "foo.vercel.app") is a valid thing to
  // configure but not a valid URL — give it the scheme it is missing.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    const url = new URL(withScheme)
    if (!url.hostname) return null
    // Normalised, without a trailing slash, so callers can append `/path`.
    return url.origin
  } catch {
    return null
  }
}

export function getSiteUrl(): string {
  // On a preview deployment the site's own origin is the preview URL. Using
  // the configured production origin there would make sitemap entries, OG
  // images and enquiry links point at production instead of the deployment
  // actually being viewed — and would make a preview untestable.
  if (process.env.VERCEL_ENV === 'preview') {
    const previewUrl = normalize(process.env.VERCEL_URL)
    if (previewUrl) return previewUrl
  }

  return (
    normalize(process.env.NEXT_PUBLIC_SERVER_URL) ??
    // Set automatically on Vercel; host only, no scheme.
    normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalize(process.env.VERCEL_URL) ??
    'http://localhost:3000'
  )
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return new URL(path, `${getSiteUrl()}/`).toString()
}
