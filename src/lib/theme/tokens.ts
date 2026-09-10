/**
 * Constitution IV — One Visual Language.
 *
 * These are the ONLY definitions of the two accent colors and the two typeface
 * roles in the entire codebase. Every component references the Tailwind
 * classes derived from these tokens (`tone-live`, `tone-digital`,
 * `font-heading`, `font-body` — see tailwind.config.ts) rather than a literal
 * hex value or font name. Non-Tailwind code (e.g. email templates, admin
 * config previews) imports this module instead of hardcoding a duplicate.
 */
export const toneTokens = {
  live: '#e7a94c',
  digital: '#9089ff',
} as const

export type Tone = keyof typeof toneTokens

export const inkTokens = {
  DEFAULT: '#0b0b0d',
  raised: '#151317',
} as const

/**
 * Mirrors the :root custom properties in src/app/globals.css.
 * tests/integration/cover-contrast.test.ts asserts the two stay in sync.
 */
export const coverScrimTokens = {
  textZoneMinAlpha: 0.85,
  navBandMinAlpha: 0.65,
} as const

export const typographyTokens = {
  heading: 'var(--font-heading)',
  body: 'var(--font-body)',
} as const

export function accentClassForTone(tone: Tone): string {
  return tone === 'live' ? 'text-tone-live border-tone-live' : 'text-tone-digital border-tone-digital'
}
