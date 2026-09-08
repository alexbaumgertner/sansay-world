# Contract: Enquiry attribution, acknowledgement, and reply

Implements FR-002, FR-002a, FR-002b, FR-003, FR-027, FR-028, FR-032, FR-033, FR-044 to FR-052.

The controlling rule: **an enquiry belongs to the address it was submitted with, and to nothing
else.** There is no other attribution path — no name matching, no phone matching, no owner-assigned
ownership.

## The enquiry form gains a required email field

`submitterEmail` becomes required in `enquirySchema` (`src/lib/validation/enquiry.ts`) and on
`EnquiryForm`. `preferredContactMethod` stays as it is: it remains free text describing how the
person prefers to be contacted, and is **not** used for attribution even when it contains an
address. Two fields that both hold contact information is a real cost, accepted in the spec's
Assumptions; the alternative — parsing an address out of free text — would make ownership depend
on a guess.

Normalization on write: trim, lowercase. The same normalization runs on sign-in, so the two always
agree. It lives in one exported function used by both paths.

## Pre-existing enquiries belong to nobody

Rows created before this feature have `submitterEmail IS NULL` and are **not backfilled**
(FR-002a). The column is nullable in Postgres while required in the submission schema, and that
split is the entire mechanism: a `NULL` can never equal a signed-in visitor's address, so old
enquiries cannot appear for anyone, cannot be guessed into, and need no special-case filter.

Someone who enquired before the change and enquires again is attributed from the new enquiry
onward; the old one stays invisible. The empty state (FR-028) explains this, which is why it is
written as an explanation rather than an error.

## The ownership-scoped read

```ts
// src/lib/data/visitor-enquiries.ts
export async function listEnquiriesFor(email: string): Promise<VisitorEnquiry[]>
export async function getEnquiryFor(email: string, id: string): Promise<VisitorEnquiry | null>
```

Both use `payload.find` / `payload.findByID` with `overrideAccess: true` **and** an explicit
`submitterEmail: { equals: email }` filter. The email always comes from the resolved session,
never from a parameter, a query string, or a form field.

`getEnquiryFor` applies the ownership filter **inside the query** rather than fetching by id and
comparing afterwards. Both work; only one is safe against a future refactor that drops the
comparison. A non-matching id returns `null` and the page renders a not-found — **identical** to a
genuinely nonexistent id, so altering the URL cannot even confirm that an enquiry exists (FR-032).

These two functions are the only way the status pages read enquiries. A visitor has no Payload API
access to `enquiries` at all, so there is no second path to secure.

### Projection

`VisitorEnquiry` exposes only: what was submitted, when, status, discipline, and `ownerReply`.
It must **not** carry `delivery`, `deliveryFailed`, internal notes, or any other enquiry's data.
Building an explicit projection type rather than returning the raw document is what keeps an
internal field from leaking the next time one is added.

## Acknowledgement email (FR-044 to FR-047)

Sent to the submitter after an enquiry is stored, containing a link to `/status/sign-in`.

Dispatched from `notifyOnEnquiry` (the existing `afterChange` hook) but **separately from the owner
fan-out**:

- It is **not** a `Channel` in `src/lib/delivery/dispatch.ts`. The owner's two-channel guarantee
  (Constitution VI) is about reaching the owner, and adding a third participant to that fan-out
  would entangle "the owner was notified" with "the visitor was acknowledged".
- Its outcome is recorded at `delivery.visitorAck` using the same `ChannelResult` shape.
- It must **not** set `deliveryFailed`, which means "the owner may not have heard about this".
- It must never throw out of the hook, for the same reason the existing channels must not: a
  stored enquiry stays stored (FR-016, FR-047).
- The write-back reuses the existing `context: { skipNotify: true }` recursion guard. Omitting it
  causes infinite hook recursion — the single most likely implementation bug in this area.

The on-screen confirmation shows the same link regardless of whether the email was delivered
(FR-046), so a bounced acknowledgement never strands the visitor.

## Owner reply (FR-033, FR-049 to FR-052)

`ownerReply` is a plain textarea on the enquiry, owner-editable, visible read-only to the
attributed submitter. One reply per enquiry. There is no threading, no visitor reply field, and no
comment collection — deliberately, per the clarified single-note model.

### The reply notice fires once

```ts
// src/hooks/notifyOnReply.ts — Enquiries.hooks.afterChange
if (doc.ownerReply && !previousDoc.ownerReply && !doc.replyNotifiedAt) { … }
```

Three conditions, all required:

- `doc.ownerReply` — there is a reply.
- `!previousDoc.ownerReply` — it was just added, not edited. Editing must not re-notify (FR-051).
- `!doc.replyNotifiedAt` — the durable guard. Without it, clearing and re-entering a reply would
  notify again, and so would any future code path that reconstructs the document.

The notice is short and carries a sign-in link; the reply text itself stays on the site (FR-050) so
enquiry content is never duplicated into email.

Outcome recorded at `delivery.replyNotice`; failure never blocks the save (FR-052) and never sets
`deliveryFailed`. `replyNotifiedAt` is set only on a successful send, so a failed notice can be
retried by re-saving — a small, useful property worth preserving.

### Replying to an unattributed enquiry

An enquiry with `submitterEmail IS NULL` can still be given a reply — the owner may be using it as
a note — but no notice is sent and nobody can sign in to read it. The admin shows this state so the
owner is not left expecting the person to see it.

## Copy

Every string — the form label, the empty state, the confirmation, and all three email subjects and
bodies — is a key in `src/lib/copy/ru.ts`. Email templates are the likeliest place for hardcoded
Russian to reappear, so this is stated as a contract term rather than left to review.

## Verified by

Scenarios A, C, E, and F in [quickstart.md](../quickstart.md);
`tests/integration/enquiry-schema.test.ts` (email now required);
`tests/e2e/visitor-login.spec.ts` (scoping and the URL-tampering case).
