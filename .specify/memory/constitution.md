<!--
Sync Impact Report
==================
Version change: N/A (unratified scaffold) → 1.0.0
Bump rationale: MAJOR — initial ratification of a previously-placeholder constitution;
  establishes six binding principles where none existed before.

Modified principles: none (initial adoption, not an amendment)

Added sections:
  - Core Principles I–VI (Content Over Interface; Extensible By Discipline;
    No-Developer Content Operations; One Visual Language; Localized Copy, Not
    Hardcoded Strings; Redundant Enquiry Delivery)
  - Content & Data Architecture
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none

Deferred / TODO placeholders: none — all template placeholders were resolved from
  user-supplied input.

Templates requiring downstream review (not modified by this command; flagged for
  the next run of each):
  - .specify/templates/plan-template.md — Constitution Check gates should cite
    Principles I–VI explicitly.
  - .specify/templates/spec-template.md — no changes required at this time.
  - .specify/templates/tasks-template.md — no changes required at this time.
  - .claude/skills/speckit-*/SKILL.md — no changes required at this time.
-->

# SanSay Portfolio Constitution

## Core Principles

### I. Content Over Interface
The site exists to show SanSay's work and to receive enquiries about it. No other
purpose justifies an element's existence. Before any page, component, or feature is
added, it MUST be traceable to one of these two goals — showcasing work or
capturing an enquiry. Decorative chrome, interface novelty, or functionality added
"because it's expected of a portfolio site" without a direct link to showcasing or
enquiry MUST NOT be built.

**Rationale**: The site owner is a musician and craftsman, not a software product;
scope creep on interface work trades away time and clarity that should go to the
work itself.

### II. Extensible By Discipline
Areas of work (music, video, 3D, guitars, and any added later) are data, not code.
Navigation, the home page, and enquiry forms MUST be generated from a single
disciplines data source. Adding, removing, or reordering a discipline MUST be
achievable by editing that data source alone; it MUST NOT require code changes to
the navigation, home page, or enquiry form components. A pull request that adds a
discipline by editing any of those three surfaces directly fails review.

**Rationale**: The catalogue of disciplines will grow and shift over the owner's
career; the site's structure must not need a developer every time it does.

