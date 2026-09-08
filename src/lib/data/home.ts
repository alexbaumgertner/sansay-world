import { getPayload } from 'payload'
import config from '@payload-config'
import type { Home } from '@/payload-types'

export async function getHomeContent(): Promise<Home> {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'home' })
}
