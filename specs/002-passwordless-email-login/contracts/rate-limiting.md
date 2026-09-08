# Contract: Rate limiting and lockout

Implements FR-018 to FR-021, FR-055 to FR-057.

The controlling rule: **counters live in Postgres and every check is one atomic statement.** A
per-instance in-memory counter cannot work on Vercel — each invocation may land on a different
instance, so N instances multiply every limit by N, and every cold start and deployment resets the
count. Full reasoning and the cost of this choice are in [research.md §3](../research.md).

## Interface

```ts
// src/lib/auth/visitor/throttle.ts
export type ThrottleVerdict =
  | { allowed: true }
  | { allowed: false; retryAt: Date }

export async function consumeRequestQuota(key: ThrottleKey): Promise<ThrottleVerdict>
export async function recordFailedAttempt(email: string): Promise<ThrottleVerdict>
export async function clearFailedAttempts(email: string): Promise<void>
export async function readBlockState(email: string): Promise<{ blockedUntil: Date | null }>
```

Everything goes through this module. No caller writes `login_throttle` directly, so swapping the
backing store later (Upstash Redis is the identified upgrade path) stays a change to one file.

## The three limits

| Key | Limit | Window | Requirement |
|---|---|---|---|
| `addr:<sha256(email)>` | 3 code requests | 15 min | FR-019 |
| `origin:<ip>` | 20 code requests | 60 min | FR-020 |
| `fail:<sha256(email)>` | 5 incorrect codes → 15 min block | 15 min | FR-018 |

Figures come from the spec's Assumptions. They live in one exported constants object so tuning is
a single edit and the tests can import the same values rather than restating them.

Addresses are hashed before use as a key: the table never needs to read an address back, only
compare, so storing plaintext there would be gratuitous.

## The atomic statement

Executed through `payload.db.drizzle` (typed and exposed at
`@payloadcms/db-postgres/dist/types.d.ts:79`) with bound parameters:

```sql
INSERT INTO login_throttle (key, count, window_ends)
VALUES ($1, 1, now() + $2::interval)
ON CONFLICT (key) DO UPDATE
  SET count       = CASE WHEN login_throttle.window_ends < now() THEN 1
                         ELSE login_throttle.count + 1 END,
      window_ends = CASE WHEN login_throttle.window_ends < now() THEN now() + $2::interval
                         ELSE login_throttle.window_ends END
RETURNING count, window_ends, blocked_until;
```

**This is the only raw SQL in the feature, and the reason is correctness, not preference.** Payload's
document API is read-then-write, so two concurrent serverless instances can both read a count of 2
and both write 3, letting a limit of 3 pass four requests. A single
`INSERT … ON CONFLICT DO UPDATE … RETURNING` is atomic, so the returned `count` is authoritative.

The window is fixed, not sliding: the first request in a window sets `window_ends`, and the window
resets only after it passes. A sliding window would need either a row per attempt or a Redis sorted
set; a fixed window is what the spec's messages already describe ("when they can try again").

The caller compares the returned `count` against the limit. Exceeding it yields
`{ allowed: false, retryAt: window_ends }`.

## Failure lockout

`recordFailedAttempt` uses the same statement on a `fail:` key, and when the returned count reaches
the threshold it sets `blocked_until = now() + 15 min` in the same round trip. `readBlockState`
reads it back for the admin display.

`clearFailedAttempts` deletes the row on successful sign-in, so an honest visitor who fumbled twice
before succeeding starts clean.

The failure counter is keyed by **address, not by code**, so it survives a code being superseded.
Requesting a new code must not reset a lockout — otherwise the lockout is bypassed by requesting
another code, which would make FR-018 decorative.

## Origin identification

`NextRequest.ip` was **removed in Next 15** (`next/dist/docs/01-app/03-api-reference/04-functions/next-request.md`),
so the origin comes from headers:

```ts
const forwarded = (await headers()).get('x-forwarded-for')
const origin = forwarded?.split(',')[0]?.trim() ?? 'unknown'
```

Take the **first** entry: on Vercel it is the client address, and later entries are proxy hops a
client can forge. A missing header collapses to a single shared `unknown` bucket, which is
intentionally conservative.

Shared origins (an office, a mobile carrier) can put unrelated visitors in one bucket, which is why
the origin limit is set loosely at 20/hour and its message says only that too many requests have
been made.

## Failing closed

If the throttle query throws, `consumeRequestQuota` returns `{ allowed: false }`. A login flow that
loses its rate limiting is worse than one that is briefly unavailable, and nothing else on the site
depends on it — the enquiry form keeps working. This must be a deliberate catch, not an accident of
an unhandled rejection.

## What is deliberately not stored

No log of individual attempts (FR-056). The table holds a count, a window, and possibly a block
expiry — never who tried what and when. The consequence, recorded in the spec, is that the owner
can see an address is blocked but cannot see a campaign over time. That was the chosen trade-off,
and adding an attempt log to "improve" the admin view would contradict FR-056.

## Owner visibility

The owner sees `blockedUntil` on the `visitors` row (FR-055) and has **no control to lift it**
(FR-057). Mirroring is display-only: authorization always reads the throttle table, never the
mirrored field, so a stale mirror can mislead a human but can never grant access. See
[owner-admin.md](./owner-admin.md).

## Cleanup

A daily Vercel Cron job deletes rows whose `window_ends` passed more than a day ago. Without it the
table grows unboundedly — small, but unbounded. The same job purges expired codes and finished
sessions.

## Verified by

Scenario D in [quickstart.md](../quickstart.md), and `tests/integration/throttle.test.ts`, which
must include a concurrency case issuing parallel requests against one key and asserting the limit
is not exceeded — the one test that would catch a regression to read-then-write.
