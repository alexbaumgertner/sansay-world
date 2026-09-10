# Feature Specification: Home Opening Screen Cover & Brand Mark

**Feature Branch**: `003-home-hero-cover`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Upgrade the home page opening screen so a first-time visitor sees a full-bleed photographic cover behind the brand, with a larger colorful brand treatment for the owner name, while keeping the one-sentence essence and the control that leads to the disciplines list visible without scrolling on desktop and mobile. The cover photograph is owner-editable through the admin as a dedicated Home field, separate from the about-block photograph. When no cover is set, the opening screen still presents name, essence, and CTA without breaking layout. The colorful name treatment is part of the site's fixed visual identity (gig-poster aesthetic, existing live/digital accent system): when the displayed owner name is the SanSay brand mark, the second half of the mark uses the digital accent; the name remains a single accessible heading. Essence sentence and CTA stay owner-/copy-driven as today. Preserve FR-001/SC-001 first-viewport readability and contrast over the cover."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrive at a cover that says who this is (Priority: P1)

A first-time visitor opens the home page and, before touching the scroll, sees a single photographic image filling the whole opening screen, with the owner's name set large across it in the site's two accent colors, the one-sentence description of what he does, and the control that takes them to the list of disciplines. Every one of those three pieces of information is legible against the photograph.

**Why this priority**: This is the site's first and only guaranteed impression, and it is the one thing spec 001's FR-001/SC-001 already commit to. The cover and the brand treatment are what turn a correct-but-plain opening screen into something that reads as a deliberate piece of craft work — but they only count as an improvement if the name, essence, and route onward stay just as readable as they were without a photograph behind them.

**Independent Test**: Load the home page cold with a cover photograph set, at a desktop viewport and at a phone viewport, and confirm the photograph fills the opening screen edge to edge, and that name, essence sentence, and disciplines control are all visible without scrolling and legible over the image. Delivers value on its own, with no admin or fallback work in place.

**Acceptance Scenarios**:

1. **Given** a cover photograph is set and a visitor lands on the home page, **When** the page finishes loading, **Then** the photograph fills the opening screen from edge to edge with no letterboxing, margin, or visible container, and the owner's name, the essence sentence, and the disciplines control all appear over it without scrolling.
2. **Given** the visitor is on a desktop-sized screen, **When** they look at the opening screen, **Then** the owner's name is rendered noticeably larger than it was before this feature and is the dominant element of the screen, and the essence sentence and disciplines control remain fully within the first viewport.
3. **Given** the visitor is on a phone-sized screen, **When** they look at the opening screen, **Then** the name, essence sentence, and disciplines control are all still visible without scrolling and without horizontal overflow, and the photograph still covers the full screen.
4. **Given** the displayed owner name is the SanSay brand mark, **When** the visitor reads it, **Then** its first half and second half are rendered in the site's two established accent tones, with the second half in the digital accent.
5. **Given** a visitor using a screen reader reaches the opening screen, **When** the heading is announced, **Then** the owner's name is announced once as a single continuous name, not as two separate fragments.
6. **Given** the visitor activates the disciplines control, **When** the action completes, **Then** they arrive at the disciplines list exactly as they did before this feature.

---

### User Story 2 - Owner changes the cover photograph without a developer (Priority: P2)

The owner opens the admin panel, picks or replaces the photograph used behind the opening screen, saves, and sees the new cover on the public home page — without touching the about-block photograph and without any code change or deployment.

**Why this priority**: The cover is the most visible image on the site and the one most likely to be swapped as the owner's work and mood change, so it must be self-service (constitution Principle III). It ranks below Story 1 because Story 1 delivers the visitor-facing value; a cover that has to be seeded once by hand is still a working cover.

**Independent Test**: Acting as the non-developer owner, set a cover photograph in the admin panel, save, reload the public home page and confirm the new image appears; then confirm the about-block photograph further down the page is unchanged. Testable without the fallback behaviour of Story 3.

**Acceptance Scenarios**:

