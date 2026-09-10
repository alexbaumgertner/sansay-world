# Phase 0 Research: Home Opening Screen Cover & Brand Mark

**Feature**: `003-home-hero-cover` | **Date**: 2026-09-10

All decisions below were resolved against the installed dependencies and the repo's own conventions. Where Next.js behaviour is cited, the source is `node_modules/next/dist/docs/` for the installed 16.3.4, not recalled API knowledge — this project's `AGENTS.md` requires that, and it changed two of these decisions (R7).

No `NEEDS CLARIFICATION` markers remain.

---

## R1 — Rendering the full-bleed cover

**Decision**: `next/image` with `fill`, `sizes="100vw"`, and `object-cover`, inside a `relative` section that carries `bg-ink`. The `src` is the media document's original `url`, not one of the named `imageSizes`.

**Rationale**: The installed docs' own "Background Image" example is exactly this shape — `fill` + `sizes="100vw"` + `objectFit: 'cover'` — and `fill` is the documented answer when the aspect ratio is unknown, which it is here because the owner can upload anything. `fill` requires the parent to be positioned, which is why the section gets `relative`.

`sizes="100vw"` matters for more than bandwidth: the docs note that without `sizes`, Next generates only a narrow `srcset` (1x/2x) suited to fixed-size images, whereas with it the full width-descriptor `srcset` is produced. A viewport-width backdrop needs the latter.

Using the original `url` rather than `sizes.gallery` (1200px) follows the precedent already set for the about photo in `page.tsx`, and for the same reason: a full-viewport backdrop on a 1440px retina display wants ~2880px of source, so handing the optimizer a 1200px derivative would cap quality below what the screen shows. `object-cover` is what satisfies FR-003 (fill without distortion) at any viewport shape.

**Alternatives considered**: A CSS `background-image` on the section — rejected because it forgoes Next's optimization, `srcset`, and format negotiation entirely, and this repo has no `background-image` precedent. The `og` (1200×630) named size — rejected as both too small and pre-cropped to a ratio unrelated to the viewport.

---

## R2 — The viewport unit that keeps the first screen a first screen

**Decision**: size the hero with `min-h-[100svh]`, emitting `min-h-screen` (i.e. `100vh`) immediately before it as a fallback for engines without small-viewport units.

**Rationale**: FR-001 and SC-004 are a hard promise that name, essence, and CTA need no scrolling. On mobile browsers `100vh` resolves to the *largest* viewport — the height with browser chrome retracted — so a `100vh` hero is taller than what the visitor can actually see at first paint, and the CTA lands under the URL bar. That is the classic failure this requirement forbids.

`svh` resolves to the *smallest* viewport (chrome expanded), which is precisely the state at first paint, so content sized to it always fits. `dvh` also fits at first paint but is defined to track chrome as it retracts, which reflows the hero mid-scroll; for a hero with no scroll-coupled content that buys nothing and risks jitter.

The accepted cost: once the visitor scrolls and chrome retracts, the visible viewport grows past `100svh` and a sliver of the about section appears below the cover. That only occurs *while already scrolling*, so it does not weaken SC-003, which is a statement about the first viewport on arrival.

**Alternatives considered**: `100dvh` — rejected for the mid-scroll reflow. `100lvh` — rejected because it reintroduces exactly the chrome-obscured CTA that FR-001 exists to prevent. The current `min-h-[90vh]` — rejected because the 10% slack it leaves for the header is what SC-003 now forbids (see R9).

---

## R3 — Guaranteeing contrast over an arbitrary photograph

**Decision**: place a fixed-alpha `ink` scrim between photograph and text, with its alpha chosen so that WCAG contrast holds against the brightest photograph physically possible (pure white). Minimum alpha **0.85** across the text zone and **0.65** across the top nav band. No per-image analysis, no per-image tuning.

**Rationale**: FR-015 rules out the whole family of adaptive approaches, so the only way to *guarantee* FR-014 is to make the worst case safe. The worst case is well defined: a photograph of pure white. Compositing `#0b0b0d` at alpha α over white gives a known backdrop luminance, and every text colour on the site can be checked against it once, in a unit test, rather than per image.

Composite of `ink` (11, 11, 13) over white at α = 0.85 is (47.6, 47.6, 49.3), relative luminance **0.0292**. Against that backdrop:

