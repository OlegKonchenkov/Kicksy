import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { IconMedalGold, IconMedalSilver, IconMedalBronze } from '@/components/ui/Icons'
import type { ReactNode } from 'react'
import { getPlayerOverall } from '@/lib/team-balancer'
import type { SkillSet } from '@/lib/team-balancer'
import type { PlayerRole } from '@/types'

interface PageProps {
  params: Promise<{ groupId: string }>
  searchParams?: Promise<{ view?: string }>
}

interface RankingRow {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  level: number
  matches_played: number
  matches_won: number
  goals_scored: number
  assists: number
  mvp_count: number
  win_rate: number
  points: number
  ovr: number
  rating_count: number
}

const SKILL_FIELDS: (keyof SkillSet)[] = [
  'velocita', 'resistenza', 'forza', 'salto', 'agilita',
  'tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa',
  'lettura_gioco', 'posizionamento', 'pressing', 'costruzione',
  'marcatura', 'tackle', 'intercettamento', 'copertura',
  'finalizzazione', 'assist_making',
  'leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play',
]

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}

function computeAvg(rows: Record<string, number | null>[], fields: string[]): number {
  let sum = 0
  let count = 0
  for (const row of rows) {
    for (const f of fields) {
      const v = row[f]
      if (v != null) {
        sum += v
        count++
      }
    }
  }
  if (count === 0) return 0
  return Math.round((sum / count) * 10) / 10
}

