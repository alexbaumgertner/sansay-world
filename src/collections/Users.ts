import type { CollectionConfig } from 'payload'

/**
 * FR-030 — the admin panel is reachable only after signing in as the single
 * owner account: no self-registration, no roles. Payload's built-in auth
 * supplies sessions, password hashing, and login/reset UI; the only thing
 * this config adds is closing the create path once an admin exists.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'Владелец сайта. Один аккаунт — регистрация закрыта.',
  },
  access: {
    // Nobody can create a user through the running app unless already signed
    // in — the very first user is created via Payload's first-user onboarding
    // screen (a one-time exception Payload itself grants when the collection
    // is empty), never through a public endpoint.
    create: ({ req: { user } }) => Boolean(user),
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
}
