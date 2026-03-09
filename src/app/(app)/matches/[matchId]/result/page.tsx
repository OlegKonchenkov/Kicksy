'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { submitMatchResult } from '@/lib/actions/matches'
import { Button, Input, LevelUpOverlay } from '@/components/ui'

export default function MatchResultPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [notes, setNotes] = useState('')

  // Level-up overlay state
  const [levelUpData, setLevelUpData] = useState<{
    newLevel: number; levelName: string; xpGained: number
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await submitMatchResult(matchId, {
        team1_score: score1,
        team2_score: score2,
        notes: notes.trim() || null,
      })

      if (result.error) { setError(result.error); return }

      const payload = result.data!
      if (payload.leveledUp) {
        setLevelUpData({
          newLevel: payload.newLevel,
          levelName: payload.levelName,
          xpGained: payload.xpGained,
        })
      } else {
        // No level-up: go straight to rating page
        router.replace(`/matches/${matchId}/rate`)
      }
    })
  }

  // After closing level-up overlay → go to rating
  const handleLevelUpClose = () => {
    setLevelUpData(null)
    router.replace(`/matches/${matchId}/rate`)
  }

  const ScoreBtn = ({ onClick, children, variant = 'default' }: { onClick: () => void; children: React.ReactNode; variant?: 'default' | 'plus' }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: variant === 'plus' ? 'var(--color-primary)' : 'var(--color-elevated)',
        border: variant === 'plus' ? 'none' : '1px solid var(--color-border)',
        color: variant === 'plus' ? 'var(--color-bg)' : 'var(--color-text-1)',
        fontSize: '1.375rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, lineHeight: 1,
      }}
    >
      {children}
    </button>
  )

  return (
    <>
      {levelUpData && (
        <LevelUpOverlay
          newLevel={levelUpData.newLevel}
          levelName={levelUpData.levelName}
          xpGained={levelUpData.xpGained}
          onClose={handleLevelUpClose}
        />
      )}

      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, marginBottom: '1rem', display: 'block' }}>
            ← Indietro
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
            Inserisci Risultato
          </h1>
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Registra il punteggio finale della partita
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Score inputs */}
          <div style={{ padding: '2rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
              {/* Team A */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>
                  Squadra A
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ScoreBtn onClick={() => setScore1(Math.max(0, score1 - 1))}>−</ScoreBtn>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-text-1)', minWidth: 64, textAlign: 'center', lineHeight: 1 }}>
                    {score1}
                  </span>
                  <ScoreBtn onClick={() => setScore1(score1 + 1)} variant="plus">+</ScoreBtn>
                </div>
              </div>

              {/* VS divider */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', paddingTop: '1.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-text-3)', fontWeight: 700, letterSpacing: '0.08em' }}>VS</span>
                {score1 !== score2 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    {score1 > score2 ? 'A vince' : 'B vince'}
                  </span>
                )}
                {score1 === score2 && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Pareggio
                  </span>
                )}
              </div>

              {/* Team B */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)' }}>
                  Squadra B
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ScoreBtn onClick={() => setScore2(Math.max(0, score2 - 1))}>−</ScoreBtn>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-text-1)', minWidth: 64, textAlign: 'center', lineHeight: 1 }}>
                    {score2}
                  </span>
                  <ScoreBtn onClick={() => setScore2(score2 + 1)} variant="plus">+</ScoreBtn>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Input
            label="Note (opzionale)"
            placeholder="es. Partita intensa, bel livello..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={500}
          />

          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          <Button type="submit" fullWidth loading={isPending} size="lg">
            Salva Risultato ✓
          </Button>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
            Dopo il salvataggio potrai valutare i compagni di squadra
          </p>
        </form>
      </div>
    </>
  )
}