1. **Given** the owner is editing home page content in the admin panel, **When** they look for the opening-screen cover, **Then** they find a dedicated cover field, clearly distinct from and additional to the existing about-block photograph field.
2. **Given** the owner selects a photograph for the cover field and saves, **When** the public home page is loaded, **Then** the opening screen shows that photograph and the about-block photograph is unchanged.
3. **Given** the owner replaces an existing cover photograph with a different one and saves, **When** the public home page is loaded, **Then** the opening screen shows the new photograph.
4. **Given** the owner clears the cover field and saves, **When** the public home page is loaded, **Then** the opening screen shows no photograph and behaves as described in Story 3.
5. **Given** the owner is setting the cover photograph, **When** they save it, **Then** they are able to supply or confirm a textual description of the image for visitors who cannot see it.

---

### User Story 3 - Opening screen holds up with no cover set (Priority: P3)

Someone loads the home page on an installation where no cover photograph has been chosen — a fresh setup, or right after the owner cleared the field — and still gets a complete, intentional-looking opening screen with the name, the essence sentence, and the route to the disciplines.

**Why this priority**: This is the safety net that keeps the site's single most important screen from ever appearing broken. It ranks last because it is a degraded-state guarantee rather than the value the feature is for, but it must ship with the feature, not after it.

**Independent Test**: With the cover field empty, load the home page at desktop and phone viewports and confirm the opening screen presents name, essence sentence, and disciplines control with no empty gap, collapsed area, stretched placeholder, or contrast failure.

**Acceptance Scenarios**:

1. **Given** no cover photograph is set, **When** a visitor lands on the home page, **Then** the opening screen still occupies the full first viewport and still presents the owner's name, the essence sentence, and the disciplines control without scrolling.
2. **Given** no cover photograph is set, **When** the visitor looks at the opening screen, **Then** there is no empty frame, blank gap, broken-image indicator, or placeholder graphic where the photograph would be.
3. **Given** no cover photograph is set, **When** the visitor reads the name, essence sentence, and disciplines control, **Then** all three still meet the site's contrast baseline against whatever backdrop is shown in place of the photograph.
4. **Given** a cover photograph is set but its image cannot be retrieved when the page is viewed, **When** the visitor lands on the home page, **Then** the opening screen presents itself as though no cover were set, rather than showing a broken image.

---

### Edge Cases

- What happens when the cover photograph is light, busy, or high-contrast in the exact area the text sits over? The name, essence sentence, and disciplines control MUST remain legible regardless of the photograph chosen — readability cannot depend on the owner picking a conveniently dark image.
- What happens when the cover photograph's aspect ratio does not match the viewport (a landscape photo on a tall phone, a portrait photo on a wide desktop)? The photograph MUST still cover the full opening screen without distortion, stretching, or bars.
- What happens on a short viewport, such as a phone held in landscape or a small laptop window? Name, essence sentence, and disciplines control MUST all still fit without scrolling, even if that means the name is rendered at a smaller size than on a tall screen.
- What happens when the owner changes the displayed name to something other than the SanSay brand mark? The name MUST render as a single heading in one tone, with no arbitrary split applied to a name the split was not designed for.
- What happens when the essence sentence is unusually long? It MUST NOT push the disciplines control out of the first viewport.
- What happens when the cover photograph is very large in file size? It MUST NOT delay the appearance of the name, essence sentence, and disciplines control — the text MUST NOT wait on the image.
- What happens when a visitor navigates with the keyboard only? The disciplines control MUST be reachable and its focus indicator MUST be visible against the photograph.
- What happens when the cover photograph has no textual description? The image MUST be treated as decorative rather than announced as an unlabelled image, since the name and essence already carry the meaning.

## Requirements *(mandatory)*

### Functional Requirements

**Opening screen composition**

