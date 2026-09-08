import { ImageResponse } from 'next/og'
import { getHomeContent } from '@/lib/data/home'
import { toneTokens } from '@/lib/theme/tokens'

/** Reads the owner's name from the CMS, so it must not be baked in at build. */
export const dynamic = 'force-dynamic'

const SIZE = { width: 1200, height: 630 }

/**
 * The share image used when a page has no CMS image of its own (FR-027).
 * Generated rather than committed as a binary so it always carries the
 * owner's current name and the site's two accent tones (Constitution IV —
 * the colours come from the token module, never a literal here).
 */
export async function GET() {
  const home = await getHomeContent()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0b0b0d',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
          <div style={{ width: '120px', height: '10px', backgroundColor: toneTokens.live }} />
          <div style={{ width: '120px', height: '10px', backgroundColor: toneTokens.digital }} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.1 }}>{home.name}</div>
        {home.essenceSentence ? (
          <div style={{ fontSize: 40, marginTop: '24px', opacity: 0.85 }}>{home.essenceSentence}</div>
        ) : null}
      </div>
    ),
    SIZE,
  )
}
