/** Where auth.setup.ts saves the owner session. `.playwright/` is gitignored. */
export const STORAGE_STATE = '.playwright/admin-state.json'

export const paths = {
  signIn: '/status/sign-in',
  status: '/status',
} as const
