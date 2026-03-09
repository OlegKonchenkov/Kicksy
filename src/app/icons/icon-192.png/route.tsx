import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0C12',
          borderRadius: 42,
          position: 'relative',
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: 55,
            border: '1px solid rgba(200,255,107,0.25)',
          }}
        />
        {/* K lettermark */}
        <span
          style={{
            fontSize: 108,
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
    { width: 192, height: 192 },
  )
}
