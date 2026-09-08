# Contract: Enquiry notification delivery (afterChange hook)

Implements Principle VI and FR-013/FR-014/FR-015. The controlling rule: **a delivery
failure is logged and surfaced in the admin, and never cancels the stored enquiry.**

## Hook shape

```ts
// src/hooks/notifyOnEnquiry.ts — registered as Enquiries.hooks.afterChange
const notifyOnEnquiry: CollectionAfterChangeHook = async ({ doc, operation, req, context }) => {
  if (operation !== 'create') return doc;
  if (context.skipNotify) return doc;      // recursion guard — see below
  // ...dispatch, then write outcomes back
  return doc;
};
```

**The hook must never throw.** Every channel attempt is individually wrapped; an unhandled
rejection inside `afterChange` would surface as a failed create to the caller, which would
break the FR-016 guarantee that a stored enquiry stays stored.

## Channel interface

```ts
type ChannelResult =
  | { status: 'sent'; attemptedAt: string }
  | { status: 'failed'; attemptedAt: string; error: string }
  | { status: 'disabled' };

type Channel = {
  name: 'email' | 'telegram';
  isEnabled(): boolean;
  send(enquiry: Enquiry): Promise<void>;   // throws on failure; the dispatcher catches
};
```

`src/lib/delivery/dispatch.ts` runs the channels with `Promise.allSettled`, so one
channel's rejection cannot prevent or abort the other's attempt.

## Channel 1 — email (mandatory)

- Sent via Payload's configured email adapter (`@payloadcms/email-resend`) to
  `site-settings.ownerNotificationEmail`.
- `isEnabled()` always returns `true`. There is no configuration that turns email off —
  it is the mandatory channel per the owner's direction and FR-013.
- Message body contains every enquiry field plus a deep link to the document in `/admin`.

## Channel 2 — Telegram (configuration-gated)

- `isEnabled()` returns `true` only when both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
  are present and non-empty. This is the whole toggle: **no code change is needed to turn
  the channel on or off** (FR-014).
- Sends via `POST https://api.telegram.org/bot<token>/sendMessage` with a plain `fetch` —
  outbound only, no webhook, no SDK.
- When disabled, the recorded status is `disabled`, which is **not** a failure and must not
  set `deliveryFailed`.
- Operational note: Vercel applies environment-variable changes on the next deployment, so
  enabling Telegram means editing the variable and clicking Redeploy in the dashboard — no
  code, no CLI. Recorded as a deliberate trade-off in [research.md](../research.md).

## Recording outcomes (and the recursion guard)

After both channels settle, the hook writes results back onto the same document:

```ts
await req.payload.update({
  collection: 'enquiries',
  id: doc.id,
  data: { delivery: { email: …, telegram: … }, deliveryFailed: anyFailed },
  context: { skipNotify: true },   // REQUIRED — without it this update re-enters afterChange
  req,
});
```

`context.skipNotify` is mandatory. Omitting it causes infinite hook recursion — this is the
single most likely implementation bug in the whole feature, so it is stated as a contract
term rather than left as folklore.

`deliveryFailed` is `true` when **any** channel reports `failed`. It drives the admin list
badge and the saved "needs attention" filter, which is how FR-015's "failure is visible to
the owner" is actually satisfied in the UI.

## Timeouts

Each channel attempt is bounded (~5s) so a hanging provider cannot stall the create call.
A timeout is recorded as `failed` with the timeout as its `error` — indistinguishable, from
the owner's point of view, from any other delivery failure, which is the correct behaviour:
the enquiry is stored, and they know to follow up by another route.

## Verified by

Scenarios A and B in [quickstart.md](../quickstart.md), plus a unit test on the dispatcher
that asserts a throwing channel never propagates out of the hook.
