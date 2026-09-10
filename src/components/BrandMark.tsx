import { splitBrandMark } from '@/lib/theme/brand'

type BrandMarkProps = {
  name: string
}

/**
 * Single accessible heading for the home opening screen.
 * Two-tone only when `name` is the SanSay brand mark (FR-009–FR-013).
 */
export function BrandMark({ name }: BrandMarkProps) {
  const halves = splitBrandMark(name)

  if (!halves) {
    return <h1 className="brand-mark">{name}</h1>
  }

  const [first, second] = halves
  return (
    <h1 className="brand-mark">
      <span className="text-tone-live">{first}</span>
      <span className="text-tone-digital">{second}</span>
    </h1>
  )
}
