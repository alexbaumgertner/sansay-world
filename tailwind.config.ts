import type { Config } from 'tailwindcss'

/**
 * The single source of truth for the site's visual language (Constitution IV).
 *
 * Two accent tokens carry meaning and MUST NOT be reassigned:
 *  - `tone-live`    (#e7a94c, warm amber) marks work that is live/handmade
 *  - `tone-digital` (#9089ff, cool violet) marks work that is digital/generated
 *
 * Two typefaces, referenced only by these font-family tokens:
 *  - `font-heading` — a heavy condensed face for headings
 *  - `font-body`    — a humanist sans for body text
 *
 * No component may reference a literal hex value or font-family name directly —
 * see src/lib/theme/tokens.ts for the same values exposed to non-Tailwind code.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tone: {
          live: '#e7a94c',
          digital: '#9089ff',
        },
        ink: {
          DEFAULT: '#0b0b0d',
          raised: '#151317',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
