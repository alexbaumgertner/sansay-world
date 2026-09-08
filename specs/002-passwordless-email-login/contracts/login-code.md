# Contract: Login code issue and verification

Implements FR-005 to FR-009, FR-011, FR-011a, FR-012 to FR-018, FR-021, FR-061 to FR-063.

Two Server Actions. Both are `'use server'` and both are the only place code state changes.
Nothing about single-use or expiry is decided by the client; the client submits a string and is
told yes or no.

## `requestLoginCode(email: string)`

```ts
export type RequestCodeResult =
  | { ok: true }                                    // "code sent" — the standard confirmation
  | { ok: false; reason: 'invalid_email' }
  | { ok: false; reason: 'rate_limited'; retryAfterSeconds: number }
  | { ok: false; reason: 'locked_out'; retryAfterSeconds: number }
  | { ok: false; reason: 'delivery_failed' }
  | { ok: false; reason: 'unavailable' }
```

Order of operations, which is load-bearing:

1. **Start the clock.** Record `startedAt` for the constant-time floor (step 10).
2. **Validate shape** via Zod. A malformed address returns `invalid_email` — this is a client-side
   input error, not an existence signal, and is the one early return that skips padding.
3. **Check the failure lockout** for this address, before any limit counting. A blocked address
   returns `locked_out` (FR-018). Requesting a code while blocked must not be allowed to proceed:
   the code would be unusable, and issuing it anyway would spend one of the three requests the
   visitor gets under FR-019 while they wait out a block they may not know about yet.
4. **Throttle: origin**, then **address** — see [rate-limiting.md](./rate-limiting.md). Either
   limit returns `rate_limited` with the remaining wait. Both messages are identical for known and
   unknown addresses, and so is the `locked_out` message from step 3 (FR-021) — possible because
   the failure counter is keyed by address hash whether or not that address exists.
5. **Look up the visitor** by normalized email. Also treat as unknown any address whose only
   enquiries predate `submitterEmail` (FR-002a, FR-007) — that falls out naturally, since such
   enquiries have `submitterEmail IS NULL` and so never create an identity.
6. **If unknown** — do no work, send nothing, and continue to step 10. The visitor receives the
   standard confirmation (FR-006).
7. **If the identity does not exist yet but an attributed enquiry does** — create the `visitors`
   row now (FR-004). Identity creation is lazy; enquiry submission grants eligibility, not a row.
8. **Supersede** every outstanding code for this visitor: `supersededAt = now()` (FR-009).
9. **Issue** — 6 digits from `crypto.randomInt(0, 1_000_000)`, zero-padded. Store
   `hmacSha256(code, PAYLOAD_SECRET)` with `expiresAt = now + 10 min`. Then send via
   `payload.sendEmail`. **Await the send.** A rejection returns `delivery_failed` (FR-011). The
   body states the 10-minute validity window, so the visitor can tell a stale code from a fresh
   one without counting minutes themselves.
10. **Pad to the constant-time floor** and return.