### III. No-Developer Content Operations
The site owner is not a developer. Any content that changes more often than once a
year — including but not limited to blog/journal posts, presets, show listings,
and work samples — MUST be editable through an admin panel, without a developer
being involved and without a code deployment. Content that is genuinely static for
years (e.g., the enquiry channels' identities, the visual system) may live in code.

**Rationale**: A portfolio that requires developer time for routine updates will
stop being updated.

### IV. One Visual Language
The site has exactly one visual identity: a dark, gig-poster aesthetic. Two accent
colors carry meaning and MUST NOT be reassigned or supplemented by ad hoc colors:
warm amber `#e7a94c` marks what is live and handmade; cool violet `#9089ff` marks
what is digital and generated. Headings use a heavy condensed typeface; body text
uses a humanist sans. These are theme tokens, not literal values — components MUST
reference the tokens, not hardcoded hex codes or font names. Introducing a third
accent color or a second visual language requires a constitution amendment, not a
design tweak.

**Rationale**: A consistent, restrained palette is what makes a one-person craft
portfolio read as intentional rather than improvised, and ties visual meaning
(handmade vs. generated) directly to the two kinds of work SanSay produces.

### V. Localized Copy, Not Hardcoded Strings
The interface language is Russian by default. Multi-language support is not
required for launch, but every user-facing string MUST be defined in a copy/
translation layer keyed by identifier, not inlined into components. Adding a
second language later MUST be achievable by adding a translation bundle, without
rewriting components.

**Rationale**: Not building full i18n now is a legitimate scope cut; hardcoding
strings anyway would foreclose that option later at a much higher cost than
building the copy layer up front.

### VI. Redundant Enquiry Delivery
Every enquiry MUST reach the owner through at least two independent delivery
channels (e.g., email plus a messenger/webhook, or email plus a stored copy
visible in the admin panel), so that the failure of any single channel — a
misconfigured mailbox, a dead webhook, a spam filter — never silently loses a
prospective client. Enquiry-flow changes MUST be verified end-to-end on every
configured channel before shipping.

**Rationale**: For a solo practitioner, a lost enquiry is a lost client with no
second chance; this is the one place on the site where reliability outranks
simplicity.

## Content & Data Architecture

Disciplines (music, video, 3D, guitars, and future additions) are defined once, in
a single structured data source, each with at minimum an id, display name, slug,
short description, and representative media. Navigation, the home page's
discipline sections, and the enquiry form's discipline/service selector are all
derived by iterating this source — they hold no per-discipline logic or literal
discipline names.

Content whose natural edit cadence is sub-annual (posts, presets, shows, work
samples) is owned by an admin panel backed by a content store the owner can write
to directly; these content types MUST expose an editing UI that requires no code
knowledge, no local environment, and no deployment step.

Visual tokens (the amber and violet accents, the condensed heading face, the
humanist body face) are defined once as design tokens/theme variables and
consumed everywhere by reference.

All user-facing copy is defined in a locale bundle addressed by string key; the
Russian bundle is the default and only required bundle at launch, but the
mechanism MUST already support adding further bundles as pure content additions.

Enquiry submissions fan out to at least two independently-configured delivery
channels at the point of submission, and a submission is not considered
successfully sent until it has been attempted on all configured channels.

## Development Workflow & Quality Gates

A change that adds, removes, or edits a discipline is reviewed as a data-only
change: if it touches navigation, home page, or enquiry form component code, the
review MUST reject it or require justification for why the data-driven mechanism
was insufficient.

A change that introduces new UI copy is reviewed for the copy going through the
locale/translation layer; a literal user-facing string inside a component fails
review.

A change that touches visual design is reviewed against Principle IV: only the
two defined accent tokens, the condensed heading face, and the humanist body face
may appear; anything else is rejected or elevated to a constitution amendment.

A change to the enquiry flow is not merged until every configured delivery
channel has been exercised end-to-end and confirmed to deliver.

A change to the content model (new fields, new discipline schema, new content
type) is not merged until it has been confirmed usable from the admin panel by
someone acting as the non-developer owner would.

## Governance

This constitution supersedes ad hoc technical or design decisions for this
project. Any specification, plan, or implementation that conflicts with a
principle here MUST either be changed to comply or MUST prompt a constitution
amendment before work proceeds — it MUST NOT simply be merged as an exception.

**Amendment procedure**: Amendments are made by editing this file, incrementing
the version per the policy below, updating the Sync Impact Report at the top of
the file, and recording the rationale for the change in that report.

**Versioning policy** (semantic versioning applied to governance):
- MAJOR: a principle is removed or redefined in a way that is backward
  incompatible with prior guidance (e.g., dropping the two-channel enquiry
  requirement, or allowing hardcoded discipline lists).
- MINOR: a new principle or section is added, or existing guidance is materially
  expanded.
- PATCH: wording, clarification, or typo fixes with no change in obligation.

**Compliance review**: Every feature specification and implementation plan
produced under this project (via `/speckit-specify`, `/speckit-plan`, or
equivalent) MUST state how it satisfies each applicable principle before
implementation begins. Reviewers reject work that: adds an interface element
without a content- or enquiry-serving justification (I); hardcodes a discipline
into navigation, home page, or enquiry form code (II); requires the owner to
involve a developer for routine content edits (III); deviates from the two-accent,
two-typeface visual system (IV); hardcodes user-facing strings outside the copy
layer (V); or leaves an enquiry dependent on a single delivery channel (VI).

**Version**: 1.0.0 | **Ratified**: 2026-09-07 | **Last Amended**: 2026-09-07
