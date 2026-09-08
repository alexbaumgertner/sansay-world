# Feature Specification: Passwordless Email Login for Enquirers

**Feature Branch**: `002-passwordless-email-login`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "Add passwordless email login to the SanSay site. WHO AND WHY: A person who has previously submitted an enquiry can sign in to see the status of their own enquiries and any reply from the owner. There are no passwords and no registration step: submitting an enquiry is what creates the account. SIGNING IN: The visitor enters an email address and requests a code. A short numeric code arrives by email and is valid for a limited time. Entering the correct code signs them in for a period long enough that they are not asked again on the same device within the same day. The response to a code request must be identical whether or not the address exists in the system, so the page cannot be used to discover who has contacted the owner. CODE RULES: A code works once. Using it again fails. A code expires after a short window; an expired code gives a clear message and an obvious way to request a new one. Requesting a new code invalidates the previous one. Repeated requests for the same address, and repeated requests from the same origin, are limited. State what the visitor sees when limited. Repeated wrong codes for one address lock further attempts for a cooling-off period. ONCE SIGNED IN: The visitor sees only their own enquiries — never anyone else's. This must hold even if they alter an identifier in the URL. Each enquiry shows what was submitted, when, its current status, and any reply. A visible way to sign out. OWNER'S VIEW: The owner can see, in the admin, which addresses have signed in and when, and can revoke an active session. CONSTRAINTS: This login is separate from the owner's own admin access. Gaining it must never grant any ability to read or change content. The Friends page stays unauthenticated as specified in spec #1. Do not put it behind this login. Email delivery reuses whatever channel the enquiry notifications already use. If email cannot be sent, the visitor is told plainly that the code could not be delivered rather than being left waiting."

## Clarifications

### Session 2026-09-08

- Q: How should an enquiry be attributed to an email address, given enquiries currently hold only a free-text contact field? → A: Add a required email address field to the enquiry form; only enquiries submitted from that point on are visible after signing in. Enquiries already submitted are not backfilled, by hand or by parsing.
- Q: What should "any reply from the owner" be? → A: One owner-written reply per enquiry, composed in the admin panel, read-only for the visitor. No two-way exchange.
- Q: How should a visitor find the sign-in page, given it is kept out of search results and the sitemap? → A: Email the submitter an acknowledgement when their enquiry is accepted, containing a link to the sign-in page, and show that same link in the on-screen confirmation. No navigation entry.
- Q: When the owner writes a reply, should the submitter be emailed that a reply is waiting? → A: Yes — a short notice with a link to sign in. The reply text itself stays on the site and is not copied into the email.
- Q: Should each device get its own session, and should revoking end one device or all of them? → A: Each device gets its own session and they coexist. The admin lists addresses with their last sign-in and how many sessions are active; revoking signs that address out on every device. No device fingerprint is recorded.
- Q: Should the owner see failed sign-in activity in the admin? → A: Show the current state only — whether an address is locked out or rate-limited and when that lifts — next to its sign-in record. No stored log of individual attempts.
- Q: How long should sign-in records be kept? → A: A visitor identity lives as long as an enquiry attributed to that address exists; deleting the last such enquiry removes the identity. Codes and finished sessions are discarded about 30 days after they stop being valid.

### Session 2026-09-08 (design review)

Raised by the requirements-quality checklists in [checklists/](./checklists/), each of which found a
decision the plan or a contract had made that no requirement covered.

- Q: Should a refused code say that it was already used? → A: No. A used, superseded, and never-valid code are refused identically; what the requirement guarantees is the route back to a working code, not a diagnosis (FR-014).
- Q: Does "the code could not be delivered" cover a later bounce, or only a rejected send? → A: Only a rejected send. The code-entry screen carries standing guidance for a code that never arrives instead of new bounce handling (FR-011, FR-011a).
- Q: If the owner clears a reply and later writes a different one, is the submitter notified again? → A: Yes. Clearing resets the notified state; only editing the wording of a standing reply stays silent (FR-051).
- Q: Where does the visitor acknowledgement sit relative to the owner's notification channels? → A: Alongside them, dispatched concurrently, so it adds no waiting to enquiry submission while its outcome is still recorded separately (FR-044, FR-047).
- Q: Does the incorrect-attempt block also stop new code requests? → A: Yes. A blocked address is refused at the request step too, so nobody is sent codes that cannot work (FR-018).
- Q: Is the last-sign-in record subject to the 30-day rule? → A: No. It lives with the identity, for as long as an enquiry is attributed to that address (FR-058, FR-059).
- Q: Does deleting the last enquiry also clear that address's counters and block? → A: Yes, so a deleted address is genuinely indistinguishable from an unknown one. The side effect that deletion lifts a block is accepted and recorded (FR-057, FR-058, SC-014).
- Q: How is "when you can try again" worded? → A: As a duration, not a clock time (FR-019, FR-020).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with a code sent to my email (Priority: P1)

Someone who previously sent an enquiry through the site wants to check on it. They open the sign-in page, type the email address they used, and request a code. A short numeric code arrives in their inbox. They type it in and are signed in — no password was ever created, and they never registered for anything.