export default async function GroupRankingsPage({ params, searchParams }: PageProps) {
  const { groupId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const viewMode = resolvedSearchParams?.view === 'ratings' ? 'ratings' : 'points'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [groupRes, memberRes] = await Promise.all([
    supabase.from('groups').select('id, name').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (groupRes.error) notFound()
  if (!memberRes.data) redirect('/groups')

  const group = groupRes.data

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(username, full_name, avatar_url, level, preferred_role, preferred_role_2)')
    .eq('group_id', groupId)
    .eq('is_active', true)

  const memberIds = (members ?? []).map((m) => m.user_id)

  const [statsQuery, ratingsQuery] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from('player_stats')
          .select('*')
          .eq('group_id', groupId)
          .in('user_id', memberIds)
      : Promise.resolve({ data: [] as unknown[] }),
    memberIds.length > 0
      ? supabase
          .from('player_ratings')
          .select('ratee_id, velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
          .eq('group_id', groupId)
          .in('ratee_id', memberIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const statsRows = statsQuery.data
  const ratingsRows = ratingsQuery.data

  type StatRow = {
    user_id: string
    matches_played: number
    matches_won: number
    matches_drawn: number
    goals_scored: number
    assists: number
    mvp_count: number
  }

  const statsMap: Record<string, StatRow> = {}
  for (const s of statsRows ?? []) {
    const stat = s as StatRow
    statsMap[stat.user_id] = stat
  }

  const ratingsByUser: Record<string, Record<string, number | null>[]> = {}
  for (const row of ratingsRows ?? []) {
    const rateeId = (row as { ratee_id: string }).ratee_id
    const existing = ratingsByUser[rateeId] ?? []
    existing.push(row as Record<string, number | null>)
    ratingsByUser[rateeId] = existing
  }

  const rankings: RankingRow[] = (members ?? []).map((m) => {
    const profile = m.profiles as unknown as {
      username: string
      full_name: string | null
      avatar_url: string | null
      level: number
      preferred_role: PlayerRole | null
      preferred_role_2: PlayerRole | null
    } | null

    const stats = statsMap[m.user_id]
    const played = stats?.matches_played ?? 0
    const won = stats?.matches_won ?? 0
    const drawn = stats?.matches_drawn ?? 0
    const goals = stats?.goals_scored ?? 0
    const assists = stats?.assists ?? 0
    const mvp = stats?.mvp_count ?? 0
    const points = won * 3 + drawn * 1 + goals * 1 + assists * 0.5 + mvp * 2

    const userRatings = ratingsByUser[m.user_id] ?? []
    const avgSkills = Object.fromEntries(
      SKILL_FIELDS.map((k) => [k, computeAvg(userRatings, [k])]),
    ) as unknown as SkillSet

    const ovr = userRatings.length > 0
      ? getPlayerOverall({
          id: m.user_id,
          role: (profile?.preferred_role ?? 'C') as PlayerRole,
          role2: (profile?.preferred_role_2 ?? undefined) as PlayerRole | undefined,
          skills: avgSkills,
          ratingCount: userRatings.length,
        })
      : 0

    return {
      user_id: m.user_id,
      username: profile?.username ?? '',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      level: profile?.level ?? 1,
      matches_played: played,
      matches_won: won,
      goals_scored: goals,
      assists,
      mvp_count: mvp,
      win_rate: played > 0 ? Math.round((won / played) * 100) : 0,
      points,
      ovr,
      rating_count: userRatings.length,
    }
  })

  const pointsRankings = [...rankings].sort((a, b) => b.points - a.points || b.matches_won - a.matches_won)
  const ratingsRankings = [...rankings].sort((a, b) => {
    const aHasRatings = a.rating_count > 0 ? 1 : 0
    const bHasRatings = b.rating_count > 0 ? 1 : 0
    return bHasRatings - aHasRatings || b.ovr - a.ovr || b.rating_count - a.rating_count || b.points - a.points
  })

  const activeRankings = viewMode === 'ratings' ? ratingsRankings : pointsRankings
  const medals: ReactNode[] = [<IconMedalGold key="g" size={22} />, <IconMedalSilver key="s" size={22} />, <IconMedalBronze key="b" size={22} />]

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/groups/${groupId}`} style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>
          ←
        </Link>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', lineHeight: 1 }}>
            Classifica
          </h1>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>{group.name}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', padding: '0.25rem', background: 'var(--color-surface)', borderRadius: 999, border: '1px solid var(--color-border)' }}>
        <Link
          href={`/groups/${groupId}/rankings?view=points`}
          style={{
            textDecoration: 'none',
            textAlign: 'center',
            padding: '0.5rem 0.75rem',
            borderRadius: 999,
            fontFamily: 'var(--font-display)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: viewMode === 'points' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'points' ? 'var(--color-bg)' : 'var(--color-text-2)',
          }}
        >
          Punteggi
        </Link>
        <Link
          href={`/groups/${groupId}/rankings?view=ratings`}
          style={{
            textDecoration: 'none',
            textAlign: 'center',
            padding: '0.5rem 0.75rem',
            borderRadius: 999,
            fontFamily: 'var(--font-display)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: viewMode === 'ratings' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'ratings' ? 'var(--color-bg)' : 'var(--color-text-2)',
          }}
        >
          Valutazioni
        </Link>
      </div>

      {activeRankings.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 1rem 1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Avatar src={activeRankings[1].avatar_url} name={activeRankings[1].full_name ?? activeRankings[1].username} size="md" />
            <div><IconMedalSilver size={28} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-2)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeRankings[1].full_name?.split(' ')[0] ?? activeRankings[1].username}
            </div>
            <div style={{ width: '100%', height: 56, background: 'rgba(192,192,192,0.15)', border: '1px solid rgba(192,192,192,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: '#c0c0c0' }}>
              {viewMode === 'ratings'
                ? `${activeRankings[1].rating_count > 0 ? activeRankings[1].ovr : '—'} OVR`
                : `${formatPoints(activeRankings[1].points)}pt`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div style={{ filter: 'drop-shadow(0 0 16px rgba(200,255,107,0.5))' }}>
              <Avatar src={activeRankings[0].avatar_url} name={activeRankings[0].full_name ?? activeRankings[0].username} size="lg" />
            </div>
            <div><IconMedalGold size={32} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeRankings[0].full_name?.split(' ')[0] ?? activeRankings[0].username}
            </div>
            <div style={{ width: '100%', height: 80, background: 'rgba(200,255,107,0.12)', border: '1px solid rgba(200,255,107,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {viewMode === 'ratings'
                ? `${activeRankings[0].rating_count > 0 ? activeRankings[0].ovr : '—'} OVR`
                : `${formatPoints(activeRankings[0].points)}pt`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Avatar src={activeRankings[2].avatar_url} name={activeRankings[2].full_name ?? activeRankings[2].username} size="md" />
            <div><IconMedalBronze size={28} /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-2)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeRankings[2].full_name?.split(' ')[0] ?? activeRankings[2].username}
            </div>
            <div style={{ width: '100%', height: 44, background: 'rgba(205,127,50,0.12)', border: '1px solid rgba(205,127,50,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: '#cd7f32' }}>
              {viewMode === 'ratings'
                ? `${activeRankings[2].rating_count > 0 ? activeRankings[2].ovr : '—'} OVR`
                : `${formatPoints(activeRankings[2].points)}pt`}
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          {viewMode === 'ratings' ? 'Classifica Valutazioni' : 'Classifica Completa'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'ratings' ? '2rem 1fr 4rem 3.5rem' : '2rem 1fr 3rem 3rem 3rem 3rem', gap: '0.25rem', padding: '0 1rem 0.5rem', alignItems: 'center' }}>
          {(viewMode === 'ratings' ? ['#', 'Giocatore', 'Voti', 'OVR'] : ['#', 'Giocatore', 'PG', 'Gol', 'MVP', 'Pt']).map((h) => (
            <span key={h} style={{ fontSize: '0.6rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, textAlign: h === 'Giocatore' ? 'left' : 'center' }}>
              {h}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {activeRankings.map((r, idx) => {
            const isMe = r.user_id === user.id
            const medal = medals[idx]
            return (
              <Link key={r.user_id} href={`/groups/${groupId}/players/${r.user_id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: viewMode === 'ratings' ? '2rem 1fr 4rem 3.5rem' : '2rem 1fr 3rem 3rem 3rem 3rem',
                    gap: '0.25rem',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: isMe ? 'rgba(200,255,107,0.08)' : 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isMe ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}`,
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: idx < 3 ? 'var(--color-primary)' : 'var(--color-text-3)', textAlign: 'center' }}>
                    {medal ?? `${idx + 1}`}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <Avatar src={r.avatar_url} name={r.full_name ?? r.username} size="xs" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.full_name?.split(' ')[0] ?? r.username}
                        {isMe && <span style={{ marginLeft: '0.25rem', fontSize: '0.6rem', color: 'var(--color-primary)' }}>Tu</span>}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Lv.{r.level} · {r.win_rate}% W
                      </div>
                    </div>
                  </div>

                  {viewMode === 'ratings' ? (
                    <>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-1)', textAlign: 'center' }}>
                        {r.rating_count}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 800, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', textAlign: 'center' }}>
                        {r.rating_count > 0 ? r.ovr : '—'}
                      </div>
                    </>
                  ) : (
                    <>
                      {[r.matches_played, r.goals_scored, r.mvp_count].map((val, i) => (
                        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-1)', textAlign: 'center' }}>
                          {val}
                        </div>
                      ))}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 800, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', textAlign: 'center' }}>
                        {formatPoints(r.points)}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {viewMode === 'points' ? (
        <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.5rem' }}>
            Come si calcolano i punti
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { label: 'Vittoria', value: '+3pt' },
              { label: 'Pareggio', value: '+1pt' },
              { label: 'Gol', value: '+1pt' },
              { label: 'Assist', value: '+0.5pt' },
              { label: 'MVP', value: '+2pt' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: 'var(--color-elevated)', borderRadius: 999 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>{item.label}:</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.5rem' }}>
            Classifica valutazioni
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', margin: 0 }}>
            Ordinata per OVR (rating medio pesato sul ruolo) e numero valutazioni ricevute.
          </p>
        </div>
      )}
    </div>
  )
}
