import { describe, expect, it } from 'vitest'
import { getOriginFromForwarded } from '@/lib/auth/visitor/throttle'

describe('throttle helpers', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(getOriginFromForwarded('203.0.113.1, 10.0.0.1')).toBe('203.0.113.1')
  })

  it('collapses missing header to unknown', () => {
    expect(getOriginFromForwarded(null)).toBe('unknown')
  })
})
