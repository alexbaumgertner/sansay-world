# Phase 0 Research: Passwordless Email Login for Enquirers

Everything below was verified against the packages actually installed in this repository
(`payload@3.88.0`, `next@16.3.4`) rather than from general knowledge, because both have breaking
changes relative to older releases. Declaration-file paths are given so each claim can be rechecked.

## 0. Unresolved external dependency — the reference implementation

**The reference clone described in the planning request is not present.** `/tmp/hht-ref` does not
exist, and `find / -maxdepth 4 -name "hht-ref*"` returns nothing, so neither
`src/email/adapter.ts` nor `docs/email.md` could be read.

The planning request describes the three-tier structure precisely enough to design against —
Resend when `RESEND_API_KEY` is set, SMTP when `SMTP_HOST` is set, Ethereal when neither is — so
that structure is carried through in [contracts/email-adapter.md](./contracts/email-adapter.md).
What could **not** be inherited is the reference's own code shape: its error taxonomy, retry
behaviour, logging conventions, and how it types the adapter.

**Action before implementation**: either restore the clone so the implementer can match its
conventions, or accept the adapter contract in this plan as the definition of record. This is
flagged rather than guessed at, because "port its three-tier structure" implies fidelity to
details this plan cannot see. Nothing else in the plan depends on it.

## 1. Platform API findings that constrain the design

### Next.js 16.3.4

Verified in `node_modules/next/dist/docs/`.

| Finding | Consequence for this feature |
|---|---|
| `cookies()` is **async** — synchronous access removed in v16 (`04-functions/cookies.md`) | Every session read is `await cookies()`. |
| **Setting** a cookie is only possible in a Server Function or Route Handler, never during Server Component rendering (`04-functions/cookies.md`) | Sign-in and sign-out must be Server Actions. A Server Component cannot mint a session. |
| `middleware.ts` is **deprecated in favour of `proxy.ts`**; `proxy.ts` runs on the Node.js runtime and exporting `runtime` from it **throws** (`03-file-conventions/proxy.md`) | We use **neither**. Auth gating happens in the `/status` layout, where the session must be resolved against the database anyway. Adding a proxy file would duplicate the check without being able to complete it. |
| `NextRequest.ip` and `.geo` were **removed** in v15 (`04-functions/next-request.md`) | The per-origin rate limit must read a forwarded header; there is no `request.ip`. See §3. |
| `redirect()` throws `NEXT_REDIRECT` and must be called **outside** `try/catch` (`04-functions/redirect.md`) | Post-sign-in and expired-session redirects sit after the try block, not inside it. |
| Reading `cookies()` in a layout or page opts the route into dynamic rendering; `cacheComponents` is **not** enabled in this project, so `export const dynamic = 'force-dynamic'` remains valid | `/status/**` is dynamic by construction. `force-dynamic` is added as an explicit guarantee, matching the existing convention in `robots.ts` and `sitemap.ts`. |
| Per-route `noindex` via `metadata.robots = { index: false }`; nested metadata fields are **overwritten** by the deepest segment, not deep-merged (`04-functions/generate-metadata.md`) | Set `robots` once in `status/layout.tsx`, and do not set a partial `robots` object in any child page or it will replace the parent's. |

### Payload 3.88.0

Verified in `node_modules/.pnpm/payload@3.88.0_.../node_modules/payload/dist/`.

