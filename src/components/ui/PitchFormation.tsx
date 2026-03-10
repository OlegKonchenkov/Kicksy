'use client'

import { useState } from 'react'
import { Avatar } from './Avatar'

interface PitchPlayer {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall?: number   // optional — not shown when absent (match detail view)
  role?: string
}

interface PitchFormationProps {
  team1: PitchPlayer[]
  team2: PitchPlayer[]
  team1Name: string
  team2Name: string
  isAdmin?: boolean
  onSwap?: (id1: string, id2: string) => void
}

function assignRows(players: PitchPlayer[]): { att: PitchPlayer[]; mid: PitchPlayer[]; def: PitchPlayer[] } {
  const att: PitchPlayer[] = []
  const mid: PitchPlayer[] = []
  const def: PitchPlayer[] = []

  for (const p of players) {
    const r = p.role ?? 'C'
    if (r === 'A' || r === 'W') att.push(p)
    else if (r === 'C') mid.push(p)
    else def.push(p) // D, E go to def
  }

  const total = players.length
  const targetDef = Math.max(1, Math.round(total * 0.375))

  // Move excess from def to mid if def is overfull
  while (def.length > targetDef && def.length > 1) {
    mid.push(def.pop()!)
  }
  // If mid is still empty, move one from def
  if (mid.length === 0 && def.length > 1) {
    mid.push(def.splice(Math.floor(def.length / 2), 1)[0])
  }

  return { att, mid, def }
}

const ROLE_COLORS: Record<string, string> = {
  D: '#4D96FF',
  E: '#4D96FF',
  C: '#FFD93D',
  W: 'var(--color-primary)',
  A: 'var(--color-primary)',
}

function PlayerToken({
  player,
  isSelected,
  isSwapTarget,
  isInteractive,
  onClick,
}: {
  player: PitchPlayer
  isSelected: boolean
  isSwapTarget: boolean
  isInteractive: boolean
  onClick: () => void
}) {
  const roleColor = ROLE_COLORS[player.role ?? 'C'] ?? 'var(--color-text-2)'
  const name = (player.full_name ?? player.username).split(' ')[0]

  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: isInteractive ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '4px 2px',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        borderRadius: '50%',
        border: `2.5px solid ${isSelected ? 'var(--color-primary)' : isSwapTarget ? '#FFD93D' : roleColor}`,
        boxShadow: isSelected
          ? '0 0 0 3px rgba(200,255,107,0.35), 0 0 12px rgba(200,255,107,0.3)'
          : isSwapTarget
            ? '0 0 0 3px rgba(255,217,61,0.35)'
            : 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <Avatar src={player.avatar_url} name={player.full_name ?? player.username} size="sm" />
      </div>
      <div style={{
        fontSize: '0.6rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.9)',
        whiteSpace: 'nowrap',
        maxWidth: 48,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.15s',
      }}>
        {name}
      </div>
      {player.overall !== undefined && player.overall > 0 && (
        <div style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.5)',
        }}>
          {player.overall}
        </div>
      )}
    </button>
  )
}

function FormationRows({
  players,
  selectedId,
  isSwapTargetTeam,
  isInteractive,
  onTokenClick,
  flipVertical,
}: {
  players: PitchPlayer[]
  selectedId: string | null
  isSwapTargetTeam: boolean
  isInteractive: boolean
  onTokenClick: (id: string) => void
  flipVertical: boolean
}) {
  const { att, mid, def } = assignRows(players)
  const rows = flipVertical ? [def, mid, att] : [att, mid, def]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'space-around' }}>
      {rows.map((rowPlayers, ri) => (
        rowPlayers.length > 0 && (
          <div key={ri} style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
            {rowPlayers.map((p) => (
              <PlayerToken
                key={p.id}
                player={p}
                isSelected={selectedId === p.id}
                isSwapTarget={isSwapTargetTeam && selectedId !== null}
                isInteractive={isInteractive}
                onClick={() => onTokenClick(p.id)}
              />
            ))}
          </div>
        )
      ))}
    </div>
  )
}

export function PitchFormation({
  team1,
  team2,
  team1Name,
  team2Name,
  isAdmin = false,
  onSwap,
}: PitchFormationProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<1 | 2 | null>(null)

  const canInteract = isAdmin && !!onSwap

  function handleTokenClick(id: string, team: 1 | 2) {
    if (!canInteract) return

    if (selectedId === null) {
      setSelectedId(id)
      setSelectedTeam(team)
      return
    }

    if (selectedId === id) {
      // Deselect
      setSelectedId(null)
      setSelectedTeam(null)
      return
    }

    if (selectedTeam === team) {
      // Same team: change selection (explicitly set both to keep state in sync)
      setSelectedId(id)
      setSelectedTeam(team)
      return
    }

    // Different team: swap
    onSwap!(selectedId, id)
    setSelectedId(null)
    setSelectedTeam(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {canInteract && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: 0,
        }}>
          {selectedId
            ? "⚡ Tocca un giocatore dell'altra squadra per scambiarlo"
            : 'Tocca un giocatore per selezionarlo'}
        </p>
      )}

      {/* The pitch */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #1a5c2a 0%, #1e6b31 50%, #1a5c2a 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '2px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        padding: '0.75rem 0.25rem',
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: 1,
          background: 'rgba(255,255,255,0.25)',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />
        {/* Center circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 60,
          height: 60,
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Team 1 name */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '0.25rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {team1Name}
        </div>

        {/* Team 1 formation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <FormationRows
            players={team1}
            selectedId={selectedTeam === 1 ? selectedId : null}
            isSwapTargetTeam={selectedTeam === 2}
            isInteractive={canInteract}
            onTokenClick={(id) => handleTokenClick(id, 1)}
            flipVertical={false}
          />
        </div>

        <div style={{ height: 8 }} />

        {/* Team 2 formation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <FormationRows
            players={team2}
            selectedId={selectedTeam === 2 ? selectedId : null}
            isSwapTargetTeam={selectedTeam === 1}
            isInteractive={canInteract}
            onTokenClick={(id) => handleTokenClick(id, 2)}
            flipVertical={true}
          />
        </div>

        {/* Team 2 name */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '0.25rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {team2Name}
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Difesa', color: '#4D96FF' },
          { label: 'Centrocampo', color: '#FFD93D' },
          { label: 'Attacco', color: 'var(--color-primary)' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
