import { withPayload } from '@payloadcms/next/withPayload'

/**
 * Payload stores media as absolute `/api/media/file/...` URLs on the site
 * origin. Those must be listed here or `next/image` rejects them with
 * INVALID_IMAGE_OPTIMIZE_REQUEST. Blob URLs are used when the storage plugin
 * emits them directly.
 */
function hostnameFrom(value) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(withScheme).hostname || null
  } catch {
    return null
  }
}

const siteHostnames = [
  ...new Set(
    [
      hostnameFrom(process.env.NEXT_PUBLIC_SERVER_URL),
      hostnameFrom(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      hostnameFrom(process.env.VERCEL_URL),
      'localhost',
    ].filter(Boolean),
  ),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      ...siteHostnames.flatMap((hostname) =>
        hostname === 'localhost'
          ? [
              { protocol: 'http', hostname: 'localhost', port: '3000' },
              { protocol: 'http', hostname: '127.0.0.1', port: '3000' },
            ]
          : [{ protocol: 'https', hostname }],
      ),
    ],
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
