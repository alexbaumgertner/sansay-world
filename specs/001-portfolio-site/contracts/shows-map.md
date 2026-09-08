# Contract: Shows map (open tiles, degrades to list)

**Status**: beyond current spec — the `shows` collection and this page have no functional
requirements in `spec.md` yet (see plan.md's Scope Note). Built per the owner's direction;
`/speckit-specify` should give it acceptance criteria before implementation.

## The degradation guarantee

The shows **list is the page**. It is rendered server-side from the `shows` collection,
sorted by `date`, complete on its own. The map is mounted above it as progressive
enhancement.

```tsx
// src/app/(frontend)/shows/page.tsx
const shows = await payload.find({ collection: 'shows', where: { published: { equals: true } }, sort: 'date' });
return (
  <>
    <MapErrorBoundary fallback={null}>
      <ShowsMap shows={shows.docs} />   {/* dynamic(..., { ssr: false }) */}
    </MapErrorBoundary>
    <ShowsList shows={shows.docs} />    {/* always rendered, server-side */}
  </>
);
```

Because the list renders unconditionally and server-side, **degradation is structural
rather than a fallback path**: if Leaflet fails to load, tiles are blocked, JavaScript is
off, or a show has no coordinates, the page is still complete. There is no "map failed"
error state to design, because there is nothing to recover — the content was never inside
the map.

## Tiles

- `react-leaflet` + OpenStreetMap raster tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- **No API key, no paid tier** — the stated requirement.
- Required attribution (`© OpenStreetMap contributors`) is rendered in the map's
  attribution control; this is a licence condition, not a nicety.
- OSM's public tile service suits low-traffic sites like this one. If traffic grows, the
  tile URL becomes a self-hosted or sponsored endpoint — a one-line change, no code
  restructuring.

## Data expectations

`shows.location` (Payload `point`) is **optional by design**. A show with no coordinates
appears in the list and simply has no marker. The map never determines whether a show is
visible to a visitor.

## Accessibility

Per FR-031, the map is never the only route to information: every marker's content —
title, date, venue, city, ticket link — is present in the list below in semantic HTML, so
keyboard and screen-reader users lose nothing by skipping the map entirely. The map
container is marked `aria-hidden` where its content is fully duplicated by the list.

## Verified by

Scenario G in [quickstart.md](../quickstart.md): the list renders with JavaScript disabled
and with tile requests blocked.
