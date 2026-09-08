import { VISITOR_AUTH } from './constants'

/** Must not be `payload-token` — see contracts/visitor-auth.md */
export const VISITOR_COOKIE = 'sansay_visitor_session'

export const visitorCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: VISITOR_AUTH.SESSION_TTL_SECONDS,
}