**Why this priority**: Nothing else in this feature can be reached without a working sign-in. It is also the slice that carries the feature's central safety property: a stranger must not be able to use this page to find out who has contacted the owner.

**Independent Test**: Can be fully tested by requesting a code for an address that has an enquiry, retrieving the code from the delivered email, entering it, and confirming a signed-in state is reached — and separately by requesting a code for an address with no enquiry and confirming the visible response is identical. Delivers value on its own (a returning enquirer gains an identity) even before any enquiry detail is displayed.

**Acceptance Scenarios**:

1. **Given** a visitor whose email address is attached to at least one enquiry, **When** they submit that address on the sign-in page, **Then** they see a confirmation that a code has been sent, an input for the code, and an obvious control to request another one — and a numeric code arrives at that address.
2. **Given** a visitor has received a code, **When** they enter it correctly before it expires, **Then** they are signed in and taken to their list of enquiries.
3. **Given** an address that is attached to no enquiry at all, **When** someone submits it on the sign-in page, **Then** the page response is indistinguishable from the known-address case — same wording, same next step, same apparent delay — and no code is sent to that address.
4. **Given** a visitor signed in on a device, **When** they return to the site later the same day on that same device, **Then** they are still signed in and are not asked for a code again.
5. **Given** the site cannot deliver the code email at all, **When** the visitor requests a code, **Then** they are told plainly, in the same interaction, that the code could not be sent and are offered a way to try again — they are never left watching a screen that implies an email is on its way.

---

### User Story 2 - See the status and any reply for my own enquiries (Priority: P2)

A signed-in visitor sees a list of the enquiries they themselves sent — what they asked for, when they sent it, where it stands now, and whatever the owner has written back. They see nobody else's enquiries, and they can sign out when finished.

**Why this priority**: This is the reason a visitor would sign in at all, but it is only reachable once Story 1 exists. It also carries the second safety property: strict ownership scoping that holds even when someone edits an identifier in the address bar.

**Independent Test**: Can be fully tested by signing in as a visitor with two enquiries and confirming both appear with their submitted content, date, status, and reply; then by taking a known identifier belonging to a different person's enquiry, putting it in the URL, and confirming access is refused without revealing that the enquiry exists.

**Acceptance Scenarios**:

1. **Given** a signed-in visitor with enquiries, **When** their enquiry list loads, **Then** every enquiry they submitted appears, most recent first, and no enquiry submitted by anyone else appears.
2. **Given** a signed-in visitor opens one of their enquiries, **When** the detail loads, **Then** they see the discipline it concerned, the job description they wrote, the desired date if they gave one, the date they submitted it, its current status in plain language, and the owner's reply if one has been written.
3. **Given** a signed-in visitor, **When** they change an identifier in the URL to one belonging to another person's enquiry, **Then** they are refused, and the refusal is identical to what they would see for an identifier that does not exist at all.
4. **Given** a signed-in visitor with no enquiries yet visible under their address, **When** the list loads, **Then** they see a clear empty state that explains only enquiries sent with an email address appear here and offers a route to the enquiry form — not an error and not a blank page.
5. **Given** a signed-in visitor, **When** they look at any signed-in page, **Then** a sign-out control is visible; using it ends the session immediately, and returning to the enquiry list afterwards requires a new code.

---

### User Story 3 - Codes and requests resist reuse, guessing, and flooding (Priority: P3)

The sign-in flow holds up against someone trying to reuse a code, guess a code, or hammer the code-request form — and an honest visitor who hits a limit is told what happened and when they can try again, rather than being met with a dead end.

**Why this priority**: These rules are what make a passwordless login trustworthy rather than a liability. They are separated from Story 1 because Story 1 can be demonstrated end-to-end first, then hardened — but this feature is not shippable without them.

**Independent Test**: Can be fully tested against the sign-in flow alone by replaying a used code, using an expired code, using a superseded code, submitting many code requests for one address, submitting many requests from one origin, and submitting repeated wrong codes — confirming each is refused with the specified message.

**Acceptance Scenarios**:

1. **Given** a visitor has already signed in using a code, **When** they submit that same code again, **Then** it is refused and they are offered a way to request a new one.
2. **Given** a code was issued and its validity window has passed, **When** the visitor enters it, **Then** they are told the code has expired and are given an obvious control to request a new one on the same screen.
3. **Given** a visitor requests a second code before using the first, **When** they enter the first code, **Then** it is refused because requesting a new code invalidated it, and only the newest code works.
4. **Given** a visitor has requested codes for one address more times than allowed within the limit window, **When** they request another, **Then** they are told that too many codes have been requested for that address and when they can try again — and this message is the same whether or not the address exists.
5. **Given** many code requests arrive from a single origin across different addresses, **When** the origin's limit is exceeded, **Then** further requests from it are refused with a message saying too many requests have been made and to try again later.
6. **Given** a visitor enters the wrong code repeatedly for one address, **When** the allowed number of wrong attempts is exceeded, **Then** further attempts for that address are refused for a cooling-off period, and the message states that attempts are temporarily blocked and when they may resume.
7. **Given** a code was issued for one address, **When** it is submitted alongside a different address, **Then** it is refused.