| Finding | Source | Consequence |
|---|---|---|
| `auth.disableLocalStrategy?: { enableFields?: true; optionalPassword?: true } \| true` | `dist/auth/types.d.ts` | Set to `true`: no password, no salt, no local login route for `visitors`. |
| `auth.strategies?: AuthStrategy[]`, where `AuthStrategyFunction` receives `{ headers, payload, canSetHeaders, strategyName }` and returns `{ user: (TypedUser & { collection?, _strategy? }) \| null, responseHeaders? }` | `dist/auth/types.d.ts` | Our strategy reads the cookie off `headers`, resolves it in Postgres, and returns the visitor with `collection: 'visitors'`. |
| `req.user` always carries `collection: string` (`BaseUser`) | `dist/auth/types.d.ts` | Access control can distinguish an owner from a visitor by collection slug — the mechanism behind FR-037/FR-038. |
| `config.cookiePrefix` is a **single global option**, and cookies are generated as `${cookiePrefix}-token` | `dist/config/types.d.ts:956`, `dist/auth/cookies.d.ts` | **Load-bearing.** Two auth collections would share one cookie name. See §2. |
| `auth.maxLoginAttempts` / `lockTime` exist, but belong to the **local** strategy | `dist/auth/types.d.ts` | Unusable here, since we disable that strategy. The incorrect-code lockout (FR-018) must be ours. |
| Native sessions exist (`auth.useSessions`, default true; `addSessionToUser`, `revokeSession`, `removeExpiredSessions`) | `dist/auth/sessions.d.ts` | Attractive but **not exported** from the package root or `./internal`. Using them would mean importing deep paths that are free to change in a patch release. We model sessions ourselves. |
| `jwtSign` and `getFieldsToSign` **are** root-exported; Payload uses `jose@5.10.0` | `dist/index.d.ts:65,494`, `package.json` | Available, but unnecessary once sessions are database-backed. See D5. |
| `EmailAdapter = ({ payload }) => { name, defaultFromAddress, defaultFromName, sendEmail }` | `dist/email/types.d.ts` | The adapter contract to implement. `SendEmailOptions` is nodemailer's `SendMailOptions`. |
| When `config.email` is undefined, Payload installs `consoleEmailAdapter` | `dist/index.js:397` | Today, with no `RESEND_API_KEY`, mail is silently logged and never sent. Tier 3 replaces this with something a developer can actually click. |
| `payload.db.drizzle` is typed and exposed | `@payloadcms/db-postgres/dist/types.d.ts:79` | The escape hatch for the one atomic SQL statement rate limiting needs. |
| `@payloadcms/email-nodemailer` publishes `3.88.0` as `latest` | `npm view` | Version-matched to the installed Payload; safe to add. |

## 2. Decisions

### D1 — Three-tier email adapter, one adapter for all mail

**Decision**: A single `buildEmailAdapter()` in `src/lib/email/adapter.ts` selects, in order:
`RESEND_API_KEY` → `resendAdapter` (already a dependency); else `SMTP_HOST` →
`nodemailerAdapter({ transportOptions })`; else `nodemailerAdapter()` with no transport, which
creates an Ethereal test account. The same adapter serves owner notifications, login codes,
acknowledgements, and reply notices, via `payload.sendEmail()`.

**Rationale**: Payload already owns the adapter abstraction, so the requested three-tier shape maps
onto its official packages rather than a bespoke transport layer. `payload.sendEmail()` is already
how `src/lib/delivery/email.ts` sends owner notifications, so login codes inherit a working path
instead of introducing a second one.

**Alternatives considered**: Calling the Resend HTTP API directly for login codes — rejected, it
would give codes a different delivery path from enquiry notifications, so a broken configuration
could be invisible on one and fatal on the other. Keeping Payload's console fallback for local
development — rejected, a developer cannot complete a login flow from a log line as easily as from
a clickable Ethereal preview, and the console fallback is silent enough to be mistaken for success.

### D2 — Non-production recipient guard

**Decision**: `src/lib/email/recipient-guard.ts` wraps the selected adapter's `sendEmail`. When
`VERCEL_ENV !== 'production'`, every `to`/`cc`/`bcc` is replaced with a single mailbox from
`PREVIEW_MAIL_RECIPIENT`, and the subject is prefixed with the environment and the original
recipient. Production passes through untouched.

**Rationale**: This is the real hazard behind the Ethereal question. A preview deployment pointed
at the production database can enumerate real enquirers and email them. The guard makes that
structurally impossible rather than relying on the tier choice to be safe by accident.

**Alternatives considered**: Trusting Ethereal on previews to be harmless — rejected; it is
harmless only until someone sets `RESEND_API_KEY` in the preview environment, at which point
previews mail real clients with no warning. Blocking all preview mail — rejected; a preview where
login cannot be completed cannot be reviewed.

### D3 — Separate auth collection, no local strategy

**Decision**: `visitors` is its own collection with `auth: { disableLocalStrategy: true, strategies: [visitorSessionStrategy] }`. `config.admin.user` stays `users`.

