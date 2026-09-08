---
description: "Task list for Passwordless Email Login for Enquirers"
---

# Tasks: Passwordless Email Login for Enquirers

**Input**: Design documents from `/specs/002-passwordless-email-login/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. The plan names Vitest integration and Playwright e2e suites for this feature, [quickstart.md](./quickstart.md) defines seven validation scenarios, and Constitution VI requires the enquiry flow to be exercised end-to-end on every configured channel before merge. Tests here are therefore requirements, not an optional extra.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Path Conventions

Single project, extending the existing layout: `src/` and `tests/` at the repository root. Visitor auth code is grouped under `src/lib/auth/visitor/` so the boundary against owner auth is visible in the file tree.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, environment, and the single place every tuned figure lives

- [x] T001 Add `@payloadcms/email-nodemailer@3.88.0` to `package.json` (version-matched to the installed `payload@3.88.0`) and install
- [x] T002 [P] Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `PREVIEW_MAIL_RECIPIENT` to `.env.example`, with comments stating the tier precedence and that `PREVIEW_MAIL_RECIPIENT` is required in every non-production environment
- [x] T003 [P] Create `src/lib/auth/visitor/constants.ts` exporting every tuned figure from the spec's Assumptions in one object: code length 6, code TTL 10 min, session TTL 7 days, 3 requests per address per 15 min, 20 per origin per 60 min, 5 incorrect attempts, 15 min lockout, `CODE_REQUEST_FLOOR_MS` 800, retention 30 days. Tests import these rather than restating them

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The access boundary, schema, email adapter, and session/code/throttle primitives every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. T004 must land before T014 — see the note under it.

- [x] T004 Tighten `adminOnly` to `user?.collection === 'users'` and give `publishedOrAdmin` the same positive check in `src/lib/access.ts` (currently `Boolean(user)` at line 4 and line 12)
- [x] T005 [P] Add `tests/integration/access-boundary.test.ts` asserting `adminOnly` and `publishedOrAdmin` deny a user whose `collection` is `visitors`, still allow one whose collection is `users`, and still show only published documents to an anonymous reader
- [x] T006 [P] Create `src/lib/email/adapter.ts` with `buildEmailAdapter()`: precedence `RESEND_API_KEY` → `SMTP_HOST` → Ethereal by presence of the variable, empty string counting as absent, logging the chosen tier name once at startup
- [x] T007 [P] Create `src/lib/email/recipient-guard.ts` with `withRecipientGuard()`: pass through when `VERCEL_ENV === 'production'`, otherwise replace `to`, drop `cc`/`bcc`, prefix the subject with environment and original recipient, and throw when `PREVIEW_MAIL_RECIPIENT` is unset
- [x] T008 Wire `email: withRecipientGuard(buildEmailAdapter())` in `src/payload.config.ts`, replacing the current conditional that leaves `email` undefined and lets Payload install its console adapter
- [x] T009 [P] Add `tests/integration/email-adapter.test.ts` covering tier selection for all four variable combinations, the guard rewriting recipients, and the guard throwing when `PREVIEW_MAIL_RECIPIENT` is missing outside production
- [x] T010 [P] Create `src/collections/Visitors.ts` — `auth.disableLocalStrategy: true`, the custom strategy, `adminOnly` on all four operations, fields per [data-model.md](./data-model.md) including `email`, `firstSeenAt`, `lastSignedInAt`, `activeSessionCount`, `blockedUntil`, `revokeAllSessions`
- [x] T011 [P] Create `src/collections/VisitorSessions.ts` — one row per device, unique index on `tokenHash`, `expiresAt`, `revokedAt`, `endedReason` (`signed_out` | `revoked_by_owner` | `identity_removed`), read-only in the admin, no device or network field of any kind (FR-053)
- [x] T012 [P] Create `src/collections/LoginCodes.ts` — `admin.hidden: true`, `codeHash`, `expiresAt`, `consumedAt`, `supersededAt`, `attemptCount`, and no column that could hold a plaintext code (FR-012)
- [x] T013 Extend `src/collections/Enquiries.ts` with `submitterEmail` (indexed, nullable in the database so pre-existing rows stay unattributed), `ownerReply` textarea, `replyNotifiedAt`, and `delivery.visitorAck` / `delivery.replyNotice` using the existing `ChannelResult` shape
- [x] T014 Register `Visitors`, `VisitorSessions` and `LoginCodes` in `src/payload.config.ts`, keeping `admin.user` as `users`. **Do not merge this ahead of T004**: while `adminOnly` is still `Boolean(user)`, registering a second auth collection grants every visitor session full content access
- [x] T015 Create the migration in `migrations/` for the three collections, the four new `enquiries` fields, and the `login_throttle` table (primary key on `key`, index on `window_ends`), following the existing `<timestamp>_<name>.ts` convention
- [x] T016 [P] Create `src/lib/auth/visitor/cookie.ts` as the single source of truth for the visitor cookie: name `sansay_visitor_session` (never `payload-token`), `httpOnly`, `secure` in production, `sameSite: 'lax'` so an email link does not drop it, `maxAge` from T003
- [x] T017 Create `src/lib/auth/visitor/session.ts` with `mintSession` (32 random bytes, only `sha256` stored, increments `activeSessionCount`, sets `lastSignedInAt`), `resolveSession` (returns the visitor only when `revokedAt IS NULL AND expiresAt > now()`, and `null` indistinguishably otherwise), `revokeSession` (this row only), `revokeAllSessions` (every live row). No sliding window — sessions are never extended on use
- [x] T018 Create `src/lib/auth/visitor/strategy.ts` returning `{ user: { ...visitor, collection: 'visitors' } }` so access control can tell the two populations apart, performing exactly one indexed lookup on `tokenHash` and mutating nothing
- [x] T019 Create `src/lib/auth/visitor/throttle.ts` with `consumeRequestQuota`, `recordFailedAttempt`, `readBlockState` and `clearFailedAttempts` over `login_throttle` via `payload.db.drizzle`, using one atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` per call, fixed windows keyed by `window_ends`, addresses hashed with `sha256` before use as a key, and a deliberate catch returning `{ allowed: false, reason: 'unavailable' }` rather than a limit result (FR-063)
- [x] T020 [P] Add `tests/integration/throttle.test.ts` covering counter arithmetic, fixed-window rollover including the accepted boundary burst, lockout at the threshold, `clearFailedAttempts` on success, and that a thrown query yields `unavailable` and never `rate_limited`
- [x] T021 [P] Create `src/lib/auth/visitor/constant-time.ts` exporting `CODE_REQUEST_FLOOR_MS` re-exported from T003 and `padTo(startedAt, floorMs)`
- [x] T022 [P] Add every new string to `src/lib/copy/ru.ts` under a `login.*` / `status.*` namespace: the six refusal messages, `login.errorUnavailable`, `login.codeHelpNotArrived`, `login.changeAddress`, the pending label, the sign-out confirmation, the session-ended message, the empty state, the three visitor-facing enquiry statuses, and all three email subjects and bodies (Constitution V — email copy is copy)
- [x] T023 [P] Create `src/lib/validation/login.ts` with Zod schemas for the email input and the six-digit code input
- [x] T024 Make `submitterEmail` required in `src/lib/validation/enquiry.ts` and export the shared `normalizeEmail` (trim + lowercase) used by both the write path and the sign-in path so the two can never disagree (FR-003)
- [x] T025 [P] Extend `tests/integration/enquiry-schema.test.ts` for the now-required `submitterEmail`, and `tests/integration/copy.test.ts` so every key added in T022 is asserted present

