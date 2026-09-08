import type { AuthStrategyResult } from 'payload'
import { VISITOR_COOKIE } from './cookie'
import { resolveSession } from './session'

function parseCookieHeader(headers: Headers): Map<string, string> {
  const header = headers.get('cookie')
  const map = new Map<string, string>()
  if (!header) return map
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1))
  }
  return map
}

export const visitorSessionStrategy = {
  name: 'visitor-session',
  authenticate: async ({ headers }: { headers: Headers }) => {
    const token = parseCookieHeader(headers).get(VISITOR_COOKIE)
    if (!token) return { user: null }

    const visitor = await resolveSession(token)
    if (!visitor) return { user: null }

    return {
      user: {
        id: visitor.id,
        email: visitor.email,
        collection: 'visitors',
      },
    } as AuthStrategyResult
  },
}
