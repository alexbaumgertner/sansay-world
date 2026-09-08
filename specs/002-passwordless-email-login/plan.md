# Implementation Plan: Passwordless Email Login for Enquirers

**Branch**: `002-passwordless-email-login` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-passwordless-email-login/spec.md`

## Summary

A person who submitted an enquiry can sign in with a one-time numeric code emailed to them, and
see only their own enquiries — what they sent, its status, and the owner's reply. No passwords, no
registration. The owner sees sign-in activity in the admin and can end a visitor's access.

The approach reuses the existing Payload 3.88 + Next 16 application. Three pieces carry the design:

1. **A second auth-enabled Payload collection** (`visitors`) with `auth.disableLocalStrategy: true`
   and a custom auth strategy, so there is no password path at all and no way for a visitor
   credential to be mistaken for an owner credential. It gets **its own cookie name** — Payload's
   `cookiePrefix` is global, so leaving both collections on `payload-token` would make a visitor
   sign-in silently clobber the owner's admin session.
2. **Server-side-only code and session state**: codes stored as HMAC digests keyed by
   `PAYLOAD_SECRET` (never the code), sessions as opaque random tokens stored hashed in a
   `visitor-sessions` collection, one row per device. Single-use, expiry, and revocation are all
   decided by a database read on every request, never by the client and never by JWT expiry alone.
3. **A three-tier email adapter** (Resend → SMTP → Ethereal, by env-var precedence) that serves
   both the existing enquiry notifications and the new login codes, plus a hard non-production
   recipient guard so a preview deployment can never email a real client.

Rate limiting uses atomic Postgres counters rather than in-process memory, because a per-instance
counter is worthless on Vercel's serverless runtime. Cost is stated in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js (Vercel serverless functions)

**Primary Dependencies**: Next.js 16.3.4 (App Router), React 19.2.8, Payload CMS 3.88.0,
`@payloadcms/db-postgres` 3.88.0, `@payloadcms/email-resend` 3.88.0, Zod 4.5.4.
**To add**: `@payloadcms/email-nodemailer@3.88.0` (verified published, version-matched to the
installed Payload) for the SMTP and Ethereal tiers.

**Storage**: PostgreSQL via Payload's Postgres adapter, `idType: 'uuid'`. Three new collections
plus two new fields on `enquiries`. One raw-SQL table for throttle counters, reached through
`payload.db.drizzle`.

**Testing**: Vitest for unit/integration (`tests/integration/`), Playwright for end-to-end
(`tests/e2e/`). Both already configured and in use.

**Target Platform**: Vercel (production + preview deployments), local development via `next dev`.

**Project Type**: Server-rendered web application, single project.

**Performance Goals**: Code request completes within a deliberate constant-time budget of ~800ms
(see the timing decision below); enquiry-status pages render per request with no caching.

**Constraints**:

- **Serverless statelessness** — no in-memory counters, no module-scope mutable state that must
  survive a request. Everything durable lives in Postgres.
- **Constant-time code request** — FR-006 (identical response for unknown addresses) and FR-011
  (tell the visitor when delivery failed) pull in opposite directions, because only a known address
  triggers a send. Both are satisfied by sending synchronously and padding every code request,
  known or unknown, to a fixed elapsed-time floor.
- **Cookie separation** — the visitor session cookie must not be `payload-token`.
- **No content access** — a visitor session must grant zero read or write on any content collection.

**Scale/Scope**: A solo practitioner's portfolio. Tens of enquiries per month, a handful of
sign-ins per day at most. This smallness is what makes Postgres-backed rate limiting the right
call instead of a dedicated store.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | How this feature satisfies it |
|---|---|---|
| **I. Content Over Interface** | PASS (justified) | A login is interface, so it needs a defence. It is traceable to the enquiry goal: it closes the loop on an enquiry the site already captured, letting a prospective client see that they were heard. The guard against it becoming chrome is FR-048 — no navigation entry — so the login is invisible to the majority of visitors who have no account. |
| **II. Extensible By Discipline** | PASS | No discipline is named anywhere in this feature. The status view renders a discipline through the existing `enquiries.discipline` relationship, so adding a discipline needs no change here. |
| **III. No-Developer Content Operations** | PASS (one noted trade-off) | Everything the owner operates — reading sign-in activity, revoking access, writing a reply — is a Payload admin surface with no deploy. Revocation is a checkbox, not a custom React control, precisely so it needs no developer. **Trade-off**: switching email tiers is an environment-variable change, which on Vercel applies on next deploy. This is the same trade-off already recorded for the Telegram channel in spec 001 and is not a regression. |
| **IV. One Visual Language** | PASS | New pages use existing theme tokens and the established typefaces. No new accent colour. Status wording is text, not a new colour-coded system. |
| **V. Localized Copy, Not Hardcoded Strings** | PASS | Every new string — including the three email bodies — is added to `src/lib/copy/ru.ts` and read via `t()`. Email subjects and bodies are copy, and are treated as such. |
| **VI. Redundant Enquiry Delivery** | PASS (needs care) | This feature adds two new outbound emails on the enquiry path, which must not weaken the owner's two-channel guarantee. The acknowledgement to the visitor is dispatched **separately** from the owner fan-out and its failure is recorded, never propagated (FR-047). The constitution's rule that enquiry-flow changes are verified end-to-end on every configured channel before shipping is carried into [quickstart.md](./quickstart.md) as a mandatory scenario. |

No principle requires an amendment. No entries in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-passwordless-email-login/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions, alternatives, the four asked questions
├── data-model.md        # Phase 1 output — collections, fields, indexes, state transitions
├── quickstart.md        # Phase 1 output — runnable validation scenarios
├── contracts/           # Phase 1 output
│   ├── email-adapter.md         # three-tier selection + non-production recipient guard
│   ├── visitor-auth.md          # collection, strategy, cookie, session lifecycle
│   ├── login-code.md            # issue / verify / invalidate, hashing, constant-time response
│   ├── rate-limiting.md         # atomic Postgres counters, the three limits, messages
│   ├── enquiry-attribution.md   # required email field, acknowledgement, reply notice
│   └── owner-admin.md           # sign-in activity view, revocation, block visibility
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing 16/16)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── collections/
│   ├── Enquiries.ts               # MODIFY — submitterEmail, ownerReply, ack/notice delivery
│   ├── Visitors.ts                # NEW — auth collection, disableLocalStrategy, revokeAll
│   ├── VisitorSessions.ts         # NEW — one row per device, revocable
│   └── LoginCodes.ts              # NEW — HMAC digest, expiry, single-use, attempt counter
├── lib/
│   ├── auth/visitor/
│   │   ├── strategy.ts            # NEW — custom Payload AuthStrategy, reads our cookie
│   │   ├── cookie.ts              # NEW — cookie name + options, single source of truth
│   │   ├── session.ts             # NEW — mint / resolve / revoke session tokens
│   │   ├── codes.ts               # NEW — generate, HMAC, verify, supersede
│   │   ├── throttle.ts            # NEW — atomic Postgres counters (raw SQL)
│   │   └── constant-time.ts       # NEW — fixed elapsed-time floor for code requests
│   ├── email/
│   │   ├── adapter.ts             # NEW — three-tier selection (Resend / SMTP / Ethereal)
│   │   └── recipient-guard.ts     # NEW — rewrite recipients when VERCEL_ENV !== 'production'
│   ├── delivery/
│   │   ├── email.ts               # UNCHANGED — owner notification
│   │   ├── dispatch.ts            # UNCHANGED — owner fan-out, allSettled
│   │   └── visitor-mail.ts        # NEW — acknowledgement, code, reply notice
│   ├── validation/
│   │   ├── enquiry.ts             # MODIFY — add required submitterEmail
│   │   └── login.ts               # NEW — email + code input schemas
│   ├── data/visitor-enquiries.ts  # NEW — ownership-scoped reads
│   ├── access.ts                  # MODIFY — adminOnly must check collection, not truthiness
│   └── copy/ru.ts                 # MODIFY — all new UI + email copy
├── actions/
│   ├── submitEnquiry.ts           # MODIFY — accept + store submitterEmail, trigger ack
│   ├── requestLoginCode.ts        # NEW
│   ├── verifyLoginCode.ts         # NEW
│   └── signOutVisitor.ts          # NEW
├── hooks/
│   ├── notifyOnEnquiry.ts         # MODIFY — dispatch visitor ack alongside the owner fan-out
│   ├── notifyOnReply.ts           # NEW — notify on first reply; reset the guard when cleared
│   └── cascadeVisitorIdentity.ts  # NEW — afterDelete on enquiries: FR-058 identity cascade
├── components/
│   ├── EnquiryForm.tsx            # MODIFY — required email field
│   ├── LoginCodeForm.tsx          # NEW — two-step form via useActionState
│   ├── VisitorEnquiryList.tsx     # NEW
│   └── SignOutButton.tsx          # NEW
├── app/
│   ├── robots.ts                  # MODIFY — disallow /status/
│   └── (frontend)/status/
│       ├── layout.tsx             # NEW — noindex metadata, session resolution
│       ├── page.tsx               # NEW — enquiry list (auth required)
│       ├── sign-in/page.tsx       # NEW — request + enter code
│       └── enquiry/[id]/page.tsx  # NEW — detail (auth required)
└── payload.config.ts              # MODIFY — register collections, swap in email adapter

migrations/
└── <timestamp>_visitor_login.ts   # NEW — three collections, two enquiry fields, throttle table

vercel.json                        # MODIFY — daily cron for the purge job (FR-059, FR-060, SC-015)

tests/
├── integration/
│   ├── login-codes.test.ts        # NEW — hashing, single-use, expiry, supersede
│   ├── throttle.test.ts           # NEW — counter arithmetic and windows
│   ├── email-adapter.test.ts      # NEW — tier selection + recipient guard
│   └── enquiry-schema.test.ts     # MODIFY — required email
└── e2e/
    ├── visitor-login.spec.ts      # NEW — sign in, scoping, IDOR, sign out
    └── enquiry.spec.ts            # MODIFY — email field on the form
```

