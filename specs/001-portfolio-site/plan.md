# Implementation Plan: SanSay Portfolio Site

**Branch**: `001-portfolio-site` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-portfolio-site/spec.md`, plus explicit
technical direction from the owner: build on Payload CMS, Payload admin as the owner's
admin panel, Next.js frontend in the same application.

## Summary

A single Next.js 15 application with Payload CMS 3 mounted inside it: Payload owns the
content models (disciplines, work samples, posts, gear, presets, shows, pages, media,
enquiries) and supplies the admin panel the owner works in, while the `(frontend)` route
group renders the public site from the same database via Payload's Local API. Enquiries
are a Payload collection with a changeable status; an `afterChange` hook fans each new
enquiry out to email (mandatory) and Telegram (enabled by environment variable), records
per-channel outcomes back onto the document, and never throws — so a delivery failure is
visible in the admin without ever cancelling the stored enquiry. Hosting is Vercel with
Git-triggered deploys, Neon Postgres, and Vercel Blob: the owner publishes by pressing
Save in `/admin`, and never runs a build.

## Scope Note (read before Phase 2)

The owner's technical direction names four content types that **`spec.md` does not yet
have functional requirements for**: `posts`, `gear`, `presets`, and `shows` (plus a shows
map with open tiles). The project constitution's Principle III explicitly names "posts,
presets, shows" as content the owner must be able to edit, so modelling them now is
consistent with governance — but their public pages have no acceptance criteria in the
spec.

**Decision**: this plan defines the collections and admin surfaces for all four, because
that is what the owner asked for and it costs little to model them once. Their **public
pages and the shows map are planned but flagged**, and `/speckit-specify` should extend
spec.md with FRs for them before `/speckit-implement` builds those pages, so they get
real acceptance criteria. Everything the current spec does cover (home, discipline pages,
enquiry flow, admin content ops, hidden Friends page, mobile/SEO/a11y) is fully planned
below and needs no further specification.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22.x

**Primary Dependencies**:
- `payload` 3.x + `@payloadcms/next` — CMS and admin mounted inside the Next.js app
- `next` 15 (App Router), React 19
- `@payloadcms/db-postgres` — Postgres adapter (Drizzle-backed, managed by Payload)
- `@payloadcms/storage-vercel-blob` — media files stored in Vercel Blob, not on disk
- `@payloadcms/richtext-lexical` — rich text for posts, page chapters, discipline copy
- `@payloadcms/email-resend` — Payload's email adapter, used by the enquiry hook
- `@payloadcms/translations` — Russian admin UI locale
- `sharp` — image size generation at upload time
- `react-leaflet` + `leaflet` — shows map, OpenStreetMap raster tiles, no API key
- `zod` — validation of the public enquiry form payload before it reaches Payload
- Tailwind CSS — theme tokens for the two accent colors and the two typefaces

**Storage**: Neon Postgres (provisioned through the Vercel Marketplace) holds every
collection including enquiries — content and enquiries share one database, as directed.
Uploaded files (images, preset binaries) live in Vercel Blob and are referenced by
Payload's media documents; the database stores metadata and URLs only.

**Testing**: Vitest for unit/integration tests driven through Payload's Local API
(collection validation, the notification dispatcher, the copy layer); Playwright for
end-to-end flows (enquiry submission → admin visibility, new discipline → home/nav/form
propagation, Friends page exclusion, map degradation).

**Target Platform**: Vercel (Node.js runtime / Fluid Compute — Payload needs Node APIs and
`sharp`, so no Edge runtime), modern evergreen browsers, mobile-first.

**Project Type**: Web application — one Next.js project containing the public frontend,
the Payload admin, and Payload's REST/GraphQL endpoints. No separate backend service.

**Performance Goals**: home and discipline pages LCP < 2.0s on 4G mobile; enquiry
submission response < 1.5s (the document write is awaited, channel delivery is not);
admin list/edit views < 1.5s; image payloads served from pre-generated sizes, never
full-resolution originals.

**Constraints**: The owner is not a developer — no CLI, no build, no migration command
may ever be required of them. Content changes must be live without a rebuild. Enquiry
delivery must tolerate either channel failing. The Friends page must be reachable by URL
yet absent from nav, sitemap, and indexing. Map must work with no paid API key and
degrade to the list. Accessibility baseline per FR-031 (semantic HTML, contrast, alt
text, keyboard operability). Interface language Russian by default.

**Scale/Scope**: 4-8 disciplines, low hundreds of work samples/posts/presets, low
hundreds of enquiries per year, one admin user, ~15-20 public routes. No multi-region or
high-concurrency design needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still passing.*

**I. Content Over Interface** — Every public route renders owner-authored content or is
the enquiry form. The one element that is neither is the **shows map**, which is
interface layered over the shows list. Justified and tracked in Complexity Tracking
below: it serves "show the work" for a performing musician (where to come and hear him),
and it is strictly additive — the list renders first and remains complete on its own.
**PASS, with one tracked justification.**

**II. Extensible By Discipline** — `disciplines` is a single Payload collection. The
public nav, the home page's discipline cards, and the enquiry form's discipline field all
derive from it: nav and cards iterate `payload.find({ collection: 'disciplines' })` sorted
by `order`, and the enquiry form's `discipline` is a Payload `relationship` field to that
same collection, so its options are the collection's contents by definition. No hardcoded
discipline name, slug, or id exists anywhere in code. Adding a discipline is one admin
save. **PASS.**

**III. No-Developer Content Operations** — The Payload admin *is* the owner's admin panel;
every sub-annual content type (disciplines, work samples, posts, gear, presets, shows,
pages, media, home globals) is a collection or global editable there. Saving triggers an
`afterChange` revalidation hook, so the public site updates without a deploy. **PASS.**

**IV. One Visual Language** — Amber `#e7a94c` and violet `#9089ff`, the condensed heading
face, and the humanist body face are defined once as Tailwind theme tokens in
`tailwind.config.ts` / CSS variables. A discipline's `tone` select field (`live` |
`digital`) selects between the two accent tokens by name; no component holds a hex value
or font name. **PASS.**

