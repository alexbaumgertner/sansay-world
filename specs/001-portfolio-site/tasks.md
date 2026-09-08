---

description: "Task list for SanSay Portfolio Site implementation"
---

# Tasks: SanSay Portfolio Site

**Input**: Design documents from `/specs/001-portfolio-site/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: A targeted set of test tasks is included — not full TDD. Three sources make them
non-optional: constitution Principle VI ("enquiry-flow changes MUST be verified end-to-end
on every channel"), plan.md's named Vitest + Playwright stack, and quickstart.md's nine
validation scenarios. Test tasks map to those scenarios rather than covering every unit.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested,
and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1-US4)
- Exact file paths are included in every task

## Path Conventions

Single Next.js + Payload project at repository root, per plan.md: `src/app/(frontend)/`,
`src/app/(payload)/`, `src/collections/`, `src/globals/`, `src/lib/`, `src/hooks/`,
`src/components/`, `src/actions/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and the visual/config foundation

- [X] T001 Scaffold the Next.js 15 + Payload 3 application at repository root — `package.json`, `tsconfig.json`, `next.config.mjs`, and the `src/app/(frontend)/` + `src/app/(payload)/` route groups per plan.md
- [X] T002 Configure Payload core in `src/payload.config.ts`: `@payloadcms/db-postgres` adapter against `DATABASE_URI`, `PAYLOAD_SECRET`, admin route, Lexical rich text
- [X] T003 [P] Add the Vercel Blob storage plugin (`@payloadcms/storage-vercel-blob`) to `src/payload.config.ts`
- [X] T004 [P] Add the Resend email adapter (`@payloadcms/email-resend`) to `src/payload.config.ts`
- [X] T005 [P] Define the visual tokens in `tailwind.config.ts` and `src/lib/theme/tokens.ts`: `tone.live` `#e7a94c`, `tone.digital` `#9089ff`, condensed heading family, humanist body family (Constitution IV — these are the only place these values may appear)
- [X] T006 [P] Configure ESLint and Prettier in `.eslintrc.json` and `.prettierrc`
- [X] T007 [P] Create `.env.example` documenting `DATABASE_URI`, `PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `NEXT_PUBLIC_SERVER_URL`, and the optional `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
- [X] T008 Set the `build` script in `package.json` to `payload migrate && next build` so deploys apply migrations with no manual command (plan.md Deployment & Operations)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create `src/collections/Users.ts` — Payload auth collection; `create` access restricted to authenticated admins so no public registration path exists (FR-030, contracts/admin-access.md)
- [X] T010 Create `src/collections/Media.ts` — upload collection with **required** `alt`, image mime types, and `imageSizes` `thumbnail`/`card`/`gallery`/`og` per contracts/media-uploads.md
- [X] T011 [P] Create the Russian copy dictionary `src/lib/copy/ru.ts` and the `t()` resolver + locale registry in `src/lib/copy/index.ts` (Constitution V)
- [X] T012 [P] Enable the Russian admin UI locale via `@payloadcms/translations` in `src/payload.config.ts` (FR-029)
- [X] T013 [P] Create access-control helpers in `src/lib/access.ts`: `adminOnly` and `publishedOrAdmin` (the published-filter used by every public read)
- [X] T014 ~~Create the revalidation hook factory `src/hooks/revalidate.ts`~~ — **superseded**: Next.js 16's `revalidateTag` now requires a cache-profile argument, and its data-model pages are dynamically rendered by default with no `'use cache'` opt-in, so every request already reads current Postgres state. No revalidation hook exists or is needed; a Save in `/admin` is live on the next request. See plan.md's Implementation note and research.md.
- [X] T015 Create `src/app/layout.tsx`, `src/app/(frontend)/layout.tsx`, and `src/app/globals.css` — fonts, theme tokens, semantic landmarks
- [X] T016 Mount Payload in `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/api/[...slug]/route.ts`, and `src/app/(payload)/layout.tsx`
- [X] T017 Wire type generation — `payload generate:types` → `src/payload-types.ts`, exposed as a `pnpm types` script
- [X] T018 Generate and commit the initial migration in `migrations/`

**Checkpoint**: Payload admin loads, auth works, media uploads land in Blob — user stories can begin

---

## Phase 3: User Story 1 - Discover the disciplines and open one (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor understands who SanSay is within one screen and can see every discipline and open the relevant one within one scroll.

**Independent Test**: Load the home page cold and confirm the offer is identifiable without scrolling, every published discipline is reachable within one scroll, and each card opens a working discipline page — no enquiry or admin functionality needed.

