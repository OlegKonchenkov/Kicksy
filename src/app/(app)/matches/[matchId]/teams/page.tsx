'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateBalancedTeams, getPlayerOverall } from '@/lib/team-balancer'
import type { PlayerInput } from '@/lib/team-balancer'
import { Button, TeamSplit, PitchFormation, useToast } from '@/components/ui'

interface PlayerData {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
  role?: string
}

interface TeamResult {
  team1: PlayerData[]
  team2: PlayerData[]
  team1Strength: number
  team2Strength: number
  balanceScore: number
}

type NeverTogetherConstraint = { a: string; b: string }

function getEffectiveFormatLabel(playerCount: number) {
  if (playerCount >= 18) return '11v11'
  if (playerCount >= 14) return '8v8'
  if (playerCount >= 10) return '5v5'
  const a = Math.floor(playerCount / 2)
  const b = Math.ceil(playerCount / 2)
  return `${a}v${b}`
}

export default function TeamsPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<PlayerData[]>([])
  const [playerInputs, setPlayerInputs] = useState<PlayerInput[]>([])
  const [teamsResult, setTeamsResult] = useState<TeamResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [constraints, setConstraints] = useState<NeverTogetherConstraint[]>([])
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [groupId, setGroupId] = useState('')
  const [team1Name, setTeam1Name] = useState('Squadra A')
  const [team2Name, setTeam2Name] = useState('Squadra B')
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch')
  const [isAdmin, setIsAdmin] = useState(false)
  const [effectiveFormat, setEffectiveFormat] = useState('')

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  )

  function computeAndSetTeams(inputs: PlayerInput[], allPlayers: PlayerData[], c: NeverTogetherConstraint[]) {
    const result = generateBalancedTeams(inputs, {
      maxIterations: 1500,
      neverTogetherPairs: c.map((x) => [x.a, x.b] as const),
    })

    const overallMap: Record<string, number> = {}
    for (const pi of inputs) {
      overallMap[pi.id] = getPlayerOverall(pi)
    }

    const mapIds = (ids: string[]): PlayerData[] =>
      ids.map((id) => {
        const found = allPlayers.find((p) => p.id === id)
        return {
          id,
          username: found?.username ?? id,
          full_name: found?.full_name ?? null,
          avatar_url: found?.avatar_url ?? null,
          overall: overallMap[id] ?? 50,
          role: found?.role,
        }
      })

    setTeamsResult({
      team1: mapIds(result.team1),
      team2: mapIds(result.team2),
      team1Strength: result.team1Strength,
      team2Strength: result.team2Strength,
      balanceScore: result.balanceScore,
    })
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, group_id')
        .eq('id', matchId)
        .single()
      if (!matchData) { setError('Partita non trovata'); setLoading(false); return }
      setGroupId(matchData.group_id)

      const { data: groupData } = await supabase
        .from('groups')
        .select('team1_name, team2_name')
        .eq('id', matchData.group_id)
        .single()
      if (groupData) {
        setTeam1Name(groupData.team1_name ?? 'Squadra A')
        setTeam2Name(groupData.team2_name ?? 'Squadra B')
      }

      const { data: adminCheck } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', matchData.group_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      setIsAdmin(adminCheck?.role === 'admin')

      const { data: regs } = await supabase
        .from('match_registrations')
        .select('user_id, profiles(username, full_name, avatar_url, preferred_role, preferred_role_2)')
        .eq('match_id', matchId)
        .eq('status', 'confirmed')

      if (!regs || regs.length < 2) {
        setError('Servono almeno 2 giocatori iscritti per generare le squadre')
        setLoading(false)
        return
      }
      setEffectiveFormat(getEffectiveFormatLabel(regs.length))

      const userIds = regs.map((r) => r.user_id)
      const { data: ratings } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('group_id', matchData.group_id)
        .in('ratee_id', userIds)

      const skillKeys = [
        'velocita', 'resistenza', 'forza', 'salto', 'agilita',
        'tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa',
        'lettura_gioco', 'posizionamento', 'pressing', 'costruzione',
        'marcatura', 'tackle', 'intercettamento', 'copertura',
        'finalizzazione', 'assist_making',
        'leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play',
      ] as const

      const inputs: PlayerInput[] = regs.map((reg) => {
        const profile = reg.profiles as unknown as {
          username: string; full_name: string | null; avatar_url: string | null
          preferred_role: string | null; preferred_role_2: string | null
        }
        const userRatings = (ratings ?? []).filter((r) => r.ratee_id === reg.user_id)
        const ratingCount = userRatings.length

        const avgSkills = Object.fromEntries(
          skillKeys.map((k) => [
            k,
            ratingCount > 0
              ? userRatings.reduce((sum, r) => sum + (Number(r[k as keyof typeof r]) || 5), 0) / ratingCount
              : 5,
          ]),
        ) as unknown as PlayerInput['skills']

        return {
          id: reg.user_id,
          role: (profile.preferred_role ?? 'C') as PlayerInput['role'],
          role2: profile.preferred_role_2 ? profile.preferred_role_2 as PlayerInput['role'] : undefined,
          skills: avgSkills,
          ratingCount,
        }
      })

      const allPlayers: PlayerData[] = regs.map((r) => {
        const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; preferred_role: string | null; preferred_role_2: string | null }
        return {
          id: r.user_id,
          username: p?.username ?? r.user_id,
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          overall: 0,
          role: p?.preferred_role ?? 'C',
        }
      })

      setPlayers(allPlayers)
      setPlayerInputs(inputs)
      computeAndSetTeams(inputs, allPlayers, [])
      setLoading(false)
    }
    load()
  }, [matchId, router])

  function handleAddConstraint() {
    if (!selectedA || !selectedB || selectedA === selectedB) return
    const exists = constraints.some(
      (c) => (c.a === selectedA && c.b === selectedB) || (c.a === selectedB && c.b === selectedA),
    )
    if (exists) return
    const next = [...constraints, { a: selectedA, b: selectedB }]
    setConstraints(next)
    computeAndSetTeams(playerInputs, players, next)
  }

  function handleRemoveConstraint(index: number) {
    const next = constraints.filter((_, i) => i !== index)
    setConstraints(next)
    computeAndSetTeams(playerInputs, players, next)
  }

  function handleRegenerate() {
    if (playerInputs.length === 0) return
    computeAndSetTeams(playerInputs, players, constraints)
    showToast('Squadre rigenerate', 'success')
  }

  async function handleConfirm() {
    if (!teamsResult) return
    startTransition(async () => {
      const supabase = createClient()
      // Delete any existing record for this match to prevent duplicate rows
      await supabase.from('generated_teams').delete().eq('match_id', matchId)

      const { error } = await supabase
        .from('generated_teams')
        .insert({
          match_id: matchId,
          team1_user_ids: teamsResult.team1.map((p) => p.id),
          team2_user_ids: teamsResult.team2.map((p) => p.id),
          team1_strength: teamsResult.team1Strength,
          team2_strength: teamsResult.team2Strength,
          balance_score: teamsResult.balanceScore,
          is_confirmed: true,
        })

      if (error) { setError(error.message); return }

      const team1Updates = teamsResult.team1.map((p) =>
        supabase.from('match_registrations').update({ team_id: 1 }).eq('match_id', matchId).eq('user_id', p.id),
      )
      const team2Updates = teamsResult.team2.map((p) =>
        supabase.from('match_registrations').update({ team_id: 2 }).eq('match_id', matchId).eq('user_id', p.id),
      )
      await Promise.all([...team1Updates, ...team2Updates])
      setConfirmed(true)
      showToast('Squadre confermate', 'success')
    })
  }

  function handleSwap(id1: string, id2: string) {
    if (!teamsResult) return
    const inTeam1 = teamsResult.team1.some(p => p.id === id1)
    const p1 = inTeam1
      ? teamsResult.team1.find(p => p.id === id1)
      : teamsResult.team2.find(p => p.id === id1)
    const p2 = inTeam1
      ? teamsResult.team2.find(p => p.id === id2)
      : teamsResult.team1.find(p => p.id === id2)
    if (!p1 || !p2) return

    const newTeam1 = inTeam1
      ? teamsResult.team1.map(p => p.id === id1 ? p2 : p)
      : teamsResult.team1.map(p => p.id === id2 ? p1 : p)
    const newTeam2 = inTeam1
      ? teamsResult.team2.map(p => p.id === id2 ? p1 : p)
      : teamsResult.team2.map(p => p.id === id1 ? p2 : p)

    const s1 = newTeam1.reduce((sum, p) => sum + p.overall, 0)
    const s2 = newTeam2.reduce((sum, p) => sum + p.overall, 0)

    setTeamsResult({
      ...teamsResult,
      team1: newTeam1,
      team2: newTeam2,
      team1Strength: Math.round(s1 * 10) / 10,
      team2Strength: Math.round(s2 * 10) / 10,
    })
    setConfirmed(false)
    showToast('Scambio effettuato! Ricordati di confermare le squadre.', 'info')
  }

  async function handleSaveTeamNames() {
    if (!groupId) return
    const supabase = createClient()
    const { error } = await supabase
      .from('groups')
      .update({
        team1_name: team1Name.trim() || 'Squadra A',
        team2_name: team2Name.trim() || 'Squadra B',
      })
      .eq('id', groupId)
    if (error) {
      setError(error.message)
      return
    }
    showToast('Nomi squadra aggiornati per il gruppo', 'success')
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
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        <button onClick={() => router.back()} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>← Indietro</button>
      </div>
    )
  }

  if (!teamsResult) return null

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Partita
      </button>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>
          Squadre
        </h1>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {players.length} giocatori • {teamsResult.team1.length}vs{teamsResult.team2.length}
        </p>
        {effectiveFormat && (
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
            Formato effettivo: <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{effectiveFormat}</span>
          </p>
        )}
      </div>

      <div style={{ padding: '0.9rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nomi squadre (persistenti per le prossime partite)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem' }}>
          <input value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} placeholder="Squadra A" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.6rem', fontSize: '0.85rem' }} />
          <input value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} placeholder="Squadra B" style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.6rem', fontSize: '0.85rem' }} />
          <button type="button" onClick={handleSaveTeamNames} style={{ border: '1px solid rgba(200,255,107,.45)', background: 'rgba(200,255,107,.13)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
            Salva
          </button>
        </div>
      </div>

      <div style={{ padding: '0.9rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Vincolo: non possono stare nella stessa squadra
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem' }}>
          <select value={selectedA} onChange={(e) => setSelectedA(e.target.value)} style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.6rem', fontSize: '0.85rem' }}>
            <option value="">Giocatore A</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username}</option>)}
          </select>
          <select value={selectedB} onChange={(e) => setSelectedB(e.target.value)} style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.6rem', fontSize: '0.85rem' }}>
            <option value="">Giocatore B</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.full_name ?? p.username}</option>)}
          </select>
          <button type="button" onClick={handleAddConstraint} style={{ border: '1px solid rgba(200,255,107,.45)', background: 'rgba(200,255,107,.13)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', fontFamily: 'var(--font-display)', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}>
            Aggiungi
          </button>
        </div>

        {constraints.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {constraints.map((c, idx) => (
              <button
                key={`${c.a}-${c.b}-${idx}`}
                type="button"
                onClick={() => handleRemoveConstraint(idx)}
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-elevated)', color: 'var(--color-text-2)', borderRadius: 999, padding: '0.32rem 0.62rem', fontSize: '0.73rem', cursor: 'pointer' }}
              >
                {(playerMap[c.a]?.full_name ?? playerMap[c.a]?.username ?? 'A')} × {(playerMap[c.b]?.full_name ?? playerMap[c.b]?.username ?? 'B')} • rimuovi
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
        {(['pitch', 'list'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              flex: 1,
              padding: '0.45rem 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              transition: 'background 0.15s, color 0.15s',
              background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
              color: viewMode === mode ? '#0A0C12' : 'var(--color-text-3)',
            }}
          >
            {mode === 'pitch' ? '⚽ Campo' : '📋 Lista'}
          </button>
        ))}
      </div>

      {viewMode === 'pitch' ? (
        <PitchFormation
          team1={teamsResult.team1}
          team2={teamsResult.team2}
          team1Name={team1Name}
          team2Name={team2Name}
          isAdmin={isAdmin}
          onSwap={handleSwap}
        />
      ) : (
        <TeamSplit
          team1={teamsResult.team1}
          team2={teamsResult.team2}
          team1Strength={teamsResult.team1Strength}
          team2Strength={teamsResult.team2Strength}
          balanceScore={teamsResult.balanceScore}
          team1Name={team1Name}
          team2Name={team2Name}
        />
      )}

      {!confirmed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <Button onClick={handleConfirm} loading={isPending} fullWidth size="lg">
            ✓ Conferma Squadre
          </Button>
          <Button variant="ghost" onClick={handleRegenerate} fullWidth>
            Rigenera
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: 'rgba(200,255,107,0.08)', border: '1px solid rgba(200,255,107,0.3)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Squadre confermate!
          </span>
          <button onClick={() => router.replace(`/matches/${matchId}`)} style={{ color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
            Torna alla partita →
          </button>
        </div>
      )}
    </div>
  )
}
