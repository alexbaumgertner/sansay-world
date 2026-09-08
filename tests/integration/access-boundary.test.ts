import { describe, expect, it } from 'vitest'
import { adminOnly, publishedOrAdmin } from '@/lib/access'

describe('access boundary', () => {
  it('denies visitors collection users from adminOnly', () => {
    expect(adminOnly({ req: { user: { collection: 'visitors', id: '1' } } } as never)).toBe(false)
  })

  it('allows users collection from adminOnly', () => {
    expect(adminOnly({ req: { user: { collection: 'users', id: '1' } } } as never)).toBe(true)
  })

  it('denies visitors from publishedOrAdmin full access', () => {
    const result = publishedOrAdmin({ req: { user: { collection: 'visitors', id: '1' } } } as never)
    expect(result).toEqual({ published: { equals: true } })
  })

  it('shows only published documents to anonymous readers', () => {
    const result = publishedOrAdmin({ req: {} } as never)
    expect(result).toEqual({ published: { equals: true } })
  })
})
