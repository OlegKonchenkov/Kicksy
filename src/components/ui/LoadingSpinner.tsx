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
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      className={className ?? 'animate-spin'}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export function LoadingScreen({ label = 'Caricamento...' }: { label?: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 pitch-lines grain overflow-hidden">
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
          background: 'radial-gradient(ellipse, rgba(200,255,107,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(36px)',
        }}
      />

      <div
        className="surface"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.875rem 1rem',
          color: 'var(--color-text-2)',
          fontSize: '0.875rem',
          boxShadow: '0 0 24px rgba(200,255,107,0.12)',
        }}
      >
        <LoadingSpinner />
        <span>{label}</span>
      </div>
    </div>
  )
}

