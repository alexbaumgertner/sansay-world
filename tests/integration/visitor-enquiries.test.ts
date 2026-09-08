import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getEnquiryFor, listEnquiriesFor } from '@/lib/data/visitor-enquiries'

const { mockFind, mockFindByID } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockFindByID: vi.fn(),
}))

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: vi.fn().mockResolvedValue({
      find: mockFind,
      findByID: mockFindByID,
    }),
  }
})

describe('visitor enquiries ownership', () => {
  beforeEach(() => {
    mockFind.mockReset()
    mockFindByID.mockReset()
  })

  it('filters listEnquiriesFor by submitterEmail inside the query', async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 })
    await listEnquiriesFor('visitor@example.com')
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'enquiries',
        where: { submitterEmail: { equals: 'visitor@example.com' } },
        overrideAccess: true,
      }),
    )
  })

  it('returns null from getEnquiryFor when submitterEmail does not match', async () => {
    mockFindByID.mockResolvedValue({
      id: 'enq-1',
      submitterEmail: 'other@example.com',
      name: 'x',
      jobDescription: 'y',
      discipline: { name: 'z' },
      status: 'new',
    })
    const result = await getEnquiryFor('visitor@example.com', 'enq-1')
    expect(result).toBeNull()
  })

  it('returns the projection when submitterEmail matches', async () => {
    mockFindByID.mockResolvedValue({
      id: 'enq-1',
      submitterEmail: 'visitor@example.com',
      name: 'Alice',
      jobDescription: 'Job',
      discipline: { name: 'Music' },
      status: 'new',
      desiredDate: null,
      submittedAt: '2026-01-01',
      ownerReply: null,
    })
    const result = await getEnquiryFor('visitor@example.com', 'enq-1')
    expect(result?.name).toBe('Alice')
    expect(result).not.toHaveProperty('submitterEmail')
  })
})

describe('VisitorEnquiry projection', () => {
  it('omits delivery and submitterEmail from the public shape', () => {
    const keys = [
      'id',
      'name',
      'jobDescription',
      'desiredDate',
      'submittedAt',
      'status',
      'disciplineName',
      'ownerReply',
    ]
    expect(keys).not.toContain('delivery')
    expect(keys).not.toContain('submitterEmail')
    expect(keys).toHaveLength(8)
  })
})
