# Implementation Plan: Home Opening Screen Cover & Brand Mark

**Branch**: `003-home-hero-cover` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-home-hero-cover/spec.md`

## Summary

Replace the home page's text-only opening screen with a full-viewport photographic cover, a fluid two-tone brand mark, and the existing essence sentence and disciplines control — without losing the first-viewport guarantee of FR-001/SC-001.

The approach has four moving parts:

1. **A new optional `coverImage` upload field** on the `home` global, alongside (never replacing) `aboutPhoto`, with a Payload migration adding `home.cover_image_id`.
2. **A `HomeHero` server component** that renders the cover with `next/image` `fill` + `sizes="100vw"` + `loading="eager"` + `fetchPriority="high"` over an `bg-ink` base, so a missing or unretrievable image degrades to the dark background with no layout change.
3. **A fixed-alpha scrim** between photograph and text. Its minimum alpha over the text zone is chosen by computing WCAG contrast against a worst-case pure-white photograph, so legibility is guaranteed by construction for *any* image the owner uploads — satisfying FR-014/FR-015 with no per-image tuning.
4. **A code-owned brand-mark rule** (`src/lib/theme/brand.ts`) that splits the name into two accent-toned halves only when the displayed name is the SanSay mark, inside a single `<h1>` whose accessible name stays the whole name.

Two consequences of the spec worth stating up front, because they widen the blast radius beyond the home page:

- **The site header must overlay the hero.** `<header><Nav/></header>` currently sits *above* `<main>` in the flow. Left alone, a full-height hero would either be pushed below the fold (breaking FR-001) or leave a dark nav bar above the photograph (breaking FR-002/SC-003, "no visible gap, bar, or margin"). The plan lifts the header over the hero using a `body:has(#home-hero) > header` rule in `globals.css`, so no other route's layout changes and no prop threads through the shared layout.
- **Overlaying the nav creates a contrast surface the spec did not anticipate.** Nav links become white text over the top of an arbitrary photograph. The scrim therefore has a top band as well as a text band, sized by the same worst-case calculation.

## Technical Context

**Language/Version**: TypeScript 5.7.3, React 19.2.8, Next.js 16.3.4 (App Router, `src/app/(frontend)`)

**Primary Dependencies**: Payload CMS 3.88.0 (`@payloadcms/db-postgres`, `@payloadcms/storage-vercel-blob`), `next/image`, Tailwind CSS 4.3.3 (config at `tailwind.config.ts`, mirrored for non-Tailwind code in `src/lib/theme/tokens.ts`), `sharp` 0.35.4

**Storage**: Postgres (Docker locally, Neon/Vercel Postgres in deployment) via Payload; media originals in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise the git-ignored `media/` directory. Schema changes ship as files in `migrations/` — `migrationDir` is `path.resolve(dirname, '../migrations')`.

**Testing**: Vitest 5 for integration/unit (`tests/integration/**/*.test.ts`, node environment); Playwright 1.63 for e2e against a running deployment (`E2E_BASE_URL`), with a `desktop` project at 1280×800 and a `mobile` project at Pixel 7 / 390×844. `tests/e2e/fixtures/cms.ts` writes through Payload's Local API to stand in for "the owner clicked Save".

**Target Platform**: Vercel (Fluid Compute) + evergreen browsers. The plan relies on `svh` viewport units (Baseline 2023), CSS `:has()` (Baseline 2023), and `clamp()`/`min()` in `font-size`.

**Project Type**: Single Next.js web application containing both the public frontend and the Payload admin panel.

**Performance Goals**: hero text painted without waiting on the cover (FR-017/SC-010); the cover is the LCP candidate and is eagerly fetched at high priority; no additional client JavaScript — `HomeHero` stays a server component.

**Constraints**: WCAG AA contrast (4.5:1 body text, 3:1 large text) against a worst-case pure-white photograph; name + essence + CTA inside the first viewport at both 1280×800 and 390×844, and at phone-landscape 844×390; no horizontal overflow; `quality` must stay within Next 16's `qualities` allowlist, which now defaults to `[75]`.

**Scale/Scope**: one route, one new CMS field, one migration, one new identity module, two new components, one CSS utility pair, and test coverage across Vitest and both Playwright projects.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Verdict |
|---|---|---|
| I. Content Over Interface | Does every added element trace to showcasing work or capturing an enquiry? | **PASS.** The cover is owner content — a photograph of his work — promoted to the site's most-seen surface, not interface chrome. The brand mark is typography applied to content already on the page. Nothing new is added to the opening screen: it still carries exactly name, essence, and the control onward. |
| II. Extensible By Discipline | Is any discipline named or special-cased? | **PASS.** No discipline data is touched. The disciplines list and `Nav` keep iterating the single source; `HomeHero` never reads a discipline. |
| III. No-Developer Content Operations | Can the owner change this without a developer? | **PASS.** The cover is a CMS upload field on the `home` global, editable and clearable in the admin (FR-019). |
| IV. One Visual Language | Only the two accent tokens and two typefaces? | **PASS.** The brand mark uses only `tone-live` and `tone-digital`; the scrim uses the existing `ink` token at varying alpha, not a new colour. New identity constants live in `src/lib/theme/`, the same place the tokens do, and no component gains a literal hex value. |
| V. Localized Copy, Not Hardcoded Strings | Is any user-facing string inlined? | **PASS, with one note.** No new user-facing copy is introduced; the CTA label stays on `t('home.ctaToDisciplines')` and the essence stays in CMS content. `BRAND_MARK = 'SanSay'` is a code constant, but it is a *sentinel for a visual rule*, never rendered — the displayed name always comes from `home.name`. See [research.md](./research.md) R4. |
| VI. Redundant Enquiry Delivery | — | **N/A.** No enquiry path is touched. |

**Gate result: PASS.** No violations to justify, so Complexity Tracking is omitted.

**Post-Phase-1 re-check: PASS.** The design added no third colour (the scrim is `ink` at alpha), no discipline coupling, and no new copy string. The one thing Phase 1 added beyond the spec — lifting the header over the hero — is a layout rule in `globals.css` keyed off the hero's presence; it names no route and no discipline, and leaves every other page's flow untouched.

## Project Structure

### Documentation (this feature)

```text
specs/003-home-hero-cover/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — decisions R1–R9
├── data-model.md        # Phase 1 output — CMS field + migration
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/
│   ├── cms-home-cover.md   # Payload field + generated type contract
│   └── home-hero-ui.md     # DOM, accessibility, and scrim-token contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                  # MODIFIED — .cover-scrim utilities; header overlay via :has()
│   └── (frontend)/
│       └── page.tsx                 # MODIFIED — inline hero markup replaced by <HomeHero>
├── components/
│   ├── HomeHero.tsx                 # NEW — full-bleed cover + scrim + brand + essence + CTA
│   ├── BrandMark.tsx                # NEW — single <h1>, optionally two-tone
│   └── Nav.tsx                      # unchanged (overlay is CSS-only)
├── globals/
│   └── HomePage.ts                  # MODIFIED — new optional `coverImage` upload field
├── lib/
│   ├── data/home.ts                 # unchanged (findGlobal already returns the new field)
│   └── theme/
│       ├── tokens.ts                # MODIFIED — scrim alpha constants mirrored for tests
│       └── brand.ts                 # NEW — BRAND_MARK + splitBrandMark()
└── payload-types.ts                 # REGENERATED — `pnpm types`

migrations/
├── 20260910_HHMMSS_home_cover_image.ts   # NEW — home.cover_image_id + FK + index
└── index.ts                              # MODIFIED — register the migration

tests/
├── integration/
│   ├── brand-mark.test.ts           # NEW — split rule, casing, non-brand names
│   └── cover-contrast.test.ts       # NEW — WCAG math against worst-case white
└── e2e/
    ├── fixtures/
    │   ├── cms.ts                   # MODIFIED — setHomeCover/clearHomeCover + synthesized media
    │   └── images.ts                # NEW — sharp-generated light/busy test photographs
    ├── home.spec.ts                 # MODIFIED — FR-001 assertions extended to the covered hero
    ├── home-cover.spec.ts           # NEW — full-bleed, brand tones, no-cover fallback, a11y name
    └── responsive.spec.ts           # MODIFIED — first-viewport fit incl. phone landscape
```

**Structure Decision**: The existing single-application layout is kept as-is. Presentation goes in `src/components/` next to `DisciplineCard`/`Gallery`; the brand-mark rule goes in `src/lib/theme/` because Constitution IV designates that directory as the home of the visual system and because it must be unit-testable without a browser; the CMS change stays confined to `src/globals/HomePage.ts` plus a migration, matching how every prior schema change in this repo shipped.

## Phase 0 — Research

Complete. Nine decisions are recorded in [research.md](./research.md):

| # | Question | Decision |
|---|---|---|
| R1 | How to render a full-bleed cover | `next/image` `fill` + `sizes="100vw"` + `object-cover` over `bg-ink`; original `url`, not a named size |
| R2 | Which viewport unit guarantees "no scrolling" | `100svh`, with `min-h-screen` ahead of it as the legacy fallback |
| R3 | How to guarantee contrast over *any* photograph | Fixed-alpha `ink` scrim, alpha derived from worst-case white; ≥0.85 over the text zone, ≥0.65 over the nav band |
| R4 | How to split the brand mark | Code constant + case-insensitive match on the whole trimmed name; displayed casing preserved |
| R5 | How to keep the name one accessible heading | One `<h1>`, two adjacent `<span>`s, no whitespace or ARIA between them |
| R6 | How to make the name larger yet always fit | `font-size: clamp(2.5rem, min(13vw, 16vh), 9rem)` — height-aware, no JS |
| R7 | Eager loading in Next 16 | `loading="eager"` + `fetchPriority="high"`; `priority` is deprecated in v16 and `quality` is omitted because `qualities` now defaults to `[75]` |
| R8 | Cover alt text | Rendered `alt=""` (decorative); the required `media.alt` still satisfies FR-022 |
| R9 | Header vs. full-viewport cover | Overlay the header with `body:has(#home-hero) > header`; top scrim keeps nav links legible |

## Phase 1 — Design & Contracts

Complete. Artifacts:

- **[data-model.md](./data-model.md)** — the `coverImage` field, the `home.cover_image_id` column, the migration to generate and the SQL to verify it against, and the `Home` type change.
- **[contracts/cms-home-cover.md](./contracts/cms-home-cover.md)** — field name, type, optionality, admin description, and the independence guarantee between `coverImage` and `aboutPhoto`.
- **[contracts/home-hero-ui.md](./contracts/home-hero-ui.md)** — the DOM the e2e suite asserts against (`#home-hero`, the `<h1>` accessible name, the two brand spans, the CTA), plus the scrim stop values and the contrast invariant that `tests/integration/cover-contrast.test.ts` proves.
- **[quickstart.md](./quickstart.md)** — how to run the migration, seed, set and clear a cover, and execute each suite to validate SC-001 through SC-010.

## Notes for `/speckit-tasks`

- The migration must be produced with `pnpm migrate:create`, not hand-written; `data-model.md` records the expected SQL so the generated file can be checked rather than trusted.
- `pnpm types` has to run after the global changes, before anything imports the new field off `Home`.
- Two pre-existing issues sit adjacent to this work and are **out of scope** unless a task explicitly claims them: `src/app/(frontend)/page.tsx` passes `quality={85}` to the about photo, which Next 16 now coerces to 75 with a dev warning; and `og-default.png/route.tsx` builds its own two-bar brand treatment that could later be derived from `brand.ts`.
- `tests/e2e/home.spec.ts` locates the essence sentence positionally (`page.locator('section').first().getByText(/\S/).nth(1)`). The hero's DOM changes shape here, so that assertion must be re-anchored to the contract in `contracts/home-hero-ui.md` rather than patched.