**Rationale**: Two collections make the privilege boundary structural. `disableLocalStrategy: true`
means there is no password field, no `/api/visitors/login` local route, and no forgot-password flow
to abuse. Access control then keys off `req.user.collection`, so an owner-only rule is a positive
check for `users`, not the absence of something.

**Alternatives considered**: One `users` collection with a role field — rejected outright by the
request, and correctly: a single collection makes every access rule a conditional, and one missed
conditional is a privilege escalation. Sessions in a signed cookie with no user collection at all —
rejected, it would put visitor identity outside Payload and lose the admin views the owner needs.

### D4 — The visitor session gets its own cookie name

**Decision**: The cookie is `sansay_visitor_session`, defined once in
`src/lib/auth/visitor/cookie.ts`, with `httpOnly`, `secure` in production, `sameSite: 'lax'`,
`path: '/'`, and `maxAge` matching the session lifetime.

**Rationale**: This is the sharpest finding of the research. Payload's `cookiePrefix` is **global
config, not per collection**, and cookies are minted as `${cookiePrefix}-token`. Two auth
collections therefore write the same cookie name by default: a visitor signing in would overwrite
the owner's `payload-token` and log them out of the admin — directly contradicting the spec's
edge case that says the two sessions are independent. Since we mint the session ourselves, we
choose a name that cannot collide.

**Alternatives considered**: Per-collection `cookiePrefix` — does not exist in 3.88. Distinguishing
the two by inspecting the JWT's `collection` claim in one shared cookie — rejected; one cookie
still holds one value, so the sessions would evict each other regardless of what the payload says.

### D5 — Database-backed opaque sessions, one row per device

**Decision**: On successful code entry, generate 32 random bytes, base64url-encode them as the
cookie value, and store only `sha256(token)` in a `visitor-sessions` row alongside `visitor`,
`createdAt`, `expiresAt`, and `revokedAt`. The auth strategy hashes the incoming cookie and looks
the row up on **every** request, rejecting expired or revoked rows.

**Rationale**: Three spec requirements are impossible with a self-contained token. FR-035 requires
that revocation take effect on the next request, which a stateless JWT cannot honour before it
expires. FR-054 requires independent per-device sessions. FR-034 requires the owner to see how many
are active. A row per session gives all three, and makes the retention purge (FR-059) a delete.
SHA-256 without a key is sufficient here — unlike the 6-digit code, a 256-bit random token has no
brute-forceable keyspace.

**Alternatives considered**: Payload's native `useSessions` — the right feature, but its helpers
(`addSessionToUser`, `revokeSession`) are not exported from the package root or `./internal`, so
using it means importing deep internal paths. Rejected on upgrade-safety grounds; revisit if
Payload exports them. Stateless JWT with a short expiry and no store — rejected, it cannot satisfy
FR-035.

### D6 — Codes are HMAC digests keyed by the server secret

**Decision**: Store `hmacSha256(code, PAYLOAD_SECRET)` in `login-codes.codeHash`. Compare using a
constant-time equality check. The plaintext code exists only in the email.

**Rationale**: The request said store only a hash, and the *kind* of hash matters at this size. A
6-digit code has 10^6 possibilities, so an unkeyed SHA-256 digest is reversible by exhaustive
search in milliseconds if the database leaks — a plain hash would satisfy the letter of the
instruction while providing no protection. Keying the digest with a secret that lives in the
environment, not the database, means a database dump alone reveals nothing.

**Alternatives considered**: bcrypt/argon2 — genuinely strong, but they cost tens to hundreds of
milliseconds per verification, which fights the constant-time budget in D8 and adds a dependency
for no gain over a keyed digest at this keyspace. Longer codes to make plain hashing safe —
rejected, the spec calls for a short numeric code a person retypes comfortably.

### D7 — Rate limiting on atomic Postgres counters

Covered in full in §3, since it answers a question asked directly.

### D8 — Constant-time code request

**Decision**: `requestLoginCode` records a start timestamp, does its work, and then waits until a
fixed budget (target: 800ms) has elapsed before returning — on every path, including unknown
address, rate-limited, and delivery failure.