| Text | Colour | Luminance | Ratio | Threshold | Result |
|---|---|---|---|---|---|
| Essence sentence | `neutral-100` `#f5f5f5` | 0.9131 | **12.2:1** | 4.5:1 (body) | pass |
| Brand mark, first half | `tone-live` `#e7a94c` | 0.4589 | **6.4:1** | 3:1 (large) | pass |
| Brand mark, second half | `tone-digital` `#9089ff` | 0.3105 | **4.6:1** | 3:1 (large) | pass |

`tone-digital` is the binding constraint and the reason alpha is 0.85 rather than something gentler: at α = 0.60 the violet falls to 1.8:1 and at α = 0.75 to 3.1:1, i.e. only marginally over the large-text floor. 0.85 clears it with room and still clears 4.5:1, so the treatment does not silently depend on the name qualifying as "large text".

For the top band the only text is the nav's body-size links in `neutral-100`, needing 4.5:1. `ink` at α = 0.65 over white composites to luminance 0.1182, giving **6.2:1** — sufficient, and much lighter than the text band, so the photograph is barely touched where the nav sits.

The CTA needs no scrim at all: it is a filled `bg-tone-live` button with `text-ink`, so its contrast is self-contained whatever is behind it. Its white focus ring (from the existing `:focus-visible` rule in `globals.css`) reads against the amber fill, which is what satisfies FR-016.

One deliberate consequence: the essence sentence's current `opacity-90` must go. Opacity makes the effective text colour a function of the backdrop, which would make the computed ratios above untrue. It becomes a solid `neutral-100` instead — visually near-identical, and exactly measurable.

**The trade-off, stated plainly**: an 0.85 scrim is nearly opaque, so wherever text sits the photograph is heavily suppressed. Guaranteeing legibility over *any* image without tuning necessarily costs image visibility; FR-015 chose that trade. The design recovers most of it by confining the strong band rather than washing the whole frame: vertical and bottom-anchored on mobile, horizontal and left-anchored from `md:` up, where the text column only occupies the left ~44% and the remaining majority of the photograph stays clear. Exact gradient stops are in [contracts/home-hero-ui.md](./contracts/home-hero-ui.md).

**Alternatives considered**: `text-shadow` on the text — rejected because WCAG contrast is computed against the backdrop and ignores shadows, so it would look better without ever being provably compliant. `backdrop-filter: blur()` behind a panel — rejected because blurring a white photograph yields a white panel; blur redistributes luminance, it does not reduce it. Server-side luminance or dominant-colour analysis to pick light or dark text — rejected twice over: FR-015 forbids per-image adjustment, and a single average cannot speak for the specific region the text occupies. Requiring the owner to upload only dark photographs — rejected as exactly the dependency FR-015 names.

---

## R4 — Detecting and splitting the brand mark

**Decision**: a new `src/lib/theme/brand.ts` exports `BRAND_MARK = 'SanSay'` and a pure `splitBrandMark(name)`. The rule applies only when the whole trimmed name matches the mark case-insensitively; the split falls between the two three-letter halves; the *displayed* casing is taken from the owner's value, never from the constant.

**Rationale**: FR-009 scopes the treatment to "when the displayed owner name is the SanSay brand mark", FR-012 requires any other name to render as one plain heading, and FR-011 forbids exposing any of this to the owner as a setting. A pure function over `home.name` satisfies all three and is testable in Vitest with no browser and no database.

Matching on the whole trimmed string, rather than searching for a substring, is what keeps FR-012 honest: a name like `SanSay Studio` is *not* the brand mark and must not be split. Slicing the owner's own string rather than substituting the constant means a name stored as `SANSAY` renders as `SAN` + `SAY`, preserving the owner's intent while still earning the two-tone treatment.

`src/lib/theme/` is the right home because Constitution IV designates it as the single definition point for the visual system, and because `tokens.ts` already establishes the pattern of visual rules living there as importable constants rather than as literals inside components.

**On Constitution V**: `'SanSay'` is a string literal in code, so the principle deserves an explicit answer. It is not user-facing copy — it is never rendered, and it is not translatable; it is the sentinel a visual rule is keyed on, in the same category as `tone-live`. Every rendered character still comes from `home.name` in the CMS. Had the constant been rendered as a fallback name, that would be a genuine violation; it is not, and `HomePage.name` remains `required: true` with a default, so there is nothing to fall back to.

