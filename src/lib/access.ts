import type { Access } from 'payload'

/** Only a signed-in admin (any authenticated `users` document) may act. */
export const adminOnly: Access = ({ req: { user } }) => Boolean(user)

/**
 * Public visitors see only `published: true` documents; a signed-in admin
 * sees everything, including drafts — this is what makes "unpublish" behave
 * as "hidden from the public site" rather than "deleted" (data-model.md).
 */
export const publishedOrAdmin: Access = ({ req: { user } }) => {
  if (user) return true
  return { published: { equals: true } }
}
