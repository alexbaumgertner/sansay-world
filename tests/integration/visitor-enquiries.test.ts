import { describe, expect, it } from 'vitest'
import type { VisitorEnquiry } from '@/lib/data/visitor-enquiries'

describe('VisitorEnquiry projection', () => {
  it('omits delivery and submitterEmail from the public shape', () => {
    const keys: (keyof VisitorEnquiry)[] = [
      'id',
      'name',
      'jobDescription',
      'desiredDate',
      'submittedAt',
      'status',
      'disciplineName',
      'ownerReply',
    ]
    expect(keys).not.toContain('delivery' as never)
    expect(keys).not.toContain('submitterEmail' as never)
    expect(keys).toHaveLength(8)
  })
})
