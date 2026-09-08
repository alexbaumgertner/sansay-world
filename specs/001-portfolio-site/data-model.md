# Data Model: SanSay Portfolio Site (Payload collections)

Every entity is a Payload collection or global in one Neon Postgres database — content and
enquiries together, as directed. Field types below are Payload field types; Payload derives
the SQL schema and migrations from them. Collections marked **beyond current spec** are
modelled per the owner's direction but have no FRs yet (see plan.md's Scope Note).

## `disciplines` (collection)

The single source of truth behind nav, home cards, and the enquiry form's topic field
(Principle II).

| Field | Type | Notes |
|---|---|---|
| `name` | text, required | |
| `slug` | text, required, unique, indexed | route `/[slug]` (shared with ordinary pages — see plan.md's Implementation note); auto-derived from name, editable |
| `strapline` | text, required | shown on the home card |
| `description` | richText (lexical), required | fuller service copy on the discipline page |
| `tone` | select(`live`, `digital`), required | picks the accent token (FR-005) |
| `order` | number, required, indexed | owner-controlled ordering (FR-004); Payload list view is drag-sortable |
| `published` | checkbox, default `true` | unpublished disciplines leave nav/home/form but keep existing enquiry references |
| `coverImage` | upload → `media` | |
| `seo` | group: `title`, `description`, `ogImage` (upload → `media`) | FR-027 |

**Validation**: `slug` matches `^[a-z0-9]+(-[a-z0-9]+)*$`; uniqueness enforced by index.

No revalidation hook is registered: public reads go through the Local API on every
request (Next.js 16 renders dynamically by default), so a Save is visible on the very
next request with nothing to invalidate — see plan.md's Implementation note.

## `work-samples` (collection)

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| `discipline` | relationship → `disciplines`, required, indexed | gallery membership |
| `description` | textarea, required | short description (FR-008) |
| `image` | upload → `media`, optional | FR-008 |
| `externalVideoUrl` | text, optional, URL-validated | FR-008 |
| `order` | number, indexed | owner-controlled; no cap on count (FR-007) |
| `published` | checkbox, default `true` | |

**Admin**: list view grouped/filterable by `discipline` so the owner works one discipline
at a time.

## `enquiries` (collection)

Stored in the same database as content, visible in the admin with a changeable status
(FR-012), and carrying its own delivery record (FR-015).

| Field | Type | Notes |
|---|---|---|
| `name` | text, required | |
| `preferredContactMethod` | text, required | free text — email, phone, Telegram handle |
| `desiredDate` | date, optional | FR-009 |
| `jobDescription` | textarea, required | |
| `discipline` | relationship → `disciplines`, required | auto-filled by the form, shown to the sender (FR-010) |
| `status` | select(`new`, `in_progress`, `closed`), default `new`, indexed | owner-changeable, any direction |
| `submittedAt` | date, defaults to now, readOnly | |
| `delivery` | group, readOnly (see below) | per-channel outcome |
| `deliveryFailed` | checkbox, readOnly, indexed | computed by the hook; drives the admin list badge and a saved "needs attention" filter |

**`delivery` group** (all fields readOnly in admin):

| Subfield | Type | Values |
|---|---|---|
| `email.status` | select | `sent`, `failed`, `disabled` (unreachable today — email is mandatory — but present so the type matches the shared channel-result union) |
| `email.attemptedAt` | date | |
| `email.error` | textarea | populated only on failure |
| `telegram.status` | select | `sent`, `failed`, `disabled` (`disabled` = env vars absent, not an error) |
| `telegram.attemptedAt` | date | |
| `telegram.error` | textarea | |

**Access**: `create: () => true` (public form), `read`/`update`/`delete`: authenticated
admin only. Nothing about an enquiry is publicly readable.

**Hooks**: `afterChange` with `operation === 'create'` → notification fan-out (see
[contracts/enquiry-submit.md](./contracts/enquiry-submit.md)).

## `pages` (collection)

Ordinary pages — the hidden Friends section is one document here, not a special case.

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| `slug` | text, required, unique, indexed | |
| `chapters` | array of `{ heading?, body: richText, photos: upload[] → media }` | the Friends story's chapters with photographs (FR-023) |
| `showInNav` | checkbox, default `true` | Friends: **off** (FR-024) |
| `includeInSitemap` | checkbox, default `true` | Friends: **off** (FR-024) |
| `noindex` | checkbox, default `false` | Friends: **on** (FR-028) |
| `seo` | group: `title`, `description`, `ogImage` | |

**Note**: the Friends page's "this content is unadvertised, not secured" statement (FR-025)
is authored content in a chapter body, not a system field — it is a sentence the owner
controls, like the rest of the page.

## `media` (upload collection)

| Field | Type | Notes |
|---|---|---|
| `alt` | text, **required** | the mechanism that makes FR-031's alt-text baseline stick |
| `caption` | text, optional | |
| file | upload, images only | stored in Vercel Blob |

**`imageSizes`** generated at upload by `sharp`:

| Name | Width | Used by |
|---|---|---|
| `thumbnail` | 300 | admin list thumbnails |
| `card` | 640 | discipline cards, post cards |
| `gallery` | 1200 | work-sample gallery, chapter photos |
| `og` | 1200×630 | social link previews (FR-027) |

## `preset-files` (upload collection) — beyond current spec

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| file | upload; mime types limited to archives/audio/preset binaries | no image sizes generated |

## `posts` (collection) — beyond current spec

`title`, `slug` (unique), `excerpt`, `body` (richText), `coverImage` (→ media),
`publishedAt` (date, indexed), `published` (checkbox), `seo` group.

## `gear` (collection) — beyond current spec

`name`, `description` (richText), `images` (upload[] → media), `discipline`
(relationship → disciplines, optional), `order`.

## `presets` (collection) — beyond current spec

`title`, `description`, `file` (relationship → `preset-files`), `format` (text, e.g. DAW
or pedal target), `image` (→ media, optional), `order`, `published`.

## `shows` (collection) — beyond current spec

| Field | Type | Notes |
|---|---|---|
| `title` | text, required | |
| `date` | date, required, indexed | list sorts on this; past/upcoming split |
| `venue` | text, required | |
| `city` | text, required | |
| `location` | point, optional | map marker; **optional by design** — a show with no coordinates still appears in the list |
| `ticketUrl` | text, optional, URL-validated | |
| `published` | checkbox, default `true` | |

## `users` (auth collection)

Payload auth. `email`, `password` (hashed by Payload), `name`. Access: `create` restricted
to authenticated admins after the first-run user is seeded — there is no public
registration anywhere (FR-030).

## `home` (global)

| Field | Type | Notes |
|---|---|---|
| `name` | text | FR-001 |
| `essenceSentence` | text | e.g. "Я играю, снимаю, паяю, строю" (FR-001) |
| `aboutPhoto` | upload → `media` | FR-002 |
| `bioParagraphs` | array of `{ text: textarea }`, 2-3 entries | FR-002 |
| `replyWindowCopy` | text | shown in the confirmation, e.g. "в течение двух рабочих дней" (FR-016) |
| `seo` | group | |

## `site-settings` (global)

`ownerNotificationEmail` (email, required — the mandatory channel's destination),
`navLabels`/misc chrome overrides if the owner wants them. The Telegram enable flag is
**not** here — it is environment-driven per the owner's direction (see research.md for the
recorded trade-off).

## Relationship summary

```text
disciplines 1──* work-samples
disciplines 1──* enquiries        (retained even if the discipline is unpublished)
disciplines 0──* gear
media       *──1 (referenced by disciplines, work-samples, pages, posts, gear, presets, home)
preset-files 1──1 presets
```

## Indexes

`disciplines.slug` (unique), `pages.slug` (unique), `posts.slug` (unique),
`users.email` (unique, Payload-managed), `work-samples.discipline`,
`enquiries.status`, `enquiries.deliveryFailed`, `shows.date`, `disciplines.order`.
