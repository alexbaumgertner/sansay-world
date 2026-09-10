---
description: "Task list for Home Opening Screen Cover & Brand Mark"
---

# Tasks: Home Opening Screen Cover & Brand Mark

**Input**: Design documents from `/specs/003-home-hero-cover/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. [plan.md](./plan.md) names Vitest integration and Playwright e2e suites, [quickstart.md](./quickstart.md) maps SC-001–SC-010 onto those suites, and the UI contract in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) is the assertion surface. Tests here are requirements, not an optional extra.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Include exact file paths in descriptions

## Path Conventions

Single project, extending the existing layout: `src/` and `tests/` at the repository root. Visual-identity code stays under `src/lib/theme/`; presentation under `src/components/`.

**Out of scope** (recorded in [plan.md](./plan.md), do not absorb): `quality={85}` on the about photo in `src/app/(frontend)/page.tsx`; deriving `og-default.png` from `brand.ts`; inserting `coverImage` into the `seo.ogImage` fallback chain.

---

## Phase 1: Setup (Shared Visual Constants)

**Purpose**: The numbers the scrim, the contrast test, and the CSS must all agree on, in one place each

- [ ] T001 Export `inkTokens` (`DEFAULT: '#0b0b0d'`, `raised: '#151317'`) and `coverScrimTokens` (`textZoneMinAlpha: 0.85`, `navBandMinAlpha: 0.65`) from `src/lib/theme/tokens.ts`, matching [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §5. Do not add a third accent colour.
- [ ] T002 [P] Add `:root` custom properties `--cover-scrim-text-alpha: 0.85` and `--cover-scrim-nav-alpha: 0.65`, plus `.cover-scrim-text`, `.cover-scrim-top`, and `.brand-mark` (`font-size: clamp(2.5rem, min(13vw, 16vh), 9rem); line-height: 0.95`) to `src/app/globals.css`, using the exact gradient stops in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §3. Scrim colour is `ink` (`11 11 13`) at alpha, never a new hue. Also add `body:has(#home-hero) > header { position: absolute; inset-inline: 0; top: 0; z-index: 10; }` so the nav overlays the hero without changing `src/app/(frontend)/layout.tsx` (research R9)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The CMS field, migration, brand-mark rule, contrast proof, and e2e fixtures every story reads

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. T006 must land before anything imports `Home.coverImage`.

- [ ] T003 Add optional `coverImage` (`type: 'upload'`, `relationTo: 'media'`, not required, no default) to `src/globals/HomePage.ts` immediately before `aboutPhoto`, with the Russian `admin.description` from [data-model.md](./data-model.md). Do not read `aboutPhoto` as a fallback and do not add owner controls for brand colours or split index (FR-011, FR-018, FR-020, FR-021)
- [ ] T004 Generate the migration with `pnpm migrate:create home_cover_image` and verify the emitted SQL in `migrations/` against [data-model.md](./data-model.md): `home.cover_image_id uuid`, FK to `media(id)` `ON DELETE set null`, index `home_cover_image_idx`. Do not hand-write the file; do not add `IF NOT EXISTS` guards
- [ ] T005 Register the new migration in `migrations/index.ts` in timestamp order after `20260910_131500_visitor_rels_columns`
- [ ] T006 Run `pnpm types` so `Home` in `src/payload-types.ts` gains `coverImage?: (string | null) | Media`. Confirm `src/lib/data/home.ts` needs no change
- [ ] T007 [P] Create `src/lib/theme/brand.ts` exporting `BRAND_MARK = 'SanSay'` and `splitBrandMark(name)` per [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §4: whole-string trim, case-insensitive match, halves sliced from the caller's string (never from the constant), `null` for any other name including `'SanSay Studio'`
- [ ] T008 Add `tests/integration/brand-mark.test.ts` covering the full input/output table in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §4 (`SanSay`, padded, `SANSAY`, `sansay`, `SanSay Studio`, a non-Latin name, empty string). Depends on T007
- [ ] T009 [P] Add `tests/integration/cover-contrast.test.ts` asserting the three invariants in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §5: WCAG ratios of essence / `tone-live` / `tone-digital` over ink-at-`textZoneMinAlpha`-over-white; nav `#f5f5f5` over ink-at-`navBandMinAlpha`-over-white; and that `--cover-scrim-text-alpha` / `--cover-scrim-nav-alpha` parsed from `src/app/globals.css` equal `coverScrimTokens`
- [ ] T010 [P] Create `tests/e2e/fixtures/images.ts` with `nearWhiteCover()` (~2000×1200, `#fdfdfd`) and `busyCover()` (~2000×1200, high-frequency full-range noise) synthesized via `sharp` (already a dependency), returning PNG buffers — no committed binaries
- [ ] T011 Extend `tests/e2e/fixtures/cms.ts` with `uploadMedia({ data, filename, alt })`, `setHomeCover(mediaId)`, and `clearHomeCover()`, each capturing the prior `coverImage` and restoring it in `undo`. Writes go through the Local API, not `payload.db`

**Checkpoint**: Schema migrated, `Home.coverImage` typed, brand-mark rule proven, contrast math proven, fixtures can set and clear a cover. User stories can begin.

---

## Phase 3: User Story 1 - Arrive at a cover that says who this is (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor sees a full-bleed cover, a large two-tone brand mark, the essence sentence, and the disciplines control, all in the first viewport and all legible over the photograph.

**Independent Test**: Load `/` with a cover set, at 1280×800 and at 390×844. The photograph fills the first viewport edge to edge; name, essence, and CTA are in view without scrolling; the `<h1>` accessible name is the whole owner name; the CTA still goes to `#disciplines`.

- [ ] T012 [P] [US1] Create `src/components/BrandMark.tsx`: one `<h1 className="brand-mark">`; when `splitBrandMark` returns halves, two adjacent `<span>`s (`text-tone-live` then `text-tone-digital`) with no interpolating space; otherwise the bare name in the inherited colour. Render `name` from props, never `BRAND_MARK` (FR-009–FR-013)
- [ ] T013 [US1] Create `src/components/HomeHero.tsx` as a **server** component matching [contracts/home-hero-ui.md](./contracts/home-hero-ui.md) §1: `id="home-hero"`, `relative isolate overflow-hidden bg-ink`, `min-h-screen min-h-[100svh]`. Guard `hasCover` with `Boolean(cover) && typeof cover === 'object' && Boolean(cover.url)`. Covered: `next/image` `fill`, `sizes="100vw"`, `className="object-cover"`, `loading="eager"`, `fetchPriority="high"`, original `url` (not a named size), `alt=""`, **no** `priority` and **no** `quality`. Both scrim `div`s always present, `aria-hidden="true"`. Content column: `BrandMark`, one `<p>` of `home.essenceSentence` in solid `text-neutral-100` (drop `opacity-90`), CTA `href="#disciplines"` labelled `t('home.ctaToDisciplines')`. Layout invariant: mobile `justify-end` with content ≤ 55% of height; from `md:` `max-w-[40vw]` plus `px-6` so the column stays inside the 44% strong band (FR-001–FR-008, FR-014–FR-017)
- [ ] T014 [US1] Replace the inline opening `<section>` in `src/app/(frontend)/page.tsx` with `<HomeHero home={home} />`. Leave the about block, disciplines list, and `generateMetadata` (`seo.ogImage ?? aboutPhoto`) unchanged
- [ ] T015 [P] [US1] Re-anchor `tests/e2e/home.spec.ts` onto `#home-hero`: `h1`, `#home-hero p`, and the CTA link. Drop `page.locator('section').first().getByText(/\S/).nth(1)`. Keep the FR-001 in-viewport assertions
- [ ] T016 [P] [US1] Create `tests/e2e/home-cover.spec.ts` (uses `cms` fixture): with `nearWhiteCover()` set, assert `#home-hero` bounding box equals the viewport, computed `object-fit: cover` on the img, header overlays rather than displacing (no dark bar above the photograph), `h1` / `p` / CTA `toBeInViewport()`, `h1` `toHaveAccessibleName` equal to CMS `home.name`, computed `h1` `font-size` ≥ 96px at 1280×800, both brand spans' computed colours match `tone-live` / `tone-digital`, CTA keyboard-focusable with non-zero `outline-width` (SC-001, SC-003, SC-005, SC-008, SC-009)
- [ ] T017 [P] [US1] Extend `tests/e2e/responsive.spec.ts` with a phone-landscape case (`viewport: { width: 844, height: 390 }`) asserting name, essence, and CTA are in viewport without scrolling and without horizontal overflow (SC-004). Keep the existing 390×844 CTA-in-viewport case, now against `#home-hero`

**Checkpoint**: The covered opening screen is the site's first impression, and FR-001 still holds.

---

## Phase 4: User Story 2 - Owner changes the cover photograph without a developer (Priority: P2)

**Goal**: The owner sets, replaces, or clears the cover from the admin; the about-block photograph is a different field and does not move.

**Independent Test**: Acting as the owner, set a cover via the same path the admin uses (Local API / admin panel), reload `/`, confirm the new image; change `aboutPhoto` and confirm the cover is unchanged, and vice versa.

**Note**: The `coverImage` column landed in Phase 2 so US1 could render a persisted cover. This story owns the owner-facing contract: independence from `aboutPhoto`, set / replace / clear, and that `media.alt` is still required.

- [ ] T018 [US2] Extend `tests/e2e/home-cover.spec.ts`: `setHomeCover` then reload asserts `#home-hero img` is present; replace with a second upload and assert the `src` changes; `updateGlobal` on `aboutPhoto` alone leaves `coverImage` byte-identical and the about-block `<img>` count stays 1; `updateGlobal` on `coverImage` alone leaves `aboutPhoto` byte-identical (FR-019, FR-020, SC-006)
- [ ] T019 [P] [US2] Add `tests/integration/home-cover-field.test.ts` asserting `payload.updateGlobal({ slug: 'home', data: { name, essenceSentence, bioParagraphs, replyWindowCopy } })` succeeds with `coverImage` omitted, and that creating `media` without `alt` is rejected — `media.alt` remains `required: true` in `src/collections/Media.ts` (FR-021, FR-022)
- [ ] T020 [P] [US2] Confirm `scripts/seed.ts` does **not** set `coverImage`, so a fresh environment boots into the uncovered state that US3 and every existing install start from

**Checkpoint**: The owner can change the cover without a developer, and the about photo is a separate field.

---

## Phase 5: User Story 3 - Opening screen holds up with no cover set (Priority: P3)

**Goal**: Missing or unretrievable cover still yields a complete first viewport — name, essence, CTA, no empty frame.

**Independent Test**: With `coverImage` empty, load `/` at desktop and phone: full-height opening screen, no `<img>` in `#home-hero`, all three elements in view. Then set a cover and block its media request: same visitor-visible result.

**Note**: T013 already implements the `hasCover` guard. This story verifies the uncovered and unretrievable states and forbids leftover artefacts.

- [ ] T021 [US3] After `cms.clearHomeCover()`, extend `tests/e2e/home-cover.spec.ts`: `#home-hero img` count is 0; both scrim elements still present; section height still fills the viewport; `h1`, `p`, and CTA in viewport at 1280×800 and 390×844; no broken-image text, empty frame, or placeholder graphic (FR-023, FR-024, SC-007)
- [ ] T022 [US3] In `tests/e2e/home-cover.spec.ts`, with a cover set, route-block the media URL and assert `h1`, `p`, and CTA remain visible and in viewport (FR-017, FR-026, SC-010). Empty `alt=""` must not paint broken-image fallback text
- [ ] T023 [P] [US3] Add an uncovered-backdrop case to `tests/integration/cover-contrast.test.ts`: essence / brand tones / CTA (`tone-live` fill on `ink`) meet the site's baseline against solid `inkTokens.DEFAULT`, which is the uncovered `bg-ink` (FR-025)

**Checkpoint**: A missing cover is a valid launch state, not an error path.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Scan the diff for Constitution IV/V leaks: no literal hex or font name in `src/components/HomeHero.tsx` or `src/components/BrandMark.tsx`; no new key in `src/lib/copy/ru.ts`; `BRAND_MARK` never rendered. `tests/integration/copy.test.ts` should still pass unchanged
- [ ] T025 [P] Confirm `src/app/(frontend)/layout.tsx` and `src/components/Nav.tsx` are untouched — overlay is CSS-only via `body:has(#home-hero)`
- [ ] T026 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` against a migrated database (`pnpm migrate` if the new migration is not yet applied)
- [ ] T027 Walk every automated row in [quickstart.md](./quickstart.md) Criterion coverage, then the three manual checks (real-phone `svh`, screen-reader "SanSay" once, whether the cover still reads as a photograph). If the strong band hides too much image, adjust **shape** of `.cover-scrim-text` in `src/app/globals.css`, not `--cover-scrim-text-alpha`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — blocks every user story. T003 → T004 → T005 → T006 is sequential. T007 may start in parallel with T003. T008 needs T007. T009 needs T001 and T002. T011 needs T006
- **US1 (Phase 3)**: depends on Phase 2. T012 before T013; T013 before T014; T014 before the e2e tasks
- **US2 (Phase 4)**: depends on Phase 2 (field + fixtures). Can start after T014 if the hero is on the page; in practice follows US1 because it asserts on `#home-hero img`
- **US3 (Phase 5)**: depends on T013's `hasCover` guard; follows US1. Extends the same `home-cover.spec.ts` as US2, so US2 and US3 should be sequential on that file
- **Polish (Phase 6)**: depends on the stories being implemented

### User Story Dependencies

- **US1 (P1)**: independent once Phase 2 is done — the MVP
- **US2 (P2)**: needs the hero on the page to confirm a saved cover appears; follows US1 in practice
- **US3 (P3)**: hardens the uncovered branch T013 already shipped; must follow US1 rather than run beside it

### Parallel Opportunities

- T001 and T002 in Setup
- In Phase 2: T007 with T003; T008, T009, T010 once their inputs exist
- In US1: T015, T016, and T017 after T014 (three different spec files)
- In US2: T019 (`tests/integration/home-cover-field.test.ts`) and T020 (`scripts/seed.ts`) after the hero is on the page
- T024 and T025 in Polish

---

## Parallel Example: Phase 2

```bash
# After T001–T002:
Task: "Add coverImage to src/globals/HomePage.ts"
Task: "Create src/lib/theme/brand.ts"
# then sequentially: migrate:create → register → pnpm types
# in parallel after those:
Task: "tests/integration/brand-mark.test.ts"
Task: "tests/integration/cover-contrast.test.ts"
Task: "tests/e2e/fixtures/images.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Create src/components/BrandMark.tsx"
# then HomeHero (imports BrandMark), then page.tsx
# then in parallel:
Task: "Create tests/e2e/home-cover.spec.ts (covered cases)"
Task: "Extend tests/e2e/responsive.spec.ts (phone landscape)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational — **T006 before any `Home.coverImage` import**
3. Phase 3 User Story 1
4. **Stop and validate**: load `/` with a cover; name, essence, CTA in the first viewport on desktop and phone
5. Demo-able as the new opening screen

### Incremental Delivery

1. Setup + Foundational → field, tokens, brand rule, fixtures
2. US1 → covered hero ships → validate SC-001/SC-003/SC-004/SC-005
3. US2 → owner can swap the photograph → validate SC-006
4. US3 → empty cover is safe → validate SC-007/SC-010
5. Polish → constitution scan + quickstart

### Parallel Team Strategy

After Phase 2, one person takes US1 then US3 (the whole opening-screen path, kept in one head). A second person can take US2's owner-contract tests once T014 has `#home-hero` on the page.

---

## Notes

- `[P]` means different files and no dependency on incomplete work
- `#home-hero` is load-bearing twice: tests hook on it, and `globals.css` keys the header overlay on it — renaming it breaks layout, not just assertions
- The two BrandMark `<span>`s must not have a space between them; the proof is `toHaveAccessibleName(home.name)`, not a source-formatting rule
- `--cover-scrim-text-alpha` is 0.85 because `tone-digital` is the binding contrast case (research R3). Do not lower it to "show more photograph"
- Next 16: `loading="eager"` + `fetchPriority="high"`, never `priority`; omit `quality` so it stays on the `[75]` allowlist
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own
