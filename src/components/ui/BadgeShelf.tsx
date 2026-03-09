'use client'

import type { Badge, PlayerBadge } from '@/types'

interface BadgeShelfProps {
  badges: Array<PlayerBadge & { badge: Badge }>
  showAll?: boolean
  maxVisible?: number
}

const TIER_CONFIG = {
  bronze: { color: '#cd7f32', glow: 'rgba(205,127,50,0.4)',  bg: 'rgba(205,127,50,0.12)' },
  silver: { color: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', bg: 'rgba(192,192,192,0.12)' },
  gold:   { color: '#ffd700', glow: 'rgba(255,215,0,0.4)',   bg: 'rgba(255,215,0,0.12)'  },
} as const

interface BadgeItemProps {
  playerBadge: PlayerBadge & { badge: Badge }
  size?: 'sm' | 'md' | 'lg'
}

export function BadgeItem({ playerBadge, size = 'md' }: BadgeItemProps) {
  const { badge } = playerBadge
  const tier = TIER_CONFIG[badge.tier]
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 52 : 40
  const fontSize = size === 'sm' ? '0.875rem' : size === 'lg' ? '1.5rem' : '1.125rem'
  const equipped = playerBadge.equipped

  return (
    <div
      title={`${badge.name_it}: ${badge.description_it}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.375rem',
        cursor: 'default',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: '50%',
          background: tier.bg,
          border: `2px solid ${equipped ? tier.color : 'var(--color-border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          boxShadow: equipped ? `0 0 12px ${tier.glow}` : 'none',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        {badge.icon}
        {/* Equipped indicator */}
        {equipped && (
          <div
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: tier.color,
              border: '2px solid var(--color-bg)',
            }}
          />
        )}
      </div>

      {/* Name */}
      {size !== 'sm' && (
        <span
          style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: equipped ? tier.color : 'var(--color-text-3)',
            textAlign: 'center',
            maxWidth: iconSize + 8,
            lineHeight: 1.2,
          }}
        >
          {badge.name_it}
        </span>
      )}
    </div>
  )
}

export function BadgeShelf({ badges, showAll = false, maxVisible = 6 }: BadgeShelfProps) {
  const visible = showAll ? badges : badges.slice(0, maxVisible)
  const remaining = badges.length - visible.length

  if (badges.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '2rem' }}>🏅</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
          Nessun badge ancora. Gioca e guadagnali!
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', alignItems: 'flex-start' }}>
      {visible.map(pb => (
        <BadgeItem key={pb.id} playerBadge={pb} size="md" />
      ))}
      {remaining > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--color-elevated)',
              border: '2px dashed var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--color-text-3)',
            }}
          >
            +{remaining}
          </div>
        </div>
      )}
    </div>
  )
}