**Alternatives considered**: storing the split index in the CMS — rejected by FR-011. Case-sensitive matching — rejected because it would silently drop the treatment if the owner typed `Sansay`. A regex substring split — rejected for the `SanSay Studio` false positive above.

---

## R5 — Keeping a two-tone name one accessible heading

**Decision**: one `<h1>` containing two adjacent `<span>`s with no whitespace, no `aria-label`, and no other ARIA. Verified by asserting the `<h1>`'s accessible name equals `home.name` exactly.

**Rationale**: FR-013 and SC-008 require the name be conveyed as a single continuous name. Adjacent inline elements with no intervening whitespace form one uninterrupted text run in the accessibility tree, so `<span>San</span><span>Say</span>` computes an accessible name of `SanSay` and is announced as one word.

The correctness condition is the absence of whitespace between the spans, and JSX is helpful here rather than hostile: whitespace runs containing a newline are dropped, so the two spans may sit on separate lines and Prettier may reformat them freely. What *would* break the contract is a literal space between them on a single line. Because the distinction is invisible in review, it is tested rather than trusted — the assertion is on the computed accessible name, not on the markup.

`aria-label` on the heading was considered as a belt-and-braces guarantee and rejected: it would override the visible text with a duplicate of itself, which is redundant ARIA that adds a second thing to keep in sync for no behavioural gain. `toHaveAccessibleName` in Playwright tests the real computed value, which is a stronger check than the attribute would be a guarantee.

**Alternatives considered**: `aria-hidden` on the spans plus a visually-hidden full name — rejected as a heavier construction solving a problem correct markup does not have. Two separate headings — rejected outright; it would fragment the document outline and break FR-013.

---

## R6 — A larger name that still always fits

**Decision**: `font-size: clamp(2.5rem, min(13vw, 16vh), 9rem)` on the brand mark.

**Rationale**: FR-005 wants the name dominant and larger than its current `text-5xl` (48px); FR-006 requires it to shrink as far as needed to keep the essence and CTA in the first viewport, with fitting taking precedence over size. Those pull against each other, and the `min(13vw, 16vh)` term is what reconciles them: width-relative sizing alone would ignore the case FR-006 is really about, which is a *short* viewport rather than a narrow one.

Resolved sizes at the viewports that matter:

| Viewport | `13vw` | `16vh` | Applied | vs. today's 48px |
|---|---|---|---|---|
| Desktop 1280×800 | 166px | 128px | **128px** | 2.7× larger |
| Phone portrait 390×844 | 51px | 135px | **51px** | slightly larger |
| Phone landscape 844×390 | 110px | 62px | **62px** | larger, and still leaves room |

Phone landscape is the case that justifies the whole expression: on width alone the name would render at 110px and consume most of a 390px-tall screen, pushing the CTA out of view and failing SC-004. The height term caps it at 62px instead. No JavaScript and no resize observer is involved, so `HomeHero` stays a server component.

**Alternatives considered**: Tailwind's discrete responsive steps (`text-6xl sm:text-7xl lg:text-8xl`) — rejected because breakpoints key off width only and would fail phone landscape exactly as above. A JS fit-to-box measurement — rejected for forcing a client component and a layout-thrashing measure/paint cycle onto the LCP element.

---

## R7 — Eager loading, and two Next.js 16 changes that bite here

**Decision**: `loading="eager"` together with `fetchPriority="high"` on the cover. No `priority` prop. No `quality` prop.

**Rationale**: both halves of this contradict what is usually written for `next/image`, and both come from the installed docs' version history:

- **`priority` is deprecated as of Next.js 16**, superseded by `preload`. The prop reference goes further and recommends against `preload` for this case too: "In most cases, you should use `loading="eager"` or `fetchPriority="high"` instead", and it explicitly lists "when the `loading` property is used" among the times not to use `preload`. So the correct v16 spelling for an above-the-fold hero image is `loading="eager"` plus `fetchPriority="high"`.
- **`qualities` now defaults to `[75]`**, and the docs note the allowlist became required in v16 "because unrestricted access could allow malicious actors to optimize more qualities than you intended". A `quality` outside the list is coerced to the nearest allowed value with a development warning. Omitting `quality` therefore lands on 75 deliberately, rather than passing a number that would be silently rewritten.

