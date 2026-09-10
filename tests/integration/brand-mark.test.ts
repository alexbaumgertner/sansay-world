import { describe, expect, it } from 'vitest'
import { BRAND_MARK, splitBrandMark } from '@/lib/theme/brand'

describe('splitBrandMark', () => {
  it('splits the canonical SanSay brand mark', () => {
    expect(splitBrandMark('SanSay')).toEqual(['San', 'Say'])
  })

  it('trims before matching', () => {
    expect(splitBrandMark('  SanSay  ')).toEqual(['San', 'Say'])
  })

  it('matches case-insensitively and preserves owner casing', () => {
    expect(splitBrandMark('SANSAY')).toEqual(['SAN', 'SAY'])
    expect(splitBrandMark('sansay')).toEqual(['san', 'say'])
  })

  it('returns null for names that are not the whole brand mark', () => {
    expect(splitBrandMark('SanSay Studio')).toBeNull()
    expect(splitBrandMark('Александр')).toBeNull()
    expect(splitBrandMark('')).toBeNull()
  })

  it('never renders BRAND_MARK itself — halves come from the caller string', () => {
    const halves = splitBrandMark('SANSAY')
    expect(halves).not.toBeNull()
    expect(halves![0] + halves![1]).toBe('SANSAY')
    expect(halves![0] + halves![1]).not.toBe(BRAND_MARK)
  })
})
