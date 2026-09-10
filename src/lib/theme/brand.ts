/**
 * Constitution IV — brand mark treatment for the home opening screen.
 *
 * `BRAND_MARK` is a sentinel for a visual rule, never rendered. The displayed
 * name always comes from `home.name` in the CMS (see research R4).
 */
export const BRAND_MARK = 'SanSay'

/**
 * The two halves to tone, or null when `name` is not the brand mark and must
 * render as a single plain heading (FR-012).
 *
 * Matching is case-insensitive on the whole trimmed string; halves are sliced
 * from the caller's string so the owner's casing is preserved.
 */
export function splitBrandMark(name: string): readonly [string, string] | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return null
  if (trimmed.toLowerCase() !== BRAND_MARK.toLowerCase()) return null

  const mid = Math.floor(BRAND_MARK.length / 2)
  return [trimmed.slice(0, mid), trimmed.slice(mid)] as const
}
