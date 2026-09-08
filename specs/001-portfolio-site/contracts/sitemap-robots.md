# Contract: Sitemap, robots, and page-level indexing control

The Friends section is **an ordinary page** in the `pages` collection, excluded from
navigation, the sitemap, and indexing by data — not by a special case in code. This is what
satisfies FR-024 and FR-028 while keeping the exclusion under the owner's control.

## The three exclusion layers

| Layer | Mechanism | Source of truth |
|---|---|---|
| Navigation | the nav queries `pages` with `where: { showInNav: { equals: true } }` | `pages.showInNav` |
| Sitemap | `sitemap.ts` queries `pages` with `where: { includeInSitemap: { equals: true } }` | `pages.includeInSitemap` |
| Indexing | `generateMetadata` emits `robots: { index: false, follow: false }` when the page's `noindex` is set | `pages.noindex` |

Plus one belt-and-braces layer in code: `robots.ts` disallows the Friends path prefix.

The Friends page document has `showInNav: false`, `includeInSitemap: false`,
`noindex: true`. No code anywhere names its slug in order to hide it — rename the page and
it stays hidden, which a hardcoded exclusion list would not survive.

## `GET /sitemap.xml` — `src/app/(frontend)/sitemap.ts`

Contains exactly:
- the home page
- every **published** discipline (`/[slug]`, resolved via the shared discipline/page route)
- every **published** post, and the shows/gear/presets index pages
- every page with `includeInSitemap: true`

Never contains: unpublished documents, `/admin/*`, Payload's `/api/*`, or any page flagged
out of the sitemap.

Regenerated from the same queries the nav and pages use, so a newly published discipline
appears without any manual step.

## `GET /robots.txt` — `src/app/(frontend)/robots.ts`

```text
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /<friends-slug>/
Sitemap: https://<domain>/sitemap.xml
```

## Not private — unadvertised

Per FR-025 and the spec's own framing, the Friends page remains **publicly reachable by
direct URL with no authentication**. These layers hide it from discovery surfaces; they do
not secure it, and are not intended to. A crawler that ignores `robots.txt` and `noindex`
can still reach it, and that is the accepted, documented behaviour — the page itself says
so in its own copy.

## Social previews (FR-027)

`generateMetadata` on home and discipline pages emits title, description, and OG image
from each document's `seo` group, falling back to the document's own title/strapline and
the `og` image size. This is what makes a link pasted into a messenger render meaningfully.

## Verified by

Scenarios E and F in [quickstart.md](../quickstart.md).