- [X] T019 [P] [US1] Create `src/collections/Disciplines.ts` — name, unique `slug`, strapline, richText description, `tone` select(`live`|`digital`), `order`, `published`, `coverImage`, `seo` group; attach revalidate hooks (data-model.md)
- [X] T020 [P] [US1] Create `src/collections/WorkSamples.ts` — title, `discipline` relationship, description, optional `image`, optional URL-validated `externalVideoUrl`, `order`, `published`; admin list filterable by discipline
- [X] T021 [P] [US1] Create `src/globals/HomePage.ts` — name, `essenceSentence`, `aboutPhoto`, `bioParagraphs` (2-3), `replyWindowCopy`, `seo`
- [X] T022 [US1] Register Disciplines, WorkSamples, and HomePage in `src/payload.config.ts`; regenerate types and the migration
- [X] T023 [P] [US1] Create `src/lib/data/disciplines.ts` — `getPublishedDisciplines()` (sorted by `order`, tag-cached), `getDisciplineBySlug()`, `getNeighbours()`
- [X] T024 [P] [US1] Create `src/lib/data/work-samples.ts` and `src/lib/data/home.ts`
- [X] T025 [US1] Build `src/components/Nav.tsx` rendering entirely from `getPublishedDisciplines()` — no discipline name, slug, or id may appear in code (Constitution II)
- [X] T026 [P] [US1] Build `src/components/DisciplineCard.tsx` applying the `tone`-selected accent token (never a literal hex)
- [X] T027 [P] [US1] Build `src/components/Gallery.tsx` rendering work samples with the `card`/`gallery` image sizes and external video links (FR-007, FR-008)
- [X] T028 [US1] Build the home page `src/app/(frontend)/page.tsx` — above-the-fold name + essence sentence + CTA, about block with photo and bio paragraphs, discipline cards within one scroll (FR-001 to FR-004)
- [X] T029 [US1] Build the discipline page `src/app/(frontend)/[slug]/page.tsx (shared discipline/page route)` — heading, strapline, description, gallery, link home and to neighbouring disciplines (FR-006 to FR-008, FR-011)
- [X] T030 [US1] Add `generateMetadata` to `src/app/(frontend)/page.tsx` and `src/app/(frontend)/[slug]/page.tsx (shared discipline/page route)` — title, description, and OG image from the `seo` group falling back to the `og` media size (FR-027)
- [X] T031 [US1] Write `tests/e2e/home-and-disciplines.spec.ts` — first screen without scrolling, all disciplines within one scroll, card → page navigation, 375px viewport with no horizontal scroll (quickstart Scenario F)

**Checkpoint**: The public portfolio is browsable and shippable on its own — this is the MVP

---

## Phase 4: User Story 2 - Send an enquiry that reliably reaches the owner (Priority: P2)

**Goal**: A visitor submits a discipline-scoped enquiry, sees a confirmation stating when to expect a reply, and the enquiry reaches the owner through email and (when configured) Telegram — surviving the failure of either channel.

**Independent Test**: Submit the form on any discipline page and confirm the enquiry is stored, confirmed to the visitor, and delivered — then break one channel and confirm the enquiry still counts as received with the failure visible in the admin.

