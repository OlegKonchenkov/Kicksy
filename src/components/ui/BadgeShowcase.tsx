'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Badge, BadgeTier, PlayerBadge } from '@/types'
import { IconCheck, IconLock } from '@/components/ui/Icons'

export type BadgeShowcaseProps = {
  earnedBadges: Array<PlayerBadge & { badge: Badge }>
  allBadges: Badge[]
}

const TIER_CONFIG: Record<BadgeTier, { color: string; glow: string; bg: string }> = {
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

type SelectedBadge = {
  badge: Badge
  earned: boolean
  equipped?: boolean
  earnedAt?: string
}

function EarnedBadgeItem({
  pb,
  onOpen,
}: {
  pb: PlayerBadge & { badge: Badge }
  onOpen: (payload: SelectedBadge) => void
}) {
  const { badge } = pb
  const tier = TIER_CONFIG[badge.tier]
  return (
    <button
      type="button"
      onClick={() => onOpen({ badge, earned: true, equipped: pb.equipped, earnedAt: pb.earned_at })}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      aria-label={`Apri badge ${badge.name_it}`}
    >
      <div
        style={{
        width: 48, height: 48, borderRadius: '50%',
        background: tier.bg,
        border: `2px solid ${pb.equipped ? tier.color : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        boxShadow: pb.equipped ? `0 0 14px ${tier.glow}` : 'none',
        position: 'relative',
        transition: 'all 0.2s',
      }}
      >
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
      }}
      >
        {badge.name_it}
      </span>
    </button>
  )
}

function LockedBadgeItem({ badge, onOpen }: { badge: Badge; onOpen: (payload: SelectedBadge) => void }) {
  const tier = TIER_CONFIG[badge.tier]
  const hint = badgeHint(badge)
  return (
    <button
      type="button"
      onClick={() => onOpen({ badge, earned: false })}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      aria-label={`Apri badge ${badge.name_it}`}
    >
      {/* wrapper for relative positioning of the lock overlay */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--color-elevated)',
          border: `2px solid ${tier.color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem',
          filter: 'grayscale(1)',
          opacity: 0.38,
        }}>
          {badge.icon}
        </div>
        {/* Lock overlay — sibling of circle, not child, so it doesn't inherit greyscale/opacity */}
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><IconLock size={9} color="var(--color-text-3)" /></div>
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
      }}>
        {badge.name_it}
      </span>
      {hint && (
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: `${tier.color}70`,
          textAlign: 'center',
          maxWidth: 52,
          lineHeight: 1.2,
        }}>
          {hint}
        </span>
      )}
    </button>
  )
}

export function BadgeShowcase({ earnedBadges, allBadges }: BadgeShowcaseProps) {
  const [selected, setSelected] = useState<SelectedBadge | null>(null)
  const earnedKeys = new Set(earnedBadges.map(pb => pb.badge.key))
  const lockedBadges = allBadges.filter(b => !earnedKeys.has(b.key))
  const allBadgesByKey = useMemo(
    () => new Map(allBadges.map((b) => [b.key, b])),
    [allBadges],
  )

  useEffect(() => {
    if (!selected) return
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [selected])

  const selectedBadge = selected
    ? (allBadgesByKey.get(selected.badge.key) ?? selected.badge)
    : null
  const selectedTier = selectedBadge ? TIER_CONFIG[selectedBadge.tier] : null
  const selectedHint = selectedBadge ? badgeHint(selectedBadge) : ''

  const sectionLabel: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-3)',
    marginBottom: '0.625rem',
  }

  const grid: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.875rem 1rem',
    alignItems: 'flex-start',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {earnedBadges.length > 0 && (
        <div>
          <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: '0.375rem' }}><IconCheck size={12} color="var(--color-text-3)" /> Sbloccati ({earnedBadges.length})</div>
          <div style={grid}>
            {earnedBadges.map(pb => <EarnedBadgeItem key={pb.id} pb={pb} onOpen={setSelected} />)}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: '0.375rem' }}><IconLock size={12} color="var(--color-text-3)" /> Da sbloccare ({lockedBadges.length})</div>
          <div style={grid}>
            {lockedBadges.map(b => <LockedBadgeItem key={b.id} badge={b} onOpen={setSelected} />)}
          </div>
        </div>
      )}

      {earnedBadges.length === 0 && allBadges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          Nessun badge disponibile.
        </div>
      )}

      {selected && selectedBadge && selectedTier && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(2, 6, 23, 0.76)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 180ms ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 'var(--radius-xl)',
              border: `1px solid ${selectedTier.color}55`,
              background: 'linear-gradient(180deg, rgba(16,24,40,0.98), rgba(8,12,20,0.98))',
              boxShadow: `0 16px 48px ${selectedTier.glow}`,
              padding: '1rem 1rem 1.125rem',
              transform: 'translateY(0) scale(1)',
              animation: 'popIn 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <style>{`
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: selectedTier.color,
                }}
              >
                {selectedBadge.tier}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-elevated)',
                  color: 'var(--color-text-2)',
                  borderRadius: 999,
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Chiudi dettaglio badge"
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  background: selected.earned ? selectedTier.bg : 'var(--color-elevated)',
                  border: `2px solid ${selected.earned ? selectedTier.color : 'var(--color-border)'}`,
                  filter: selected.earned ? 'none' : 'grayscale(0.85)',
                  opacity: selected.earned ? 1 : 0.65,
                }}
              >
                {selectedBadge.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--color-text-1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {selectedBadge.name_it}
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: selected.earned ? 'var(--color-success)' : 'var(--color-text-3)' }}>
                  {selected.earned ? 'Sbloccato' : `Da sbloccare${selectedHint ? ` · ${selectedHint}` : ''}`}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '0.9rem',
                padding: '0.8rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--color-text-2)',
                fontSize: '0.85rem',
                lineHeight: 1.6,
              }}
            >
              {selectedBadge.description_it || selectedBadge.description_en || 'Nessuna descrizione disponibile.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
