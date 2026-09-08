# Quickstart: Validating passwordless email login

Runnable scenarios that prove the feature works end to end. Each states its prerequisites, the
commands to run, and what must be true afterwards. Detail lives in [contracts/](./contracts/) and
[data-model.md](./data-model.md) rather than being repeated here.

Scenario G is **mandatory before merge** — it is the constitution's rule that any change touching
the enquiry flow is verified on every configured delivery channel.

## Prerequisites

```bash
pnpm install                      # picks up @payloadcms/email-nodemailer
cp .env.example .env              # then fill in the values below
docker compose up -d              # local Postgres on 5433, if not already running
pnpm payload migrate              # applies the visitor-login migration
pnpm dev
```

Required in `.env` for local work — deliberately leave **both** `RESEND_API_KEY` and `SMTP_HOST`
empty so Tier 3 (Ethereal) is selected:

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5433/sansay
PAYLOAD_SECRET=<long random string>     # also the HMAC key for login codes
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
RESEND_API_KEY=
SMTP_HOST=
PREVIEW_MAIL_RECIPIENT=you@example.com  # required whenever VERCEL_ENV !== 'production'
```

Changing `PAYLOAD_SECRET` invalidates every outstanding login code, since it keys the HMAC. That is
correct behaviour, not a bug — but it will look like one during a rotation.

## Scenario A — The email tier is the one you think it is

**Proves**: tier selection (FR-010), and that local development actually sends something readable.

1. Start the dev server with both variables empty. The startup log must name the Ethereal tier.
2. Submit an enquiry at `/` with a real-looking address in the new email field.
3. The server log must print an Ethereal preview URL for **two** messages: the owner notification
   and the visitor acknowledgement.
4. Open both. The acknowledgement must contain a working link to `/status/sign-in`.

Then confirm precedence without restarting into a real provider:

```bash
pnpm test tests/integration/email-adapter.test.ts
```

Must assert all four combinations (Resend wins over SMTP; SMTP when only it is set; Ethereal when
neither; Resend when both) and that the recipient guard rewrites `to` and **throws** when
`PREVIEW_MAIL_RECIPIENT` is missing outside production.

**Fails if**: the log shows Payload's console adapter — that means `config.email` is still being
left undefined and mail is being silently swallowed.

## Scenario B — Signing in

**Proves**: US1, FR-005 to FR-008, FR-012 to FR-014.

1. Using the address from Scenario A, open `/status/sign-in` and request a code.
2. The confirmation must not reveal whether the address is known.
3. Retrieve the code from the Ethereal preview. Enter it.
4. You land on `/status` and see exactly the enquiry from Scenario A.
5. Reload — still signed in. Close and reopen the browser — still signed in.

Then the negative half:

6. Request a code, then request a second one **before** using the first. The first must now be
   refused (FR-009).
7. Sign in with the second. Then submit that same code again — refused (FR-014).
8. Repeat step 1 with an address that has never enquired. The response must be **indistinguishable**
   from step 2, in wording and in visible timing.

**Fails if**: step 8 returns noticeably faster than step 2. That is the timing oracle SC-002 exists
to catch, and it means the constant-time floor is missing or is being skipped on the unknown-address
path.

## Scenario C — You see only your own

**Proves**: US2, FR-027, FR-028, FR-032.

1. Submit a second enquiry from a **different** address. Note its id from the admin.
2. Signed in as the first address, visit `/status` — only your own enquiry is listed.
3. Navigate to `/status/enquiry/<the other enquiry's id>`. You must get a not-found page,
   **identical** to what a made-up id produces. Not an error page, not a permission message.
4. Sign out, sign in as the second address, and confirm the mirror image.
5. Sign in with an address whose only enquiry predates this feature (create one by clearing
   `submitterEmail` on a row in the admin). The list must show the empty state explaining that only
   enquiries sent with an address appear, with a route to the enquiry form.

**Fails if**: step 3 distinguishes "not yours" from "does not exist" in any way — status code, page
content, or response time.

## Scenario D — Abuse resistance

**Proves**: US3, FR-015, FR-017 to FR-021.

1. Request four codes for one address within 15 minutes. The fourth must be refused, stating when
   it can be tried again, in wording identical for a known and an unknown address.
