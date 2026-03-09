'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateBalancedTeams, getPlayerOverall } from '@/lib/team-balancer'
import type { PlayerInput } from '@/lib/team-balancer'
import { Avatar, Button, TeamSplit } from '@/components/ui'
import type { RegistrationStatus } from '@/types'

interface PlayerData {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
}

interface TeamResult {
  team1: PlayerData[]
  team2: PlayerData[]
  team1Strength: number
  team2Strength: number
  balanceScore: number
}

export default function TeamsPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [teamsResult, setTeamsResult] = useState<TeamResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [matchGroupId, setMatchGroupId] = useState<string>('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      // Get confirmed players for this match
      const { data: matchData } = await supabase
        .from('matches')
        .select('group_id')
        .eq('id', matchId)
        .single()

      if (!matchData) { setError('Partita non trovata'); setLoading(false); return }
      setMatchGroupId(matchData.group_id)

      const { data: regs } = await supabase
        .from('match_registrations')
        .select('user_id, profiles(username, full_name, avatar_url, preferred_role)')
        .eq('match_id', matchId)
        .eq('status', 'confirmed')

      if (!regs || regs.length < 2) {
        setError('Servono almeno 2 giocatori iscritti per generare le squadre')
        setLoading(false)
        return
      }

      // Get player ratings for this group
      const userIds = regs.map(r => r.user_id)
      const { data: ratings } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('group_id', matchData.group_id)
        .in('ratee_id', userIds)

      // Build PlayerInput objects
      const playerInputs: PlayerInput[] = regs.map(reg => {
        const profile = reg.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; preferred_role: string | null }
        const userRatings = (ratings ?? []).filter(r => r.ratee_id === reg.user_id)
        const ratingCount = userRatings.length

        // Average skills from all ratings
        const skillKeys = [
          'velocita', 'resistenza', 'forza', 'salto', 'agilita',
          'tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa',
          'lettura_gioco', 'posizionamento', 'pressing', 'costruzione',
          'marcatura', 'tackle', 'intercettamento', 'copertura',
          'finalizzazione', 'assist_making',
          'leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play',
        ] as const

        const avgSkills = Object.fromEntries(
          skillKeys.map(k => [
            k,
            ratingCount > 0
              ? userRatings.reduce((sum, r) => sum + (r[k as keyof typeof r] as number ?? 5), 0) / ratingCount
              : 5,
          ])
        ) as unknown as PlayerInput['skills']

        return {
          id: reg.user_id,
          role: (profile.preferred_role ?? 'C') as PlayerInput['role'],
          skills: avgSkills,
          ratingCount,
        }
      })

      const result = generateBalancedTeams(playerInputs, { maxIterations: 1500 })

      // Map IDs back to player data
      const playerMap: Record<string, { username: string; full_name: string | null; avatar_url: string | null }> = {}
      for (const reg of regs) {
        const p = reg.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null }
        playerMap[reg.user_id] = p
      }

      const overallMap: Record<string, number> = {}
      for (const pi of playerInputs) {
        overallMap[pi.id] = getPlayerOverall(pi)
      }

      const mapIds = (ids: string[]): PlayerData[] =>
        ids.map(id => ({
          id,
          username: playerMap[id]?.username ?? id,
          full_name: playerMap[id]?.full_name ?? null,
          avatar_url: playerMap[id]?.avatar_url ?? null,
          overall: overallMap[id] ?? 50,
        }))

      setPlayers(regs.map(r => ({
        id: r.user_id,
        username: (playerMap[r.user_id] ?? {}).username ?? r.user_id,
        full_name: (playerMap[r.user_id] ?? {}).full_name ?? null,
        avatar_url: (playerMap[r.user_id] ?? {}).avatar_url ?? null,
        overall: overallMap[r.user_id] ?? 50,
      })))

      setTeamsResult({
        team1: mapIds(result.team1),
        team2: mapIds(result.team2),
        team1Strength: result.team1Strength,
        team2Strength: result.team2Strength,
        balanceScore: result.balanceScore,
      })
      setLoading(false)
    }
    load()
  }, [matchId, router])

  async function handleRegenerate() {
    setLoading(true)
    setError(null)
    // Re-run algorithm
    window.location.reload()
  }

  async function handleConfirm() {
    if (!teamsResult) return
    startTransition(async () => {
      const supabase = createClient()

      const { error } = await supabase
        .from('generated_teams')
        .insert({
          match_id: matchId,
          team1_user_ids: teamsResult.team1.map(p => p.id),
          team2_user_ids: teamsResult.team2.map(p => p.id),
          team1_strength: teamsResult.team1Strength,
          team2_strength: teamsResult.team2Strength,
          balance_score: teamsResult.balanceScore,
          is_confirmed: true,
        })

      if (error) { setError(error.message); return }
      setConfirmed(true)

      // Update player team assignments
      for (const p of teamsResult.team1) {
        await supabase
          .from('match_registrations')
          .update({ team_id: 1 })
          .eq('match_id', matchId)
          .eq('user_id', p.id)
      }
      for (const p of teamsResult.team2) {
        await supabase
          .from('match_registrations')
          .update({ team_id: 2 })
          .eq('match_id', matchId)
          .eq('user_id', p.id)
      }
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Bilanciamento squadre...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={() => router.back()} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>← Indietro</button>
      </div>
    )
  }

  if (!teamsResult) return null

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Partita
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>
          Squadre
        </h1>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {players.length} giocatori, {teamsResult.team1.length}vs{teamsResult.team2.length}
        </p>
      </div>

      {/* Teams visualization */}
      <TeamSplit
        team1={teamsResult.team1}
        team2={teamsResult.team2}
        team1Strength={teamsResult.team1Strength}
        team2Strength={teamsResult.team2Strength}
        balanceScore={teamsResult.balanceScore}
      />

      {/* Algorithm info */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', padding: '0.875rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>{teamsResult.balanceScore}%</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bilanciamento</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{teamsResult.team1Strength.toFixed(1)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Forza A</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{teamsResult.team2Strength.toFixed(1)}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Forza B</div>
        </div>
      </div>

      {/* Actions */}
      {!confirmed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {error && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{error}</p>}
          <Button onClick={handleConfirm} loading={isPending} fullWidth size="lg">
            ✓ Conferma Squadre
          </Button>
          <Button variant="ghost" onClick={handleRegenerate} fullWidth>
            🔀 Rigenera
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'rgba(200,255,107,0.08)', border: '1px solid rgba(200,255,107,0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem' }}>✅</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Squadre confermate!</span>
          <button onClick={() => router.replace(`/matches/${matchId}`)} style={{ color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
            Torna alla partita →
          </button>
        </div>
      )}
    </div>
  )
}
