# Local development

Local dev runs against **its own Postgres (Docker)** and **its own media folder**,
so nothing you do locally can touch the production Neon database or the
production Vercel Blob store.

| Concern | Production | Local dev |
| --- | --- | --- |
| Database | Neon Postgres | `postgres:17` in Docker, port **5433** |
| Media / uploads | Vercel Blob | git-ignored `./media` folder |
| Email | Resend | Ethereal (mock) — link printed on boot |

## First-time setup

```sh
cp .env.example .env
# edit .env: set PAYLOAD_SECRET to any long random string,
# and set ADMIN_EMAIL / ADMIN_PASSWORD for the seeded admin.
# leave BLOB_READ_WRITE_TOKEN empty.

pnpm install
pnpm db:setup      # starts Postgres, runs migrations, seeds a dev admin + content
pnpm dev
```

`pnpm db:setup` seeds an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
(admin UI at http://localhost:3000/admin).

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm db:up` | start Postgres (data persists between runs) |
| `pnpm db:down` | stop Postgres, keep the data |
| `pnpm db:reset` | **delete** the database volume and start clean |
| `pnpm migrate` | apply pending migrations |
| `pnpm migrate:create <name>` | generate a migration from schema changes |
| `pnpm migrate:status` | list applied / pending migrations |
| `pnpm seed` | (re)seed dev content — safe to re-run |

## Media in local dev

With `BLOB_READ_WRITE_TOKEN` empty, the Vercel Blob plugin is inactive and
Payload writes uploads (original + every `imageSize`) to `./media`. `next/image`
loads them from `http://localhost:3000/api/media/file/...`, which is already an
allowed host in `next.config.mjs`.

`./media` is git-ignored. Delete it any time to clear local uploads; `pnpm seed`
does not create media.

### Testing the real Blob code path locally (optional)

Only needed if you're changing upload/storage code. Either:

- **Separate dev Blob store** — create a second Blob store in the Vercel
  dashboard and put *its* token in `.env` (never the production token), or
- **Blob emulator** — run `ghcr.io/payloadcms/vercel-blob-emulator` and set
  `STORAGE_VERCEL_BLOB_BASE_URL` to point at it.

## Important: do not point local dev at production

The production `DATABASE_URI` and `BLOB_READ_WRITE_TOKEN` must **not** appear in
your local `.env` or `.env.local`. If `vercel env pull` added
`BLOB_READ_WRITE_TOKEN` to `.env.local`, remove that line (and remove the var
from the **Development** environment in the Vercel dashboard so it isn't pulled
again). Running `next dev` against the production database is what previously
corrupted the migration ledger and hung every deploy for ~9 minutes.