Steps 3 and 4 both consult the throttle table, and if that read throws, both return `unavailable`
rather than a limit message (FR-063). Failing closed is right — a login flow with no working rate
limiting is worse than one that is briefly unavailable — but the visitor must not be told they made
too many requests when in fact enforcement broke. See
[rate-limiting.md](./rate-limiting.md#failing-closed).

### `crypto.randomInt`, not `Math.random`

A predictable code is equivalent to no code. `crypto.randomInt` is uniform over the range and
avoids the modulo bias that `randomBytes % 1000000` introduces.

### Why the send is awaited

FR-011 requires the visitor be told, in the same interaction, that delivery failed. That is only
possible if the outcome is known before responding, which rules out deferring the send (e.g. with
Vercel's `waitUntil`). This costs latency on the happy path and is the reason a constant-time floor
is needed at all.

### The constant-time floor

```ts
// src/lib/auth/visitor/constant-time.ts
export const CODE_REQUEST_FLOOR_MS = 800
export async function padTo(startedAt: number, floorMs: number): Promise<void>
```

Every terminal path in steps 3–9 goes through `padTo`. Without it, a known address takes as long as
a Resend API call while an unknown one returns immediately, which is a reliable existence oracle and
exactly what SC-002 tests for. The floor also supplies SC-002's threshold, now stated in the spec:
the two distributions must agree to within the padding's own jitter, so no cut-off separates them.

800ms is a starting value; confirm against observed Resend latency and tune in this one constant.
If a send ever exceeds the floor the response is simply late — correctness does not depend on the
floor being generous, only on both paths targeting the same figure.

### One residual signal, accepted

`delivery_failed` can only occur for a known address, so it does distinguish the two cases. This is
the spec's documented, deliberate trade-off: the visitor must not be left waiting for an email that
will never arrive. It is acceptable because genuine send failures are rare and not attacker-
triggerable at will. Recorded in the spec's Assumptions; restated here so nobody "fixes" it by
silently swallowing the failure.

## `verifyLoginCode(email: string, code: string)`

```ts
export type VerifyCodeResult =
  | { ok: true }                                    // cookie set; caller redirects
  | { ok: false; reason: 'incorrect' }
  | { ok: false; reason: 'expired' }
  | { ok: false; reason: 'locked_out'; retryAfterSeconds: number }
  | { ok: false; reason: 'unavailable' }
```

1. **Validate shape** — six digits.
2. **Check the failure lockout** for this address. If blocked, return `locked_out` with the
   remaining wait (FR-018). This precedes any code lookup, so a locked address cannot keep
   guessing. `requestLoginCode` performs the same check at its own step 3, so the block holds on
   both halves of the flow rather than only on this one.
3. **Resolve the visitor.** Unknown address returns `incorrect` — identical to a wrong code
   (FR-017).
4. **Find the usable code**: `consumedAt IS NULL AND supersededAt IS NULL AND expiresAt > now()`.
5. **Compare** with `crypto.timingSafeEqual` over the HMAC digests. A plain `===` on digests leaks
   timing; use the constant-time comparison even though the margin is small.
6. **On mismatch** — increment the address failure counter and `attemptCount`, then return
   `incorrect`. Crossing the threshold sets `blocked_until`; the visitor is told on the *next*
   attempt, per FR-018's wording that further attempts are refused.
7. **On expiry** (a code exists for this address but is past `expiresAt`) — return `expired`, so
   the UI can show the explicit expiry message and a request-new control (FR-015). This is the one
   place a distinction is deliberately exposed, and it is safe because reaching it requires having
   supplied a genuinely issued code.
8. **On match** — consume the code, then clear the failure counter, mint a session, and set the
   cookie.

Step 8's ordering matters: consume the code **before** minting the session, so a crash between the
two leaves a dead code rather than a reusable one.

### Consumption is atomic

The consuming write is conditional and its result is what decides the outcome:

```sql
UPDATE login_codes SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL
```

Zero rows affected means another request consumed it first, and this one must be treated as
`incorrect` — not as a success. Reading `consumedAt IS NULL` at step 4 and writing it at step 8 as
two separate statements would let two simultaneous submissions of the same valid code both mint a
session, which is exactly what FR-008's "usable exactly once" forbids. The spec now states this
explicitly rather than leaving single-use dependent on request timing.

### Codes are bound to their address

The code is looked up by `visitor`, so a code issued for A can never authenticate B (FR-016) —
there is no code-only lookup path anywhere in the implementation.

### No distinction between consumed and superseded

Both return `incorrect`, and FR-014 now requires exactly that rather than merely tolerating it: a
used code, a superseded code, and a code that was never valid are refused identically, and what the
requirement guarantees is the route back to a working code. Distinguishing them would confirm to
whoever holds a spent code that it was genuine and that the address exists.

## Cookie setting and redirect

`verifyLoginCode` sets the cookie via `(await cookies()).set(...)` — possible only in a Server
Action or Route Handler in Next 16, never during Server Component render. The caller then
`redirect('/status')`, placed **outside** any try/catch because `redirect()` throws `NEXT_REDIRECT`.

## Client shape

`src/components/LoginCodeForm.tsx` is a two-step form using `useActionState`. Every message is a
copy key; the component maps a `reason` to a key and renders `t(key)`. No message text lives in the
component.

| `reason` | Copy key |
|---|---|
| `invalid_email` | `login.errorInvalidEmail` |
| `rate_limited` | `login.errorRateLimited` (interpolates a duration) |
| `delivery_failed` | `login.errorDeliveryFailed` |
| `unavailable` | `login.errorUnavailable` — "temporarily unavailable, try again shortly" (FR-063) |
| `incorrect` | `login.errorIncorrectCode` |
| `expired` | `login.errorExpiredCode` |
| `locked_out` | `login.errorLockedOut` (interpolates a duration) |

Two further keys are not error states and are always present on the code-entry step:
`login.codeHelpNotArrived` (FR-011a — where else to look, and how to try another address) and
`login.changeAddress` (FR-062).

`retryAfterSeconds` is rendered as a duration — "попробуйте снова через 12 минут" — never as a clock
time (FR-019, FR-020). A duration needs no timezone, survives a page left open, and does not depend
on the visitor's device clock agreeing with the server's.

### What the code-entry step must offer

Three controls, not one:

1. **Request a new code** for the same address — every refusal path offers it.
2. **Change the address** (FR-062), returning to step one with the field editable. Without this a
   typo is unrecoverable, and by design the visitor is never told the address was wrong.
3. **Standing help text** for a code that never arrived (FR-011a), rendered as help rather than as
   an error, since the server cannot know whether any given code was delivered.

### The pending state

`useActionState` exposes `isPending`; the submit control must be disabled while it is true and the
form must show that the request is running (FR-061). This is not cosmetic: every request is padded
to `CODE_REQUEST_FLOOR_MS`, and 800ms of unresponsive form is long enough to earn a second click
that would spend one of the visitor's three requests under FR-019.

## Verified by

Scenarios B and D in [quickstart.md](../quickstart.md), and
`tests/integration/login-codes.test.ts`, which must cover: reuse refused, expiry refused,
supersede refused, cross-address refused, lockout after the threshold, and that no plaintext code
is ever written to any column.
