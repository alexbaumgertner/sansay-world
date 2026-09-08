# Contract: Admin authentication & access control

Implements FR-030 — the admin panel is reachable only after signing in as the single owner
account; no self-registration, no roles.

## Authentication

Payload's built-in auth on the `users` collection (`auth: true`). Payload supplies session
handling, password hashing, the login UI at `/admin/login`, password reset, and route
protection for `/admin/*`. Nothing here is hand-rolled.

**First-run**: the initial admin user is created through Payload's first-user onboarding
(or a seed script) once. After that, `users.access.create` requires an authenticated
admin, so there is no public path to creating an account.

## Access control per collection

| Collection | create | read | update | delete |
|---|---|---|---|---|
| `enquiries` | **public** (the form) | admin | admin | admin |
| `disciplines`, `work-samples`, `pages`, `posts`, `gear`, `presets`, `shows` | admin | **public** (published only) | admin | admin |
| `media`, `preset-files` | admin | public | admin | admin |
| `users` | admin | admin | admin (self) | admin |
| globals `home`, `site-settings` | — | public | admin | — |

**Two rules do the heavy lifting:**

1. `enquiries.create` is the only public write in the entire application. Everything else
   a visitor can do is a read.
2. `enquiries.read` is admin-only. A submitted enquiry — containing a member of the
   public's name and contact details — is never readable through the public API, the REST
   endpoint, or GraphQL. This is worth stating explicitly because Payload exposes every
   collection over REST by default; the access function is what closes it.

## Published-content filtering

Public `read` access on content collections is a function, not `true`: it restricts results
to `published: true` for unauthenticated requests, while a signed-in admin sees drafts.
This is what makes unpublish behave as "hidden from the public site" rather than "deleted".

## Verified by

An e2e check that an unauthenticated request to `/api/enquiries` returns no documents, and
that `/admin` redirects to the login screen.
