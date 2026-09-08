# Phase 1 Data Model: Passwordless Email Login for Enquirers

Three new Payload collections, two new fields plus a delivery group on `enquiries`, and one
raw-SQL table that deliberately sits outside the document API. Every collection uses
`idType: 'uuid'`, matching the existing configuration in `src/payload.config.ts`.

Admin labels and descriptions are Russian, consistent with the existing collections — the owner
works in this panel every day.

## Overview

```text
visitors (auth, no password)
   │ 1
   ├──────< visitor-sessions        one row per signed-in device, revocable
   │ 1
   ├──────< login-codes             at most one outstanding per visitor
   │
   └──── attributed by email ────> enquiries.submitterEmail

login_throttle (raw SQL, no Payload collection)
   counters keyed by hashed address / origin ip / hashed address for failures
```

`visitors` is **not** a foreign key on `enquiries`. Attribution is by normalized email address
(FR-003), which keeps an enquiry independent of whether an identity currently exists — important
because FR-058 deletes the identity when the last attributed enquiry goes, and because an enquiry
can be submitted long before anyone signs in.

## `visitors` — collection

Auth-enabled, no password. One row per email address that has ever been eligible to sign in.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Payload-managed |
| `email` | text | **required, unique, indexed.** Stored already normalized: trimmed, lowercased (FR-003). Defined by us, not by Payload's local auth, since that strategy is disabled |
| `firstSeenAt` | date | Set on creation, read-only in admin |
| `lastSignedInAt` | date | Updated on each successful code verification. Read-only. Drives the admin column for FR-034 |
| `activeSessionCount` | number | Denormalized count of live sessions, read-only. Maintained on session create/revoke/expire. Exists so the admin list can show it without a per-row subquery (FR-034) |
| `revokeAllSessions` | checkbox | The owner's revoke control (FR-035). A `beforeChange` hook revokes every live session for this visitor and resets the checkbox to `false`, so it behaves as a button using only stock Payload UI — no custom React, per Principle III |
| `blockedUntil` | date | Read-only, mirrored from the throttle table for display only (FR-055). Never read to make an authorization decision — the throttle table is the authority |

**Config**:

```ts
auth: {
  disableLocalStrategy: true,          // no password, no salt, no local login route
  strategies: [visitorSessionStrategy],
}
```

**Access**: `create`/`read`/`update`/`delete` — owner only (`req.user?.collection === 'users'`).
A visitor session must never read this collection through the API, even its own row (FR-036).

**Admin**: `useAsTitle: 'email'`, default columns `email`, `lastSignedInAt`,
`activeSessionCount`, `blockedUntil`. This list view *is* the owner's sign-in activity screen —
no custom view is built.

**Deliberately absent**: name, any device or browser string, any IP address (FR-053), and any
attempt history (FR-056).

## `visitor-sessions` — collection

One row per signed-in device. The row, not the cookie, is the authority on whether a session is
live — which is what makes revocation take effect on the next request (FR-035).

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Payload-managed |
| `visitor` | relationship → `visitors` | required, indexed, `hasMany: false` |
| `tokenHash` | text | **required, unique, indexed.** `sha256(token)` of the 32 random bytes handed to the browser. The token itself is never stored |
| `createdAt` | date | required |
| `expiresAt` | date | required, indexed. `createdAt + 7 days` (spec Assumptions) |
| `revokedAt` | date | null while live. Set by owner revocation or by visitor sign-out |
| `endedReason` | select | `signed_out` \| `revoked_by_owner` \| `identity_removed`. Null while live. Kept only for the retention window; carries no device information |

**Access**: owner only, same as `visitors`.

**Admin**: visible but read-only (`admin.hidden: false`, fields read-only). The owner revokes via
the checkbox on `visitors`, not by editing rows here. Listing them gives the owner a way to see
that two devices are signed in without exposing what those devices are.

**A session is live** when `revokedAt IS NULL AND expiresAt > now()`. This is a single predicate
and is the only definition used anywhere — the auth strategy, the session count, and the admin
display all derive from it.

## `login-codes` — collection

At most one outstanding code per visitor. Superseding is enforced by invalidating on issue
(FR-009), not by relying on the newest row winning.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Payload-managed |
| `visitor` | relationship → `visitors` | required, indexed |
| `codeHash` | text | **required.** `hmacSha256(code, PAYLOAD_SECRET)` — keyed, not a bare digest, because a 6-digit code has only 10^6 possibilities (research D6) |
| `issuedAt` | date | required |
| `expiresAt` | date | required, indexed. `issuedAt + 10 minutes` |
| `consumedAt` | date | null until used. Non-null makes the code permanently dead (FR-014) |
| `supersededAt` | date | Set on every outstanding code for this visitor when a new one is issued (FR-009) |
| `attemptCount` | number | Incremented on each incorrect submission against this code. Advisory; the authoritative lockout counter is per address in the throttle table, so it survives the code being superseded |

**Access**: owner only for `read`; no public access whatsoever. The owner should have no reason to
read it, but it must not be publicly readable, and `codeHash` is useless without the secret.

