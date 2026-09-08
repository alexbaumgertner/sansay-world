# Contract: Enquiry submission (Server Action → Payload create → afterChange hook)

The public discipline-page form's only write path. Its ordering is what encodes FR-015,
FR-016, and FR-017 — the requirements live in the sequence, not just in prose.

## Public entry point

```ts
// src/actions/submitEnquiry.ts   ('use server')
async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult>

type EnquiryInput = {
  disciplineId: string;          // pre-filled by the form, displayed to the sender (FR-010)
  name: string;
  preferredContactMethod: string;
  desiredDate?: string;          // ISO date, optional (FR-009)
  jobDescription: string;
  honeypot?: string;             // must be empty
};

type EnquiryResult =
  | { ok: true; replyWindowCopy: string }   // copy comes from the `home` global (FR-016)
  | { ok: false; error: "validation" | "bot_detected" | "storage_error" };
```

The action uses Payload's **Local API** (`payload.create({ collection: 'enquiries', ... })`)
rather than an HTTP call to Payload's REST endpoint — same process, no network hop, and the
collection's access control (`create: () => true`) still applies.

## Required order of operations

1. **Bot check.** Honeypot field must be empty; a bot verdict returns
   `{ ok: false, error: "bot_detected" }` **with no document created**. A bot submission
   must never become a stored enquiry (FR-017), and the check adds no visible friction for
   a real visitor.
2. **Validate** against the Zod schema (`src/lib/validation/enquiry.ts`). Failure returns
   `{ ok: false, error: "validation" }` before any write.
3. **Create the enquiry document.** `status` defaults to `new`. This write is the durable
   record and the first of the two-plus channels required by Principle VI.
   - On failure → `{ ok: false, error: "storage_error" }`. The visitor must **not** see a
     success confirmation in this case.
4. **Return success as soon as the document is committed.** The confirmation shown to the
   visitor — including `home.replyWindowCopy` — is rendered at this point, *before and
   independently of* any delivery outcome (FR-016).
5. **`afterChange` hook fans out delivery** (see
   [notification-delivery.md](./notification-delivery.md)). The hook is invoked by Payload
   as part of the create call; it must never throw and must never leave the document
   uncommitted.

## Outcome matrix

| Condition | Result to visitor | Document stored? | Admin sees |
|---|---|---|---|
| Honeypot filled / bot detected | `bot_detected` | No | nothing |
| Invalid input | `validation` | No | nothing |
| Database write fails | `storage_error` | No | nothing |
| Stored; email sent; Telegram sent | success + reply window | Yes | status `new`, both channels `sent` |
| Stored; email failed; Telegram sent | success + reply window | Yes | `deliveryFailed` flagged, `email.error` populated |
| Stored; both channels failed | success + reply window | Yes | `deliveryFailed` flagged, both errors populated |
| Stored; Telegram env vars absent | success + reply window | Yes | `email: sent`, `telegram: disabled` (not a failure) |

The invariant across the last four rows: **once the document is stored, the enquiry counts
as received.** No delivery outcome can retract it, and the visitor is never told otherwise.

## Verified by

Scenarios A, B, and C in [quickstart.md](../quickstart.md).
