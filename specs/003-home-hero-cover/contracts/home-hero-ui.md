# Contract: Home Hero UI

**Feature**: `003-home-hero-cover` | **Consumers**: `tests/e2e/home.spec.ts`, `tests/e2e/home-cover.spec.ts`, `tests/e2e/responsive.spec.ts`, `tests/integration/brand-mark.test.ts`, `tests/integration/cover-contrast.test.ts`

The observable surface of the opening screen: the DOM tests may depend on, the accessibility properties that must hold, the scrim values that make legibility provable, and the module boundary of the brand-mark rule.

---

## 1. DOM contract

```html
<section id="home-hero">                       <!-- relative, isolate, min-h 100svh, bg-ink, overflow-hidden -->
  <img alt="" />                               <!-- only when a cover is set; next/image fill, behind content -->
  <div aria-hidden="true"></div>               <!-- text-zone scrim, always present -->
  <div aria-hidden="true"></div>               <!-- top/nav-band scrim, always present -->
  <div>                                        <!-- content column -->
    <h1>…</h1>                                 <!-- brand mark; 1 or 2 inline spans -->
    <p>…</p>                                   <!-- essence sentence -->
    <a href="#disciplines">…</a>               <!-- CTA -->
  </div>
</section>
```

### Stable hooks

| Hook | Guarantee | Requirements |
|---|---|---|
| `#home-hero` | The opening screen's root. Also the selector `globals.css` keys the header overlay on — renaming it silently breaks the layout, not just the tests. | FR-002, R9 |
| `#home-hero h1` | Exactly one. Accessible name is exactly `home.name`. | FR-005, FR-013 |
| `#home-hero p` | Exactly one non-empty paragraph, the essence sentence, sourced from `home.essenceSentence`. | FR-007 |
| `#home-hero a[href="#disciplines"]` | Exactly one. Label is `t('home.ctaToDisciplines')`. Destination unchanged from before the feature. | FR-007, FR-008 |
| `#home-hero img` | Present iff a cover is set and resolvable; `alt=""`; `object-fit: cover`. | FR-002, FR-003, R8 |
| Scrim elements | `aria-hidden="true"`, no text content, never focusable. Present in **both** cover states. | SC-007 |

`tests/e2e/home.spec.ts` currently finds the essence by position — `page.locator('section').first().getByText(/\S/).nth(1)`. That must be re-anchored onto `#home-hero p`; the positional form is not part of this contract and will break.

### Ordering and z-order

Text sits above both scrims; both scrims sit above the image; the image sits above the section's `bg-ink`. The section establishes its own stacking context (`isolate`) so negative z-index children cannot escape behind the page background.

### Both scrims render unconditionally

Even with no cover. Two reasons: SC-007 asks that the uncovered opening screen be *indistinguishable in structure* from the covered one, which is far easier to hold — and to test — when the element list does not change; and `ink` over `ink` is a visual no-op, so there is nothing to gain by branching. The only conditional element in the hero is the `<img>`.

---

## 2. Cover states

| State | Condition | Rendered |
|---|---|---|
| **Covered** | `coverImage` populated and `url` non-empty | `<img>` + scrims over `bg-ink` |
| **Uncovered** | `coverImage` null, an unpopulated id string, or populated with no `url` | scrims over `bg-ink`; no `<img>` |
| **Unretrievable** | reference resolvable server-side, fetch fails in the browser | no visual artefact: `alt=""` renders nothing, `bg-ink` shows through — visually the uncovered state (FR-026) |

The guard is a single expression, and the `url` check is part of it rather than an extra safety net:

```ts
const cover = home.coverImage
const hasCover = Boolean(cover) && typeof cover === 'object' && Boolean(cover.url)
```

Uncovered must produce **no** empty frame, gap, collapsed region, placeholder graphic, or broken-image indicator (FR-024). Since the `<img>` is simply absent, the section keeps its full `100svh` and its content column keeps its position — nothing collapses.

---

## 3. Scrim contract

Two utility classes in `src/app/globals.css`, with their contrast-critical alphas held in `:root` custom properties so one edit moves both the CSS and the value the tests check.

```css
:root {
  /* Minimum ink alpha wherever hero text sits. Derived from a worst-case
     pure-white photograph — see specs/003-home-hero-cover/research.md R3.
     Mirrored in src/lib/theme/tokens.ts; the two are asserted equal by
     tests/integration/cover-contrast.test.ts. */
  --cover-scrim-text-alpha: 0.85;
  /* Minimum ink alpha across the band the overlaid nav occupies. */
  --cover-scrim-nav-alpha: 0.65;
}
```

### Text-zone scrim

Mobile — text is bottom-anchored, so the strong band runs from the bottom edge up past the content:

```css
.cover-scrim-text {
  background-image: linear-gradient(
    to top,
    rgb(11 11 13 / var(--cover-scrim-text-alpha)) 0,
    rgb(11 11 13 / var(--cover-scrim-text-alpha)) 55%,
    rgb(11 11 13 / 0.45) 74%,
    rgb(11 11 13 / 0) 92%
  );
}
```

From `md:` up — text is left-anchored, so the strong band runs from the left edge and the majority of the photograph stays clear:

```css
@media (min-width: 768px) {
  .cover-scrim-text {
    background-image: linear-gradient(
      to right,
      rgb(11 11 13 / 0.88) 0,
      rgb(11 11 13 / var(--cover-scrim-text-alpha)) 44%,
      rgb(11 11 13 / 0.40) 66%,
      rgb(11 11 13 / 0) 88%
    );
  }
}
```

### Nav-band scrim

