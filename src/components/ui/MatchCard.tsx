'use client'

import type { Match, MatchRegistration } from '@/types'

interface MatchCardProps {
  match: Match
  registration?: MatchRegistration | null
  confirmedCount?: number
  onClick?: () => void
}

const STATUS_CONFIG = {
  draft:     { label: 'Bozza',      color: 'var(--color-text-3)',   bg: 'rgba(255,255,255,0.06)' },
  open:      { label: 'Iscrizioni', color: '#22c55e',               bg: 'rgba(34,197,94,0.12)'   },
  locked:    { label: 'Chiuso',     color: '#f59e0b',               bg: 'rgba(245,158,11,0.12)'  },
  played:    { label: 'Giocato',    color: 'var(--color-text-3)',   bg: 'rgba(255,255,255,0.06)' },
  cancelled: { label: 'Annullato',  color: 'var(--color-danger)',   bg: 'rgba(239,68,68,0.12)'   },
} as const

const REG_BADGE = {
  confirmed: { label: 'Iscritto ✓', color: 'var(--color-primary)', bg: 'rgba(200,255,107,0.12)' },
  waitlist:  { label: 'Lista att.', color: '#f59e0b',              bg: 'rgba(245,158,11,0.12)'  },
  declined:  { label: 'Rifiutato',  color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.12)'   },
} as const

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function MatchCard({ match, registration, confirmedCount = 0, onClick }: MatchCardProps) {
  const status = STATUS_CONFIG[match.status]
  const reg = registration ? REG_BADGE[registration.status] : null
  const spotsLeft = match.max_players - confirmedCount

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, transform 0.1s ease',
      }}
      onMouseEnter={e => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,255,107,0.3)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
      }}
    >
      {/* Top row: title + status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--color-text-1)',
            flex: 1,
            lineHeight: 1.2,
          }}
        >
          {match.title}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.2rem 0.5rem',
            borderRadius: 999,
            color: status.color,
            background: status.bg,
            whiteSpace: 'nowrap',
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Date / time / location */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
          📅 {formatDate(match.scheduled_at)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
          🕐 {formatTime(match.scheduled_at)}
        </span>
        {match.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8125rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            📍 {match.location}
          </a>
        )}
      </div>

      {/* Bottom row: player count + registration badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Player slots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: match.max_players }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i < confirmedCount ? 'var(--color-primary)' : 'var(--color-border)',
                  transition: 'background 0.2s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
            {confirmedCount}/{match.max_players}
          </span>
          {match.status === 'open' && spotsLeft > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>
              +{spotsLeft} posti
            </span>
          )}
        </div>

        {/* My registration status */}
        {reg && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.2rem 0.5rem',
              borderRadius: 999,
              color: reg.color,
              background: reg.bg,
            }}
          >
            {reg.label}
          </span>
        )}
      </div>
    </button>
  )
}
