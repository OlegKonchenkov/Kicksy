'use client'

import type { Badge, PlayerBadge } from '@/types'

export type BadgeShowcaseProps = {
  earnedBadges: Array<PlayerBadge & { badge: Badge }>
  allBadges: Badge[]
}

const TIER_CONFIG = {
  bronze: { color: '#cd7f32', glow: 'rgba(205,127,50,0.45)',  bg: 'rgba(205,127,50,0.12)' },
  silver: { color: '#a8a8a8', glow: 'rgba(168,168,168,0.40)', bg: 'rgba(168,168,168,0.10)' },
  gold:   { color: '#FFD700', glow: 'rgba(255,215,0,0.45)',   bg: 'rgba(255,215,0,0.12)'  },
}

// Maps condition_type + condition_value → short Italian hint
function badgeHint(badge: Badge): string {
  const n = badge.condition_value
  switch (badge.condition_type) {
    case 'matches_played':  return `${n} partite`
    case 'goals_scored':    return `${n} gol`
    case 'matches_won':     return `${n} vittorie`
    case 'win_streak':      return `${n} vitt. di fila`
    case 'mvp_count':       return `${n} MVP`
    case 'assists':         return `${n} assist`
    case 'ratings_given':   return `${n} valutazioni`
    case 'groups_created':  return 'Crea un gruppo'
    case 'invites_sent':    return `${n} inviti`
    case 'early_adopter':   return 'Pioniere'
    case 'clean_sheets':    return `${n} clean sheet`
    default:                return ''
  }
}

function EarnedBadgeItem({ pb }: { pb: PlayerBadge & { badge: Badge } }) {
  const { badge } = pb
  const tier = TIER_CONFIG[badge.tier]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: tier.bg,
        border: `2px solid ${pb.equipped ? tier.color : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        boxShadow: pb.equipped ? `0 0 14px ${tier.glow}` : 'none',
        position: 'relative',
        transition: 'all 0.2s',
      }}>
        {badge.icon}
        {pb.equipped && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 11, height: 11, borderRadius: '50%',
            background: tier.color, border: '2px solid var(--color-bg)',
          }} />
        )}
      </div>
      <span style={{
        fontSize: '0.58rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: pb.equipped ? tier.color : 'var(--color-text-2)',
        textAlign: 'center',
        maxWidth: 52,
        lineHeight: 1.2,
      }}>{badge.name_it}</span>
    </div>
  )
}

function LockedBadgeItem({ badge }: { badge: Badge }) {
  const tier = TIER_CONFIG[badge.tier]
  const hint = badgeHint(badge)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--color-elevated)',
        border: `2px solid ${tier.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        filter: 'grayscale(1)',
        opacity: 0.38,
        position: 'relative',
      }}>
        {badge.icon}
        {/* Lock overlay */}
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.55rem',
        }}>🔒</div>
      </div>
      <span style={{
        fontSize: '0.58rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-3)',
        textAlign: 'center',
        maxWidth: 52,
        lineHeight: 1.2,
      }}>{badge.name_it}</span>
      {hint && (
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: `${tier.color}70`,
          textAlign: 'center',
          maxWidth: 52,
          lineHeight: 1.2,
        }}>{hint}</span>
      )}
    </div>
  )
}

export function BadgeShowcase({ earnedBadges, allBadges }: BadgeShowcaseProps) {
  const earnedKeys = new Set(earnedBadges.map(pb => pb.badge.key))
  const lockedBadges = allBadges.filter(b => !earnedKeys.has(b.key))

  const sectionLabel: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-3)',
    marginBottom: '0.625rem',
  }

  const grid: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.875rem 1rem',
    alignItems: 'flex-start',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {earnedBadges.length > 0 && (
        <div>
          <div style={sectionLabel}>✅ Sbloccati ({earnedBadges.length})</div>
          <div style={grid}>
            {earnedBadges.map(pb => <EarnedBadgeItem key={pb.id} pb={pb} />)}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <div style={sectionLabel}>🔒 Da sbloccare ({lockedBadges.length})</div>
          <div style={grid}>
            {lockedBadges.map(b => <LockedBadgeItem key={b.id} badge={b} />)}
          </div>
        </div>
      )}

      {earnedBadges.length === 0 && allBadges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          Nessun badge disponibile.
        </div>
      )}
    </div>
  )
}