- **FR-001**: The home page opening screen MUST present the owner's name, the one-sentence essence, and the control leading to the disciplines list within the first viewport, without scrolling, on both desktop and phone-sized screens. This restates and MUST NOT weaken FR-001 of the portfolio site specification (`specs/001-portfolio-site`).
- **FR-002**: When a cover photograph is set, the opening screen MUST display it as a full-bleed backdrop covering the entire first viewport — edge to edge horizontally and vertically, with no container margin, letterboxing, or visible frame.
- **FR-003**: The cover photograph MUST fill the opening screen without distorting the image's proportions, at any viewport shape, including portrait phone and wide desktop.
- **FR-004**: The owner's name, the essence sentence, and the disciplines control MUST all be rendered over the cover photograph, not beside or beneath it.
- **FR-005**: The owner's name MUST be rendered at a size that makes it the dominant element of the opening screen, and larger than its pre-feature size, on desktop screens.
- **FR-006**: The opening screen MUST reduce the name's rendered size as far as needed to keep the essence sentence and the disciplines control inside the first viewport on short and small screens; keeping all three visible takes precedence over any target name size.
- **FR-007**: The essence sentence MUST continue to come from owner-editable home page content, and the disciplines control's label MUST continue to come from the site's copy layer; this feature MUST NOT move either into component code.
- **FR-008**: The disciplines control MUST continue to lead to the disciplines list, with the same destination and behaviour as before this feature.

**Brand mark treatment**

- **FR-009**: When the displayed owner name is the SanSay brand mark, the opening screen MUST render its two halves in the site's two established accent tones, with the second half in the digital accent.
- **FR-010**: The name MUST use only the site's two established accent tones and its established heading typeface; this feature MUST NOT introduce any additional colour or typeface (constitution Principle IV).
- **FR-011**: The two-tone treatment MUST be part of the site's fixed visual identity, not owner-editable content: the owner MUST NOT be given a control for choosing the name's colours or where the split falls.
- **FR-012**: When the displayed owner name is not the SanSay brand mark, the name MUST be rendered as a single heading in a single tone, with no split applied.
- **FR-013**: However the name is coloured, it MUST remain one heading and MUST be conveyed to assistive technology as a single, continuous name.

**Readability over the cover**

- **FR-014**: The owner's name, the essence sentence, and the disciplines control MUST meet the site's accessibility contrast baseline against the cover photograph, for any photograph the owner is able to set — including light, busy, and high-contrast images.
- **FR-015**: Legibility over the cover MUST NOT depend on the owner selecting a suitable photograph, on manual per-image adjustment, or on any owner-configured setting.
- **FR-016**: The keyboard focus indicator for the disciplines control MUST remain clearly visible when the control sits over the cover photograph.
- **FR-017**: The name, essence sentence, and disciplines control MUST be readable as soon as the opening screen is rendered, without waiting for the cover photograph to load.

**Owner control of the cover**

- **FR-018**: Home page content MUST carry a dedicated cover photograph field for the opening screen, separate from and in addition to the existing about-block photograph field.
- **FR-019**: The owner MUST be able to set, replace, and clear the cover photograph through the admin panel, with no developer involvement and no code change.
- **FR-020**: Changing the cover photograph MUST NOT change the about-block photograph, and changing the about-block photograph MUST NOT change the cover.
- **FR-021**: The cover photograph MUST be optional; home page content MUST be saveable with no cover set.
- **FR-022**: The owner MUST be able to supply a textual description for the cover photograph through the same admin flow used for the site's other images.

**Behaviour with no cover**

- **FR-023**: When no cover photograph is set, the opening screen MUST still occupy the full first viewport and MUST still present the owner's name, the essence sentence, and the disciplines control, with the same layout structure and no scrolling required.
- **FR-024**: When no cover photograph is set, the opening screen MUST NOT show an empty frame, blank gap, collapsed region, broken-image indicator, or placeholder graphic.
- **FR-025**: When no cover photograph is set, the name, essence sentence, and disciplines control MUST meet the site's contrast baseline against whatever backdrop is shown instead.
- **FR-026**: When a cover photograph is set but cannot be retrieved at view time, the opening screen MUST present itself exactly as it does when no cover is set.