---

### User Story 4 - Owner reviews and revokes visitor sign-ins (Priority: P4)

In the admin panel, the owner can see which email addresses have signed in and when, and can end a visitor's access in one action — for instance if someone reports that a device was lost.

**Why this priority**: Useful oversight and a safety valve, but the feature delivers its value to visitors without it, so it can follow the visitor-facing slices.

**Independent Test**: Can be fully tested by signing in as a visitor on two devices, confirming that address and sign-in time appear in the admin, revoking its access there, and confirming both devices need a new code.

**Acceptance Scenarios**:

1. **Given** visitors have signed in, **When** the owner opens the sign-in activity view in the admin, **Then** they see each address, when it last signed in, and how many sessions it currently holds active — and no device, browser, or network detail.
2. **Given** an address is signed in on two devices, **When** the owner revokes its access, **Then** both devices are signed out, and the visitor must request a new code on whichever device they return to.
3. **Given** a visitor writes in saying they cannot sign in, **When** the owner looks that address up in the admin, **Then** they can see whether it is currently blocked and when the block lifts — and they can tell the visitor to wait, rather than needing to read logs or ask a developer.
4. **Given** someone who is not signed in as the owner, **When** they try to reach the sign-in activity view, **Then** they cannot see it, whether or not they hold a visitor session.

---

### Edge Cases

- What happens when someone who enquired before the email address field existed tries to sign in? Their old enquiry is attributed to nobody, so their address is unknown to the login: they see the standard "code sent" confirmation, receive no email, and cannot sign in. This is intentional and follows from the clarified attribution decision.
- What happens when someone who enquired before the change enquires again with the address field present? They can sign in and see the new enquiry; the older one stays visible to the owner only.
- What happens when the reply notice cannot be delivered? The reply is still saved and still shown to the submitter when they next sign in; only the owner sees that the notice failed.
- What happens when the owner writes a reply to an enquiry that predates the email address field, and so has no submitter address? No notice can be sent and no visitor can ever read it; such a reply is effectively an internal note. The admin MUST make that plain rather than implying the submitter was told.
- What happens when the acknowledgement email to the submitter cannot be delivered? The enquiry still counts as received and the visitor still sees their submission confirmation with its link to the sign-in page; only the owner sees that the acknowledgement failed. The visitor is never told their enquiry failed because an acknowledgement did not arrive.
- What happens when someone supplies an address that is not theirs on the enquiry form? The acknowledgement, and any later sign-in, both go to that address — so whoever controls it can see that enquiry. This is inherent to using an email address as the identity and is not something this feature can detect.
- What happens when the visitor mistypes their address (e.g. an address nobody has used)? They see the same "code sent" confirmation as everyone else and simply never receive an email; the screen must therefore always offer a way to correct the address and try again.
- What happens when a code email is delivered but lands in spam? The visitor can request a new code from the code-entry screen, which invalidates the previous one; the previous code failing afterwards is expected behaviour, not a defect.
- What happens when the visitor opens the code email on a different device from the one that requested it? Entering the code must work on the device where it is entered; the resulting session belongs to that device.
- What happens when a code is requested and the visitor never uses it? It expires silently and grants nothing.
- What happens if the visitor's email address is attached to enquiries and the owner later deletes one of them? The remaining enquiries still list; the deleted one simply no longer appears.
- What happens when the owner deletes the last enquiry attributed to an address while that visitor is signed in? Their identity is removed and their sessions stop working, so their next action takes them to the sign-in page — and requesting a code for that address then produces the standard confirmation with no email, exactly as for any unknown address.
- What happens when the same person submitted enquiries under two different addresses? Each address is a separate identity; signing in with one shows only that address's enquiries. Merging identities is out of scope.
- What happens when a visitor signs in on a phone and then on a laptop? Both stay signed in independently, and signing out on one leaves the other alone. Only the owner's revoke action ends both at once.
- What happens when a signed-in visitor's session expires while they are reading their enquiry list? Their next action sends them to the sign-in page with a message explaining the session ended, not a bare error.
- What happens when the owner is signed into the admin in the same browser and also signs in as a visitor? The two are independent: the visitor session shows only that address's enquiries and grants no content access; the admin session is unaffected.
- What happens when a delivery failure is reported to the visitor for a known address, while an unknown address gets the generic confirmation? This is a deliberate, accepted trade-off (see Assumptions): the visitor must not be left waiting, and delivery failures are rare and non-repeatable enough not to serve as a reliable way to enumerate addresses.
- What happens when someone reaches the Friends page while signed in, or while not signed in? Both work identically — the Friends page is unaffected by this feature and is never placed behind the login.
- What happens when a visitor tries to reach the enquiry list without signing in? They are sent to the sign-in page, not shown an error, and no information about any enquiry is revealed.

## Requirements *(mandatory)*

### Functional Requirements

**Identity**