2. Force an expiry by setting a code's `expiresAt` into the past in the database, then submit it.
   The message must say the code expired and offer a new one — this is the one refusal that is
   allowed to be specific.
3. Enter six wrong codes for one address. After the threshold, further attempts are refused with a
   cooling-off time.
4. While locked out, request a **new** code and try it. Still refused — a new code must not reset a
   lockout.
5. Confirm the block appears on the visitor's row in the admin with its lift time, and that there is
   no control to clear it.

```bash
pnpm test tests/integration/throttle.test.ts
```

Must include a concurrency case: fire parallel requests against one key and assert the limit is not
exceeded. This is the test that catches a regression from the atomic upsert back to read-then-write,
which is invisible in serial testing and wrong in production.

## Scenario E — The owner's view and revocation

**Proves**: US4, FR-034 to FR-036, FR-054 to FR-057.

1. Sign in as a visitor in two different browsers (or a normal and a private window).
2. In `/admin`, open the `visitors` collection. The row shows the address, last sign-in, and an
   active session count of **2**.
3. Confirm no device, browser, or IP information is shown anywhere.
4. Sign out in one browser only. The other stays signed in; the count drops to 1.
5. Tick `revokeAllSessions` and save. The remaining browser is signed out on its **next request** —
   no waiting for expiry.
6. Confirm the checkbox reset itself to unticked.
7. Confirm the admin offers no way to view the site as that visitor.

Then the separation check:

8. In the same browser where a visitor is signed in, sign in to `/admin` as the owner. Both sessions
   must work simultaneously. Signing out of one must not affect the other.

**Fails if**: step 8 logs the owner out of the admin. That means the visitor session is using
Payload's default `payload-token` cookie name instead of its own.

## Scenario F — The owner replies

**Proves**: FR-033, FR-049 to FR-052.

1. In the admin, write a reply on the enquiry from Scenario A and save.
2. An Ethereal preview URL appears for a short notice containing a sign-in link — and **not** the
   reply text.
3. Signed in as the visitor, the reply is visible on the enquiry, read-only, with no way to respond.
4. Edit the reply in the admin and save again. **No second notice is sent.**
5. Confirm `replyNotifiedAt` is set and `delivery.replyNotice` records the outcome.
6. Confirm `deliveryFailed` on the enquiry is **not** set by a visitor-facing message — only owner
   channels feed that flag.

**Fails if**: step 4 sends another notice. The `replyNotifiedAt` guard is missing, and the owner
will spam a client every time they fix a typo.

## Scenario G — Delivery redundancy is intact (mandatory before merge)

**Proves**: Constitution VI still holds after this feature adds two new outbound messages.

Configure both owner channels (`RESEND_API_KEY` **and** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`),
then:

1. Submit an enquiry. Confirm the owner receives it on **both** channels and that the visitor
   receives an acknowledgement.
2. Break the acknowledgement only — point `PREVIEW_MAIL_RECIPIENT` at an invalid address, or
   simulate a rejection. Submit again. Then confirm:
   - the enquiry is still stored;
   - the owner still received both notifications;
   - `delivery.visitorAck` records the failure;
   - `deliveryFailed` is **not** set;
   - the visitor still saw a successful confirmation with the sign-in link on screen.
3. Break the owner's email channel instead. Confirm `deliveryFailed` **is** set and the enquiry
   appears in the admin's "needs attention" filter, exactly as before this feature.

**Fails if**: a failed acknowledgement sets `deliveryFailed`. That would make the owner's
"needs attention" signal fire for something that has nothing to do with whether they were notified,
and it erodes the flag until it gets ignored.

## Full suite

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

New coverage this feature must add:

| File | Covers |
|---|---|
| `tests/integration/login-codes.test.ts` | Reuse, expiry, supersede, cross-address, lockout, and that no plaintext code reaches any column |
| `tests/integration/throttle.test.ts` | Window arithmetic, lockout, and the concurrency case |
| `tests/integration/email-adapter.test.ts` | Tier selection and the recipient guard |
| `tests/e2e/visitor-login.spec.ts` | Sign in, scoping, URL tampering, sign out, and that a visitor session is refused by `/admin`, `/api/enquiries`, and unpublished content |
| `tests/integration/enquiry-schema.test.ts` (modified) | Email now required |
