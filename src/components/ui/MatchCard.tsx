'use client'

import type { Match, MatchRegistration } from '@/types'
import { getMapsHref } from '@/lib/maps'
import { IconCalendar, IconClock, IconLocation, IconCheck } from '@/components/ui/Icons'

interface MatchCardProps {
  match: Match
  registration?: MatchRegistration | null
  confirmedCount?: number
  onClick?: () => void
}

const STATUS_CONFIG = {
  draft:     { label: 'Bozza',      color: 'var(--color-text-3)',   bg: 'rgba(255,255,255,0.06)', dot: 'var(--color-text-3)' },
  open:      { label: 'Iscrizioni', color: '#22c55e',               bg: 'rgba(34,197,94,0.10)',   dot: '#22c55e' },
  locked:    { label: 'Chiuso',     color: '#f59e0b',               bg: 'rgba(245,158,11,0.10)',  dot: '#f59e0b' },
  played:    { label: 'Giocato',    color: 'var(--color-text-3)',   bg: 'rgba(255,255,255,0.06)', dot: 'var(--color-text-3)' },
  cancelled: { label: 'Annullato',  color: 'var(--color-danger)',   bg: 'rgba(239,68,68,0.10)',   dot: 'var(--color-danger)' },
} as const

const REG_BADGE = {
  confirmed: { label: 'Iscritto', color: 'var(--color-primary)', bg: 'rgba(200,255,107,0.10)', icon: true },
  waitlist:  { label: 'Lista att.', color: '#f59e0b',              bg: 'rgba(245,158,11,0.10)', icon: false },
  declined:  { label: 'Rifiutato',  color: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.10)',  icon: false },
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
  const mapsHref = match.location ? getMapsHref(match.location) : null
  const fillPercent = Math.min(100, (confirmedCount / match.max_players) * 100)

  return (
    <button
      onClick={onClick}
      className="card-interactive"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem 1.125rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient accent at top based on status */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: match.status === 'open'
            ? 'linear-gradient(90deg, #22c55e, rgba(34,197,94,0.2))'
            : match.status === 'locked'
            ? 'linear-gradient(90deg, #f59e0b, rgba(245,158,11,0.2))'
            : 'transparent',
          opacity: 0.8,
        }}
      />

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
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '0.2rem 0.5rem',
            borderRadius: 999,
            color: status.color,
            background: status.bg,
            whiteSpace: 'nowrap',
            border: `1px solid ${status.color}20`,
          }}
        >
          <span style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: status.dot,
            flexShrink: 0,
          }} />
          {status.label}
        </span>
      </div>

      {/* Date / time / location */}
      <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
          <IconCalendar size={13} color="var(--color-text-3)" />
          {formatDate(match.scheduled_at)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
          <IconClock size={13} color="var(--color-text-3)" />
          {formatTime(match.scheduled_at)}
        </span>
        {match.location && mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.8125rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            <IconLocation size={13} color="var(--color-primary)" />
            {match.location}
          </a>
        )}
      </div>

      {/* Bottom row: player count bar + registration badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        {/* Player fill bar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            flex: 1,
            height: 4,
            background: 'var(--color-elevated)',
            borderRadius: 999,
            overflow: 'hidden',
            maxWidth: 100,
          }}>
            <div style={{
              height: '100%',
              width: `${fillPercent}%`,
              background: fillPercent >= 100
                ? 'linear-gradient(90deg, var(--color-primary), #90FF00)'
                : 'linear-gradient(90deg, rgba(200,255,107,0.6), var(--color-primary))',
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {confirmedCount}/{match.max_players}
          </span>
          {match.status === 'open' && spotsLeft > 0 && (
            <span style={{ fontSize: '0.65rem', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              +{spotsLeft}
            </span>
          )}
          {match.status === 'open' && spotsLeft < 0 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
              +{Math.abs(spotsLeft)} extra
            </span>
          )}
        </div>

        {/* My registration status */}
        {reg && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.2rem 0.5rem',
              borderRadius: 999,
              color: reg.color,
              background: reg.bg,
              border: `1px solid ${reg.color}20`,
            }}
          >
            {reg.icon && <IconCheck size={10} color={reg.color} />}
            {reg.label}
          </span>
        )}
      </div>
    </button>
  )
}