- **FR-001**: The system MUST treat an email address as a visitor's identity for this login. There MUST be no registration step and no password at any point; having submitted an enquiry is the only prerequisite for being able to sign in.
- **FR-002**: The enquiry form MUST collect the submitter's email address in a dedicated, required field, separate from the existing free-text "how to contact me" value, and every enquiry MUST store it as the address the enquiry is attributed to.
- **FR-002a**: Enquiries submitted before that field existed MUST NOT be attributed to any address — not by extracting an address from their free-text contact value, and not by the owner attaching one by hand. They remain visible to the owner in the admin panel exactly as they are today and MUST NOT appear in any visitor's view.
- **FR-002b**: The dedicated email address MUST be treated as personal data of the same sensitivity as the rest of an enquiry: readable by the owner in the admin panel and by the signed-in submitter, and never publicly readable.
- **FR-003**: Email addresses MUST be compared ignoring letter case and surrounding whitespace, so that a visitor signing in with a differently-cased form of their address still reaches their own enquiries.
- **FR-004**: A visitor identity MUST come into existence as a consequence of submitting an enquiry carrying an email address, and nothing more; no other action, and no involvement from the owner, MUST be required for that submitter to be able to sign in later.

**Finding the way in**

- **FR-044**: When an enquiry is accepted, the system MUST email the submitter an acknowledgement at the address they supplied, confirming their enquiry was received and containing a link to the sign-in page.
- **FR-045**: The on-screen confirmation shown after submitting an enquiry MUST also link to the sign-in page, so a visitor who acts immediately does not have to wait for the email.
- **FR-046**: The acknowledgement MUST NOT contain a code, a session, or any link that signs the visitor in without a code; it is a route to the sign-in page, not a way past it.
- **FR-047**: Failure to deliver the acknowledgement MUST NOT cause the enquiry to be rejected, and MUST NOT be reported to the visitor as a failed submission — by that point the enquiry has been received. The failure MUST be visible to the owner in the same way as other delivery outcomes.
- **FR-048**: The sign-in page MUST NOT be added to the site navigation, so that a login is not advertised to the majority of visitors who have no reason to use one.

**Requesting a code**

- **FR-005**: The system MUST provide a sign-in page that asks for an email address and nothing else, and a control to request a code.
- **FR-006**: The response to a code request MUST be identical whether or not the address is known to the system — identical wording, identical next step, and no observable difference in timing — so the page cannot be used to discover who has contacted the owner.
- **FR-007**: A code MUST be emailed only to an address that at least one enquiry is attributed to. Any other address — never used, mistyped, or used only on an enquiry predating the address field — MUST receive no email while still seeing the standard confirmation.
- **FR-008**: A requested code MUST be a short numeric code, valid for a limited time, and usable exactly once. "Exactly once" MUST hold even when the same code is submitted twice at the same moment: the system MUST decide single use atomically, never by reading a code's state and then separately marking it used.
- **FR-009**: Requesting a new code for an address MUST invalidate every code previously issued to that address and still outstanding.
- **FR-010**: Code emails MUST be delivered through the same email channel and configuration already used for enquiry notifications; this feature MUST NOT introduce a separate email provider or a second set of delivery credentials.
- **FR-011**: If the attempt to send the code email is rejected, the visitor MUST be told plainly, within the same interaction, that the code could not be delivered, and MUST be offered a way to try again. They MUST NOT be shown the standard "code sent" confirmation in that case. This requirement covers a rejection at the moment of sending; a message accepted for delivery and only later bounced is out of its scope, and is addressed instead by FR-011a.
- **FR-011a**: Because a code can be accepted for delivery and still never arrive, the code-entry screen MUST carry standing guidance for a code that does not turn up — covering where else to look and how to try a different address — shown as ordinary help text rather than as an error, since the system cannot know whether a given code arrived.
- **FR-012**: A code MUST never be exposed anywhere other than the delivered email — not in the page, not in a URL, and not in any owner-visible or diagnostic output.
- **FR-061**: Because every code request takes a deliberately uniform amount of time (FR-006), the sign-in form MUST show that the request is in progress and MUST prevent a second request being submitted while the first is still running — otherwise the wait itself provokes the repeat click that spends the visitor's allowance under FR-019.

**Entering a code**

- **FR-013**: Entering the correct, unexpired, unused code for the address that requested it MUST sign the visitor in.
- **FR-014**: Submitting a code that has already been used MUST be refused, and the visitor MUST be given an obvious control to request a new one. The refusal MUST NOT state that the code was previously used: a used code, a superseded code, and a code that was never valid MUST all be refused identically, so that holding a genuine but spent code reveals nothing. What this requirement guarantees is the route back to a working code, not a diagnosis of which kind of failure occurred.
- **FR-015**: Submitting an expired code MUST be refused with a message that says the code has expired, together with an obvious control to request a new one from that same screen.
- **FR-016**: A code MUST be bound to the address it was issued for; presenting it for any other address MUST be refused.
- **FR-017**: A refusal of an incorrect code MUST NOT reveal whether the address is known, whether a code is currently outstanding for it, or how much of the code was correct.
- **FR-018**: After a defined number of consecutive incorrect codes for one address, that address MUST be blocked for a cooling-off period, and the visitor MUST be told that attempts are temporarily blocked and when they may try again. The block MUST cover both entering a code and requesting a new one, so that a blocked visitor is told at the first step rather than being sent codes that cannot work and spending their request allowance on them (FR-019). Requesting a new code MUST NOT reset the block or its count of incorrect attempts; a block ends only by waiting.
- **FR-062**: The code-entry screen MUST offer a way back to correcting the email address, not only a way to request another code for the address already submitted. Because a mistyped address produces the same confirmation as a known one (FR-007), the visitor has no signal that the address was wrong, and without this route a typo can only be recovered by starting the page again.

