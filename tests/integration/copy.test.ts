import { describe, expect, it } from 'vitest'
import { t } from '@/lib/copy'

describe('copy layer (Constitution V)', () => {
  it('resolves a known key to Russian copy', () => {
    expect(t('enquiry.submit')).toBe('Отправить')
  })

  it('falls back to the key path itself for an unknown key rather than throwing', () => {
    expect(t('nope.not.a.real.key')).toBe('nope.not.a.real.key')
  })

  it('includes login and status copy keys', () => {
    expect(t('login.heading')).toBeTruthy()
    expect(t('status.heading')).toBeTruthy()
    expect(t('login.emailCodeSubject')).toBeTruthy()
    expect(t('login.errorUnavailable')).toBeTruthy()
  })

  it('interpolates variables in copy', () => {
    expect(t('login.errorRateLimited', undefined, { duration: '5 мин.' })).toContain('5 мин.')
  })
})
