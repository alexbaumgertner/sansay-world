# Contract: Visitor authentication

Implements FR-001, FR-004, FR-022 to FR-026, FR-031, FR-037, FR-038, FR-053, FR-054.

The controlling rule: **a visitor session is a database row, and the cookie is only a pointer to
it.** Every authenticated request resolves that row, so expiry and revocation take effect
immediately rather than whenever a token would have expired.

## Collection

```ts
// src/collections/Visitors.ts
export const Visitors: CollectionConfig = {
  slug: 'visitors',
  auth: {
    disableLocalStrategy: true,          // no password field, no local login route
    strategies: [visitorSessionStrategy],
  },
  access: { create: adminOnly, read: adminOnly, update: adminOnly, delete: adminOnly },
  // fields per data-model.md
}
```

`config.admin.user` stays `users`. Registering a second auth collection does not grant it admin
access, but access control is what actually enforces that, so every content collection's rules
must be positive checks for the owner (below), never merely `Boolean(req.user)`.

## The cookie

```ts
// src/lib/auth/visitor/cookie.ts
export const VISITOR_COOKIE = 'sansay_visitor_session'
export const visitorCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,          // 7 days
}
```

**It must not be `payload-token`.** Payload's `cookiePrefix` is a single global config option
(`payload/dist/config/types.d.ts:956`) and cookies are minted as `${cookiePrefix}-token`, so both
auth collections default to the same cookie name. Sharing it would mean a visitor signing in
overwrites the owner's admin session and logs them out — contradicting the spec's edge case that
the two are independent. A distinct name is what makes FR-038 true in practice rather than only in
intent.

`sameSite: 'lax'` is deliberate: the visitor arrives by clicking a link in an email, and `strict`
would withhold the cookie on that first cross-site navigation, presenting a signed-in visitor with
a sign-in page.

Defined once and imported everywhere. A second literal of this cookie name anywhere in the
codebase is a defect.

## Session lifecycle

```ts
// src/lib/auth/visitor/session.ts
export async function mintSession(visitorId: string): Promise<string>       // returns raw token
export async function resolveSession(token: string): Promise<Visitor | null>
export async function revokeSession(token: string): Promise<void>           // this device
export async function revokeAllSessions(visitorId: string): Promise<void>   // every device
```

**Mint** — 32 bytes from `crypto.randomBytes`, base64url-encoded. Store only `sha256(token)` in
`visitor-sessions.tokenHash`; the raw token exists only in the cookie. Set `expiresAt` to
`now + 7 days`, increment `visitors.activeSessionCount`, and set `lastSignedInAt`.

**Resolve** — hash the incoming token, look up by `tokenHash`, and return the visitor only when
`revokedAt IS NULL AND expiresAt > now()`. A miss, an expired row, and a revoked row are all
indistinguishable to the caller: the answer is `null`.

**Revoke (sign-out)** — set `revokedAt` and `endedReason: 'signed_out'` on **that row only**, then
delete the cookie. Other devices are untouched (FR-054).

**Revoke all** — every live row for the visitor, `endedReason: 'revoked_by_owner'`. Triggered by
the owner's checkbox (see [owner-admin.md](./owner-admin.md)).

Sessions are never extended on use. Seven days from sign-in, the visitor signs in again. There is
no sliding window, because a sliding window would keep a session alive indefinitely for a regular
visitor and quietly defeat the retention policy.

## The auth strategy

```ts
// src/lib/auth/visitor/strategy.ts
export const visitorSessionStrategy = {
  name: 'visitor-session',
  authenticate: async ({ headers, payload }) => {
    const token = parseCookies(headers).get(VISITOR_COOKIE)
    if (!token) return { user: null }
    const visitor = await resolveSession(token)
    return visitor ? { user: { ...visitor, collection: 'visitors' } } : { user: null }
  },
}
```

Signature confirmed against `payload/dist/auth/types.d.ts`: `AuthStrategyFunction` receives
`{ headers, payload, canSetHeaders?, strategyName? }` and returns
`{ user, responseHeaders? }`. Returning `collection: 'visitors'` is what lets access control tell
the two populations apart, since `req.user` always carries `collection`.

The strategy never sets headers and never mutates state. It performs exactly one indexed lookup on
`tokenHash`. This is the hottest query in the feature.

## Access control boundary

The rule that keeps a visitor session from touching content (FR-037):

```ts
// src/lib/access.ts — existing helper, tightened
export const adminOnly: Access = ({ req: { user } }) => user?.collection === 'users'
```

The current implementation is `Boolean(user)`, which was correct while `users` was the only auth
collection. Once `visitors` exists, `Boolean(user)` would grant every visitor full content access
— **this one-line change is the single most security-critical edit in the feature.** Every
collection and global already routes through `adminOnly`, so tightening it here covers all of them
at once; that centralisation is why the change is safe to make in one place, and why it must not
be bypassed by any new inline access function.

`publishedOrAdmin` needs the same treatment: a visitor must see published content only, exactly
like an anonymous reader.

Visitors get **no** Payload API access to any collection, including `visitors` and their own
enquiries. All reads for the status pages go through server-side helpers using
`payload.find({ overrideAccess: true })` with an explicit `submitterEmail` filter — see
[enquiry-attribution.md](./enquiry-attribution.md). Ownership is enforced in that one query path
rather than by access-control rules, so it cannot be bypassed by a crafted REST or GraphQL query.

## Route protection

`/status/**` is protected in `src/app/(frontend)/status/layout.tsx`:

1. `const token = (await cookies()).get(VISITOR_COOKIE)?.value`
2. `resolveSession(token)`; if `null`, `redirect('/status/sign-in?ended=1')` — outside any
   try/catch, since `redirect()` throws `NEXT_REDIRECT`.
3. Export `metadata.robots = { index: false, follow: false }` (FR-042) and
   `export const dynamic = 'force-dynamic'`.

No `proxy.ts` (Next 16's replacement for `middleware.ts`) is added. A proxy could check for the
cookie's presence but not its validity without a database call, so it would duplicate the check
while still requiring the real one — and the layout is where the session is needed anyway.

Child pages must not define their own partial `robots` object: nested metadata fields are
overwritten by the deepest segment, not merged, so a child setting `robots: {}` would silently
re-index the page.

The `?ended=1` parameter drives the "your session ended" message (FR-025) and carries no
information about who was signed in.

## Verified by

Scenarios B, C, D, and E in [quickstart.md](../quickstart.md), and
`tests/e2e/visitor-login.spec.ts`, which must include a case asserting that a visitor session
cannot read `/api/enquiries`, `/api/disciplines` (unpublished), or `/admin`.