**Checkpoint**: Access boundary tightened, schema migrated, email adapter guarded, and the session/code/throttle primitives exist. User stories can begin.

---

## Phase 3: User Story 1 - Sign in with a code sent to my email (Priority: P1) 🎯 MVP

**Goal**: A returning enquirer requests a code, receives it, enters it, and is signed in — and the page reveals nothing about which addresses exist.

**Independent Test**: Request a code for an address with an attributed enquiry, read the code from the delivered mail, enter it, and reach a signed-in state. Separately, request a code for an address with no enquiry and confirm the response is identical in wording, next step, and elapsed time, with no mail sent.

- [x] T026 [P] [US1] Create `src/lib/auth/visitor/codes.ts`: generate six digits with `crypto.randomInt(0, 1_000_000)` zero-padded, store `hmacSha256(code, PAYLOAD_SECRET)` only, `supersedeOutstanding`, `findUsable`, compare with `crypto.timingSafeEqual`, and consume with a conditional `UPDATE … WHERE consumed_at IS NULL` whose zero-rows-affected result means the caller must report `incorrect` (FR-008, D10)
- [x] T027 [P] [US1] Create `src/lib/delivery/visitor-mail.ts` with `sendLoginCode`, reading subject and body from the copy layer via `t()` and stating the 10-minute validity window in the body
- [x] T028 [US1] Create `src/actions/requestLoginCode.ts` implementing the ten-step order in [contracts/login-code.md](./contracts/login-code.md): start the clock, validate shape, check the lockout, throttle origin then address, resolve the visitor, treat an unattributed address as unknown, create the identity lazily, supersede outstanding codes, issue and **await** the send, then pad to the floor. Every terminal path except `invalid_email` goes through `padTo`
- [x] T029 [US1] Create `src/actions/verifyLoginCode.ts`: lockout check before any code lookup, unknown address returns `incorrect`, find the usable code, timing-safe compare, consume atomically before minting the session, clear the failure counter, set the cookie, and let the caller `redirect('/status')` outside any try/catch
- [x] T030 [P] [US1] Add `tests/integration/login-codes.test.ts`: reuse refused, expiry refused, supersede refused, cross-address refused, lockout after the threshold, no plaintext code in any column, and two concurrent submissions of one valid code yielding exactly one session
- [x] T031 [US1] Create `src/components/LoginCodeForm.tsx` as a two-step `useActionState` form mapping each `reason` to a copy key, with the submit control disabled while `isPending` and a visible in-progress state (FR-061), a "request a new code" control on every refusal path, a "change the address" route back to step one (FR-062), and standing help text for a code that never arrived (FR-011a)
- [x] T032 [US1] Create `src/app/(frontend)/status/layout.tsx` carrying `metadata.robots = { index: false, follow: false }` and `export const dynamic = 'force-dynamic'` for the whole namespace, and **no** session gate — the sign-in page lives under `/status` and a gate here would redirect it to itself
- [x] T033 [US1] Create `src/app/(frontend)/status/(protected)/layout.tsx` as the session gate for signed-in pages only: resolve the cookie, and on `null` redirect to `/status/sign-in?ended=1` outside any try/catch. Child pages must not define a partial `robots` object, since nested metadata is overwritten rather than merged
- [x] T034 [US1] Create `src/app/(frontend)/status/sign-in/page.tsx` rendering `LoginCodeForm`, reading `?ended=1` and `?signedout=1` to show the session-ended and signed-out messages respectively (FR-024, FR-025)
- [x] T035 [US1] Create `src/app/(frontend)/status/(protected)/page.tsx` as the signed-in landing that confirms a session was established — User Story 2 replaces its body with the real enquiry list
- [x] T036 [US1] Add `/status/` to the disallow list in `src/app/robots.ts` and confirm nothing under it reaches `src/app/(frontend)/sitemap.ts` (FR-042)
- [x] T037 [P] [US1] Add `tests/e2e/visitor-login.spec.ts` covering the happy path end to end, and the known-versus-unknown address comparison asserting identical wording, identical next screen, and elapsed times that agree within the padding jitter (SC-002). Add the new routes to `tests/e2e/helpers/paths.ts`