**Limiting requests**

- **FR-019**: Code requests for a single email address MUST be limited to a defined number within a fixed window that begins with the first request and does not slide. When the limit is reached, the visitor MUST see a message stating that too many codes have been requested for that address, together with how long they must wait, expressed as a duration rather than a clock time.
- **FR-020**: Code requests from a single origin MUST be limited to a defined number within a fixed window, independently of which addresses were used. When the limit is reached, the visitor MUST see a message stating that too many requests have been made, together with how long they must wait, expressed as a duration rather than a clock time.
- **FR-021**: Limit messages — including the incorrect-attempt block of FR-018 — MUST be identical whether or not the address involved is known to the system, preserving FR-006. This is possible because incorrect attempts are counted against any address that is tried, not only against addresses the system knows.
- **FR-063**: If the system cannot determine whether a request is within its limits, it MUST refuse the request rather than allow it. That refusal MUST carry its own message, saying that signing in is temporarily unavailable and to try again shortly. It MUST NOT reuse a limit message: telling a visitor they have made too many requests when enforcement itself is unavailable is untrue and directs them to wait for something that will never clear.

**Sessions**

- **FR-022**: A successful sign-in MUST establish a session that remains valid long enough that the visitor is not asked for a code again on the same device within the same calendar day.
- **FR-023**: A session MUST expire after a bounded lifetime, after which the visitor MUST request a new code to continue.
- **FR-024**: A sign-out control MUST be visible on every signed-in page. Using it MUST end the session immediately, and reaching signed-in content afterwards MUST require a new code. What the visitor is shown after signing out MUST confirm that they signed out, and MUST be distinct from the message shown when a session ended on its own (FR-025) — a deliberate action must not be reported back as an unexpected failure.
- **FR-025**: When a session expires or is revoked mid-use, the visitor's next action MUST take them to the sign-in page with an explanation that the session ended, not to an unexplained error.
- **FR-026**: A visitor session MUST NOT be transferable between visitors — a session credential obtained for one address MUST NOT grant access to another address's enquiries under any manipulation.
- **FR-054**: One address MUST be able to hold several sessions at once, one per device it signed in from. Signing in on a new device MUST NOT end a session already held on another, and signing out on one device MUST end only that device's session.

**Seeing my own enquiries**

- **FR-027**: A signed-in visitor MUST see a list of exactly those enquiries attributed to their own address, and MUST NOT see any enquiry belonging to another address.
- **FR-028**: Each enquiry MUST show, to its own submitter: the discipline it concerned, the job description as submitted, the desired date if one was given, the date it was submitted, its current status expressed in plain visitor-facing language, and the owner's reply if one exists.
- **FR-029**: Ownership MUST be enforced on every request for enquiry data, not only on the list view. Altering an identifier in the URL to one belonging to another visitor MUST be refused, and that refusal MUST be indistinguishable from the response for an identifier that does not exist.
- **FR-030**: The visitor's view MUST show a clear empty state when no enquiries are attributed to their address, and that empty state MUST explain that only enquiries sent with an email address appear here and offer a route to the enquiry form — so that someone who enquired before the address field existed is not left thinking their enquiry was lost.
- **FR-031**: Reaching any signed-in page without a valid session MUST send the visitor to the sign-in page and MUST NOT reveal anything about any enquiry.
- **FR-032**: A signed-in visitor MUST be able to read their enquiries but MUST NOT be able to alter, withdraw, or re-open them through this view.
- **FR-033**: The owner MUST be able to write one reply per enquiry in the admin panel, which its submitter can read once signed in. The reply MUST be read-only for the visitor: they MUST NOT be able to answer it, add to it, or start an exchange from it. The owner MUST be able to edit or clear a reply they have already written, and an enquiry with no reply MUST simply show none.
- **FR-049**: When the owner saves a reply for an enquiry for the first time, the system MUST email that enquiry's submitter a short notice that a reply is waiting, containing a link to the sign-in page.
- **FR-050**: The reply notice MUST NOT contain the reply text, a code, or any link that signs the visitor in without a code — the reply is readable only on the site, by a signed-in submitter.
- **FR-051**: Editing the wording of a reply that has already been notified MUST NOT send a further notice, so that correcting a slip does not alert the visitor a second time. Clearing a reply entirely, however, MUST reset that state, so that a reply written after the previous one was removed notifies the submitter as a first reply would. Deleting a reply and writing a different one is not a wording correction, and the submitter would otherwise never learn the replacement exists.
- **FR-052**: Failure to deliver the reply notice MUST NOT prevent the reply from being saved, nor from being shown to the submitter when they next sign in. The failure MUST be visible to the owner.