**Structure Decision**: Single project, extending the existing layout. No new top-level
directories. Visitor auth code is grouped under `src/lib/auth/visitor/` so that the boundary
against owner/admin auth is visible in the file tree, not just in access-control functions —
which is the same reason the spec asked for a separate collection.

Routes live under one `/status` namespace so they cannot collide with the owner-editable
`/[slug]` catch-all that serves CMS pages, and so a single `layout.tsx` can apply
`robots: { index: false }` and session resolution to all of them at once.

## Key design decisions

Full reasoning and rejected alternatives are in [research.md](./research.md). The load-bearing
ones:

| # | Decision | Why it matters here |
|---|---|---|
| D1 | Three-tier email adapter via `@payloadcms/email-nodemailer`, selected by `RESEND_API_KEY` → `SMTP_HOST` → Ethereal | Ports the requested structure onto Payload's own adapters instead of hand-rolling one. Replaces Payload's current silent fallback to a console adapter. |
| D2 | Non-production recipient guard: when `VERCEL_ENV !== 'production'`, every recipient is rewritten to one owner test mailbox | Answers the Ethereal-on-preview question. Previews send real, readable mail but can never reach a client, even against a production database. |
| D3 | `visitors` auth collection with `disableLocalStrategy: true` + custom `AuthStrategy` | No password field exists to attack, and the two access levels are separate collections as required. |
| D4 | Visitor session uses its own cookie name, not `payload-token` | Payload's `cookiePrefix` is global config; sharing it would mean a visitor sign-in logs the owner out of the admin, contradicting the spec's own edge case. |
| D5 | Opaque random session token, stored as a SHA-256 digest in `visitor-sessions`, one row per device | Gives per-device sessions (FR-054), instant owner revocation checked per request (FR-035), and session counts for the admin (FR-034) — none of which a self-contained JWT can do. |
| D6 | Codes stored as HMAC-SHA256 keyed with `PAYLOAD_SECRET`, never plaintext | A 6-digit code has only a million possibilities; a plain unkeyed digest would be trivially reversible from a database dump. The key turns that into a non-attack. |
| D7 | Rate limits as atomic Postgres counters (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) | Survives cold starts and works across concurrent instances. Cost stated in research. |
| D8 | Constant-time floor on every code request | The only way to honour FR-006 and FR-011 together. |
| D9 | `adminOnly` changes from `Boolean(user)` to `user?.collection === 'users'` | Verified in `src/lib/access.ts:4`. The moment a second auth collection exists, truthiness grants every visitor full content access. `publishedOrAdmin` has the same flaw at line 12. This is the single most security-critical edit in the feature, and it is one line in a shared helper that every collection already routes through. **Sequencing: this lands before `visitors` is registered, not after.** |
| D10 | Code consumption is a conditional `UPDATE … WHERE consumed_at IS NULL`, and zero rows affected means `incorrect` | FR-008's "usable exactly once" must not depend on request timing. Read-then-write as two statements lets two simultaneous submissions of one valid code both mint a session. |
| D11 | The incorrect-attempt block is checked on the request path as well as the entry path | Otherwise a blocked visitor keeps receiving codes that cannot work and spends their FR-019 allowance while waiting out a block they have not been told about. |
| D12 | A throttle read that throws returns its own `unavailable` reason, never `rate_limited` | Failing closed is right; telling the visitor they made too many requests when the counter query broke is false and points them at a wait that never ends (FR-063). |
| D13 | The identity cascade also deletes that address's `addr:` and `fail:` counters | A block outliving a deleted identity is a residual signal and contradicts SC-014. The accepted side effect — deleting an enquiry lifts a block — is now the one stated exception to FR-057. |

