# Contract: Three-tier email adapter

One adapter serves every outbound message in the application: owner enquiry notifications
(existing), login codes, enquiry acknowledgements, and reply notices (new). Implements FR-010 and
the planning request's tier structure.

**Note on provenance**: the reference implementation at `/tmp/hht-ref` was not present when this
was written (see [research.md §0](../research.md)). The tier precedence below is taken from the
planning request verbatim; the code shape is this project's, not the reference's. If the reference
is restored, reconcile naming and error handling with it — the behaviour specified here should not
need to change.

## Tier selection

```ts
// src/lib/email/adapter.ts
export function buildEmailAdapter(): EmailAdapter {
  if (process.env.RESEND_API_KEY) return tierResend()   // 1
  if (process.env.SMTP_HOST)      return tierSmtp()     // 2
  return tierEthereal()                                 // 3
}
```

Precedence is by **presence of the variable**, checked in this order, first match wins. An empty
string counts as absent. The chosen tier's `name` is logged once at startup — a deployment that
silently picked the wrong tier is the failure mode most likely to waste an afternoon.

| Tier | Trigger | Adapter | Intended environment |
|---|---|---|---|
| 1 | `RESEND_API_KEY` set | `resendAdapter` from `@payloadcms/email-resend` (already a dependency) | Production **and preview** |
| 2 | `SMTP_HOST` set | `nodemailerAdapter({ transportOptions: { host, port, auth } })` | Any environment with a real SMTP host |
| 3 | neither | `nodemailerAdapter()` with **no** transport — creates an Ethereal test account and logs a clickable preview URL per message | **Local development only** |

`@payloadcms/email-nodemailer@3.88.0` must be added; it is version-matched to the installed
`payload@3.88.0`.

### Environment variables

| Variable | Tier | Notes |
|---|---|---|
| `RESEND_API_KEY` | 1 | Use a **separate key** for preview so it can be revoked independently |
| `RESEND_FROM_ADDRESS` | 1 | Already exists |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | 2 | New; add to `.env.example` |
| `PREVIEW_MAIL_RECIPIENT` | guard | New; required in every non-production environment |

## Non-production recipient guard

**This wraps the adapter and is not optional.** It is the reason a preview deployment cannot email
a real client.

```ts
// src/lib/email/recipient-guard.ts
export function withRecipientGuard(adapter: EmailAdapter): EmailAdapter
```

Behaviour:

- When `process.env.VERCEL_ENV === 'production'` — pass through untouched.
- Otherwise — replace `to`, and drop `cc`/`bcc` entirely, with `PREVIEW_MAIL_RECIPIENT`, and
  prefix the subject with the environment and the original recipient, e.g.
  `[preview → client@example.com] Ваш код для входа`.
- If a non-production environment has no `PREVIEW_MAIL_RECIPIENT`, **refuse to send** and throw.
  Failing loudly is correct: the alternative is sending to a real address by default.

The composition order matters and is fixed: `withRecipientGuard(buildEmailAdapter())`. The guard
must be the outermost layer so it applies to every tier, including Tier 1.

Why this exists rather than relying on Ethereal to keep previews harmless: previews commonly share
the production database, so they can enumerate real enquirers. Ethereal's non-delivery is an
accident of the tier, and evaporates the moment someone sets `RESEND_API_KEY` on the preview
environment. The guard holds regardless of tier. Full reasoning in
[research.md §4](../research.md).

## Wiring into Payload

```ts
// src/payload.config.ts
email: withRecipientGuard(buildEmailAdapter()),
```

This replaces the current conditional that leaves `email` undefined when `RESEND_API_KEY` is
absent. That fallback is worth calling out: Payload currently installs `consoleEmailAdapter` in
that case (`payload/dist/index.js:397`), so **today, local development silently logs mail and
never sends it**. Tier 3 replaces silence with a clickable preview.

## Sending

All callers use `payload.sendEmail(...)`, which routes through the configured adapter. No feature
code constructs a transport, and no feature code reads `RESEND_API_KEY`. `src/lib/delivery/email.ts`
already works this way and needs no change.

Subjects and bodies come from `src/lib/copy/ru.ts` via `t()`, not from string literals in the
delivery modules — email copy is user-facing copy under Principle V.

## Failure semantics

`sendEmail` rejects on failure. Callers differ in how they treat that, and the difference is
required by the spec:

| Caller | On failure |
|---|---|
| Login code (FR-011) | **Surface to the visitor** in the same interaction, before responding. Never show "code sent" |
| Enquiry acknowledgement (FR-047) | Record on the enquiry, never surface to the visitor, never fail the enquiry |
| Reply notice (FR-052) | Record on the enquiry, never prevent the reply from saving |
| Owner notification (existing) | Unchanged — recorded, sets `deliveryFailed` |

The visitor-facing outcomes (`delivery.visitorAck`, `delivery.replyNotice`) must **not** set
`deliveryFailed`, which means "the owner may not have heard about this enquiry" and must keep that
meaning.

### Only a rejected send counts

`sendEmail` rejecting is the entire trigger for every row in that table. A message the provider
accepts and later bounces produces no failure here, and FR-011 is scoped to match: a bounce cannot
be known while the visitor is still on the page. Bounce handling — a public webhook, stored bounce
state, signature verification — was considered and left out, and the visitor-side mitigation is the
standing guidance of FR-011a on the code-entry screen instead. Recorded in the spec's Assumptions.

### No escalation on repeated failures

Every failure is treated identically; nothing changes on the second or tenth. There is deliberately
no backoff, no provider switch, and no "this address keeps failing" state, because each of those
would be a new stored signal about a specific address for a rare event the owner can already see in
`delivery.visitorAck` and `delivery.replyNotice`.

### The acknowledgement runs alongside the owner channels

Not after them. It is started in the same `allSettled` as the owner fan-out so it adds no latency to
enquiry submission, while its outcome stays separately accounted — see
[enquiry-attribution.md](./enquiry-attribution.md).

## Verified by

Scenarios A, F, and G in [quickstart.md](../quickstart.md), plus
`tests/integration/email-adapter.test.ts`, which asserts tier selection for all four variable
combinations and that the guard rewrites recipients and throws when
`PREVIEW_MAIL_RECIPIENT` is missing outside production.