**Rationale**: FR-006 demands that known and unknown addresses be indistinguishable, and SC-002
explicitly includes timing. But only a known address triggers a send, and FR-011 requires that a
send failure be reported to the visitor in the same interaction — so the send cannot be deferred
past the response. Sending synchronously and padding both paths to a common floor is what makes the
two requirements coexist. This also gives SC-002 the quantified threshold that
[clarify](./checklists/requirements.md) deferred to planning: responses are equal to within the
padding jitter, not merely "similar".

**Alternatives considered**: Deferring the send with Vercel's `waitUntil` so both paths return
immediately — rejected; the response would then be sent before the send outcome is known, making
FR-011 unimplementable. Not padding at all — rejected; it leaves a timing oracle that SC-002
explicitly tests for.

## 3. Answer: rate limiting that survives cold starts on Vercel, and its cost

**A per-instance in-memory counter is unusable here**, and the reasoning is worth stating because
it is the most common way this gets built wrong. Vercel runs each function invocation in one of
many instances; a module-scope `Map` is per instance, so N concurrent instances multiply every
limit by N, and the counter resets on every cold start and every deployment. An attacker does not
need to defeat it — ordinary traffic distribution does.

**Decision: atomic counters in the Postgres database the application already uses.**

A single dedicated table, created by migration and reached through `payload.db.drizzle` rather than
the Payload document API:

```sql
-- login_throttle
key         text        primary key,  -- 'addr:sha256(email)' | 'origin:<ip>' | 'fail:sha256(email)'
count       integer     not null default 0,
window_ends timestamptz not null,
blocked_until timestamptz
```

Each check is one statement, which is what makes it correct under concurrency:

```sql
INSERT INTO login_throttle (key, count, window_ends)
VALUES ($1, 1, now() + $2::interval)
ON CONFLICT (key) DO UPDATE
  SET count       = CASE WHEN login_throttle.window_ends < now() THEN 1
                         ELSE login_throttle.count + 1 END,
      window_ends = CASE WHEN login_throttle.window_ends < now() THEN now() + $2::interval
                         ELSE login_throttle.window_ends END
RETURNING count, window_ends;
```

`INSERT … ON CONFLICT DO UPDATE … RETURNING` is atomic in a single statement, so two concurrent
instances cannot both read a stale count. Read-modify-write through Payload's document API
**would** race, which is precisely why this one thing bypasses it.

The per-origin key comes from the `x-forwarded-for` header, since `NextRequest.ip` was removed in
Next 15. Take the **first** entry and treat a missing header as a single shared bucket.

**Cost, stated plainly:**

- **Money: nothing.** No new service, no new vendor, no new credential. It reuses the Postgres
  instance already provisioned for content and enquiries.
- **Latency: one extra database round trip per code request and per code verification** — roughly
  5–20ms against a Postgres instance in the same region. Sequenced before the email send, so it is
  a small fraction of the 800ms constant-time budget and invisible to the visitor.
- **Write volume: negligible at this scale** — bounded by the limits themselves, a few rows and a
  few dozen writes per day.
- **Operational: one cleanup job.** Expired rows must be purged or the table grows without bound.
  A Vercel Cron entry running a daily `DELETE FROM login_throttle WHERE window_ends < now() - interval '1 day'`
  covers it, and the same job purges expired codes and sessions (FR-059). This is the only genuine
  ongoing obligation the approach creates.