## Phase 0 — Research

Complete. See [research.md](./research.md), which records eight decisions with alternatives, the
Next 16 and Payload 3.88 API findings that constrain the design, direct answers to the two
questions asked in the planning request (serverless rate limiting with its cost; Ethereal's
viability on preview deployments), and one unresolved external dependency.

No `NEEDS CLARIFICATION` markers remain in Technical Context.

## Phase 1 — Design & Contracts

Complete. Artifacts:

- [data-model.md](./data-model.md) — three new collections, the two new `enquiries` fields, the
  throttle table, every index, and the state transitions for a code and a session.
- [contracts/](./contracts/) — six contracts, listed in the documentation tree above.
- [quickstart.md](./quickstart.md) — runnable validation scenarios, including the constitution's
  mandatory end-to-end check on every configured delivery channel.

### Post-design Constitution re-check

Re-evaluated against the finished design: all six principles still PASS. Two points were tightened
by the design work rather than left to implementation:

- **Principle V** — the three email bodies (code, acknowledgement, reply notice) are copy and are
  specified to live in `src/lib/copy/ru.ts`, not inside the delivery modules. Without stating this,
  email templates are the most likely place for hardcoded Russian strings to reappear.
- **Principle VI** — the visitor acknowledgement is explicitly excluded from the owner's
  two-channel delivery accounting, so adding it can neither satisfy nor break that guarantee.
  `quickstart.md` Scenario G exists to enforce the pre-merge verification rule.

