# Phase 1 Data Model: Home Opening Screen Cover & Brand Mark

**Feature**: `003-home-hero-cover` | **Date**: 2026-09-10

This feature adds exactly one persisted field. Everything else it introduces is presentation logic with no storage.

---

## Entity: Home Page Content (`home` global)

Defined in `src/globals/HomePage.ts`, slug `home`, singleton by construction. Existing fields are unchanged; one field is added.

| Field | Type | Required | Change | Notes |
|---|---|---|---|---|
| `name` | text | yes | unchanged | default `'SanSay'`; drives the brand-mark rule (never overwritten by it) |
| `essenceSentence` | text | yes | unchanged | rendered in the hero |
| **`coverImage`** | upload → `media` | **no** | **NEW** | opening-screen backdrop; absence is a valid, expected state |
| `aboutPhoto` | upload → `media` | no | unchanged | about block only; never used as a cover fallback |
| `bioParagraphs` | array (2–3) | — | unchanged | |
| `replyWindowCopy` | text | yes | unchanged | |
| `seo.title` / `seo.description` / `seo.ogImage` | group | no | unchanged | see "Deliberate non-change" below |

### Field placement and definition

`coverImage` is inserted **immediately before `aboutPhoto`**, so the admin form reads in the same order the visitor meets the page: name, essence, cover, then the about block. Both remain distinct `upload` fields pointing at `media`, which is the whole of FR-018 and FR-020 — two independent columns cannot alias each other.

```ts
{
  name: 'coverImage',
  type: 'upload',
  relationTo: 'media',
  admin: {
    description:
      'Фон первого экрана — на весь экран, за именем. Необязательно: без него первый экран остаётся целым.',
  },
},
```

The field is optional with no `defaultValue`, per FR-021. The `admin.description` is a Payload admin-panel hint in Russian, matching every other field in this global; it is not visitor-facing copy and so does not belong in the `src/lib/copy` bundle (Constitution V governs the public interface, and no existing `admin.description` in this repo is routed through the copy layer).

### Validation rules

| Rule | Source | Where enforced |
|---|---|---|
| Cover may be absent | FR-021 | field is not `required` |
| Cover has a textual description | FR-022 | inherited — `media.alt` is already `required: true` in `src/collections/Media.ts` |
| Cover is an image | — | inherited — `media.upload.mimeTypes: ['image/*']` |
| Deleting the media row clears the reference | FR-026 | `ON DELETE set null` on the FK, matching `about_photo_id` |
| Only the owner can change it | FR-019, spec 001 FR-030 | inherited — the global's `access.update` is `adminOnly` |

No new validation code is written. Every rule above is either an absence of `required` or already guaranteed by the `media` collection — which is the point of routing the cover through the existing media library rather than adding bespoke upload handling.

### State transitions

The field has three states and all transitions are owner-driven through the admin panel:

```text
        (initial, and after ✕)
              ┌──────────┐
      ┌──────▶│  unset   │◀──────┐
      │       └────┬─────┘       │
   clear           │ select      │ media row deleted
      │            ▼             │  (FK → NULL)
      │       ┌──────────┐       │
      └───────┤   set    ├───────┘
              └────┬─────┘
                   │ select a different image
                   └──▶ set (new reference)
```

`unset` is the state every existing installation is in the moment this ships, which is why FR-023–FR-025 are launch requirements and not merely an error path. A fourth, transient condition — reference present but the file unretrievable by the browser — is not a persisted state and is handled in presentation (FR-026); see [contracts/home-hero-ui.md](./contracts/home-hero-ui.md).

---

## Generated types

`pnpm types` regenerates `src/payload-types.ts`, adding to the `Home` interface:

```ts
coverImage?: (string | null) | Media;
```

Same shape as `aboutPhoto`: a media id when unpopulated, a populated `Media` document at the default depth `findGlobal` uses in `src/lib/data/home.ts`. `getHomeContent()` needs no change — `findGlobal` returns every field in the global.

Consumers must narrow with the same guard the about photo uses (`typeof x === 'object'`) before reading `url`, because the type admits an unpopulated id string.

---

## Database migration

**Generate, do not hand-write**: run `pnpm migrate:create home_cover_image`. Payload diffs the schema and emits the file; `migrations/index.ts` must then register it in order, following the existing three entries.

The generated `up()` is expected to be equivalent to the following. This is the **verification target** — check the emitted SQL against it rather than assuming it:

```sql
ALTER TABLE "home" ADD COLUMN "cover_image_id" uuid;

ALTER TABLE "home"
  ADD CONSTRAINT "home_cover_image_id_media_id_fk"
  FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "home_cover_image_idx" ON "home" USING btree ("cover_image_id");
```

Every element mirrors `about_photo_id` as created in `migrations/20260907_212401_initial.ts` (the `home_about_photo_id_media_id_fk` constraint and `home_about_photo_idx` index), which is the strongest available signal that the shape is right. Confirm the column type matches `media.id` — this schema uses `uuid` — rather than transcribing it from this document.

`down()` drops the index, then the constraint, then the column.

### Migration properties

- **Additive and nullable**, so it needs no backfill and no data migration. Existing rows land in the `unset` state, which FR-023 already requires be safe.
- **Reversible** with no data loss beyond the reference itself.
- **Safe to apply ahead of the code**: nothing reads the column until `HomeHero` ships.
- Unlike `20260910_131500_visitor_rels_columns.ts`, this does not need `IF NOT EXISTS` guards. That migration was a repair for a schema that production had already acquired through a dev-mode push; this column exists nowhere yet, so the plain generated statements are correct. If a `migrate:status` check shows otherwise on any environment, prefer fixing the drift over softening the migration.

---

## Deliberate non-change: `seo.ogImage`

`generateMetadata()` in `src/app/(frontend)/page.tsx` currently falls back `seo.ogImage ?? aboutPhoto`. The cover is now the most representative image on the page, so inserting it into that chain is tempting.

**It is left alone.** No requirement in this spec mentions link previews or social sharing; spec 001 owns that surface through FR-027 and SC-007. Quietly changing which image unfurls in a messenger would alter behaviour those criteria cover, outside any requirement here and without a test asserting the new order. If it is wanted, it belongs in its own change against FR-027 — noted here so the omission reads as a decision rather than an oversight.