**Owner's view**

- **FR-034**: The admin panel MUST show, for each email address that has signed in, when it last signed in and how many sessions it currently holds active.
- **FR-035**: The owner MUST be able to revoke a visitor's access from the admin panel in one action, which MUST end every active session held by that address. The next request made with any of those sessions MUST be treated as not signed in.
- **FR-036**: Sign-in activity and session revocation MUST be reachable only by the signed-in owner, and MUST NOT be reachable by any visitor session.
- **FR-053**: The admin panel MUST NOT record or display a device, browser, or network identifier for a visitor session; the owner sees addresses, sign-in times, and active session counts only.
- **FR-055**: The admin panel MUST show, for each address, whether it is currently blocked from signing in — because it has hit the code-request limit or the incorrect-attempt lockout — and when that block lifts, so the owner can answer a visitor who says they cannot get in.
- **FR-056**: The system MUST NOT retain a log of individual code requests or incorrect attempts beyond the counters needed to enforce the limits. The owner sees the present state of a block, not a history of who tried what and when.
- **FR-057**: The owner MUST NOT be able to lift a block early or sign a visitor in on their behalf; a block expires only by waiting it out. The single exception is a consequence of FR-058: deleting the last enquiry attributed to an address clears that address's counters along with its identity. This is not a support route — it destroys the enquiry — but it MUST be stated rather than discovered.

**Retention**

- **FR-058**: A visitor identity MUST be retained only for as long as at least one enquiry is attributed to its address. When the owner deletes the last such enquiry, the identity and its sign-in record MUST be removed, any session it holds MUST stop working, and any outstanding codes, request counters, and incorrect-attempt block held against that address MUST be cleared with it. Anything left behind — a block in particular — would make a deleted address behave differently from one the site has never seen, contradicting FR-006 and SC-014.
- **FR-059**: Codes, finished sessions — used, expired, signed out, or revoked — and spent request counters MUST be discarded once they have been invalid long enough to no longer be needed for enforcing limits, and MUST NOT accumulate indefinitely. This rule governs those records only. An identity's own sign-in record, including when it last signed in, is governed by FR-058 instead: it lives as long as an enquiry is attributed to that address, which may be far longer.
- **FR-060**: Deleting an enquiry MUST remain the owner's single lever for removing a visitor's data; this feature MUST NOT require the owner to clean up identities, codes, or sessions by hand. Since FR-059 is therefore satisfied by an automatic process running outside any visitor's request, that process failing or never being scheduled MUST be detectable rather than silent — an unnoticed absence would leave FR-059 and SC-015 unmet while everything visible continued to work.

**Boundaries and constraints**

- **FR-037**: This visitor login MUST be entirely separate from the owner's admin access. Holding a visitor session MUST NOT grant any ability to read or change any content, any site setting, or any other visitor's data, and MUST NOT grant access to the admin panel.
- **FR-038**: Holding an admin session MUST NOT implicitly grant a visitor session; if the owner wants to see a visitor's view of their own address, they MUST sign in through the same visitor flow as anyone else.
- **FR-039**: The Friends page MUST remain reachable without signing in, exactly as specified in the portfolio site specification. It MUST NOT be placed behind this login.
- **FR-040**: Submitting an enquiry MUST remain possible without signing in; this login MUST NOT become a prerequisite for contacting the owner.
- **FR-041**: All copy introduced by this feature MUST be sourced from the site's existing copy layer keyed by identifier, defaulting to Russian, rather than fixed in place.
- **FR-042**: The sign-in and enquiry-status pages MUST be excluded from search-engine indexing and from the sitemap.
- **FR-043**: The sign-in and enquiry-status pages MUST render correctly and remain usable on phone-sized screens, and MUST meet WCAG 2.2 Level AA — the site's accessibility baseline — including semantic structure, sufficient contrast, and fully keyboard-operable forms. Because the flow requires transcribing a numeric code, typically from an email read on the same phone, the code field MUST present a numeric keypad, accept a pasted code, and permit the device's own one-time-code autofill.

### Key Entities

