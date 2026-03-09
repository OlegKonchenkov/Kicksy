'use client'

import { cn } from '@/lib/utils'
import { LEVELS, getLevelInfo } from '@/lib/xp'

interface XPBarProps {
  xp: number
  className?: string
  showLabel?: boolean
  compact?: boolean
}

export function XPBar({ xp, className, showLabel = true, compact = false }: XPBarProps) {
  const { current, next, progress } = getLevelInfo(xp)

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="level-badge"
              style={{
                color: 'var(--color-primary)',
                borderColor: 'rgba(200,255,107,0.4)',
                background: 'rgba(200,255,107,0.1)',
              }}
            >
              Lv.{current.level} {current.name}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-text-2)',
            }}
          >
            {xp.toLocaleString('it')} XP
          </span>
        </div>
      )}

      <div className="xp-bar">
        <div
          className="xp-bar-fill"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progressione livello: ${Math.round(progress)}%`}
        />
      </div>

      {showLabel && next && (
        <div className="flex justify-between">
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>
            {xp - current.xp} / {next.xp - current.xp} per {next.name}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>
            {next.xp - xp} mancanti
          </span>
        </div>
      )}
    </div>
  )
}

export { LEVELS, getLevelInfo }