**Checkpoint**: A returning enquirer can sign in. The page cannot be used to discover who has contacted the owner.

---

## Phase 4: User Story 2 - See the status and any reply for my own enquiries (Priority: P2)

**Goal**: A signed-in visitor reads their own enquiries — content, date, status, and the owner's reply — sees nobody else's, and can sign out.

**Independent Test**: Sign in as a visitor with two enquiries and confirm both appear with content, date, status and reply. Then put a known identifier belonging to someone else's enquiry in the URL and confirm the refusal is identical to one for an identifier that does not exist.

- [x] T038 [P] [US2] Create `src/lib/data/visitor-enquiries.ts` with `listEnquiriesFor(email)` and `getEnquiryFor(email, id)`, both using `overrideAccess: true` **and** an explicit `submitterEmail` filter inside the query, with the email always taken from the resolved session and never from a parameter, query string, or form field
- [x] T039 [P] [US2] Define the `VisitorEnquiry` projection type in `src/lib/data/visitor-enquiries.ts` exposing only discipline, job description, desired date, submitted date, status and `ownerReply` — never `delivery`, `deliveryFailed`, `submitterEmail`, or any internal field (FR-028)
- [x] T040 [P] [US2] Create `src/components/VisitorEnquiryList.tsx` rendering most recent first, with the self-explaining empty state that says only enquiries sent with an email address appear here and links to the enquiry form (FR-030)
- [x] T041 [US2] Replace the body of `src/app/(frontend)/status/(protected)/page.tsx` with the real list, mapping each internal status to its visitor-facing wording from the copy layer
- [x] T042 [US2] Create `src/app/(frontend)/status/(protected)/enquiry/[id]/page.tsx` calling `getEnquiryFor`, rendering not-found for a `null` result so a foreign identifier and a nonexistent one are indistinguishable (FR-029)
- [x] T043 [P] [US2] Create `src/actions/signOutVisitor.ts` revoking that one session row with `endedReason: 'signed_out'`, deleting the cookie, and redirecting to `/status/sign-in?signedout=1` — never `?ended=1`
- [x] T044 [P] [US2] Create `src/components/SignOutButton.tsx` and place it in `src/app/(frontend)/status/(protected)/layout.tsx` so it is visible on every signed-in page (FR-024)
- [x] T045 [US2] Render the owner reply read-only in `src/app/(frontend)/status/(protected)/enquiry/[id]/page.tsx`, with no control to answer it, add to it, or start an exchange from it, and no reply shown at all when none has been written (FR-032, FR-033)
- [x] T046 [P] [US2] Extend `tests/e2e/visitor-login.spec.ts` with the ownership cases: two enquiries both listed, a third visitor's identifier in the URL refused identically to a nonexistent one, the empty state for an address with no attributed enquiry, and sign-out requiring a new code afterwards
- [x] T047 [P] [US2] Add `tests/integration/visitor-enquiries.test.ts` asserting the ownership filter is inside the query, that the projection omits `delivery` and `submitterEmail`, and that a non-matching id returns `null` rather than a document