**V. Localized Copy, Not Hardcoded Strings** — Frontend UI chrome comes from a keyed
dictionary (`src/lib/copy/ru.ts`, resolved by `t(key)`), never inlined in components; the
Payload admin runs in Russian via `@payloadcms/translations`; owner-authored content lives
in collection fields. Adding a locale later means adding a bundle (and optionally turning
on Payload field localization), not editing components. **PASS.**

**VI. Redundant Enquiry Delivery** — Three independent places record every enquiry: the
Payload document itself (durable, visible in admin), the mandatory email, and the optional
Telegram message. The `afterChange` hook attempts email and Telegram independently, each
wrapped so neither can affect the other or the stored document, and writes per-channel
outcome fields back onto the enquiry. A failed channel shows in the admin list as a
delivery-failure flag. **PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/001-portfolio-site/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── collections.md            # Payload collection/global configs — the content contract
│   ├── enquiry-submit.md         # public submission path + afterChange hook ordering
│   ├── notification-delivery.md  # email + Telegram channel contract, failure recording
│   ├── media-uploads.md          # media/preset-file collections, image sizes
│   ├── admin-access.md           # Payload auth + access control per collection
│   ├── shows-map.md              # open-tile map contract and list degradation
│   └── sitemap-robots.md         # sitemap/robots/noindex exclusion contract
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (frontend)/
│   │   ├── layout.tsx                  # public shell: nav derived from disciplines, theme tokens
│   │   ├── page.tsx                    # home: essence, about, discipline cards
│   │   ├── [slug]/page.tsx             # resolves a discipline OR an ordinary page (incl. Friends) —
│   │   │                                 Next.js forbids two sibling dynamic segments with different
│   │   │                                 param names at the same level, so disciplines and pages share
│   │   │                                 one slug namespace; a discipline match takes priority
│   │   ├── posts/page.tsx, posts/[slug]/page.tsx           # Phase 7 — gated, see Scope Note
│   │   ├── gear/page.tsx, presets/page.tsx, shows/page.tsx # Phase 7 — gated, see Scope Note
│   │   └── sitemap.ts                  # home + published disciplines + sitemap-flagged pages
│   ├── robots.ts                       # at the app ROOT, not inside (frontend) — only there does
│   │                                     Next.js 16 map this file to /robots.txt (sitemap.ts resolves
│   │                                     correctly from inside a route group; robots.ts does not)
│   └── (payload)/
│       ├── admin/[[...segments]]/page.tsx, admin/importMap.js   # Payload admin UI (owner's panel)
│       ├── api/[...slug]/route.ts                                # Payload REST
│       └── layout.tsx
├── collections/
│   ├── Disciplines.ts, WorkSamples.ts, Enquiries.ts, Pages.ts, Media.ts, Users.ts
│   └── Posts.ts, Gear.ts, Presets.ts, PresetFiles.ts, Shows.ts   # Phase 7 — gated
├── globals/
│   └── HomePage.ts, SiteSettings.ts
├── hooks/
│   └── notifyOnEnquiry.ts              # afterChange fan-out, never throws (recursion-guarded)
├── lib/
│   ├── delivery/email.ts, telegram.ts, dispatch.ts, types.ts
│   ├── data/disciplines.ts, work-samples.ts, home.ts, pages.ts
│   ├── copy/ru.ts, index.ts            # keyed UI dictionary + t()
│   ├── theme/tokens.ts
│   ├── access.ts                       # adminOnly / publishedOrAdmin
│   └── validation/enquiry.ts           # Zod schema for the public form
├── components/
│   ├── Nav.tsx, DisciplineCard.tsx, DisciplineView.tsx, PageView.tsx, Gallery.tsx, EnquiryForm.tsx
│   └── ShowsMap.tsx                    # Phase 7 — dynamic(ssr:false), error boundary → list only
├── actions/
│   └── submitEnquiry.ts                # server action: honeypot → Zod validate → payload.create
└── payload.config.ts

