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

### The windows are fixed, and that is required

`window_ends` makes each window fixed: it opens with the first request and does not slide. This is
not a simplification to revisit later — a rolling window has to know when each individual request
happened, and storing per-request timestamps is exactly the attempt history FR-056 forbids. The
accepted consequence, now written into the spec's Assumptions, is a boundary burst: 3 codes at the
end of one window and 3 more at the start of the next. The limits exist to stop flooding, not to
ration honest use, so that was judged the better trade against keeping no history.

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

**Both halves of the flow check it.** `verifyLoginCode` checks the block before looking up a code,
and `requestLoginCode` checks it before counting a request (FR-018). Checking only the first would
leave a blocked visitor able to request codes for 15 minutes — receiving mail that cannot work,
spending their FR-019 allowance on it, and not learning about the block until they tried one.

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

If the throttle query throws, `consumeRequestQuota` returns `{ allowed: false, reason: 'unavailable' }`.
A login flow that loses its rate limiting is worse than one that is briefly unavailable, and nothing
else on the site depends on it — the enquiry form keeps working. This must be a deliberate catch, not
an accident of an unhandled rejection.

**The message must not be a limit message** (FR-063). A refusal caused by enforcement being
unavailable surfaces as `unavailable` — "signing in is temporarily unavailable, try again shortly" —
never as `rate_limited`. Telling a visitor they have requested too many codes when the counter query
failed is false, and it points them at a wait that will never end because no window is running.

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
sessions. The job does not yet exist: adding the `vercel.json` entry is implementation work that
FR-059 and SC-015 depend on, and under FR-060 its absence or failure has to be detectable rather
than silent, since nothing a visitor or the owner can see would reveal it.

## Deletion clears an address's counters

When the owner deletes the last enquiry attributed to an address, the identity cascade
([data-model.md](../data-model.md)) also deletes that address's `addr:` and `fail:` rows (FR-058).
Otherwise a block would outlive the identity, and a deleted address would behave differently from
one the site has never seen — a residual signal, and a straightforward contradiction of SC-014.

The accepted side effect, now recorded in FR-057, is that deleting an enquiry lifts a block. That is
not a support workaround — it destroys the enquiry — but it is the one exception to the owner having
no way to lift a block, and it is stated rather than left to be discovered.

## Verified by

Scenario D in [quickstart.md](../quickstart.md), and `tests/integration/throttle.test.ts`, which
must include a concurrency case issuing parallel requests against one key and asserting the limit
is not exceeded — the one test that would catch a regression to read-then-write.