**Checkpoint**: A visitor sees exactly their own enquiries, and URL tampering reveals nothing.

---

## Phase 5: User Story 3 - Codes and requests resist reuse, guessing, and flooding (Priority: P3)

**Goal**: Reuse, expiry, supersession, flooding and guessing are all refused with the specified message, and an honest visitor who hits a limit is told what happened and when they can try again.

**Independent Test**: Against the sign-in flow alone — replay a used code, use an expired one, use a superseded one, exceed the per-address and per-origin request limits, and submit repeated wrong codes — confirming each refusal and its message.

**Note**: T048–T050 modify files created in Phase 3. Sequence this story after US1 rather than alongside it.

- [x] T048 [US3] Wire `recordFailedAttempt` into the mismatch path of `src/actions/verifyLoginCode.ts` and `clearFailedAttempts` into the success path, keying the counter by address so it survives a code being superseded — otherwise the lockout is bypassed by requesting another code
- [x] T049 [US3] Add the lockout check to the request path in `src/actions/requestLoginCode.ts` so a blocked address is refused before any counting or sending (FR-018), and confirm its message is identical for known and unknown addresses (FR-021)
- [x] T050 [US3] Render `rate_limited`, `locked_out` and `unavailable` in `src/components/LoginCodeForm.tsx`, interpolating `retryAfterSeconds` as a duration rather than a clock time (FR-019, FR-020), and never showing a limit message for `unavailable`
- [x] T051 [P] [US3] Add the refusal matrix to `tests/integration/login-codes.test.ts`: used, expired, superseded, and cross-address codes each refused with the expected reason, and used-versus-superseded indistinguishable from `incorrect`
- [x] T052 [P] [US3] Add per-address and per-origin limit cases to `tests/integration/throttle.test.ts`, asserting the limit message is byte-identical for a known and an unknown address
- [x] T053 [P] [US3] Add `tests/e2e/visitor-login-limits.spec.ts` walking the visitor-visible side: expired code offers a new one on the same screen, repeated wrong codes produce the block with its wait, and exceeding the request limit produces the limit message with its wait
- [x] T054 [US3] Confirm origin identification in `src/lib/auth/visitor/throttle.ts` takes the **first** `x-forwarded-for` entry (`NextRequest.ip` was removed in Next 15) and that a missing header collapses to one conservative shared bucket
- [x] T055 [P] [US3] Assert in `tests/integration/login-codes.test.ts` that a code is never written, logged, or returned in plaintext anywhere, including error paths and the `attemptCount` update (FR-012)
- [x] T056 [US3] Verify every terminal path in `requestLoginCode` passes through `padTo`, adding a test in `tests/integration/login-codes.test.ts` that fails if a new early return skips the floor

