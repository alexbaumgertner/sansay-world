# Contract: Media and preset-file uploads

All owner uploads go through Payload upload collections backed by Vercel Blob
(`@payloadcms/storage-vercel-blob`). No file is ever written to the serverless filesystem,
which does not persist between invocations.

## `media` — images

```ts
upload: {
  mimeTypes: ['image/*'],
  adminThumbnail: 'thumbnail',
  imageSizes: [
    { name: 'thumbnail', width: 300 },
    { name: 'card',      width: 640 },
    { name: 'gallery',   width: 1200 },
    { name: 'og',        width: 1200, height: 630, crop: 'center' },
  ],
}
```

**Guarantees**:
- Sizes are generated once at upload time by `sharp`, not per request. Cards and galleries
  reference the named size; a full-resolution original is never served to a card
  (this is what keeps the mobile LCP target reachable — FR-026 and the performance goals).
- `alt` is a **required** field. Payload rejects the upload without it, which is the
  enforcement mechanism behind FR-031's alt-text baseline — a frontend convention would
  decay, a required CMS field cannot be skipped.
- The `og` size feeds `generateMetadata`'s OpenGraph image, so shared links show a real
  picture (FR-027).

## `preset-files` — downloadable binaries

```ts
upload: {
  mimeTypes: ['application/zip', 'application/octet-stream', 'audio/*'],
  // no imageSizes — Payload generates none for non-image types
}
```

Separate from `media` so that multi-megabyte binaries stay out of the image library the
owner browses daily. This is a deliberate refinement of the "one media collection"
instruction, flagged in plan.md's Complexity Tracking and reversible in one config change.

## Upload-size caveat (serverless)

Vercel request bodies are size-limited, so very large preset files uploaded through the
admin can fail. Two mitigations, in order of preference:
1. Keep preset archives modest (the common case for presets and patches).
2. If large files become routine, switch `preset-files` to Blob client-side uploads
   (direct browser → Blob, bypassing the function body limit) — a contained change to that
   one collection, not an architecture change.

This is noted here rather than discovered later; it is the one place where the serverless
hosting choice has a real edge.

## Referencing sizes from the frontend

Frontend components request a named size explicitly (`image.sizes.card.url`), never the
original. Types come from generated `payload-types.ts`, so a renamed size is a build
error rather than a broken image in production.
