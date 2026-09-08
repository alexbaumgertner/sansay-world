import { getPayload, type Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { hasDatabase } from './env'

let instance: Promise<Payload> | null = null
let throttleReady = false

async function ensureThrottleTable(payload: Payload) {
  if (throttleReady) return
  await payload.db.drizzle.execute(sql`
    CREATE TABLE IF NOT EXISTS login_throttle (
      key text PRIMARY KEY NOT NULL,
      count integer DEFAULT 0 NOT NULL,
      window_ends timestamp(3) with time zone NOT NULL,
      blocked_until timestamp(3) with time zone
    );
  `)
  throttleReady = true
}

export async function testPayload(): Promise<Payload> {
  if (!hasDatabase) {
    throw new Error('DATABASE_URI and PAYLOAD_SECRET are required for database integration tests')
  }
  instance ??= getPayload({ config })
  const payload = await instance
  await ensureThrottleTable(payload)
  return payload
}

export { hasDatabase }
