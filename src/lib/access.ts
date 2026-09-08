import type { Access } from 'payload'

/** Only a signed-in owner (`users` collection) may act — never a visitor session. */
export const adminOnly: Access = ({ req: { user } }) => user?.collection === 'users'

/**
 * Public visitors see only `published: true` documents; a signed-in admin
 * sees everything, including drafts — this is what makes "unpublish" behave
 * as "hidden from the public site" rather than "deleted" (data-model.md).
 */
export const publishedOrAdmin: Access = ({ req: { user } }) => {
  if (user?.collection === 'users') return true
  return { published: { equals: true } }
}
