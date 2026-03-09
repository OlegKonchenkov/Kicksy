'use client'

import { useEffect, useRef, useState } from 'react'

interface LevelUpOverlayProps {
  newLevel: number
  levelName: string
  xpGained: number
  onClose: () => void
}

export function LevelUpOverlay({ newLevel, levelName, xpGained, onClose }: LevelUpOverlayProps) {
  const [phase, setPhase] = useState<'burst' | 'show' | 'fade'>('burst')
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    timerRef.current = setTimeout(() => setPhase('show'), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const handleClose = () => {
    setPhase('fade')
    setTimeout(onClose, 400)
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(10,12,18,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: phase === 'fade' ? 0 : 1,
        transition: 'opacity 0.4s ease',
        cursor: 'pointer',
      }}
    >
      {/* Stars burst effect */}
      {phase === 'burst' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '4rem',
            animation: 'level-up-burst 0.4s ease-out forwards',
          }}
        >
          ⭐
        </div>
      )}

      {/* Main card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          textAlign: 'center',
          opacity: phase === 'show' ? 1 : 0,
          transform: phase === 'show' ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Trophy emoji */}
        <div
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            filter: 'drop-shadow(0 0 24px rgba(200,255,107,0.6))',
            animation: phase === 'show' ? 'float 3s ease-in-out infinite' : 'none',
          }}
        >
          🏆
        </div>

        {/* Level up text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--color-primary)',
            }}
          >
            Livello Up!
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-1)',
              lineHeight: 1,
            }}
          >
            {levelName}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              color: 'var(--color-text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Livello {newLevel}
          </div>
        </div>

        {/* XP gained pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(200,255,107,0.12)',
            border: '1px solid rgba(200,255,107,0.3)',
            borderRadius: 999,
          }}
        >
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}
          >
            +{xpGained} XP
          </span>
        </div>

        {/* Particle dots */}
        <div
          style={{
            display: 'flex',
            gap: '0.375rem',
            position: 'absolute',
            top: '20%',
            left: '10%',
            animation: 'float 2s ease-in-out infinite alternate',
            opacity: 0.6,
          }}
        >
          {['⭐', '✨', '💫'].map((s, i) => (
            <span key={i} style={{ fontSize: '1.25rem', animationDelay: `${i * 0.2}s` }}>{s}</span>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.375rem',
            position: 'absolute',
            bottom: '20%',
            right: '10%',
            animation: 'float 2.5s ease-in-out infinite alternate-reverse',
            opacity: 0.6,
          }}
        >
          {['💫', '✨', '⭐'].map((s, i) => (
            <span key={i} style={{ fontSize: '1rem', animationDelay: `${i * 0.15}s` }}>{s}</span>
          ))}
        </div>

        {/* Tap to close */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-bg)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 2rem',
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(200,255,107,0.4)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Continua ⚡
        </button>
      </div>
    </div>
  )
}