This also surfaces a **pre-existing defect nearby**: `src/app/(frontend)/page.tsx` passes `quality={85}` to the about photo, which under 16.3.4 is coerced to 75 and warns in development. It is not this feature's to fix, and `plan.md` records it as out of scope so a task does not quietly absorb it.

FR-017 and SC-010 — text readable before the photograph loads — need nothing extra. The hero is server-rendered HTML with the text in the markup and the image as a separate subresource, so text paints first by construction. Eager/high-priority fetching serves the LCP goal without gating the text on it.

**Alternatives considered**: `preload` — rejected on the docs' own advice above. `placeholder="blur"` — rejected because a remote CMS image has no automatic `blurDataURL` (that is a static-import feature), so it would mean generating and storing one per upload for a backdrop that sits under an 0.85 scrim.

---

## R8 — What the cover's `alt` should be

**Decision**: render the cover with `alt=""`, marking it decorative. The `media.alt` value keeps being collected and stored as today.

**Rationale**: FR-022 requires the owner be *able* to supply a textual description through the usual flow, and that already holds without any change — `src/collections/Media.ts` makes `alt` `required: true` precisely so the accessibility baseline cannot be skipped in a hurry. FR-022 asks that the description be collectable; it does not dictate that this particular surface render it.

What should render is settled by the spec's own edge case: the cover "MUST be treated as decorative rather than announced as an unlabelled image, since the name and essence already carry the meaning". That matches the HTML specification's guidance that a purely decorative image take `alt=""`. Announcing a backdrop description ahead of the `<h1>` would put noise between the visitor and the one thing the opening screen exists to say.

`alt=""` also quietly helps FR-026: when an image fails to load, an empty `alt` renders nothing, whereas a non-empty one renders broken-image text — the very artefact FR-024 forbids.

**Alternatives considered**: rendering `media.alt` — rejected per the edge case and the noise argument. Making `alt` conditional on some new "decorative?" CMS toggle — rejected as owner-facing complexity in service of a distinction the owner has no reason to reason about, and as pressure on FR-011's spirit.

---

## R9 — The header versus a cover that must fill the viewport

**Decision**: lift the site header over the hero with a single rule in `globals.css`, keyed on the hero's presence:

```css
body:has(#home-hero) > header { position: absolute; inset-inline: 0; top: 0; z-index: 10; }
```

The hero carries `id="home-hero"`, and the scrim's top band (R3) keeps the nav links legible over the photograph.

**Rationale**: this is the one place where the spec's requirements force a change outside the home page, so it is worth being explicit about why. `src/app/(frontend)/layout.tsx` renders `<header><Nav/></header>` as a sibling *before* `<main>`, and `Nav` is `px-6 py-4` with no background, so it occupies roughly 56–60px of normal flow and shows the body's `bg-ink` behind it. That leaves two unacceptable outcomes and one acceptable one:

- Hero at `100svh` with the header still in flow: total content exceeds the viewport, so the CTA drops below the fold — fails FR-001 and SC-004.
- Hero at `calc(100svh - 60px)`: everything fits, but a dark bar sits above the photograph — fails FR-002 and SC-003, which name "no visible gap, bar, or margin".
- Header lifted out of flow, hero at `100svh`: the photograph reaches all four edges and the content still fits. This is the only option satisfying both.

Keying the rule on `body:has(#home-hero)` is what keeps the change from leaking. The alternative shapes all cost more: a prop through the shared layout cannot work because a layout cannot read which child route rendered; a globally `fixed` or `absolute` header would require every other route to add compensating top padding; and moving `Nav` into each page duplicates it and abandons the single-definition property Constitution II relies on. `:has()` has been Baseline since 2023 and is already implied by the repo's browser expectations. Should it be unsupported, the degradation is graceful and bounded — the header stays in flow and the hero is pushed down by ~60px, which costs a small scroll rather than breaking the page.

This decision is also why R3 specifies a top scrim band at all. Overlaying the nav onto an arbitrary photograph creates a contrast surface the spec never contemplated, since FR-014 enumerates only the name, essence, and CTA. Rather than leave nav legibility to chance, it is folded into the same worst-case calculation and held to the same 4.5:1.

**Alternatives considered**: giving the nav its own opaque pill or bar over the cover — rejected as chrome added for its own sake (Constitution I) when a gradient already owed to the text band can extend to cover it. Hiding the nav entirely on the home page — rejected as a navigation regression well outside this feature's scope.
