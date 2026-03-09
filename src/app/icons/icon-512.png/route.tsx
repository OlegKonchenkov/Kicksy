import { ImageResponse } from 'next/og'

export const runtime = 'edge'

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
          borderRadius: 112,
          position: 'relative',
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            width: 290,
            height: 290,
            borderRadius: 145,
            border: '2px solid rgba(200,255,107,0.2)',
          }}
        />
        {/* K lettermark */}
        <span
          style={{
            fontSize: 292,
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
