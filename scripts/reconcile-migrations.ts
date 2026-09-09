/**
 * One-off repair: reconcile the `payload_migrations` table after the database
 * was schema-pushed in dev mode.
 *
 * Running Payload in dev mode (`next dev` with `push` enabled) writes a sentinel
 * row into `payload_migrations` with `batch = -1`. On the next `payload migrate`,
 * Payload sees that row and blocks on an interactive confirmation prompt
 * ("It looks like you've run Payload in dev mode ..."). In CI / Vercel builds
 * there is no TTY, so the prompt hangs for ~9 min until stdin EOF cancels it —
 * and migrations are silently skipped. There is no CLI flag to bypass it.
 *
 * This script:
 *   1. deletes every `batch = -1` sentinel row, and
 *   2. records any migration from `migrations/index.ts` that isn't already in the
 *      table as applied in one new batch (the dev push already created the
 *      schema, and `20260907_212401_initial` is not idempotent, so it must NOT
 *      be re-run).
 *
 * After this, `payload migrate` is a clean no-op until you add a new migration.
 *
 * Usage: pnpm reconcile-migrations
 * DATABASE_URI (from .env) must point at the database you want to fix.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { migrations } from '../migrations'

type MigrationRow = { name: string; batch: number | string }

type Pool = {
  query: <Row = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Row[] }>
}

async function reconcile() {
  const payload = await getPayload({ config })
  const { pool } = payload.db as unknown as { pool: Pool }

  const tableCheck = await pool.query<{ table: string | null }>(
    `SELECT to_regclass('public.payload_migrations') AS table`,
  )
  if (!tableCheck.rows[0]?.table) {
    console.log(
      'No payload_migrations table found — nothing to reconcile. Run `pnpm migrate` instead.',
    )
    process.exit(0)
  }

  const { rows: before } = await pool.query<MigrationRow>(
    'SELECT name, batch FROM payload_migrations ORDER BY batch, name',
  )
  console.log('payload_migrations before:', before)

  const sentinels = before.filter((r) => Number(r.batch) === -1)
  const realRows = before.filter((r) => Number(r.batch) !== -1)
  const recorded = new Set(realRows.map((r) => r.name))
  const missing = migrations.filter((m) => !recorded.has(m.name))

  if (sentinels.length === 0 && missing.length === 0) {
    console.log('Nothing to reconcile — table is already consistent.')
    process.exit(0)
  }

  const nextBatch =
    realRows.reduce((max, r) => Math.max(max, Number(r.batch)), 0) + 1

  await pool.query('BEGIN')
  try {
    if (sentinels.length > 0) {
      await pool.query('DELETE FROM payload_migrations WHERE batch = -1')
      console.log(`Removed ${sentinels.length} dev-push sentinel row(s).`)
    }
    for (const m of missing) {
      await pool.query(
        `INSERT INTO payload_migrations (id, name, batch, updated_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, now(), now())`,
        [m.name, nextBatch],
      )
      console.log(`Recorded as applied: ${m.name} (batch ${nextBatch})`)
    }
    await pool.query('COMMIT')
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }

  const { rows: after } = await pool.query<MigrationRow>(
    'SELECT name, batch FROM payload_migrations ORDER BY batch, name',
  )
  console.log('payload_migrations after:', after)
  console.log('Done. `pnpm migrate` should now report nothing to run.')
  process.exit(0)
}

reconcile().catch((err) => {
  console.error(err)
  process.exit(1)
})
