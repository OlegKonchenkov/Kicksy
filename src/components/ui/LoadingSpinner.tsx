'use client'

type LoadingSpinnerProps = {
  size?: number
  className?: string
}

export function LoadingSpinner({ size = 18, className }: LoadingSpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className ?? 'animate-spin'}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path
        d="M12 2a10 10 0 019.8 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LoadingScreen({ label = 'Caricamento...' }: { label?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Atmospheric glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 520,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(200,255,107,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}
      />

      {/* Soccer ball loading animation */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div className="loading-ball-container">
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            className="loading-ball-spin"
          >
            <circle cx="12" cy="12" r="10" stroke="var(--color-text-3)" strokeWidth="1" opacity="0.3"/>
            {/* Pentagon pattern */}
            <path
              d="M12 7l2.94 2.14-.36 3.54-5.16 0-.36-3.54L12 7z"
              fill="var(--color-primary)"
              opacity="0.8"
            />
            <path
              d="M12 7l-2.94 2.14L7 5.8M12 7l2.94 2.14L17 5.8M9.06 9.14l-4 1.36M14.94 9.14l4 1.36M9.42 12.68l-1.82 3.52M14.58 12.68l1.82 3.52M9.42 12.68h5.16M10.4 17.7l1.6-1.5 1.6 1.5"
              stroke="var(--color-primary)"
              strokeWidth="0.8"
              strokeLinejoin="round"
              opacity="0.5"
            />
            <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.6"/>
          </svg>
          {/* Ground shadow */}
          <div className="loading-ball-shadow" />
        </div>

        {/* Label */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--color-text-3)',
          fontSize: '0.8125rem',
          letterSpacing: '0.04em',
        }}>
          <span className="loading-dots">{label}</span>
        </div>
      </div>
    </div>
  )
}