- **Visitor Identity**: A person who may sign in, identified solely by a normalized email address. Comes into existence through enquiry submission and lasts only as long as an enquiry attributed to that address exists. Holds the address, when it was first seen, when it last signed in, and how many sessions it currently holds. Owns no password and no profile.
- **Login Code**: A short-lived numeric credential issued to one visitor identity on request. Holds the address it belongs to, when it was issued, when it stops being valid, whether it has been used, whether it was superseded by a newer request, and how many incorrect attempts have been made against it.
- **Visitor Session**: The signed-in state on one device, resulting from a correct code. Holds the identity it belongs to, when it began, when it expires, and whether it has been ended by sign-out or by the owner. One identity may hold several at once. Carries no device, browser, or network identifier. Grants read access to its own identity's enquiries and nothing else.
- **Request Limit Record**: The counting needed to enforce limits — code requests per address, code requests per origin, and incorrect attempts per address — each with the window it applies to and, where relevant, the time a cooling-off period ends. This is present state, not history: it is what the owner sees when an address is blocked, and it holds no record of individual attempts.
- **Enquiry** *(extended)*: The existing enquiry gains a required submitter email address used for attribution, a single owner-written reply readable by its submitter, and the delivery outcome of each message sent to that submitter — the acknowledgement and the reply notice. Its existing fields — discipline, job description, desired date, submission date, and status — become visible to its own submitter. Enquiries predating the address field carry no address and belong to no visitor identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning enquirer can go from opening the sign-in page to seeing their own enquiries in under 2 minutes, using nothing but their email inbox.
- **SC-002**: Across repeated trials with known and unknown addresses, the code-request response is indistinguishable 100% of the time in wording and in next screen, and the two distributions of elapsed time agree to within the deliberate padding's own jitter — that is, the difference between their medians is smaller than the spread within either one, so no threshold an observer could pick separates them. The one exception is the delivery failure of FR-011, which is documented under Assumptions as an accepted residual signal.
- **SC-003**: 100% of attempts to view an enquiry that belongs to someone else — including by substituting identifiers in the address bar — are refused, and none of them reveals whether that enquiry exists.
- **SC-004**: Used, expired, and superseded codes grant access in 0 out of all attempts.
- **SC-005**: A visitor who signs in is not asked for a code again on the same device for at least the remainder of that calendar day.
- **SC-006**: In 100% of cases where the code email cannot be delivered, the visitor learns so during the same interaction rather than waiting for an email that will not arrive.
- **SC-007**: Once the incorrect-attempt threshold for an address is crossed, 100% of further attempts for that address are refused until the stated cooling-off period ends, and the visitor is told when that is.
- **SC-008**: An audit of every content-reading and content-changing operation available on the site, attempted while holding only a visitor session, finds 0 that succeed.
- **SC-009**: The owner can determine which addresses signed in and when, and end a chosen visitor's access on all their devices, within a single admin session and in under 1 minute.
- **SC-010**: The Friends page loads without any sign-in prompt in 100% of trials, both for signed-in and signed-out visitors.
- **SC-011**: A visitor using only a keyboard, on a phone-sized screen, can request a code, enter it, read their enquiries, and sign out without becoming stuck.
- **SC-012**: 100% of accepted enquiries produce an acknowledgement to the submitter carrying a working route to the sign-in page, or — where delivery fails — a failure the owner can see; a visitor never has to search the site to find where to check on their enquiry.
- **SC-013**: When the owner writes a reply, the submitter learns that something is waiting without having to check speculatively, in 100% of cases where their address can receive email.
- **SC-014**: After the owner deletes the last enquiry attributed to an address, no identity, session, code, request counter, or block for that address remains, and it behaves indistinguishably from an address the site has never seen — including for an address that was blocked at the moment it was deleted.
- **SC-015**: No code, finished session, or spent request counter remains stored more than 30 days after it ceased to be valid, and the owner never has to delete any of them by hand. An identity's last-sign-in record is out of scope here and is governed by SC-014 instead. If the process responsible stops running, that is apparent rather than silent.

## Assumptions

