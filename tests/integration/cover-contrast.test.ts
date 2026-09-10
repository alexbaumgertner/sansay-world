import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { coverScrimTokens, inkTokens, toneTokens } from '@/lib/theme/tokens'

/** Relative luminance per WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg)
  const L2 = relativeLuminance(bg)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** Composite `ink` over white at the given alpha; return as #rrggbb. */
function inkOverWhite(alpha: number): string {
  const ink = inkTokens.DEFAULT.replace('#', '')
  const ir = parseInt(ink.slice(0, 2), 16)
  const ig = parseInt(ink.slice(2, 4), 16)
  const ib = parseInt(ink.slice(4, 6), 16)
  const r = Math.round(ir * alpha + 255 * (1 - alpha))
  const g = Math.round(ig * alpha + 255 * (1 - alpha))
  const b = Math.round(ib * alpha + 255 * (1 - alpha))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

describe('cover contrast (FR-014 / FR-015)', () => {
  it('keeps CSS custom properties in sync with coverScrimTokens', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    const text = css.match(/--cover-scrim-text-alpha:\s*([\d.]+)/)?.[1]
    const nav = css.match(/--cover-scrim-nav-alpha:\s*([\d.]+)/)?.[1]
    expect(Number(text)).toBe(coverScrimTokens.textZoneMinAlpha)
    expect(Number(nav)).toBe(coverScrimTokens.navBandMinAlpha)
  })

  it('meets WCAG thresholds over a pure-white photograph at text-zone alpha', () => {
    const backdrop = inkOverWhite(coverScrimTokens.textZoneMinAlpha)
    // Essence / body text (neutral-100 ≈ #f5f5f5) — 4.5:1
    expect(contrastRatio('#f5f5f5', backdrop)).toBeGreaterThanOrEqual(4.5)
    // Brand halves are large text — 3:1; tone-digital is the binding case
    expect(contrastRatio(toneTokens.live, backdrop)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(toneTokens.digital, backdrop)).toBeGreaterThanOrEqual(3)
  })

  it('meets WCAG for nav links over the nav-band alpha', () => {
    const backdrop = inkOverWhite(coverScrimTokens.navBandMinAlpha)
    expect(contrastRatio('#f5f5f5', backdrop)).toBeGreaterThanOrEqual(4.5)
  })

  it('meets the baseline against solid ink when no cover is set (FR-025)', () => {
    const backdrop = inkTokens.DEFAULT
    expect(contrastRatio('#f5f5f5', backdrop)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(toneTokens.live, backdrop)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(toneTokens.digital, backdrop)).toBeGreaterThanOrEqual(3)
    // CTA is tone-live fill with ink text — self-contained
    expect(contrastRatio(inkTokens.DEFAULT, toneTokens.live)).toBeGreaterThanOrEqual(4.5)
  })
})
