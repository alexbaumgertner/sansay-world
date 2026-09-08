import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { ensureLoginThrottleTable } from '@/lib/auth/visitor/ensure-throttle-table'
import { hasDatabase } from './env'

let instance: Promise<Payload> | null = null

export async function testPayload(): Promise<Payload> {
  if (!hasDatabase) {
    throw new Error('DATABASE_URI and PAYLOAD_SECRET are required for database integration tests')
  }
  instance ??= getPayload({ config })
  const payload = await instance
  await ensureLoginThrottleTable(payload)
  return payload
}

export { hasDatabase }
