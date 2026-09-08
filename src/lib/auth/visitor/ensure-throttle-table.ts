import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

let ensured = false

/**
 * `login_throttle` is migration-managed raw SQL, not a Payload collection.
 * Dev schema push can drop it; recreate idempotently before any throttle read.
 */
export async function ensureLoginThrottleTable(payload: Payload): Promise<void> {
  if (ensured) return
  await payload.db.drizzle.execute(sql`
    CREATE TABLE IF NOT EXISTS login_throttle (
      key text PRIMARY KEY NOT NULL,
      count integer DEFAULT 0 NOT NULL,
      window_ends timestamp(3) with time zone NOT NULL,
      blocked_until timestamp(3) with time zone
    );
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS login_throttle_window_ends_idx ON login_throttle (window_ends);
  `)
  ensured = true
}
