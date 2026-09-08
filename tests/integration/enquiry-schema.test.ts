import { describe, expect, it } from 'vitest'
import { enquirySchema } from '@/lib/validation/enquiry'

describe('enquirySchema', () => {
  it('accepts a valid submission without a desired date', () => {
    const result = enquirySchema.safeParse({
      disciplineId: 'abc',
      name: 'Иван',
      submitterEmail: 'ivan@example.com',
      preferredContactMethod: 'telegram @ivan',
      jobDescription: 'Нужна запись гитары',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a submission missing submitterEmail', () => {
    const result = enquirySchema.safeParse({
      disciplineId: 'abc',
      name: 'Иван',
      preferredContactMethod: 'telegram @ivan',
      jobDescription: 'Нужна запись гитары',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a submission missing the job description', () => {
    const result = enquirySchema.safeParse({
      disciplineId: 'abc',
      name: 'Иван',
      submitterEmail: 'ivan@example.com',
      preferredContactMethod: 'telegram @ivan',
      jobDescription: '',
    })
    expect(result.success).toBe(false)
  })
})
