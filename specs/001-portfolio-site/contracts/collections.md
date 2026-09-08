# Contract: Payload collection & global configuration

In a Payload application the collection config *is* the contract: it simultaneously
defines the database schema, the REST/GraphQL/Local API surface, the admin UI the owner
uses, and the validation rules. This file states the guarantees each config must uphold;
field-by-field detail lives in [data-model.md](../data-model.md).

## Registered collections and globals

```ts
// src/payload.config.ts
collections: [
  Disciplines, WorkSamples, Enquiries, Pages,
  Posts, Gear, Presets, Shows,        // beyond current spec — see plan.md Scope Note
  Media, PresetFiles, Users,
],
globals: [HomePage, SiteSettings],
```

## Guarantees every content collection must uphold

1. **Ordering is owner-controlled.** Any collection whose public presentation has an order
   (`disciplines`, `work-samples`, `gear`, `presets`, page `chapters`) exposes an `order`
   field and is sortable in the admin list view. No ordering is derived from creation date
   or alphabetical position in code.
2. **Publication is data.** Collections with a public surface carry `published`; every
   frontend query filters on it. Unpublishing never deletes, so historical references
   (notably `enquiries.discipline`) stay intact.
3. **Revalidation on save.** Every content collection registers `afterChange` and
   `afterDelete` hooks calling `revalidateTag`/`revalidatePath` for the surfaces it feeds.
   This is the mechanism behind "the owner presses Save and the site updates" — no deploy,
   no rebuild.
4. **Nothing that feeds nav/home/enquiry-form is hardcoded.** The nav, home cards, and the
   enquiry form's `discipline` field all resolve from the `disciplines` collection at
   request time. A new discipline appears in all three on the next request (FR-022).

## The `disciplines` propagation guarantee (FR-022, Principle II)

| Surface | How it derives from the collection |
|---|---|
| Public nav | `payload.find({ collection: 'disciplines', where: { published: { equals: true } }, sort: 'order' })` in the `(frontend)` layout |
| Home page cards | the same query, rendered as cards with the `tone`-selected accent token |
| Enquiry form topic | a Payload `relationship` field to `disciplines` — the option list *is* the collection, so it cannot drift |
| Discipline pages | `/[slug]` resolved by trying a discipline lookup first, then a page lookup (see plan.md); neighbours = adjacent rows by `order` |

Adding a discipline is a single admin save. Nothing in code changes. This is the exact
claim Scenario D in [quickstart.md](../quickstart.md) verifies.

## Admin experience requirements

- Admin UI locale is Russian (`@payloadcms/translations`), matching FR-029's default
  interface language.
- `enquiries` list view shows columns: `submittedAt`, `discipline`, `name`, `status`,
  `deliveryFailed` — so a delivery problem is visible without opening a document.
- `useAsTitle` is set on every collection so admin lists read as content, not as ids.
- Field-level `admin.description` text is written in Russian for the owner, since they are
  the only user of these screens.

## Type generation

`payload generate:types` produces `payload-types.ts`, and the frontend imports those types
rather than redeclaring shapes. A type mismatch between a collection config and frontend
code is therefore a build-time error, not a runtime surprise.