### Key Entities

- **Home Page Content**: Extends the existing owner-editable landing copy (name, one-sentence essence, about photograph, bio paragraphs, reply-window copy, sharing metadata) with one new optional attribute: the opening-screen cover photograph, held separately from the about-block photograph and referencing the same owner-managed image library.
- **Opening-screen cover photograph**: A single image the owner selects from the site's managed images, used only as the backdrop of the home page's first viewport. Carries an optional textual description. Its absence is a valid state.
- **Brand mark treatment**: A fixed, code-owned rule of the visual identity that maps the two halves of the SanSay name onto the site's two existing accent tones. Not content, not configurable, and applicable only when the displayed name is that brand mark.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify who SanSay is and what he can help with without scrolling, on both desktop and phone-sized screens, with a cover photograph in place — preserving SC-001 of the portfolio site specification (`specs/001-portfolio-site`).
- **SC-002**: The owner's name, the essence sentence, and the disciplines control each meet the site's contrast baseline over the cover photograph in 100% of cover images tested, including a deliberately light and a deliberately busy image.
- **SC-003**: On both desktop and phone viewports, the cover photograph covers 100% of the first viewport area with no visible gap, bar, or margin, and with the image's proportions preserved.
- **SC-004**: The opening screen keeps name, essence sentence, and disciplines control fully visible without scrolling across the full range of tested viewports, including a phone in landscape orientation.
- **SC-005**: The owner's name occupies a visibly larger share of the opening screen than before this feature on desktop, while SC-004 still holds.
- **SC-006**: An owner with no coding ability can set or replace the opening-screen cover photograph, and confirm it live on the home page, within a single admin-panel session with zero developer involvement.
- **SC-007**: Loading the home page with the cover field empty produces an opening screen indistinguishable in structure and completeness from the covered version — no empty region, and all three elements present and legible — in 100% of tested viewports.
- **SC-008**: A visitor using a screen reader hears the owner's name announced once, as a single continuous name, in 100% of tested screen-reader passes.
- **SC-009**: A visitor using only a keyboard can move focus to the disciplines control and see its focus indicator over the cover photograph, on both desktop and phone viewports.
- **SC-010**: The name, essence sentence, and disciplines control are readable before the cover photograph has finished loading, on a throttled connection.

## Assumptions

- **The split falls between the two halves of the brand mark, coloured with both accents.** The user's description fixes only that the second half takes the digital accent. This spec assumes the first half takes the live accent, so that the name itself carries the constitution's two-accent meaning — handmade and generated — which is precisely what the owner does. If the owner would rather the first half stay in the default foreground tone, that is a one-line change to FR-009 and nothing else in this spec moves.
- The site's contrast baseline is the reasonable accessibility baseline already established for public pages by FR-031 of the portfolio site specification, not a formal audit against a stricter standard.
- Achieving readability over an arbitrary photograph is expected to need some always-on treatment of the image or the text behind which the photograph sits; which treatment is chosen is an implementation decision, so FR-014 and FR-015 state the outcome rather than the mechanism.
- One cover photograph serves every viewport. Separate desktop and mobile crops, owner-set focal points, and multiple cover images are out of scope; the single image is expected to be cover-cropped to the viewport.
- The cover photograph is a still image only. Video and animated covers are out of scope.
- The cover photograph draws from the same owner-managed image library, and the same upload and description flow, as the site's existing images; this feature adds no new media handling for the owner to learn.
- Everything below the opening screen — the about block with its own photograph and bio paragraphs, the disciplines list, and the discipline cards — is unchanged by this feature.
- The about-block photograph remains a separate field with its own purpose; this feature neither reuses it as a cover fallback nor removes it.
- Existing installations have no cover set until the owner chooses one, so the no-cover state of Story 3 is the initial state after this feature ships, not only an error path.
- No new user-facing copy strings are assumed to be needed; if any are, they go through the site's existing copy layer per constitution Principle V.
