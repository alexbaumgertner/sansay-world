# Contract: Login code issue and verification

Implements FR-005 to FR-009, FR-011 to FR-018, FR-021.

Two Server Actions. Both are `'use server'` and both are the only place code state changes.
Nothing about single-use or expiry is decided by the client; the client submits a string and is
told yes or no.

## `requestLoginCode(email: string)`

```ts
export type RequestCodeResult =
  | { ok: true }                                    // "code sent" — the standard confirmation
  | { ok: false; reason: 'invalid_email' }
  | { ok: false; reason: 'rate_limited'; retryAfter: string }
  | { ok: false; reason: 'delivery_failed' }
```

Order of operations, which is load-bearing:

1. **Start the clock.** Record `startedAt` for the constant-time floor (step 9).
2. **Validate shape** via Zod. A malformed address returns `invalid_email` — this is a client-side
   input error, not an existence signal, and is the one early return that skips padding.
3. **Throttle: origin**, then **address** — see [rate-limiting.md](./rate-limiting.md). Either
   limit returns `rate_limited` with the window end. Both messages are identical for known and
   unknown addresses (FR-021).
4. **Look up the visitor** by normalized email. Also treat as unknown any address whose only
   enquiries predate `submitterEmail` (FR-002a, FR-007) — that falls out naturally, since such
   enquiries have `submitterEmail IS NULL` and so never create an identity.
5. **If unknown** — do no work, send nothing, and continue to step 9. The visitor receives the
   standard confirmation (FR-006).
6. **If the identity does not exist yet but an attributed enquiry does** — create the `visitors`
   row now (FR-004). Identity creation is lazy; enquiry submission grants eligibility, not a row.
7. **Supersede** every outstanding code for this visitor: `supersededAt = now()` (FR-009).
8. **Issue** — 6 digits from `crypto.randomInt(0, 1_000_000)`, zero-padded. Store
   `hmacSha256(code, PAYLOAD_SECRET)` with `expiresAt = now + 10 min`. Then send via
   `payload.sendEmail`. **Await the send.** A rejection returns `delivery_failed` (FR-011).
9. **Pad to the constant-time floor** and return.

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

Every terminal path in steps 3–8 goes through `padTo`. Without it, a known address takes as long as
a Resend API call while an unknown one returns immediately, which is a reliable existence oracle and
exactly what SC-002 tests for. The floor also supplies SC-002's missing quantified threshold:
responses must agree to within the padding jitter.

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
  | { ok: false; reason: 'locked_out'; retryAfter: string }
```

1. **Validate shape** — six digits.
2. **Check the failure lockout** for this address. If blocked, return `locked_out` with the end
   time (FR-018). This precedes any code lookup, so a locked address cannot keep guessing.
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
8. **On match** — `consumedAt = now()` (FR-014: reuse now fails), clear the failure counter, mint a
   session, and set the cookie.

Steps 8's ordering matters: consume the code **before** minting the session, so a crash between the
two leaves a dead code rather than a reusable one.

### Codes are bound to their address

The code is looked up by `visitor`, so a code issued for A can never authenticate B (FR-016) —
there is no code-only lookup path anywhere in the implementation.

### No distinction between consumed and superseded

Both return `incorrect`. FR-014 wants a clear message with a way to request a new code, which the
`incorrect` UI already provides. Distinguishing them would tell an attacker that they hold a real
but stale code.

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
| `rate_limited` | `login.errorRateLimited` (interpolates the retry time) |
| `delivery_failed` | `login.errorDeliveryFailed` |
| `incorrect` | `login.errorIncorrectCode` |
| `expired` | `login.errorExpiredCode` |
| `locked_out` | `login.errorLockedOut` (interpolates the retry time) |

The code-entry step always shows a "request a new code" control, since every refusal path is
supposed to offer one.

## Verified by

Scenarios B and D in [quickstart.md](../quickstart.md), and
`tests/integration/login-codes.test.ts`, which must cover: reuse refused, expiry refused,
supersede refused, cross-address refused, lockout after the threshold, and that no plaintext code
is ever written to any column.
