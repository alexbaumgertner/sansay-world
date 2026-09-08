# Contract: The owner's view in the admin

Implements FR-034 to FR-036, FR-039 to FR-041, FR-053, FR-055 to FR-057.

The controlling rule: **everything the owner needs is a stock Payload surface.** No custom admin
view, no custom React control. Under Principle III the owner must operate this without a developer,
and a bespoke component is a thing that breaks on a Payload upgrade at exactly the moment they need
it.

## Sign-in activity is the `visitors` list view

No screen is built. The collection's default list view, configured with the right columns, *is* the
requirement:

| Column | Meaning |
|---|---|
| `email` | Which address (FR-034) |
| `lastSignedInAt` | When they last signed in (FR-034) |
| `activeSessionCount` | How many devices are currently signed in (FR-034, FR-054) |
| `blockedUntil` | Whether the address is currently blocked and when it lifts (FR-055) |

`activeSessionCount` is denormalized onto the visitor and maintained on session create, revoke, and
expiry, so the list needs no subquery per row.

Because expiry is time-based, a count can go stale between writes. The purge job recomputes it, and
the authoritative definition of "live" (`revokedAt IS NULL AND expiresAt > now()`) is always
evaluated fresh at request time. **The displayed count is never used to make an authorization
decision** — it informs a human, nothing more.

## Revocation is a checkbox

`visitors.revokeAllSessions` is a checkbox whose `beforeChange` hook revokes every live session for
that visitor and resets itself to `false`.

Why a checkbox rather than a button: Payload renders it with no custom code, it works in the mobile
admin, and it survives upgrades. The cost is that it reads as a setting rather than an action, which
the field label and description are written to counteract ("Отозвать доступ" with a description
stating the effect is immediate and applies to all devices).

Scope is **per address, everywhere** (FR-035): one tick ends every device. There is deliberately no
per-device revoke control, matching the clarified decision — the owner has no way to tell the
devices apart (FR-053 records nothing about them), so offering a choice between two indistinguishable
rows would be a worse interface than not offering one.

Effect is immediate: the next request from any of those devices resolves a revoked row and is
treated as not signed in (FR-035). Nothing is cached and no token has to expire first.

## The owner cannot read enquiries as a visitor

FR-036 is enforced by there being no such mechanism, rather than by a check that could be removed.
There is no impersonation, no "view as", no way to mint a visitor session from the admin. The only
route to a session is possession of a code delivered to that address.

The owner can of course read every enquiry in the admin — that is their own data. What they cannot
do is enter the visitor-facing view as someone else.

## Blocks are visible but not overridable

`blockedUntil` is mirrored from the throttle table onto the visitor row **for display only**
(FR-055). There is no control to lift a block (FR-057): the owner waits, exactly as the visitor
does.

Because it is a mirror, it can be stale — a block may have lapsed while the column still shows a
time. The field label and description therefore present it as the last known state rather than as
live truth, so the owner reading it to answer a visitor knows to treat a passed time as "no longer
blocked". The purge job refreshes it. The authoritative check is always the throttle table, which is
what keeps a stale mirror a cosmetic problem instead of a security one.

An address that has never requested a code has no `visitors` row and so nothing to display. In
practice this does not bite: the row is created at the first code request for any attributed address
([login-code.md](./login-code.md) step 7), so anyone who enquired and then tried to sign in has one
by the time they could be blocked.

The mirror is never read to make an authorization decision — `verifyLoginCode` always consults the
throttle table. This matters because the mirror can be stale, and a stale mirror that could grant
access would be a security defect rather than a cosmetic one.

There is no attempt log (FR-056). The owner sees the current state, not a history. The accepted
consequence, recorded in the spec, is that a slow campaign across many addresses is not visible
from this screen.

## Access separation

Every collection in this feature is `adminOnly`, which after this feature means
`user?.collection === 'users'` and no longer `Boolean(user)` — see
[visitor-auth.md](./visitor-auth.md). A visitor session must not read `visitors`,
`visitor-sessions`, or `login-codes`, including its own rows.

`login-codes` is additionally `admin.hidden: true`. There is nothing actionable in it, and showing
it would suggest a code can be looked up and read out to someone on the phone — it cannot, since
only a keyed digest is stored.

`visitor-sessions` is visible but entirely read-only, so the owner can see that two devices are
signed in without being able to edit rows into an inconsistent state.

## Admin panel access

A `visitors` user must never reach `/admin`. `config.admin.user` remains `users`, and the tightened
`adminOnly` is what actually enforces it. This is asserted directly in
`tests/e2e/visitor-login.spec.ts` rather than assumed from configuration.

## Deleting an enquiry

Deleting the last enquiry attributed to an address deletes the identity, which ends its sessions and
also clears that address's outstanding codes, request counters, and block (FR-058). The owner is not
warned separately — the deletion confirmation is Payload's own — but the collection description notes
the relationship so the behaviour is discoverable before it surprises someone.

The counters go too so that a deleted address is genuinely indistinguishable from an unknown one
(SC-014). The side effect is that deleting an enquiry lifts a block, which is the single stated
exception to FR-057. It is not a support route — the enquiry is destroyed — but it is recorded in the
spec rather than left as a surprise.

**This cascade needs an owner in code.** It is described here and in
[data-model.md](../data-model.md) but no hook in the plan's source tree performs it; see
[plan.md](../plan.md).

## Verified by

Scenario E in [quickstart.md](../quickstart.md), which walks the owner path end to end: observe a
sign-in, revoke it, confirm the visitor is signed out on the next request, and confirm a blocked
address shows its lift time with no control to clear it.
