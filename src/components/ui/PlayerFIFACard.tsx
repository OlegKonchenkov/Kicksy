// src/components/ui/PlayerFIFACard.tsx
'use client'

import { Avatar } from '@/components/ui/Avatar'
import type { PlayerRole } from '@/types'

export type FIFASkillBar = {
  abbr: string
  label: string
  value: number
  color: string
}

export type PlayerFIFACardProps = {
  player: {
    user_id: string
    username: string
    full_name: string | null
    avatar_url: string | null
    level: number
    preferred_role: PlayerRole | null
    preferred_role_2?: PlayerRole | null
  }
  /** 0 = no ratings yet (shows "—" and no tier) */
  ovr: number
  skillBars: FIFASkillBar[]
  isMe?: boolean
  isAdmin?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  D: 'Difensore', C: 'Centrocampista', E: 'Esterno', W: 'Trequartista', A: 'Attaccante',
}

type Tier = { label: string; color: string; glow: string }

function getTier(ovr: number, hasRatings: boolean): Tier | null {
  if (!hasRatings) return null
  if (ovr >= 92) return { label: 'ELITE', color: '#C8FF6B', glow: 'rgba(200,255,107,0.25)' }
  if (ovr >= 85) return { label: 'ORO',   color: '#FFD700', glow: 'rgba(255,215,0,0.20)'   }
  if (ovr >= 75) return { label: 'ARG',   color: '#a8a8a8', glow: 'rgba(168,168,168,0.18)' }
  if (ovr >= 60) return { label: 'BRZ',   color: '#cd7f32', glow: 'rgba(205,127,50,0.20)'  }
  return null
}

export function PlayerFIFACard({
  player, ovr, skillBars, isMe = false, isAdmin = false,
}: PlayerFIFACardProps) {
  const hasRatings = ovr > 0
  const tier = getTier(ovr, hasRatings)

  const cardBg = tier
    ? `radial-gradient(ellipse at 85% 110%, ${tier.glow}, transparent 60%), var(--color-surface)`
    : 'var(--color-surface)'
  const cardBorder = tier
    ? `1px solid ${tier.color}30`
    : `1px solid ${isMe ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}`
  const role1 = player.preferred_role
  const role2 = player.preferred_role_2

  return (
    <div style={{
      background: cardBg,
      borderRadius: 'var(--radius-lg)',
      border: cardBorder,
      padding: '1.125rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
    }}>
      {/* Row 1: avatar + name + OVR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          flexShrink: 0,
          filter: tier ? `drop-shadow(0 0 8px ${tier.glow})` : undefined,
        }}>
          <Avatar
            src={player.avatar_url}
            name={player.full_name ?? player.username}
            size="lg"
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.375rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {player.full_name ?? player.username}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.375rem' }}>
            <span style={{
              padding: '0.125rem 0.4rem',
              background: 'rgba(200,255,107,0.12)',
              border: '1px solid rgba(200,255,107,0.3)',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}>Lv.{player.level}</span>
            {role1 && (
              <span style={{
                padding: '0.125rem 0.4rem',
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-2)',
              }}>{ROLE_LABELS[role1] ?? role1}</span>
            )}
            {role2 && role2 !== role1 && (
              <span style={{
                padding: '0.125rem 0.4rem',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid #f59e0b',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#f59e0b',
              }}>{`${ROLE_LABELS[role2] ?? role2} (2)`}</span>
            )}
            {isAdmin && (
              <span style={{
                padding: '0.125rem 0.4rem',
                background: 'rgba(255,184,0,0.12)',
                border: '1px solid rgba(255,184,0,0.3)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--color-secondary)',
              }}>Admin</span>
            )}
          </div>
        </div>

        {/* OVR block */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: hasRatings ? '2rem' : '1.25rem',
            fontWeight: 700,
            lineHeight: 1,
            color: tier ? tier.color : 'var(--color-text-3)',
          }}>
            {hasRatings ? ovr : '—'}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: tier ? tier.color : 'var(--color-text-3)',
            marginTop: '0.1rem',
          }}>
            {tier ? tier.label : 'OVR'}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: tier ? `${tier.color}20` : 'var(--color-border)',
      }} />

      {/* Skill bars: 2 columns × 3 rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.25rem' }}>
        {skillBars.map(bar => (
          <div key={bar.abbr} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: bar.color,
              width: 26,
              flexShrink: 0,
            }}>{bar.abbr}</span>
            <div style={{
              flex: 1,
              height: 4,
              background: 'var(--color-elevated)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: hasRatings ? `${Math.round((bar.value / 10) * 100)}%` : '0%',
                background: bar.color,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: hasRatings ? bar.color : 'var(--color-text-3)',
              width: 18,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {hasRatings ? bar.value.toFixed(1) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