**Checkpoint**: The sign-in flow holds up against reuse, guessing and flooding, and says so clearly.

---

## Phase 6: User Story 4 - Owner reviews and revokes visitor sign-ins (Priority: P4)

**Goal**: The owner sees which addresses signed in and when, how many sessions each holds, whether an address is blocked, and can end a visitor's access in one action.

**Independent Test**: Sign in as a visitor on two devices, confirm the address, sign-in time and session count appear in the admin, revoke there, and confirm both devices need a new code.

- [x] T057 [US4] Configure the `visitors` list view in `src/collections/Visitors.ts` with columns `email`, `lastSignedInAt`, `activeSessionCount`, `blockedUntil` — the stock list view *is* the sign-in activity screen, so no custom admin component is built (Constitution III)
- [x] T058 [US4] Add the `revokeAllSessions` checkbox to `src/collections/Visitors.ts` with a `beforeChange` hook that revokes every live session for that visitor with `endedReason: 'revoked_by_owner'` and resets itself to `false`, with a Russian label and a description stating the effect is immediate and covers all devices
- [x] T059 [US4] Maintain `activeSessionCount` on session create, revoke and expiry in `src/lib/auth/visitor/session.ts`, and never read it for an authorization decision — the live definition is evaluated fresh per request
- [x] T060 [US4] Mirror `blockedUntil` from `login_throttle` onto the visitor row in `src/lib/auth/visitor/throttle.ts` and surface it in `src/collections/Visitors.ts` for display only — labelled as the last known state rather than live truth, refreshed by the purge job, and never consulted for authorization (FR-055, FR-057)
- [x] T061 [P] [US4] Confirm `admin.hidden: true` in `src/collections/LoginCodes.ts` and that `src/collections/VisitorSessions.ts` is visible but entirely read-only, so the owner can see that two devices are signed in without editing rows into an inconsistent state
- [x] T062 [P] [US4] Add the owner path to `tests/e2e/visitor-login.spec.ts`: observe a sign-in, revoke it, confirm the visitor is signed out on the next request on both devices, and confirm a blocked address shows its lift time with no control to clear it
- [x] T063 [P] [US4] Assert in `tests/e2e/visitor-login.spec.ts` that a visitor session cannot read `/api/enquiries`, cannot read unpublished `/api/disciplines`, and cannot reach `/admin` (FR-036, FR-037, SC-008)
- [x] T064 [P] [US4] Assert in `tests/e2e/visitor-login.spec.ts` that an admin session grants no visitor access: the owner must sign in through the visitor flow like anyone else, and no impersonation or "view as" path exists anywhere in `src/` (FR-038)