## Requirements review pass (2026-09-08)

Four requirements-quality checklists in [checklists/](./checklists/) were generated against this
plan and its contracts. They found 21 places where the plan or a contract had decided something no
requirement covered. Eight went back to the owner; the answers are recorded in the spec's
Clarifications and the resulting requirements are FR-011a, FR-061, FR-062, FR-063 plus amendments to
FR-008, FR-011, FR-014, FR-018 to FR-021, FR-024, FR-043, FR-051, FR-057 to FR-060, SC-002, SC-014
and SC-015.

Two findings were gaps in this plan rather than in the spec, and both are now fixed above:

1. **The FR-058 cascade had no owning file.** `data-model.md` specified the identity cascade and
   `owner-admin.md` referred to it, but the source tree listed no hook that performs it — so FR-058
   and SC-014 had no implementation. Now `src/hooks/cascadeVisitorIdentity.ts`.
2. **The purge job was a to-do, not a deliverable.** `research.md` listed the Vercel Cron entry as
   an open item while FR-059 and SC-015 depended on it entirely. Now an explicit `vercel.json`
   change, and FR-060 requires its failure to be detectable rather than silent.

One sequencing risk is worth repeating because it is a one-line edit in shared code that predates
this feature: **D9 must land before `visitors` is registered.** `src/lib/access.ts:4` is still
`Boolean(user)` today, and `publishedOrAdmin` at line 12 has the same shape. Registering the second
auth collection first would, for the duration, grant every visitor session full content access.

Six decisions were confirmed as designed and are now written into the spec rather than living only
here: the fixed rate-limit windows (forced by FR-056, since a rolling window requires the per-attempt
history FR-056 forbids), the 800ms uniform-response floor and the tolerance SC-002 is measured
against, origin identification from the first `x-forwarded-for` entry, the `blockedUntil` mirror
being informational only, no escalation on repeated delivery failures, and the last-sign-in timestamp
living with the identity rather than ageing out at 30 days.