- **Coupling: rate limiting shares a failure domain with the database.** If Postgres is
  unreachable, the limiter cannot answer. The design **fails closed** — a limiter error refuses the
  code request — because a login that silently loses its rate limiting is worse than a login that
  is briefly unavailable, and the enquiry form (the site's actual purpose) is unaffected either way.

**Alternatives considered:**

- **Upstash Redis via the Vercel Marketplace** — the purpose-built answer: native TTLs, atomic
  `INCR`, sub-millisecond reads, and a ready-made sliding-window library. Rejected as premature
  here: it adds a vendor, a credential, and a second stateful dependency to a site that will see a
  handful of sign-ins a day, to solve a contention problem that does not exist at this volume.
  This is the option to switch to if volume ever makes the Postgres writes uncomfortable — the
  contract in `contracts/rate-limiting.md` keeps the limiter behind one interface so the swap
  stays local.
- **Vercel WAF / Firewall rate-limiting rules** — genuinely good for the per-origin dimension,
  since it blocks abusive traffic at the edge before a function ever runs. Rejected as the primary
  mechanism for two reasons: it is a paid-plan platform feature, and it cannot see the per-address
  or per-wrong-code dimensions, which are application state. Worth adding later as
  defence-in-depth for the origin limit specifically, not as a replacement.
- **Vercel Edge Config** — read-optimised with slow writes and no atomic increment. Wrong tool.

## 4. Answer: does Ethereal work on Vercel preview deployments?

**Short answer: technically yes, practically no. Use Ethereal for local development only.
Previews should use Tier 1 or Tier 2 behind the non-production recipient guard (D2).**

Ethereal is nodemailer's test service. `createTestAccount()` calls Ethereal's API at runtime to
mint throwaway SMTP credentials, and mail sent through it is **never delivered to the real
recipient** — it is only viewable at a one-off preview URL that nodemailer returns and Payload
logs. Outbound network access works fine from a Vercel function, so nothing *stops* it running on
a preview deployment. It is nonetheless the wrong choice there:

1. **A different inbox per instance.** The Payload config, and therefore the adapter, is
   constructed at module scope — once per serverless instance. Each cold start mints a *new*
   Ethereal account, so codes scatter across many throwaway inboxes with no way to predict which
   one a given request used.
2. **The code is only readable from function logs.** A reviewer testing a preview would need
   Vercel log access to find the message URL and complete a sign-in. That makes the login flow —
   the entire feature under review — effectively untestable by anyone without dashboard access.
3. **Two extra network round trips before the first send**, on a cold start, inside the 800ms
   constant-time budget.
4. **A third-party test service in a deployed environment**, with no availability guarantee, on the
   critical path of an authentication flow.
5. **It hides the real risk instead of managing it.** Ethereal appears to make previews safe by
   never delivering anything — but that safety evaporates the moment someone sets
   `RESEND_API_KEY` on the preview environment, and previews commonly share the production
   database. The protection has to come from the recipient guard, which holds regardless of tier.

**What preview environments should use instead:**

- Set `RESEND_API_KEY` (Tier 1) in the Vercel preview environment, with a **separate, preview-only
  key** so it can be revoked without touching production.
- Set `PREVIEW_MAIL_RECIPIENT` to one mailbox the owner controls. The guard from D2 rewrites every
  recipient to it, so a preview can exercise a real send, produce a real readable code, and still
  never reach a client.
- Keep `RESEND_FROM_ADDRESS` on Resend's sandbox sender until a domain is verified. Resend's own
  restriction — an unverified domain can only send to the account's verified address — is then a
  second, independent safety net behind the guard.
- Tier 2 (SMTP) is the alternative if the owner prefers a self-hosted catch-all inbox; the guard
  applies identically.

**So the tiers land as:** Tier 1 Resend in production and preview; Tier 2 SMTP wherever a real SMTP
host is preferred; Tier 3 Ethereal on a developer's laptop only, where zero configuration and a
clickable preview link are exactly what is wanted. The selection logic stays as requested — this is
guidance about which variables to set in which environment, not a change to the precedence.

## 5. Consolidated open items for implementation

| Item | Status |
|---|---|
| Reference implementation at `/tmp/hht-ref` | **Missing.** Restore it, or treat `contracts/email-adapter.md` as the definition of record. |
| `PREVIEW_MAIL_RECIPIENT`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS` | To be added to `.env.example` and to the Vercel preview environment. |
| Vercel Cron entry for the purge job | **Now a tracked deliverable**, not an open item — FR-059 and SC-015 depend on it and FR-060 requires its absence to be detectable. Listed in `plan.md`'s source tree. |
| Constant-time budget of 800ms | A starting figure. Confirm against real Resend latency and tune once, in one place. The spec's Assumptions now record that this is the one place it depends on a measurement rather than a decision, and SC-002 states the tolerance the two response distributions must agree within. |
| FR-058 identity cascade | Was specified in `data-model.md` with no owning file. Now `src/hooks/cascadeVisitorIdentity.ts` in `plan.md`'s source tree. |
