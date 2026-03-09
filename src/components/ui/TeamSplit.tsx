'use client'

import { Avatar } from './Avatar'

interface TeamPlayer {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall?: number
}

interface TeamSplitProps {
  team1: TeamPlayer[]
  team2: TeamPlayer[]
  team1Strength: number
  team2Strength: number
  balanceScore: number
  team1Score?: number
  team2Score?: number
  isResult?: boolean
  team1Name?: string
  team2Name?: string
}

function TeamColumn({
  players,
  strength,
  score,
  isResult,
  side,
  teamName,
}: {
  players: TeamPlayer[]
  strength: number
  score?: number
  isResult?: boolean
  side: 'left' | 'right'
  teamName?: string
}) {
  const isRight = side === 'right'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: isRight ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Score (if result) */}
      {teamName && (
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.68rem',
            color: 'var(--color-text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {teamName}
        </div>
      )}
      {isResult && score !== undefined && (
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            fontWeight: 800,
            color: 'var(--color-text-1)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {score}
        </div>
      )}

      {/* Strength */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-primary)',
          letterSpacing: '0.04em',
        }}
      >
        {strength.toFixed(1)} OVR
      </div>

      {/* Players */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
        {players.map(p => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexDirection: isRight ? 'row-reverse' : 'row',
            }}
          >
            <Avatar
              src={p.avatar_url}
              name={p.full_name ?? p.username}
              size="xs"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: isRight ? 'right' : 'left',
                }}
              >
                {p.full_name?.split(' ')[0] ?? p.username}
              </div>
              {p.overall !== undefined && (
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--color-text-3)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: isRight ? 'right' : 'left',
                  }}
                >
                  {p.overall}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TeamSplit({
  team1,
  team2,
  team1Strength,
  team2Strength,
  balanceScore,
  team1Score,
  team2Score,
  isResult = false,
  team1Name,
  team2Name,
}: TeamSplitProps) {
  const scoreColor =
    balanceScore >= 85 ? '#22c55e'
    : balanceScore >= 65 ? '#f59e0b'
    : 'var(--color-danger)'

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Balance header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-elevated)',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Bilanciamento
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: scoreColor,
          }}
        >
          {balanceScore}%
        </span>
        {/* Balance bar */}
        <div style={{ flex: 1, maxWidth: 80, height: 4, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${balanceScore}%`,
              background: scoreColor,
              borderRadius: 999,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', gap: 0, padding: '1rem' }}>
        {/* Team 1 */}
        <TeamColumn
          players={team1}
          strength={team1Strength}
          score={team1Score}
          isResult={isResult}
          side="left"
          teamName={team1Name}
        />

        {/* Divider */}
        <div
          style={{
            width: 1,
            background: 'var(--color-border)',
            margin: '0 0.75rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--color-surface)',
              padding: '0.25rem 0.125rem',
              fontSize: '0.6rem',
              color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.1em',
              writingMode: 'vertical-rl',
            }}
          >
            VS
          </div>
        </div>

        {/* Team 2 */}
        <TeamColumn
          players={team2}
          strength={team2Strength}
          score={team2Score}
          isResult={isResult}
          side="right"
          teamName={team2Name}
        />
      </div>
    </div>
  )
}
