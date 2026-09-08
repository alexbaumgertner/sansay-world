import { VISITOR_AUTH } from './constants'

export async function padTo(startedAt: number, floorMs: number = VISITOR_AUTH.CODE_REQUEST_FLOOR_MS): Promise<void> {
  const elapsed = Date.now() - startedAt
  const remaining = floorMs - elapsed
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
}