- [X] T032 [P] [US2] Create `src/collections/Enquiries.ts` — name, preferredContactMethod, optional desiredDate, jobDescription, `discipline` relationship, `status` select(`new`|`in_progress`|`closed`), readOnly `delivery` group, `deliveryFailed`; access `create: public`, read/update/delete admin-only (data-model.md, contracts/admin-access.md)
- [X] T033 [P] [US2] Create `src/globals/SiteSettings.ts` — `ownerNotificationEmail` (the mandatory channel's destination)
- [X] T034 [US2] Register Enquiries and SiteSettings in `src/payload.config.ts`; regenerate types and the migration
- [X] T035 [P] [US2] Create the Zod schema `src/lib/validation/enquiry.ts` shared by the form and the server action
- [X] T036 [P] [US2] Implement the email channel `src/lib/delivery/email.ts` — Resend via Payload's adapter, message body containing every field plus a deep link to the document in `/admin` (FR-013)
- [X] T037 [P] [US2] Implement the Telegram channel `src/lib/delivery/telegram.ts` — `isEnabled()` true only when both env vars are present; outbound `sendMessage` via `fetch` (FR-014)
- [X] T038 [US2] Implement the dispatcher `src/lib/delivery/dispatch.ts` — `Promise.allSettled` across channels, ~5s per-channel timeout, `ChannelResult` per channel, never throws (contracts/notification-delivery.md)
- [X] T039 [US2] Implement the `afterChange` hook `src/hooks/notifyOnEnquiry.ts` — create-only, dispatch, write outcomes back with `context: { skipNotify: true }` **recursion guard**, set `deliveryFailed` when any channel failed
- [X] T040 [US2] Implement the server action `src/actions/submitEnquiry.ts` in the exact order from contracts/enquiry-submit.md — honeypot/bot check → Zod validate → `payload.create` → return `replyWindowCopy`; never confirm before the document is committed (FR-016, FR-017)
- [X] T041 [US2] Build `src/components/EnquiryForm.tsx` — discipline pre-filled and visible, native keyboard-operable controls, hidden honeypot, confirmation state showing the reply window (FR-009, FR-010, FR-016)
- [X] T042 [US2] Mount the enquiry form on `src/app/(frontend)/[slug]/page.tsx (shared discipline/page route)`
- [X] T043 [US2] Configure the Enquiries admin list in `src/collections/Enquiries.ts` — columns `submittedAt`, `discipline`, `name`, `status`, `deliveryFailed` (indexed, so the owner can filter/sort on it directly in the list UI — Payload has no distinct "saved filter" concept beyond that) (FR-015)
- [X] T044 [P] [US2] Write `tests/integration/dispatch.test.ts` — a throwing channel never propagates out of the hook, `disabled` is not counted as a failure, outcomes are recorded per channel
- [X] T045 [P] [US2] Write `tests/e2e/enquiry-flow.spec.ts` — quickstart Scenarios A, B1, B2, and C
- [X] T046 [US2] Verify Principle VI end-to-end against every configured channel per quickstart Scenario B — mandatory before this story is considered done

**Checkpoint**: Enquiries are captured durably and delivered redundantly; US1 still works untouched

---

## Phase 5: User Story 3 - Manage content and add a new discipline without a developer (Priority: P3)

**Goal**: The owner runs the whole site from `/admin` — editing copy, work samples, and images, and adding a discipline that appears everywhere on its own.

**Independent Test**: Acting as the non-developer owner, create a discipline end-to-end in the admin and confirm it reaches the home page, navigation, and enquiry topic list with no code change and no deploy.

- [X] T047 [US3] Add Russian `admin.description` text, field labels, and `useAsTitle` to every collection and global in `src/collections/` and `src/globals/` (the owner is the only user of these screens)
- [ ] T048 [US3] **Deferred** — Payload's native `orderable` collection option is `@experimental` (flagged for frequent breaking changes upstream); the owner reorders by editing the numeric `order` field instead, which fully satisfies FR-004/FR-007 without depending on an unstable API. Revisit if Payload stabilizes `orderable`.
- [X] T049 [US3] ~~Wire the T014 revalidate factory~~ — not applicable, see T014: dynamic rendering makes every content collection and global live on save with no revalidation hook needed (verified end-to-end by `tests/e2e/discipline-lifecycle.spec.ts`).
- [X] T050 [P] [US3] Write the seed script `scripts/seed.ts` — first admin user plus minimal home and discipline content for a usable dev environment
- [X] T051 [P] [US3] Write `tests/e2e/discipline-lifecycle.spec.ts` — create a discipline in the admin, then assert it appears in the nav, on the home page with the correct tone accent and order, in the enquiry form's topic list, and at its own route; reorder and assert the home page order changes (quickstart Scenario D)
- [X] T052 [P] [US3] Write `tests/e2e/admin-access.spec.ts` — `/admin` redirects when signed out, unauthenticated `/api/enquiries` returns no documents, no registration route exists (quickstart Scenario I)
- [X] T053 [US3] Verify the enquiry status flow in the admin — `new` → `in_progress` → `closed` and back — persists and is visible in the list (FR-012)
- [X] T054 [US3] Write the owner handover guide in Russian at `docs/admin-guide.ru.md` — signing in, adding a discipline, adding work samples, uploading images, reading and triaging enquiries

**Checkpoint**: The owner is self-sufficient; no developer is required for any routine content change

---

## Phase 6: User Story 4 - Reach the hidden "Friends" story by direct link (Priority: P4)

**Goal**: A chaptered story page reachable by anyone holding its URL, absent from navigation, on-site search, and the sitemap, and excluded from indexing — unadvertised, not secured.

**Independent Test**: Open the page's direct URL with no authentication and confirm it renders, then audit nav HTML, `sitemap.xml`, `robots.txt`, and the page's own metadata to confirm it appears in none of them.

- [X] T055 [P] [US4] Create `src/collections/Pages.ts` — title, unique `slug`, `chapters` array (optional heading, richText body, photo uploads), `showInNav`, `includeInSitemap`, `noindex`, `seo` group (data-model.md)
- [X] T056 [US4] Register Pages in `src/payload.config.ts`; regenerate types and the migration
- [X] T057 [US4] Build the page route `src/app/(frontend)/[slug]/page.tsx (shared discipline/page route)` — renders chapters with photographs; `generateMetadata` emits `robots: { index: false, follow: false }` when `noindex` is set (FR-023, FR-028)
- [X] T058 [US4] Filter the nav by `showInNav` in `src/components/Nav.tsx` (FR-024)
- [X] T059 [P] [US4] Build `src/app/(frontend)/sitemap.ts` — home, published disciplines, and only pages with `includeInSitemap: true`
- [X] T060 [P] [US4] Build `src/app/(frontend)/robots.ts` — disallow `/admin/`, `/api/`, and the Friends path; reference the sitemap
- [X] T061 [P] [US4] Write `tests/e2e/friends-exclusion.spec.ts` — direct URL loads without auth, absent from nav and sitemap, `noindex` present, and **still hidden after renaming the slug** (proving exclusion follows data, not a hardcoded path) (quickstart Scenario E)

**Checkpoint**: All four specified user stories are independently functional

---

## Phase 7: Beyond Current Spec — Posts, Gear, Presets, Shows

**⚠️ BLOCKED ON SPECIFICATION**: `spec.md` has no functional requirements or acceptance
criteria for these content types or the shows map. They come from the owner's technical
direction and constitution Principle III, not from the spec. Do **not** start this phase
until `/speckit-specify` has extended spec.md — otherwise these ship without acceptance
criteria. See plan.md's Scope Note.

- [ ] T062 Run `/speckit-specify` to add functional requirements and acceptance criteria for posts, gear, presets, shows, and the shows map — blocking gate for every task below
- [ ] T063 [P] Create `src/collections/Posts.ts` — title, unique slug, excerpt, richText body, coverImage, publishedAt, published, seo
- [ ] T064 [P] Create `src/collections/Gear.ts` — name, richText description, image list, optional discipline relationship, order
- [ ] T065 [P] Create `src/collections/PresetFiles.ts` — upload collection for archives/audio, no image sizes (contracts/media-uploads.md)
- [ ] T066 [P] Create `src/collections/Presets.ts` — title, description, `file` relationship to PresetFiles, format, optional image, order, published
- [ ] T067 [P] Create `src/collections/Shows.ts` — title, indexed date, venue, city, **optional** `point` location, optional ticketUrl, published
- [ ] T068 Register Posts, Gear, PresetFiles, Presets, and Shows in `src/payload.config.ts`; regenerate types and the migration
- [ ] T069 [P] Build `src/app/(frontend)/posts/page.tsx` and `src/app/(frontend)/posts/[slug]/page.tsx`
- [ ] T070 [P] Build `src/app/(frontend)/gear/page.tsx` and `src/app/(frontend)/presets/page.tsx` (preset downloads served from Blob)
- [ ] T071 Build `src/app/(frontend)/shows/page.tsx` — the shows **list rendered server-side and unconditionally**, sorted by date (contracts/shows-map.md)
- [ ] T072 Build `src/components/ShowsMap.tsx` — `react-leaflet` with OpenStreetMap tiles, `dynamic(..., { ssr: false })`, error boundary, required OSM attribution, `aria-hidden` where the list duplicates its content
- [ ] T073 [P] Write `tests/e2e/shows-map.spec.ts` — list renders with JavaScript disabled, list survives blocked tile requests, a show with no coordinates still appears (quickstart Scenario G)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T074 [P] Accessibility pass across `src/components/` and `src/app/(frontend)/` — semantic landmarks, heading hierarchy, global focus-visible styles, keyboard-only enquiry submission (FR-031, quickstart Scenario H)
- [X] T075 [P] Verify both accent tokens and body text meet WCAG AA contrast on the dark background; adjust `src/lib/theme/tokens.ts` if any fall short
- [X] T076 [P] Performance pass — confirm cards and galleries request named image sizes and never originals; measure home and discipline LCP against the < 2.0s 4G mobile target
- [X] T077 Security check — confirmed unauthenticated `/api/enquiries` returns a 403 (verified live and in `tests/e2e/admin-access.spec.ts`); GraphQL is not mounted in this app (REST only), so that surface doesn't exist to check
- [X] T078 [P] Verify no user-facing string exists outside `src/lib/copy/` (Constitution V) — add a lint rule or grep check to `package.json` scripts
- [X] T079 [P] Verify no accent hex value or font-family name exists outside `tailwind.config.ts` and `src/lib/theme/tokens.ts` (Constitution IV)
- [ ] T080 Set up the Vercel project — Git integration, environment variables, Neon Postgres and Vercel Blob provisioning, production domain — **requires the owner's/developer's real Vercel account; not performed in this implementation pass**
- [X] T081 Confirm the deployment contract locally — `payload migrate && next build` succeeds end-to-end (verified); a content Save (Local API create) is visible on the next request with no rebuild (verified via `discipline-lifecycle.spec.ts`). The equivalent check against a real Vercel deployment still needs doing once T080 is complete.
- [X] T082 Ran quickstart.md Scenarios A, B1 (live), B2 (proven at the dispatcher-unit level, not against a genuinely misconfigured Resend key), C, D, E, F, and I — all pass. Scenario G is gated behind Phase 7 (T062). Scenario H (accessibility) is satisfied by construction (semantic HTML, required alt text, native keyboard-operable controls) but not run through an automated audit tool.
- [X] T083 [P] Reconcile `specs/001-portfolio-site/` docs with anything that changed during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks all user stories**
- **User Stories (Phases 3-6)**: all depend on Foundational; can then run in parallel if staffed, or sequentially P1 → P2 → P3 → P4
- **Beyond Spec (Phase 7)**: blocked by T062 (`/speckit-specify`), and depends on Foundational
- **Polish (Phase 8)**: depends on the user stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: depends only on Foundational. No story dependencies.
- **US2 (P2)**: depends only on Foundational. Its form mounts on the US1 discipline page (T042), so US1's route should exist first in practice — but the enquiry flow itself is independently testable.
- **US3 (P3)**: depends on Foundational; its verification (T051) exercises US1 and US2 surfaces, since "a new discipline appears everywhere" is only meaningful once those surfaces exist.
- **US4 (P4)**: depends only on Foundational. Fully independent of US1-US3.

### Within Each User Story

Collections → registration/migration → data access → components → routes → metadata → tests.

### Parallel Opportunities

- T003-T007 (Setup) run together
- T011, T012, T013 (Foundational) run together
- T019, T020, T021 (US1 collections) run together; then T023, T024; then T026, T027
- T032, T033 and T035, T036, T037 (US2) run together
- T059, T060, T061 (US4) run together
- Most of Phase 8 runs in parallel
- With multiple developers, US1/US2/US4 can proceed simultaneously after Phase 2

---

## Parallel Example: User Story 1

```bash
# Collections first (independent files):
Task: "Create src/collections/Disciplines.ts"
Task: "Create src/collections/WorkSamples.ts"
Task: "Create src/globals/HomePage.ts"

# Then data access (independent files):
Task: "Create src/lib/data/disciplines.ts"
Task: "Create src/lib/data/work-samples.ts and src/lib/data/home.ts"

# Then presentational components (independent files):
Task: "Build src/components/DisciplineCard.tsx"
Task: "Build src/components/Gallery.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 (US1)
2. **STOP and VALIDATE**: quickstart Scenario F plus the US1 independent test
3. This is a genuinely shippable portfolio: the work is visible, the site is crawlable and
   shareable, and the owner can already edit content through `/admin` (Payload gives that
   for free once the collections exist)

### Incremental Delivery

1. Setup + Foundational → admin usable
2. + US1 → **MVP: the portfolio is public** → deploy
3. + US2 → enquiries arrive redundantly → deploy
4. + US3 → owner fully self-sufficient, handover guide written → deploy
5. + US4 → hidden Friends story → deploy
6. Phase 7 only after `/speckit-specify` extends the spec

### Suggested MVP scope

**Phases 1-3 (T001-T031)** — 31 tasks. Delivers User Story 1 in full.

---

## Notes

- The single most likely implementation bug in this feature is omitting
  `context: { skipNotify: true }` in T039 — without it the `afterChange` hook recurses
  infinitely. It is a contract term, not a detail.
- T046 is a constitution-mandated verification gate (Principle VI), not an optional check.
- T062 is a hard gate: Phase 7 ships content types that currently have no acceptance
  criteria. Do not start it early.
- `[P]` tasks touch different files and have no incomplete dependencies.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently.
