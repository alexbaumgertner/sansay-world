# Quickstart & Validation Guide: SanSay Portfolio Site

How to run the project and prove the feature works end to end. Scenarios map to the spec's
user stories and to the contracts in [contracts/](./contracts/); schema detail lives in
[data-model.md](./data-model.md) and is not repeated here.

## Prerequisites

- Node.js 22.x, pnpm
- A Neon Postgres database (Vercel Marketplace) — connection string
- A Vercel Blob store — read/write token
- A Resend API key and a verified sending domain
- Optional: a Telegram bot token and chat id (leave unset to validate the disabled path)

## Environment

```bash
vercel link
vercel env pull .env            # DATABASE_URI, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY,
                                # PAYLOAD_SECRET, NEXT_PUBLIC_SERVER_URL,
                                # optional TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
```

## Setup and run

```bash
pnpm install
pnpm payload migrate            # applies migrations locally; on Vercel this runs during build
pnpm dev                        # http://localhost:3000 — public site
                                # http://localhost:3000/admin — Payload admin
```

On first visit to `/admin`, create the single owner account (first-user onboarding). After
that account exists, no further accounts can be created without signing in.

Seed enough content to validate against: one `home` global, two or three `disciplines`
(mix `live` and `digital` tones), a few `work-samples`, and one `pages` document for the
Friends story with `showInNav: false`, `includeInSitemap: false`, `noindex: true`.

## Test commands

```bash
pnpm test           # Vitest — collections, dispatcher, copy layer (Payload Local API)
pnpm test:e2e       # Playwright — the scenarios below
```

---

## Scenario A — An enquiry reaches the owner on both channels (User Story 2)

**Setup**: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` set; Resend configured.

1. Open a discipline page and submit the enquiry form (name, contact method, optional
   date, job description). The discipline field is pre-filled and visible.
2. **Expect**: a confirmation appears immediately, stating the reply window from the
   `home` global.
3. In `/admin` → Enquiries: the document exists with status `new`, the correct discipline,
   and `delivery.email.status = sent`, `delivery.telegram.status = sent`.
4. **Expect**: the notification email arrived, and the Telegram message arrived.

Contract: [enquiry-submit.md](./contracts/enquiry-submit.md),
[notification-delivery.md](./contracts/notification-delivery.md).

## Scenario B — One channel down, the enquiry still counts as received (FR-015, Principle VI)

Run this twice — it is the single most important behaviour in the feature.

**B1 — Telegram off**: unset `TELEGRAM_BOT_TOKEN`, restart, submit an enquiry.
- **Expect**: confirmation shown as normal; document stored; `email.status = sent`,
  `telegram.status = disabled`; `deliveryFailed` **not** set (disabled is not a failure).

**B2 — Email broken**: set an invalid `RESEND_API_KEY`, submit an enquiry.
- **Expect**: confirmation still shown to the visitor; document still stored;
  `email.status = failed` with the error text populated; `deliveryFailed` set; the
  enquiry appears flagged in the admin list without opening it.
- **Expect**: the create call itself did not error — the hook swallowed the failure.

## Scenario C — Bot submissions never become enquiries (FR-017)

1. Submit the form with the honeypot field populated (simulating a naive bot).
2. **Expect**: no enquiry document is created, no email or Telegram message is sent.
3. **Expect**: in Scenario A, a real visitor never saw a challenge, a puzzle, or an extra
   step — the protection is invisible.

## Scenario D — Publish a new discipline with no code change and no deploy (User Story 3, FR-022)

1. In `/admin` → Disciplines, create a discipline: name, slug, strapline, description,
   `tone`, `order`, published.
2. Press Save. Do not run a build, do not deploy, do not restart anything.
3. **Expect**, within seconds, on the public site:
   - it appears in the site navigation;
   - it appears as a card on the home page, in the position set by `order`, with the
     accent colour matching its `tone` (amber for `live`, violet for `digital`);
   - it is selectable as the topic in the enquiry form;
   - `/[its-slug]` renders its page with links back home and to neighbouring disciplines.
4. Reorder two disciplines in the admin list, Save. **Expect**: the home page order
   changes to match.

This scenario is the practical test of Principles II and III together — if any step
required touching code, the architecture has failed.

## Scenario E — Friends page: reachable, unadvertised (User Story 4, FR-024/FR-025/FR-028)

1. Open the Friends page by its direct URL. **Expect**: chapters with photographs render;
   no login is requested.
2. **Expect**: the page states in its own copy that the content is unadvertised, not
   secured.
3. **Expect**: its URL appears nowhere in the rendered navigation HTML.
4. Fetch `/sitemap.xml`. **Expect**: the Friends URL is absent.
5. Fetch `/robots.txt`. **Expect**: the Friends path is disallowed.
6. View the page's HTML head. **Expect**: `<meta name="robots" content="noindex, nofollow">`.
7. Rename the page's slug in the admin and repeat 3-6. **Expect**: still hidden — the
   exclusion follows the data, not a hardcoded slug.

Contract: [sitemap-robots.md](./contracts/sitemap-robots.md).

## Scenario F — Mobile, link previews, and first-screen comprehension (User Story 1, FR-001/026/027)

1. Load the home page at a 375px-wide viewport. **Expect**: the name, the one-sentence
   essence, and the call to action are visible **without scrolling**; no horizontal scroll
   anywhere on the page.
2. Scroll once. **Expect**: the about block and every published discipline card are
   reachable within that single scroll.
3. Paste a discipline URL into a messenger. **Expect**: the preview shows a meaningful
   title, description, and image (from the `og` media size).

## Scenario G — Shows map degrades to the list (beyond current spec)

1. Load `/shows` normally. **Expect**: map with markers above, full list below.
2. Disable JavaScript and reload. **Expect**: the complete list still renders server-side.
3. Block requests to `tile.openstreetmap.org` and reload. **Expect**: the list is intact
   and the page is not broken.
4. Add a show with no coordinates. **Expect**: it appears in the list, with no marker.

Contract: [shows-map.md](./contracts/shows-map.md).

## Scenario H — Accessibility baseline (FR-031)

1. Using only the keyboard, tab from the top of a discipline page through to submitting
   the enquiry form. **Expect**: every control is reachable, focus is always visible, and
   the form can be submitted without a mouse.
2. **Expect**: every image has meaningful alt text (enforced at upload — try saving a
   `media` document without `alt` and expect Payload to reject it).
3. Check contrast of both accent tokens and body text against the dark background.
   **Expect**: WCAG AA or better.

## Scenario I — Access control (FR-030)

1. Sign out. Request `/admin`. **Expect**: redirect to the login screen.
2. Request `/api/enquiries` unauthenticated. **Expect**: no enquiry documents returned —
   visitors' names and contact details are never publicly readable.
3. **Expect**: no route anywhere offers account registration.

Contract: [admin-access.md](./contracts/admin-access.md).

## Deployment check (the owner never builds)

1. Push to the default branch. **Expect**: Vercel builds and deploys automatically, running
   `payload migrate` as part of the build.
2. As the owner, edit content in `/admin` and Save. **Expect**: the public site reflects it
   within seconds — **no build runs at all** for a content change.
