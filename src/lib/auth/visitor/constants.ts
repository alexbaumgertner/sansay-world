/**
 * Every tuned figure from the spec's Assumptions — one object so tests import
 * these rather than restating them.
 */
export const VISITOR_AUTH = {
  CODE_LENGTH: 6,
  CODE_TTL_SECONDS: 10 * 60,
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60,
  REQUESTS_PER_ADDRESS: 3,
  ADDRESS_WINDOW_SECONDS: 15 * 60,
  REQUESTS_PER_ORIGIN: 20,
  ORIGIN_WINDOW_SECONDS: 60 * 60,
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_SECONDS: 15 * 60,
  CODE_REQUEST_FLOOR_MS: 800,
  RETENTION_DAYS: 30,
} as const

export const CODE_REQUEST_FLOOR_MS = VISITOR_AUTH.CODE_REQUEST_FLOOR_MS