```css
.cover-scrim-top {
  background-image: linear-gradient(
    to bottom,
    rgb(11 11 13 / var(--cover-scrim-nav-alpha)) 0,
    rgb(11 11 13 / var(--cover-scrim-nav-alpha)) 9%,
    rgb(11 11 13 / 0.25) 16%,
    rgb(11 11 13 / 0) 26%
  );
}
```

`Nav` is `px-6 py-4` around `text-lg`, so it occupies roughly 56–60px — about 7% of an 800px or 844px viewport. Holding full alpha to 9% keeps the entire nav inside the strong band with margin.

### The invariant that ties layout to contrast

**The content column must never extend beyond the region where alpha ≥ `--cover-scrim-text-alpha`.** The gradients above are only a guarantee if the text stays inside their strong band, which constrains the layout:

| Viewport | Strong band | Content column must satisfy |
|---|---|---|
| Mobile | bottom 55% of height | bottom-anchored (`justify-end`), content ≤ 55% tall |
| `md:` and up | left 44% of width | `max-w-[40vw]` + `px-6`, keeping the right edge inside 44% |

`max-w-[40vw]` rather than a fixed `max-w-*`: the band is a percentage of viewport width, so the cap has to scale with it. A fixed `max-w-xl` (576px) already exceeds the band at 1280px wide (44% − 24px padding ≈ 539px), and any fixed value is wrong at some width. Mobile keeps `max-w-xl`, which is wider than a 390px viewport and so has no effect there.

---

## 4. Brand mark contract

### Module — `src/lib/theme/brand.ts`

```ts
export const BRAND_MARK = 'SanSay'

/**
 * The two halves to tone, or null when `name` is not the brand mark and must
 * render as a single plain heading (FR-012).
 */
export function splitBrandMark(name: string): readonly [string, string] | null
```

Behaviour, asserted by `tests/integration/brand-mark.test.ts`:

| Input | Output | Requirement |
|---|---|---|
| `'SanSay'` | `['San', 'Say']` | FR-009 |
| `'  SanSay  '` | `['San', 'Say']` | trimmed before matching |
| `'SANSAY'` | `['SAN', 'SAY']` | case-insensitive match, owner's casing preserved |
| `'sansay'` | `['san', 'say']` | same |
| `'SanSay Studio'` | `null` | whole-string match only — FR-012 |
| `'Александр'` | `null` | FR-012 |
| `''` | `null` | FR-012 |

The returned halves are sliced from the caller's `name`, never from `BRAND_MARK`, so nothing the visitor sees originates in the constant (Constitution V — research R4).

### Rendering — `src/components/BrandMark.tsx`

One `<h1>`. When `splitBrandMark` returns halves, two `<span>`s: the first `text-tone-live`, the second `text-tone-digital` (FR-009, FR-010). Otherwise the bare name in the inherited colour (FR-012).

**No literal space may separate the two spans.** JSX drops whitespace runs that contain a newline, so the spans may be written on separate lines safely; what breaks the contract is a space *within a line* between them. The consequence is observable, so it is tested rather than trusted: the `<h1>`'s accessible name must equal `home.name` exactly, with no interpolated space (FR-013, SC-008).

Size comes from a single class rather than a utility soup, so the clamp lives in one place:

```css
/* FR-005 dominant, FR-006 always fits. The 16vh term is what keeps a
   phone in landscape from losing the CTA — see research.md R6. */
.brand-mark {
  font-size: clamp(2.5rem, min(13vw, 16vh), 9rem);
  line-height: 0.95;
}
```

The heading inherits `font-heading uppercase tracking-wide` from the existing `h1` rule in `globals.css`; this feature adds no typeface (Constitution IV).

---

## 5. Contrast contract

`src/lib/theme/tokens.ts` gains the values the test needs — the accent tokens are already there:

```ts
export const inkTokens = { DEFAULT: '#0b0b0d', raised: '#151317' } as const

/** Mirrors the :root custom properties in src/app/globals.css. */
export const coverScrimTokens = {
  textZoneMinAlpha: 0.85,
  navBandMinAlpha: 0.65,
} as const
```

`tests/integration/cover-contrast.test.ts` must assert all three of the following. The first two are the substance of FR-014/FR-015; the third is what stops the CSS and the tokens drifting apart into a false pass.

**1. Text-zone alpha carries every hero text colour over a pure-white photograph.** Composite `inkTokens.DEFAULT` over `#ffffff` at `textZoneMinAlpha`, then check the WCAG 2.1 ratio:

| Text | Colour | Expected ratio | Threshold |
|---|---|---|---|
| Essence | `#f5f5f5` (`neutral-100`) | ≈ 12.2:1 | ≥ 4.5:1 |
| Brand first half | `#e7a94c` (`tone-live`) | ≈ 6.4:1 | ≥ 3:1 |
| Brand second half | `#9089ff` (`tone-digital`) | ≈ 4.6:1 | ≥ 3:1 |

Assert against the thresholds, not the approximations — the numbers are there to make a regression legible, not to be pinned. `tone-digital` is the binding case: it is why the alpha is 0.85 and not lower.

**2. Nav-band alpha carries the nav links.** `#f5f5f5` over ink-at-`navBandMinAlpha`-over-white ≈ 6.2:1, threshold ≥ 4.5:1.

**3. CSS and tokens agree.** Read `src/app/globals.css`, parse `--cover-scrim-text-alpha` and `--cover-scrim-nav-alpha` out of `:root`, and assert they equal the `coverScrimTokens` values. Without this, softening a gradient in CSS would leave the contrast test passing against a number the page no longer uses.

The CTA is deliberately absent from the table: `bg-tone-live` with `text-ink` is opaque, so its contrast does not depend on the scrim or the photograph at all.
