'use client'

import { useCallback, useRef, useState } from 'react'

interface RatingSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  color?: string
  disabled?: boolean
}

export function RatingSlider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  color = 'var(--color-primary)',
  disabled = false,
}: RatingSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const getValueFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value
      const rect = trackRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(min + ratio * (max - min))
    },
    [min, max, value]
  )

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    onChange(getValueFromEvent(e.clientX))
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return
    onChange(getValueFromEvent(e.clientX))
  }

  const handlePointerUp = () => setDragging(false)

  const pct = ((value - min) / (max - min)) * 100

  const valueLabel =
    value <= 3 ? 'Scarso'
    : value <= 5 ? 'Medio'
    : value <= 7 ? 'Buono'
    : value <= 9 ? 'Ottimo'
    : 'Fenomeno'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Header: label + value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-display)',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>{valueLabel}</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: color,
              lineHeight: 1,
              minWidth: '1.5rem',
              textAlign: 'right',
            }}
          >
            {value}
          </span>
        </div>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* Background track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 999,
            background: 'var(--color-border)',
            overflow: 'hidden',
          }}
        >
          {/* Filled portion */}
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: color,
              borderRadius: 999,
              transition: dragging ? 'none' : 'width 0.15s ease',
              opacity: disabled ? 0.4 : 1,
            }}
          />
        </div>

        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: color,
            border: '3px solid var(--color-bg)',
            boxShadow: dragging ? `0 0 0 4px ${color}40` : '0 2px 8px rgba(0,0,0,0.4)',
            transition: dragging ? 'none' : 'left 0.15s ease, box-shadow 0.15s ease',
            opacity: disabled ? 0.4 : 1,
          }}
        />
      </div>

      {/* Tick marks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingInline: 2 }}>
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(v => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(v)}
            style={{
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                color: v === value ? color : 'var(--color-text-3)',
                fontWeight: v === value ? 700 : 400,
                transition: 'color 0.15s ease',
              }}
            >
              {v}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Rating Section (groups sliders by macro category) ─── */

interface RatingSectionProps {
  title: string
  emoji: string
  color: string
  skills: Array<{ key: string; label: string; value: number }>
  onChange: (key: string, value: number) => void
  disabled?: boolean
}

export function RatingSection({ title, emoji, color, skills, onChange, disabled }: RatingSectionProps) {
  const avg = skills.reduce((s, k) => s + k.value, 0) / skills.length

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.875rem 1rem',
          background: 'var(--color-elevated)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem' }}>{emoji}</span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-1)',
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            fontWeight: 700,
            color,
          }}
        >
          {avg.toFixed(1)}
        </span>
      </div>

      {/* Sliders */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {skills.map(skill => (
          <RatingSlider
            key={skill.key}
            label={skill.label}
            value={skill.value}
            onChange={v => onChange(skill.key, v)}
            color={color}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
