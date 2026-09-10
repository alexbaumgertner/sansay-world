# Contract: `home.coverImage` (CMS)

**Feature**: `003-home-hero-cover` | **Consumers**: Payload admin panel (owner), `HomeHero`, `tests/e2e/fixtures/cms.ts`

The owner-facing and code-facing contract for the one persisted field this feature adds. Schema details and the migration live in [../data-model.md](../data-model.md); this file states the guarantees other code and tests may rely on.

---

## Field

| Property | Value |
|---|---|
| Global | `home` (`src/globals/HomePage.ts`) |
| Field name | `coverImage` |
| Type | `upload`, `relationTo: 'media'` |
| Required | no |
| Default | none |
| Position | immediately before `aboutPhoto` |
| Read access | public (`access.read: () => true`, unchanged) |
| Update access | `adminOnly` (unchanged) |

## Guarantees

1. **Independence (FR-020).** `coverImage` and `aboutPhoto` are separate columns. Writing either one leaves the other byte-identical. No code path reads `aboutPhoto` as a cover fallback, and none reads `coverImage` for the about block.
2. **Optionality (FR-021).** The global saves with `coverImage` absent. No validation, hook, or UI state requires it.
3. **Clearability (FR-019).** Removing the reference in the admin and saving persists `null`. There is no soft-delete and no "last cover" memory.
4. **Description already collected (FR-022).** Every `media` document has a non-empty `alt`, enforced by `required: true` in `src/collections/Media.ts`. Setting a cover therefore cannot produce an image with no textual description. Note that the hero renders `alt=""` regardless — see [home-hero-ui.md](./home-hero-ui.md) and research R8.
5. **Referential safety (FR-026).** The FK is `ON DELETE set null`. Deleting the media document moves the field to `unset`, never to a dangling id.
6. **Owner-only (spec 001 FR-030).** Reachable for writing only through an authenticated owner session; unchanged from the global's existing access control.

## Reading it

`getHomeContent()` in `src/lib/data/home.ts` is unchanged — `payload.findGlobal({ slug: 'home' })` returns the field with the relation populated at default depth.

Consumers must narrow before use, because the generated type is `(string | null) | Media`:

```ts
const cover = home.coverImage
const hasCover = Boolean(cover) && typeof cover === 'object' && Boolean(cover.url)
```

The `cover.url` check is part of the guard, not an extra precaution: an object with no `url` cannot be rendered and must take the same path as no cover at all (FR-026).

The home route is already `export const dynamic = 'force-dynamic'`, so a saved cover appears on the next request with no revalidation step and no deploy (FR-019).

## Test fixture surface

`tests/e2e/fixtures/cms.ts` gains three methods on the `Cms` class, each registering its own undo step so the suite stays order-independent as the existing methods do:

| Method | Purpose |
|---|---|
| `uploadMedia(input: { data: Buffer; filename: string; alt: string }): Promise<Media>` | Creates a `media` document from an in-memory buffer via the Local API |
| `setHomeCover(mediaId: string): Promise<void>` | Points `home.coverImage` at a media document; undo restores the previous value |
| `clearHomeCover(): Promise<void>` | Sets `home.coverImage` to `null`; undo restores the previous value |

Both mutators must capture the prior `coverImage` before writing and restore it on cleanup, so a suite run leaves the shared deployment as it found it.

Writes go through the Local API rather than raw SQL, deliberately: that exercises the same field config and access rules the admin panel does, which is what makes "the fixture set a cover" a faithful stand-in for "the owner clicked Save". Contrast `breakEmailChannel()`, which drops to `payload.db` only because it needs to violate a `required` constraint; nothing here does.

Test photographs are synthesized at runtime with `sharp` (already a dependency) in a new `tests/e2e/fixtures/images.ts`, not committed as binaries. Two are needed by SC-002:

| Helper | Image | Proves |
|---|---|---|
| `nearWhiteCover()` | ~2000×1200, uniform `#fdfdfd` | the worst case the scrim is dimensioned for (FR-014) |
| `busyCover()` | ~2000×1200, high-frequency full-range noise | no local region defeats the scrim (FR-014 edge case) |