- **Code shape and lifetime**: the code is a 6-digit number valid for 10 minutes. These are conventional defaults; the specification only requires that it be short, numeric, and short-lived.
- **Session lifetime**: a session lasts 7 days from sign-in, which satisfies the stated requirement of not re-asking on the same device within the same day. No "remember me" choice is offered to the visitor.
- **Request limits**: 3 code requests per address per 15 minutes, and 20 code requests per origin per hour. The specification only requires that both limits exist, be enforced, and be explained to the visitor when hit.
- **Fixed windows, not rolling**: the windows in FR-019 and FR-020 are fixed rather than rolling, and this follows from FR-056 rather than from preference. A rolling window has to know when each individual request happened, which is exactly the per-attempt history FR-056 forbids keeping. The accepted consequence is a burst at a window boundary: an address can receive 3 codes at the end of one window and 3 more at the start of the next. Since the ceiling exists to stop flooding rather than to ration honest use, that burst was judged tolerable in exchange for storing no attempt history.
- **Incorrect-attempt lockout**: 5 consecutive incorrect codes for one address block that address for 15 minutes, covering both code entry and new code requests (FR-018). The count is held against the address rather than against a particular code, so requesting a new code neither clears it nor evades it — otherwise the block would be lifted by the one action any blocked visitor is most likely to try.
- **Origin identification**: "same origin" means the network origin of the request as the hosting platform reports it. Shared origins (offices, mobile carriers) may cause an honest visitor to hit the origin limit; the per-origin limit is therefore set loosely enough that this is rare, and the message tells them to try again later.
- **Enumeration trade-off**: the owner's explicit instruction that a visitor be told when a code could not be delivered means that, in the rare case of a genuine delivery failure, the response for a known address differs from the standard confirmation. This residual signal is accepted deliberately: leaving a visitor waiting for an email that will never arrive is judged the worse outcome.
- **Bounces are out of scope**: FR-011 covers a send that is rejected outright, which is the only failure knowable while the visitor is still on the page. A code accepted for delivery and bounced afterwards produces the standard confirmation and silence. Handling that properly would mean a public webhook endpoint, stored bounce state, and a new failure surface — and it still could not reach the visitor during the same interaction. The standing guidance of FR-011a covers it from the visitor's side instead, at a fraction of the cost.
- **Reply model**: a single owner-authored reply per enquiry, written in the admin, read-only for the visitor, with no in-app back-and-forth. Writing it for the first time emails the submitter a notice that a reply is waiting; the reply text is readable only on the site.
- **Re-notification**: editing the wording of a standing reply never notifies again, so an owner who rewrites a reply in place and wants the visitor to know would contact them directly; no "notify again" control is added, to keep the admin surface small. Clearing a reply and writing a new one does notify, on the grounds that a reply written after the previous one was deleted is a new reply rather than a correction, and that the owner deliberately emptying the field is a clear enough signal of intent to act on.
- **Attribution cut-over**: the login becomes useful only for enquiries submitted after the required email address field ships. For a period after launch, most visitors who try to sign in will legitimately have nothing to see, which is why the empty state must explain itself (FR-030).
- **Enquiry form burden**: making the email address required means a visitor who would rather be reached only by phone or messenger must still supply an address. This was accepted as the cost of a reliable identity; the existing free-text "how to contact me" field stays, so their preferred channel is still captured.
- **Status wording**: the existing enquiry statuses (new, in progress, closed) are shown to visitors through visitor-appropriate wording from the copy layer; this feature does not add, remove, or rename statuses.
- **No override on blocks**: showing the owner a block's present state deliberately comes with no control to lift it early and no way to sign a visitor in by hand. A locked-out visitor waits out the cooling-off period, which keeps the lockout meaningful and keeps the owner out of an authentication decision.
- **Attack visibility is coarse**: because no attempt history is kept, the owner can see that an address is blocked but not how often it has been targeted over time. Detecting a sustained campaign is therefore out of scope for the admin view.
- **Revocation granularity**: revoking is per address, not per device, which means an honest visitor who lost one device is also signed out on the devices they still hold. That was accepted so the site need not record a device or browser fingerprint for every session — data that would exist only to populate a screen the owner opens rarely.
- **No identity merging**: each email address is a separate identity. Someone who used two addresses sees two separate views and cannot combine them.
- **Notification channels**: only the email channel carries codes, acknowledgements, and reply notices. The messenger channel used for owner enquiry notifications is for the owner and is not used to reach visitors.
- **Acknowledgement content**: the acknowledgement to the submitter confirms receipt, restates the reply window already promised on screen, and links to the sign-in page. It does not restate the enquiry's contents, keeping personal detail out of an inbox the site cannot vouch for.
- **Acknowledgement is a third delivery, not a second owner channel**: it does not count towards the project's requirement that every enquiry reach the owner through two independent channels — it is addressed to the visitor, not the owner.
- **Scope of the visitor's view**: the visitor can read their enquiries only. Editing, withdrawing, re-opening, or attaching files to an enquiry after submission is out of scope.
- **No account deletion flow**: a visitor cannot delete their identity or their enquiries; the owner remains the only party who can remove enquiry records, as in the portfolio site specification.
- **Retention of sign-in records**: an identity's lifetime is tied to the enquiries attributed to its address, and spent codes, finished sessions, and expired counters are discarded around 30 days after they stop being valid. The 30 days is a conventional default; the specification only requires that these records not accumulate indefinitely. The last-sign-in timestamp is deliberately excluded from that 30 days and lives with the identity, which may mean years: it is what makes the owner's view of sign-in activity worth opening, and ageing it out would leave an identity with no history at all while the enquiry it belongs to is still open.
- **Deletion is a side effect, not a feature**: removing a visitor's data happens by deleting their enquiry, which the owner can already do. No separate "delete this visitor" control is added, and a visitor still cannot delete their own data — consistent with the portfolio site specification.
- **Uniform-response budget**: the fixed duration every code request is padded to is a single tuned figure, confirmed against the real latency of the email provider before shipping rather than assumed. It has to exceed a normal send, since a send that overruns it re-opens the timing difference FR-006 closes; a response that is merely later than the floor is harmless. This is the one place where the spec depends on a measurement rather than a decision.
- **Deletion means deletion**: FR-058's cascade assumes that deleting an enquiry removes the record. If the content store's own archive or trash behaviour is ever enabled for enquiries, a discarded enquiry would keep its submitter address and the identity would survive it — so enabling that MUST also treat discarding an enquiry as deleting it. Without that, the owner would believe they had removed someone's data when they had not, and FR-058, FR-060, and SC-014 would all quietly become false.
- **Personal-data notice**: as with the enquiry form in the portfolio site specification, a consent or personal-data notice is out of scope here and remains a separate site-wide concern.
