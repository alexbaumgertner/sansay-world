# Specification Quality Checklist: Passwordless Email Login for Enquirers

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`

### Validation iterations

- **Iteration 1 (2026-09-08)**: All items passed except "No [NEEDS CLARIFICATION]
  markers remain". Two scope-level questions were raised, both because the
  existing enquiry record supported neither requirement: how an enquiry is
  attributed to an email address (FR-002), and what "any reply from the owner"
  means (FR-033).
- **Iteration 2 (2026-09-08)**: Both answered by the owner and recorded in the
  spec's Clarifications section. Attribution: a required email address field on
  the enquiry form, applying to new enquiries only, with no backfill of older
  ones (FR-002, FR-002a, FR-002b). Replies: one owner-written, read-only reply
  per enquiry (FR-033). Follow-on consequences were written into the spec rather
  than left implicit — the self-explaining empty state (FR-030, Story 2 scenario
  4), two new edge cases covering people who enquired before the field existed,
  and three new assumptions (attribution cut-over, reply notification out of
  scope, the burden of a required address on visitors who prefer phone or
  messenger). All checklist items now pass.

### Decisions resolved by documented default rather than by asking

Recorded in the spec's Assumptions section: code shape and lifetime (6 digits,
10 minutes), session lifetime (7 days), request limits (3 per address per 15
minutes, 20 per origin per hour), incorrect-attempt lockout (5 attempts, 15
minutes), origin identification, visitor-facing status wording, no identity
merging across two addresses.

### Deliberate tension recorded, not resolved away

Telling a visitor plainly that a code could not be delivered (FR-011) conflicts
with responses being identical for known and unknown addresses (FR-006), since
only a known address triggers a send attempt at all. The owner's explicit
instruction was honoured and the residual signal is documented as an accepted
trade-off in the Assumptions section, on the grounds that leaving a visitor
waiting for an email that will never arrive is the worse outcome.