**Admin**: `admin.hidden: true`. Nothing here is actionable by the owner, and showing rows would
invite the impression that a code can be looked up and read out — it cannot.

**A code is usable** when `consumedAt IS NULL AND supersededAt IS NULL AND expiresAt > now()`.

### Code state transitions

```text
                    issue (invalidates prior outstanding codes)
                              │
                              ▼
                        ┌──────────┐
                        │ usable   │
                        └────┬─────┘
        correct entry        │        new code requested
   ┌─────────────────────────┼────────────────────────────┐
   ▼                         ▼                            ▼
consumed              expired (clock)                superseded
(FR-014: reuse        (FR-015: clear message         (FR-009: only the
 refused)              + request-new control)          newest works)
```

All three terminal states are refusals to the visitor and all three offer a way to request a new
code. They are distinguished in the message only where the spec requires it: expiry says so
explicitly (FR-015), while a merely incorrect code stays generic (FR-017).

## `enquiries` — modifications

| Field | Change | Rules |
|---|---|---|
| `submitterEmail` | **new**, text | **required** for new enquiries (FR-002), indexed, normalized on write. This is the attribution key |
| `ownerReply` | **new**, textarea | Owner-authored, optional. Readable by the attributed submitter (FR-033) |
| `replyNotifiedAt` | **new**, date | Read-only. Set when the first reply notice is sent; its presence is what makes editing a reply not re-notify (FR-051) |
| `delivery.visitorAck` | **new** group member | `{ status: 'sent' \| 'failed' \| 'disabled', attemptedAt, error }` — same `ChannelResult` shape the existing `delivery.email` and `delivery.telegram` groups use |
| `delivery.replyNotice` | **new** group member | Same shape |

**Migration constraint**: existing rows have no `submitterEmail` and must **not** be backfilled
(FR-002a). The column is therefore nullable in the database while being required in the submission
schema. This split is intentional and is the mechanism by which pre-existing enquiries belong to
nobody: `submitterEmail IS NULL` can never match a signed-in visitor.

**`deliveryFailed`** keeps its current meaning — any *owner* channel failed. The two new visitor
delivery outcomes must **not** feed it, because a failed acknowledgement is not a failure to reach
the owner and must not raise the owner's "needs attention" flag (FR-047, Constitution VI).

## `login_throttle` — raw SQL table

Created by migration; **no Payload collection**. Read and written only through
`payload.db.drizzle` with the single atomic statement in
[contracts/rate-limiting.md](./contracts/rate-limiting.md).

```sql
CREATE TABLE login_throttle (
  key           text PRIMARY KEY,
  count         integer     NOT NULL DEFAULT 0,
  window_ends   timestamptz NOT NULL,
  blocked_until timestamptz
);
CREATE INDEX login_throttle_window_ends_idx ON login_throttle (window_ends);
```

| Key shape | Limit | Window |
|---|---|---|
| `addr:<sha256(email)>` | 3 code requests | 15 minutes |
| `origin:<ip>` | 20 code requests | 1 hour |
| `fail:<sha256(email)>` | 5 incorrect codes → sets `blocked_until` | 15 minutes cooling-off |

**Why it is not a collection**: correctness requires a single atomic
`INSERT … ON CONFLICT DO UPDATE … RETURNING`. Payload's document API is read-then-write, which
races between concurrent serverless instances — exactly the failure the request warned about.
The address is hashed so that the table holds no plaintext addresses; it never needs to be read
back as an address, only compared.

## Indexes

| Collection / table | Index | Serves |
|---|---|---|
| `visitors` | unique on `email` | Sign-in lookup; one identity per address |
| `visitor-sessions` | unique on `tokenHash` | Session resolution on **every** authenticated request — the hottest lookup in the feature |
| `visitor-sessions` | `visitor`, `expiresAt` | Session counting, bulk revocation, purge |
| `login-codes` | `visitor`, `expiresAt` | Outstanding-code lookup, supersede, purge |
| `enquiries` | `submitterEmail` | The ownership-scoped list query (FR-027) |
| `login_throttle` | pk on `key`, index on `window_ends` | Atomic upsert; purge |

## Retention and cascade

| Trigger | Effect |
|---|---|
| Owner deletes an enquiry, and no other enquiry shares its `submitterEmail` | Delete the `visitors` row; its sessions and codes cascade; live sessions stop working on the next request (FR-058). Sessions are marked `identity_removed` before deletion so the reason is recorded if a row is inspected mid-purge |
| Owner deletes an enquiry, others share the address | Nothing. The identity persists and the remaining enquiries still list |
| Daily purge job | Delete `login-codes` and `visitor-sessions` finished more than 30 days ago, and `login_throttle` rows whose window ended more than a day ago (FR-059, SC-015) |
| Visitor signs out | `revokedAt = now()`, `endedReason = 'signed_out'` on that one row only (FR-054) |
| Owner ticks `revokeAllSessions` | `revokedAt = now()`, `endedReason = 'revoked_by_owner'` on every live row for that visitor (FR-035) |

The purge is a Vercel Cron job, not a hook, because nothing in a request path should be responsible
for cleanup the owner is promised will happen automatically (FR-060).
