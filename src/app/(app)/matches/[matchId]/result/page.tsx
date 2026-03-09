'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { submitMatchResult, upsertMatchPlayerStats } from '@/lib/actions/matches'
import { Button, Input, LevelUpOverlay, useToast } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

type PlayerRow = {
  user_id: string
  username: string
  full_name: string | null
}

type StatRow = {
  goals: number
  assists: number
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-elevated)',
          color: 'var(--color-text-1)',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        -
      </button>
      <span style={{ minWidth: 18, textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', fontSize: '0.9rem', fontWeight: 700 }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-primary)',
          color: 'var(--color-bg)',
          cursor: 'pointer',
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        +
      </button>
    </div>
  )
}

export default function MatchResultPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [myUserId, setMyUserId] = useState<string>('')
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [statsByUser, setStatsByUser] = useState<Record<string, StatRow>>({})
  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [notes, setNotes] = useState('')

  const [levelUpData, setLevelUpData] = useState<{
    newLevel: number; levelName: string; xpGained: number
  } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setMyUserId(user.id)

      const { data: matchRow, error: matchErr } = await supabase
        .from('matches')
        .select('id, group_id')
        .eq('id', matchId)
        .single()
      if (matchErr || !matchRow) { setError('Partita non trovata'); setLoading(false); return }

      const [{ data: member }, { data: regs }, { data: existingStats }, { data: existingResult }] = await Promise.all([
        supabase
          .from('group_members')
          .select('role')
          .eq('group_id', matchRow.group_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('match_registrations')
          .select('user_id, profiles(username, full_name)')
          .eq('match_id', matchId)
          .eq('status', 'confirmed'),
        supabase
          .from('match_player_stats')
          .select('user_id, goals, assists')
          .eq('match_id', matchId),
        supabase
          .from('match_results')
          .select('team1_score, team2_score, notes')
          .eq('match_id', matchId)
          .maybeSingle(),
      ])

      if (!member) { setError('Non autorizzato'); setLoading(false); return }
      const admin = member.role === 'admin'
      setIsAdmin(admin)

      const rows = (regs ?? []).map((r) => {
        const p = r.profiles as unknown as { username: string; full_name: string | null }
        return { user_id: r.user_id, username: p?.username ?? '', full_name: p?.full_name ?? null }
      })
      const allowedRows = admin ? rows : rows.filter((r) => r.user_id === user.id)
      if (allowedRows.length === 0) {
        setError('Nessuna statistica modificabile per questa partita')
        setLoading(false)
        return
      }

      const initStats: Record<string, StatRow> = {}
      for (const p of allowedRows) initStats[p.user_id] = { goals: 0, assists: 0 }
      for (const s of existingStats ?? []) {
        if (!initStats[s.user_id]) continue
        initStats[s.user_id] = { goals: Number(s.goals ?? 0), assists: Number(s.assists ?? 0) }
      }

      if (existingResult) {
        setScore1(existingResult.team1_score)
        setScore2(existingResult.team2_score)
        setNotes(existingResult.notes ?? '')
      }

      setPlayers(allowedRows)
      setStatsByUser(initStats)
      setLoading(false)
    }
    load()
  }, [matchId, router])

  const statPayload = useMemo(
    () => players.map((p) => ({
      user_id: p.user_id,
      goals: Math.max(0, statsByUser[p.user_id]?.goals ?? 0),
      assists: Math.max(0, statsByUser[p.user_id]?.assists ?? 0),
    })),
    [players, statsByUser],
  )

  function setGoals(userId: string, goals: number) {
    setStatsByUser((prev) => ({ ...prev, [userId]: { ...(prev[userId] ?? { goals: 0, assists: 0 }), goals } }))
  }

  function setAssists(userId: string, assists: number) {
    setStatsByUser((prev) => ({ ...prev, [userId]: { ...(prev[userId] ?? { goals: 0, assists: 0 }), assists } }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (isAdmin) {
        const result = await submitMatchResult(matchId, {
          team1_score: score1,
          team2_score: score2,
          notes: notes.trim() || null,
          playerStats: statPayload,
        })
        if (result.error) { setError(result.error); return }
        const payload = result.data!
        showToast('Risultato e statistiche salvati', 'success')
        if (payload.leveledUp) {
          setLevelUpData({
            newLevel: payload.newLevel,
            levelName: payload.levelName,
            xpGained: payload.xpGained,
          })
        } else {
          router.replace(`/matches/${matchId}/rate`)
        }
        return
      }

      const mine = statPayload.find((s) => s.user_id === myUserId)
      if (!mine) { setError('Nessuna statistica da salvare'); return }
      const result = await upsertMatchPlayerStats(matchId, [mine])
      if (result.error) { setError(result.error); return }
      showToast('Le tue statistiche sono state salvate', 'success')
      router.replace(`/matches/${matchId}`)
    })
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-3)' }}>Caricamento...</div>
  }

  if (error && players.length === 0) {
    return (
      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>
        <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          ← Indietro
        </button>
      </div>
    )
  }

  return (
    <>
      {levelUpData && (
        <LevelUpOverlay
          newLevel={levelUpData.newLevel}
          levelName={levelUpData.levelName}
          xpGained={levelUpData.xpGained}
          onClose={() => {
            setLevelUpData(null)
            router.replace(`/matches/${matchId}/rate`)
          }}
        />
      )}

      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
          ← Indietro
        </button>

        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
            {isAdmin ? 'Risultato & Statistiche' : 'Le Tue Statistiche'}
          </h1>
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {isAdmin ? 'Inserisci score e numeri finali. MVP sarà deciso dal voto in 24h.' : 'Aggiungi i tuoi goal e assist'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isAdmin && (
            <>
              <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.78rem' }}>Punteggio</span>
                  <span style={{ color: 'var(--color-text-3)', fontSize: '0.72rem' }}>Squadra A vs B</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                  <Stepper value={score1} onChange={setScore1} />
                  <span style={{ color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>VS</span>
                  <Stepper value={score2} onChange={setScore2} />
                </div>
              </div>

              <Input
                label="Note (opzionale)"
                placeholder="es. Partita equilibrata, grande intensità..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </>
          )}

          <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
              Goal e Assist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {players.map((p) => {
                const row = statsByUser[p.user_id] ?? { goals: 0, assists: 0 }
                return (
                  <div key={p.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-elevated)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--color-text-1)', fontSize: '0.86rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.full_name ?? p.username}
                      </div>
                      <div style={{ color: 'var(--color-text-3)', fontSize: '0.72rem' }}>@{p.username}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ color: 'var(--color-text-3)', fontSize: '0.72rem' }}>Gol</span>
                      <Stepper value={row.goals} onChange={(v) => setGoals(p.user_id, v)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ color: 'var(--color-text-3)', fontSize: '0.72rem' }}>Assist</span>
                      <Stepper value={row.assists} onChange={(v) => setAssists(p.user_id, v)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8125rem' }}>{error}</p>}

          <Button type="submit" fullWidth loading={isPending} size="lg">
            {isAdmin ? 'Salva risultato e stats' : 'Salva le mie stats'}
          </Button>
        </form>
      </div>
    </>
  )
}