tests/
├── integration/*.test.ts               # Vitest: copy layer, Zod schema, dispatcher (Constitution VI)
└── e2e/*.spec.ts                       # Playwright: home/disciplines, enquiry flow, discipline
                                           lifecycle, Friends exclusion, admin access

migrations/                             # Payload-generated; applied automatically at deploy
tailwind.config.ts
```

**Structure Decision**: One Next.js project with Payload's two standard route groups —
`(frontend)` for the public site and `(payload)` for the admin and API. This is Payload
3's native layout and it is what makes "the admin panel is the owner's admin panel" true
with no second service, no content-sync step, and one database for content and enquiries
alike, as directed.

**Implementation note (supersedes the original design in two places, both verified against
a real build)**:
- Disciplines and ordinary pages share a single `[slug]` route rather than separate
  `[disciplineSlug]` / `[pageSlug]` routes — Next.js rejects two sibling dynamic segments
  with different parameter names at the same level ("Ambiguous route pattern" build error).
- `robots.ts` must live at `src/app/robots.ts`, not inside `(frontend)` — confirmed by
  direct testing (with and without Turbopack) that only the root location produces a
  `/robots.txt` route; `sitemap.ts` is unaffected and works from inside the route group.
- No `revalidateTag`/`revalidatePath` hook layer was built: Next.js 16 renders these routes
  dynamically by default (no `'use cache'` opted into), so every request already reads
  current Postgres state — a Save in the admin is live on the next request with nothing to
  invalidate. This satisfies Principle III/FR-022 more directly than the tag-based approach
  originally planned, and was adopted after `revalidateTag`'s Next 16 signature (now
  requiring a cache-profile argument) made the original one-line call incorrect.

## Deployment & Operations (owner never runs a build)

- **Vercel + Git integration**: every push to the default branch deploys automatically.
  The owner is never involved in a deploy; the developer's push is the only trigger.
- **Content changes require no build at all.** Public pages read from Postgres on every
  request (dynamic rendering, no cache to invalidate), so pressing Save in `/admin` makes
  the change live on the very next request. There is no static rebuild in the content path.
- **Database migrations run during deploy, not by hand**: the `build` script runs
  `payload migrate` before `next build`, so schema changes ship with the developer's push.
- **Neon Postgres** (Vercel Marketplace) and **Vercel Blob** are both managed — no server,
  no backups to configure by hand (Neon provides point-in-time restore).
- **The Telegram toggle is the one operational caveat**: it is driven by environment
  variables (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), as directed, and Vercel applies an
  env var change on the next deployment — so switching it on means editing the variable in
  the Vercel dashboard and pressing "Redeploy" (two clicks, no code, no CLI). If the owner
  ever wants a true zero-redeploy toggle, moving the flag to the `SiteSettings` global is a
  small change; that trade-off is documented in [research.md](./research.md).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Shows map (interface element beyond pure content, Principle I) | The owner asked for it; for a performing musician "where I'm playing" is part of showing the work, and a map answers it faster than a list of city names | List-only was considered and is in fact retained — the map is additive and the list stays complete and primary, so the map costs nothing when it fails or is removed. Kept out of the critical path deliberately. |
| `preset-files` as a second upload collection alongside `media` | Preset binaries (.zip/.fxp/.wav) need different mime types, no image sizes, and a download-oriented admin view | A single `media` collection was the literal instruction and is one config line away; split only because mixing multi-megabyte binaries with gallery images in one list degrades the admin experience the owner lives in daily. Trivially reversible. |
