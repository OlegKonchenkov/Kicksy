import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Maskable icons: full-bleed background, content within the inner 80% safe zone
// Safe zone = inner 409×409 centred at 256,256 → keep visual within ~80% of canvas
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0C12',
          position: 'relative',
        }}
      >
        {/* Glow ring (sized to safe zone) */}
        <div
          style={{
            position: 'absolute',
            width: 230,
            height: 230,
            borderRadius: 115,
            border: '2px solid rgba(200,255,107,0.2)',
          }}
        />
        {/* K lettermark (fits comfortably within safe zone) */}
        <span
          style={{
            fontSize: 232,
            fontWeight: 900,
            color: '#C8FF6B',
            fontFamily: '"Arial Black", Arial, sans-serif',
            lineHeight: 1,
          }}
        >
          K
        </span>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