**Checkpoint**: The owner has oversight and a working safety valve, with no bespoke admin code to maintain.

---

## Phase 7: Retention & Data Lifecycle (FR-058 to FR-060)

**Purpose**: The identity cascade and the automatic purge. Neither is polish — FR-058, FR-059, SC-014 and SC-015 have no other mechanism behind them.

- [x] T065 Create `src/hooks/cascadeVisitorIdentity.ts` as an `afterDelete` hook on `enquiries`: when no other enquiry shares the deleted row's `submitterEmail`, mark that identity's live sessions `identity_removed`, delete the `visitors` row so sessions and codes cascade, and delete that address's `addr:` and `fail:` rows from `login_throttle` (FR-058). Register it in `src/collections/Enquiries.ts`
- [x] T066 Create the purge endpoint at `src/app/(payload)/api/cron/purge-visitor-data/route.ts`, deleting `login-codes` and `visitor-sessions` finished more than 30 days ago and `login_throttle` rows whose window ended more than a day ago, recomputing `activeSessionCount` while it runs, and refusing any caller that is not the platform's cron
- [x] T067 Create `vercel.json` with a daily cron entry for the purge route. The file does not exist yet, and FR-059 and SC-015 depend entirely on it
- [x] T068 Make a failed or unscheduled purge run detectable rather than silent in `src/app/(payload)/api/cron/purge-visitor-data/route.ts` — log a structured success line with the row counts it deleted, and log an error the platform surfaces on failure (FR-060). Nothing a visitor or the owner can see would otherwise reveal that retention had stopped working
- [x] T069 [P] Add `tests/integration/retention.test.ts`: deleting the last attributed enquiry removes the identity, its sessions, its codes **and its block**, so the address behaves indistinguishably from one never seen (SC-014); deleting one of several enquiries sharing an address changes nothing; and the purge deletes only rows past their window
- [x] T070 [P] Add a case to `tests/e2e/visitor-login.spec.ts` where the owner deletes the last enquiry while that visitor is signed in, and the visitor's next action lands on the sign-in page with the session-ended message rather than an error (FR-025, FR-058)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T071 Add the visitor acknowledgement to `src/hooks/notifyOnEnquiry.ts`, started in the same `Promise.allSettled` as `dispatchEnquiry` so it adds no latency, recorded at `delivery.visitorAck`, never setting `deliveryFailed`, never throwing out of the hook, and reusing the existing `context: { skipNotify: true }` guard on the write-back
- [x] T072 Create `src/hooks/notifyOnReply.ts`
- [x] T073 Add `sendVisitorAck` and `sendReplyNotice` to `src/lib/delivery/visitor-mail.ts`, neither carrying the reply text, a code, or any link that signs the visitor in without one (FR-046, FR-050)
- [x] T074 Add the required email field to `src/components/EnquiryForm.tsx` and the sign-in link to the on-screen confirmation (FR-002, FR-045), leaving the existing free-text "how to contact me" field in place and unused for attribution
- [x] T075 Make the admin show plainly that a reply on an enquiry with no `submitterEmail` reaches nobody, in `src/collections/Enquiries.ts`, so the owner is not left believing the submitter was told
- [x] T076 [P] Extend `tests/e2e/enquiry.spec.ts` for the now-required email field, and add the acknowledgement to the delivery assertions
- [ ] T077 [P] Verify FR-043 on `/status/**`: WCAG 2.2 AA, keyboard-only completion of the whole flow, and a code field with numeric keypad, paste, and one-time-code autofill on a phone-sized viewport — extend `tests/e2e/mobile.spec.ts` and `tests/e2e/responsive.spec.ts`
- [ ] T078 Run every scenario in [quickstart.md](./quickstart.md), including Scenario G's end-to-end exercise of all configured delivery channels, which Constitution VI requires before this may merge
- [ ] T079 Measure real Resend latency and tune `CODE_REQUEST_FLOOR_MS` in `src/lib/auth/visitor/constants.ts` once. The floor must exceed a normal send, since a send that overruns it re-opens the timing difference FR-006 closes — the one place this feature depends on a measurement rather than a decision
- [ ] T080 Get the three visitor-facing status strings from the owner and put them in `src/lib/copy/ru.ts` (T022 lands them as placeholders); confirm no literal user-facing string was introduced anywhere in this feature, email subjects and bodies included (Constitution V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — blocks every user story. Within it, **T004 blocks T014**
- **US1 (Phase 3)**: depends on Phase 2. Nothing depends on another story
- **US2 (Phase 4)**: depends on Phase 2; needs US1's session gate (T033) to have a session to scope by
- **US3 (Phase 5)**: depends on US1, because T048–T050 modify files US1 creates
- **US4 (Phase 6)**: depends on Phase 2; independent of US2 and US3
- **Retention (Phase 7)**: depends on Phase 2; T070 also needs US2
- **Polish (Phase 8)**: T071–T076 depend on Phase 2; the rest depend on the stories they verify

### User Story Dependencies

- **US1 (P1)**: independent — the MVP
- **US2 (P2)**: needs a session to exist, so in practice follows US1
- **US3 (P3)**: hardens US1's two actions; must follow US1 rather than run beside it
- **US4 (P4)**: independent of US2 and US3; can be built in parallel with either

### Parallel Opportunities

- T002 and T003 in Setup
- In Phase 2: the two email tasks (T006, T007), the three collections (T010–T012), and the leaf modules (T016, T021, T022, T023) — but T004 first and T014 after it
- All four integration test tasks in Phase 2 (T005, T009, T020, T025)
- In US1: T026 and T027, then T030 and T037
- In US2: T038, T039, T040, T043, T044 touch different files
- US4 and US2 can proceed simultaneously with two people

## Parallel Example: Phase 2 collections

```bash
Task: "Create src/collections/Visitors.ts"
Task: "Create src/collections/VisitorSessions.ts"
Task: "Create src/collections/LoginCodes.ts"
# then, sequentially: T013 (Enquiries), T014 (register — only after T004), T015 (migration)
```

## Parallel Example: User Story 1

```bash
Task: "Create src/lib/auth/visitor/codes.ts"
Task: "Create src/lib/delivery/visitor-mail.ts"
# then the two Server Actions, which both depend on codes.ts
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup
2. Phase 2 Foundational — **T004 before T014**, without exception
3. Phase 3 US1
4. **Stop and validate**: a returning enquirer signs in; an unknown address is indistinguishable
5. Demo-able, but see the shipping gate below

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → sign-in works → validate
3. US3 → sign-in is trustworthy → **this is the real shipping gate**; the spec states the feature is not shippable without it
4. US2 → the visitor gets something worth signing in for
5. US4 → the owner gets oversight
6. Phase 7 → retention holds
7. Phase 8 → the enquiry path, accessibility, and copy

### Parallel Team Strategy

Two people after Phase 2: one takes US1 then US3 (the whole authentication path, kept in one head), the other takes US4 then Phase 7, joining on US2 once the session gate from T033 exists.

---

## Notes

- `[P]` means different files and no dependency on incomplete work
- **T004 is the single most security-critical task in the feature** and it is one line in a shared helper. Every collection already routes through `adminOnly`, which is why tightening it in one place covers all of them — and why no new inline access function may bypass it
- The `(protected)` route group in T033 exists because the sign-in page lives under `/status`; a session gate on `status/layout.tsx` would redirect the sign-in page to itself
- Two deliverables here were absent from the plan until the requirements review: the identity cascade (T065) and the purge cron (T067). Both are load-bearing for stated success criteria
- Tests are part of the work, not a follow-up phase — Constitution VI blocks merge on end-to-end channel verification (T078)
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own
