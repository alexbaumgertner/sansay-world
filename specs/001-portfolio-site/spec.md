# Feature Specification: SanSay Portfolio Site

**Feature Branch**: `001-portfolio-site`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Build a portfolio site for SanSay, one person who practises several crafts at once: he writes and performs music, shoots and edits video, does 3D work, and builds and repairs guitars and amplifiers. The list of disciplines will keep growing. Home page shows who he is and every discipline within one screen/scroll. Each discipline has its own page with a gallery of work samples and a scoped enquiry form. Enquiries must be stored with a status, emailed to the owner, and optionally sent to a messenger, with any single channel failure not losing the enquiry. Content (disciplines, work samples, home copy, images) is managed by the non-developer owner through an admin panel, and a new discipline automatically appears on the home page, in navigation, and in the enquiry topic list. A hidden, unauthenticated 'Friends' story page exists outside navigation, on-site search, and the sitemap. The site must work on mobile and produce good search-engine and social-share previews."

## Clarifications

### Session 2026-09-07

- Q: How should access to the admin panel be restricted so that only SanSay (the owner) can edit content or view enquiries? → A: Single owner login (username/password or equivalent) — one account, no self-registration, no roles.
- Q: What accessibility standard should the public-facing pages (home, discipline pages) meet? → A: Reasonable baseline only — semantic HTML, sufficient color contrast, alt text on images, keyboard-operable forms — no formal audit.
- Q: Should the enquiry form show a personal-data notice (what's collected and why) before or at submission? → A: No — out of scope for this feature; treat as a general site concern to address separately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover the disciplines and open one (Priority: P1)

A first-time visitor lands on the home page, understands within one screen who SanSay is and what he could be useful for, and within one further scroll can see every discipline he practises and open the one relevant to them.

**Why this priority**: This is the entire reason the site exists (per the project's "content over interface" principle) — if a visitor cannot work out who SanSay is and what he offers within seconds, nothing else on the site matters.

**Independent Test**: Can be fully tested by loading the home page cold (no prior navigation) and confirming a visitor can identify the offer and reach any discipline's page — delivers value on its own even before enquiries or admin editing exist.

**Acceptance Scenarios**:

1. **Given** a visitor lands on the home page, **When** the page finishes loading, **Then** they see, without scrolling, the owner's name, a single sentence describing what he does, and a control that leads to the list of disciplines.
2. **Given** the visitor scrolls down, **When** they reach the "about" block, **Then** they see one photograph and two to three paragraphs of biography.
3. **Given** the visitor continues scrolling, **When** they reach the disciplines list, **Then** every published discipline appears as a card (name, strapline, one-to-two-sentence description, accent tone) in the order the owner set, within a single scroll from the opening screen.
4. **Given** the visitor clicks a discipline card, **When** the discipline page loads, **Then** they see that discipline's heading, strapline, fuller description, and its gallery of work samples, plus links back to the home page and to neighbouring disciplines.

---

### User Story 2 - Send an enquiry that reliably reaches the owner (Priority: P2)

A visitor interested in a specific discipline fills out that discipline's enquiry form and trusts that their message will reach SanSay even if one delivery mechanism has a problem.

**Why this priority**: Receiving enquiries is the site's other reason for existing; a form that visitors can submit but that silently loses messages is worse than no form at all.

**Independent Test**: Can be fully tested by submitting the enquiry form on any discipline page and confirming the enquiry is stored, delivered, and confirmed to the visitor — independent of admin content management or the hidden page.

**Acceptance Scenarios**:

1. **Given** a visitor is on a discipline page, **When** they open the enquiry form, **Then** the discipline is already filled in and visible, and they can provide name, preferred contact method, an optional desired date, and a description of the job.
2. **Given** a visitor submits a complete, valid enquiry, **When** the submission is accepted, **Then** they immediately see an on-screen confirmation that states when they can expect a reply, and the enquiry appears in the admin panel with status "new".
3. **Given** an enquiry has been accepted, **When** the system attempts delivery, **Then** it is emailed to the owner and, if a messenger channel is enabled in configuration, also sent there — and if exactly one of these channels fails, the enquiry still counts as received and that failure is visible to the owner.
4. **Given** an automated bot attempts to submit the form, **When** it does so, **Then** the submission is prevented from being treated as a genuine enquiry, without adding noticeable friction for a genuine visitor.

---

### User Story 3 - Manage content and add a new discipline without a developer (Priority: P3)

The owner, who is not a developer, logs into the admin panel to update home page copy, add or reorder work samples, and add an entirely new discipline — and the new discipline shows up everywhere it needs to on its own.

**Why this priority**: The catalogue of disciplines will keep growing; if every addition needs a developer, the site stops being maintained. This depends on Stories 1 and 2 already existing (there must be a home page, navigation, and enquiry form for the new discipline to appear in).

**Independent Test**: Can be fully tested by having someone acting as the non-developer owner create a new discipline end-to-end in the admin panel and confirming it appears on the home page, in navigation, and as an enquiry topic without any code change.

**Acceptance Scenarios**:

1. **Given** the owner is in the admin panel, **When** they create a new discipline (name, strapline, description, order, tone) and publish it, **Then** it appears on the home page's discipline list, in the site navigation, and as a topic in every discipline's enquiry form, with no code change.
2. **Given** the owner is editing an existing discipline, **When** they add, reorder, or remove a work sample (title, description, optional image, optional external video link), **Then** the discipline's gallery reflects the change immediately.
3. **Given** the owner edits the home page copy (name, one-sentence essence, about photo, bio paragraphs), **When** they save, **Then** the public home page shows the updated copy.
4. **Given** the owner opens the enquiries list in the admin panel, **When** they review an enquiry, **Then** they can see all its fields and its delivery status, and change its status among new, in progress, and closed.

---

### User Story 4 - Reach the hidden "Friends" story by direct link (Priority: P4)

Someone who has been given the address of the "Friends" page opens it directly and reads the chaptered story of Murat, Zuich, and the author, with no login and no way to have stumbled onto it by browsing the site normally.

**Why this priority**: This is a self-contained, low-traffic feature independent of the portfolio's business purpose; it can ship after the core browsing and enquiry flows are solid.

**Independent Test**: Can be fully tested by opening the page's direct URL without authentication, and separately confirming it is absent from navigation, on-site search, and the search-engine sitemap.

**Acceptance Scenarios**:

1. **Given** someone has the page's direct URL, **When** they open it, **Then** they see the story broken into chapters with accompanying photographs, without being asked to log in.
2. **Given** a visitor browses the site's navigation, uses any on-site search, or finds the site through a search engine, **When** they look for this content, **Then** it never appears.
3. **Given** a visitor reads the page, **When** they look for a statement of its status, **Then** it explicitly says the content is unadvertised rather than access-controlled or secured.

---

### Edge Cases

- What happens when a discipline has no work samples yet? The gallery MUST show a clear empty state rather than appearing broken.
- What happens when the owner has published zero disciplines? The home page MUST still load correctly (opening screen and about block intact) with an empty or hidden disciplines section, rather than erroring.
- What happens when the visitor leaves the optional desired date blank? The enquiry MUST still be accepted.
- What happens when both the email and the messenger channel fail for the same enquiry? The enquiry MUST still be stored if at all possible; if storage itself also fails, the visitor MUST NOT see a false confirmation — the failure MUST be surfaced to the visitor instead.
- What happens when the owner deletes or unpublishes a discipline that already has enquiries or work samples attached? Existing enquiries MUST retain their original discipline reference for the owner's records even if the discipline is later removed from public view.
- What happens when a discipline accumulates a very large number of work samples? The gallery MUST remain usable (scrollable/navigable) rather than degrading the page.
- What happens when someone reaches the Friends page URL through a leaked link or a crawler that ignores exclusion signals? The page MUST still load without authentication (it is unadvertised, not access-controlled) — this is intentional, not a defect.

## Requirements *(mandatory)*

### Functional Requirements

**Home page**

- **FR-001**: The home page MUST present, without scrolling, on both desktop and mobile screen sizes, the owner's name, a single sentence describing what he does, and a control leading to the disciplines list.
- **FR-002**: The home page MUST include an "about" block with one photograph and two to three paragraphs of biography.
- **FR-003**: The home page MUST list every published discipline within one scroll of the opening screen, each shown as a card with name, strapline, a one-to-two-sentence description, and a link to that discipline's own page.
- **FR-004**: The display order of discipline cards MUST be configurable by the site owner without requiring a code change.
- **FR-005**: Each discipline MUST carry exactly one of two semantic tones ("live" or "digital"), and its card MUST visibly reflect that tone through the site's established accent system.

**Discipline pages**

- **FR-006**: Every discipline page MUST display that discipline's heading, strapline, and a fuller description of the service, using the same structure across all disciplines.
- **FR-007**: Every discipline page MUST display a gallery of that discipline's work samples, in owner-defined order, with no upper limit on the number of samples.
- **FR-008**: Each work sample MUST support a title, a short description, an optional image, and an optional link to an externally hosted video.
- **FR-009**: Every discipline page MUST include an enquiry form scoped to that discipline, collecting name, preferred contact method, an optional desired date, and a description of the job.
- **FR-010**: The enquiry form MUST pre-fill and visibly display the discipline it applies to, without requiring the visitor to select it manually.
- **FR-011**: Every discipline page MUST provide a link back to the home page and links to neighbouring disciplines.

**Enquiry handling**

- **FR-012**: Every submitted enquiry MUST be stored and visible to the owner in the admin panel, with a status of "new", "in progress", or "closed" that the owner can change.
- **FR-013**: Every submitted enquiry MUST be emailed to the owner.
- **FR-014**: The system MUST support notifying the owner of a new enquiry through a messenger channel, which the owner can enable or disable through configuration, without a code change.
- **FR-015**: If any one delivery channel (email or messenger) fails, the enquiry MUST still count as received (stored and visible in the admin panel), and that specific failure MUST be visible to the owner.
- **FR-016**: The visitor-facing confirmation MUST be shown only once the enquiry has actually been accepted, and it MUST state when the visitor can expect a reply.
- **FR-017**: The enquiry form MUST include a mechanism that reduces the likelihood of automated/bot submissions being treated as genuine enquiries, without adding noticeable friction for genuine visitors.

**Content management**

- **FR-018**: The owner MUST be able to create, edit, reorder, and remove disciplines through the admin panel without developer involvement.
- **FR-019**: The owner MUST be able to create, edit, reorder, and remove work samples within a discipline through the admin panel without developer involvement.
- **FR-020**: The owner MUST be able to edit home page copy (name, one-sentence essence, about photo, and bio paragraphs) through the admin panel without developer involvement.
- **FR-021**: The owner MUST be able to upload and manage the images used across disciplines, work samples, and the home page through the admin panel.
- **FR-022**: Creating a new discipline in the admin panel MUST automatically make it appear on the home page's discipline list, in the site navigation, and as a topic option in the enquiry form, with no developer involvement and no code change.
- **FR-030**: The admin panel MUST be reachable only after signing in with a single owner account (no self-registration, no additional roles); no content-editing or enquiry-viewing capability MUST be reachable without signing in.

**Hidden "Friends" section**

- **FR-023**: The system MUST provide a standalone page presenting the "Friends" story in chapters, each with text and photographs, reachable by direct URL without authentication.
- **FR-024**: The Friends page MUST NOT appear in the site navigation, in any on-site search, or in the sitemap submitted to search engines.
- **FR-025**: The Friends page MUST explicitly state, on the page itself, that its content is unadvertised rather than access-controlled or secured.

**General**

- **FR-026**: The home page and all discipline pages MUST render correctly and remain fully usable on phone-sized screens.
- **FR-031**: The home page and discipline pages MUST meet a reasonable accessibility baseline — semantic HTML structure, sufficient color contrast for text and accent-tone indicators, descriptive alt text on images, and fully keyboard-operable navigation and forms. A formal accessibility audit or certification is not required.
- **FR-027**: The home page and discipline pages MUST be reachable by search engines and MUST produce a meaningful title and description when a link to them is shared in a messenger.
- **FR-028**: The Friends page MUST be excluded from search-engine indexing even though it remains reachable by anyone with its direct link.
- **FR-029**: The interface language MUST default to Russian, and all interface copy MUST be sourced from an editable content layer rather than fixed in place, so it can be changed without a code change.

### Key Entities

- **Discipline**: A practice area SanSay offers (e.g., music, video, 3D, guitars & amps). Holds a name, strapline, fuller description, display order, semantic tone (live/digital), and published/unpublished state. Owns a collection of work samples and is the topic a visitor's enquiry is filed against.
- **Work Sample**: A single piece of work shown in a discipline's gallery. Holds a title, short description, optional image, optional external video link, and display order. Belongs to exactly one discipline.
- **Enquiry**: A message submitted by a visitor. Holds the sender's name, preferred contact method, optional desired date, job description, the discipline it concerns, a submission timestamp, a status (new / in progress / closed), and the delivery outcome for each notification channel attempted.
- **Home Page Content**: The owner-editable copy for the landing experience — name, one-sentence essence statement, about photograph, and bio paragraphs.
- **Friends Story Page**: The standalone hidden narrative, made up of ordered chapters, each with text and photographs, plus a flag keeping it out of navigation, on-site search, and the sitemap.
- **Delivery Channel Configuration**: The owner-controlled settings for enquiry notifications — which channels (email, messenger) are enabled, and the most recent delivery outcome per channel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify who SanSay is and what he can help with without scrolling, on both desktop and phone-sized screens.
- **SC-002**: A first-time visitor can see every published discipline and reach any one of them within a single scroll from the top of the home page.
- **SC-003**: A visitor can complete and submit a discipline enquiry in under 2 minutes.
- **SC-004**: 100% of submitted enquiries that pass spam filtering are retrievable by the owner in the admin panel, even when one notification channel is unavailable at the time of submission.
- **SC-005**: An owner with no coding ability can publish a new discipline — including its appearance on the home page, in navigation, and in the enquiry topic list — within a single admin-panel session, with zero developer involvement.
- **SC-006**: Every primary visitor action (browsing disciplines, viewing a gallery, submitting an enquiry) can be completed on a phone-sized screen without horizontal scrolling or unusable controls.
- **SC-007**: When a home or discipline page link is shared in a messenger, the resulting preview shows a relevant title and description in at least 95% of shares tested.
- **SC-008**: An audit of site navigation, on-site search, and the search-engine sitemap finds the Friends page absent 100% of the time, while the page still loads correctly for anyone with its direct link.
- **SC-009**: A visitor using only a keyboard or a screen reader can identify the offer, browse to any discipline, and submit an enquiry without becoming stuck.

## Assumptions

- The owner (SanSay) is the sole admin user; multi-user roles and permissions are out of scope for this feature.
- "Live" tone is intended for hands-on/performed work (e.g., music performance, guitar/amp building & repair) and "digital" tone for produced/generated work (e.g., video editing, 3D), consistent with the project's established two-accent visual system; the owner assigns the specific tone per discipline.
- The confirmation shown after submitting an enquiry states an indicative, owner-configurable reply window (e.g., "within 2 business days") rather than a guaranteed service-level commitment.
- The messenger notification is a single configurable channel (e.g., a chat-app integration); this spec only requires that it can be toggled on or off through configuration, not which specific platform is used.
- Bot mitigation on the enquiry form uses a standard technique (e.g., a honeypot field, a challenge, or rate limiting) chosen during implementation; this spec only requires that some such mechanism exists and stays unobtrusive to genuine visitors.
- No general on-site search feature is required by this specification; the requirement that the Friends page stay out of on-site search is a preventive constraint in case one is added later.
- The interface language defaults to Russian per the project constitution; full multi-language support is not required now, but the copy mechanism must not block adding another language later.
- Enquiries and their history are retained indefinitely unless the owner deletes them; no specific retention period was requested.
- A personal-data notice or consent flow for the enquiry form is explicitly out of scope for this feature; if required, it will be addressed as a separate, site-wide concern rather than as part of this specification.
