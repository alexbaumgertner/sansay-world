# Quickstart & Validation: Home Opening Screen Cover & Brand Mark

**Feature**: `003-home-hero-cover` | **Date**: 2026-09-10

How to bring the feature up locally and prove each success criterion. Field and DOM details are in [data-model.md](./data-model.md) and [contracts/](./contracts/); this file is the run guide.

---

## Prerequisites

- Docker running (local Postgres via `docker compose`)
- `.env` present with `DATABASE_URI` and `PAYLOAD_SECRET`
- `.env.local` with `E2E_BASE_URL` (`http://localhost:3000` for a local run), and `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` if they differ from the seed defaults
- `BLOB_READ_WRITE_TOKEN` **unset** locally, so uploads land in the git-ignored `media/` directory rather than the production Blob store

## Bring it up

```bash
pnpm db:up                       # Postgres
pnpm migrate                     # includes the new home_cover_image migration
pnpm types                       # regenerate src/payload-types.ts with Home.coverImage
pnpm seed                        # owner user, home copy, two disciplines
pnpm dev
```

`pnpm migrate:status` should list `home_cover_image` as applied. The seed deliberately leaves `coverImage` unset, so the first thing a fresh environment renders is the **uncovered** hero — the state FR-023 through FR-025 govern, and the state every existing installation is in on the day this ships.

Verify the schema landed as intended:

```bash
docker compose exec -T postgres psql -U postgres -d sansay \
  -c "\d home" | grep cover_image
```

Expect `cover_image_id | uuid` plus the `home_cover_image_idx` index. Compare against the SQL in [data-model.md](./data-model.md#database-migration).

## Set a cover as the owner would

1. Open `http://localhost:3000/admin` and sign in (`owner@example.com` / `changeme123!` from the seed).
2. Go to **Globals → Главная**.
3. In the cover field, upload an image and fill the required **alt** text.
4. Save, then load `http://localhost:3000/`.

The cover appears on the next request — the route is `force-dynamic`, so there is no revalidation step and no deploy (FR-019, SC-006). Clearing the field and saving returns the page to the uncovered hero (FR-021, Story 3).

Worth doing at least once with a deliberately **light** photograph. That is the case the scrim is dimensioned for, and the one where a regression would be obvious to the eye rather than only to the test.

---

## Automated validation

```bash
pnpm typecheck
pnpm lint
pnpm test                        # Vitest: brand-mark + cover-contrast
pnpm test:e2e                    # Playwright: desktop 1280×800 + mobile 390×844
```

Playwright runs against `E2E_BASE_URL`, so `pnpm dev` must already be up (or point it at a preview deployment). The suite is `fullyParallel: false` with one worker because specs mutate shared CMS state; the new cover specs set and restore `home.coverImage` through the fixture's undo steps, so they must not be forced parallel.

### Criterion coverage

| Criterion | Verified by |
|---|---|
| SC-001 — offer identifiable without scrolling, both sizes, cover in place | `home.spec.ts` (desktop) + `responsive.spec.ts` (mobile), `toBeInViewport()` on `h1`, `p`, and CTA with a cover set |
| SC-002 — contrast holds for 100% of covers incl. light and busy | `cover-contrast.test.ts` proves the worst case mathematically; `home-cover.spec.ts` renders the `nearWhiteCover()` and `busyCover()` fixtures to confirm the scrim is actually applied |
| SC-003 — cover fills 100% of the first viewport, proportions preserved | `home-cover.spec.ts`: `#home-hero` bounding box vs. viewport; `object-fit: cover` computed on the `<img>`; the header overlays rather than displaces |
| SC-004 — all three elements fit across viewports incl. phone landscape | `responsive.spec.ts` at 390×844 and an added 844×390 case |
| SC-005 — name occupies a visibly larger share on desktop | `home-cover.spec.ts`: computed `font-size` of `h1` ≥ 96px at 1280×800 (was 48px) |
| SC-006 — owner sets a cover in one admin session, no developer | `home-cover.spec.ts` via `cms.uploadMedia()` + `cms.setHomeCover()`, both going through the Local API — the same config and access rules the admin panel uses |
| SC-007 — uncovered hero structurally indistinguishable | `home-cover.spec.ts` after `cms.clearHomeCover()`: no `img` in `#home-hero`, section still full height, all three elements present and in viewport |
| SC-008 — name announced once as one continuous name | `home-cover.spec.ts`: `expect(h1).toHaveAccessibleName(home.name)`, read from the CMS rather than hardcoded |
| SC-009 — CTA focusable with a visible indicator over the cover | `home-cover.spec.ts`: keyboard focus reaches the CTA, computed `outline-width` is non-zero |
| SC-010 — text readable before the cover loads | `home-cover.spec.ts`: route-block the media request, assert `h1`, `p`, and CTA still visible and in viewport |

### Manual checks worth keeping

Three things the suite cannot honestly assert:

- **Real-device first viewport.** Headless Chrome reports `svh`, `dvh`, and `lvh` as equal, so the reason `svh` was chosen (research R2) is invisible to the test. Load the page on an actual phone with the URL bar expanded and confirm the CTA is visible without scrolling.
- **Screen-reader announcement.** `toHaveAccessibleName` checks the computed name, which is the right proxy, but hearing VoiceOver or NVDA say "SanSay" once — not "San Say" — is the actual requirement.
- **Whether it looks like a photograph.** The 0.85 scrim is heavy by construction (research R3). The tests can prove the text is legible; only a person can say whether the cover still reads as a photographic cover rather than a dark wash. If it does not, the lever is the *shape* of the strong band, not its alpha — the alpha is what FR-014 rests on.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Cover 400s or does not render | Media host missing from `next.config.mjs` `remotePatterns`. Local originals are absolute `http://localhost:3000/api/media/file/...`, allowed only when `NODE_ENV=development` (`dangerouslyAllowLocalIP`). |
| `Home.coverImage` missing from types | `pnpm types` not run after editing `src/globals/HomePage.ts`. |
| Dev warning about image quality | Pre-existing, not this feature: `page.tsx` passes `quality={85}` to the about photo and Next 16 coerces it to the `qualities` default of `[75]`. Out of scope — see `plan.md`. |
| Dark bar above the cover | The `body:has(#home-hero) > header` rule is not matching. Check the hero's `id` and that the header is a direct child of `body` in `layout.tsx`. |
| CTA below the fold on a phone | Hero sized in `vh` rather than `svh`, or the content column exceeded the 55% bottom band. See research R2 and the layout invariant in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md#the-invariant-that-ties-layout-to-contrast). |
| Contrast test passes but the page looks washed out | The CSS/token drift guard exists for this: check that `:root`'s alphas still match `coverScrimTokens`. |
