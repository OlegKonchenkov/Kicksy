import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { IconMedalGold, IconMedalSilver, IconMedalBronze } from '@/components/ui/Icons'
import type { ReactNode } from 'react'
import { getPlayerOverall } from '@/lib/team-balancer'
import type { SkillSet } from '@/lib/team-balancer'
import type { PlayerRole } from '@/types'

interface PageProps {
  searchParams?: Promise<{ view?: string }>
}

interface RankingRow {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  level: number
  total_played: number
  total_won: number
  total_goals: number
  total_mvp: number
  total_points: number
  win_rate: number
  group_count: number
  primary_group_id: string
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

export default async function RankingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const viewMode = resolvedSearchParams?.view === 'ratings' ? 'ratings' : 'points'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const myGroupIds = (memberRows ?? []).map((r) => r.group_id)

  const groups = (memberRows ?? [])
    .map((r) => {
      const g = r.groups as unknown as { id: string; name: string } | null
      return g
    })
    .filter(Boolean) as { id: string; name: string }[]

  if (myGroupIds.length === 0) {
    redirect('/onboarding')
  }

  const { data: allMembers } = await supabase
    .from('group_members')
    .select('user_id, group_id, profiles(username, full_name, avatar_url, level, preferred_role, preferred_role_2)')
    .in('group_id', myGroupIds)
    .eq('is_active', true)

  const userMap: Record<
    string,
    {
      username: string
      full_name: string | null
      avatar_url: string | null
      level: number
      preferred_role: PlayerRole | null
      preferred_role_2: PlayerRole | null
      groups: Set<string>
    }
  > = {}

  for (const m of allMembers ?? []) {
    const p = m.profiles as unknown as {
      username: string
      full_name: string | null
      avatar_url: string | null
      level: number
      preferred_role: PlayerRole | null
      preferred_role_2: PlayerRole | null
    } | null

    if (!p) continue
    if (!userMap[m.user_id]) {
      userMap[m.user_id] = { ...p, groups: new Set() }
    }
    userMap[m.user_id].groups.add(m.group_id)
  }

  const allUserIds = Object.keys(userMap)

  const [statsQuery, ratingsQuery] = await Promise.all([
    allUserIds.length > 0
      ? supabase
          .from('player_stats')
          .select('*')
          .in('user_id', allUserIds)
          .in('group_id', myGroupIds)
      : Promise.resolve({ data: [] as unknown[] }),
    allUserIds.length > 0
      ? supabase
          .from('player_ratings')
          .select('ratee_id, velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
          .in('group_id', myGroupIds)
          .in('ratee_id', allUserIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const statsRows = statsQuery.data
  const ratingsRows = ratingsQuery.data

  const statsAgg: Record<string, { played: number; won: number; drawn: number; goals: number; assists: number; mvp: number }> = {}
  for (const s of statsRows ?? []) {
    const row = s as {
      user_id: string
      matches_played: number
      matches_won: number
      matches_drawn: number
      goals_scored: number
      assists: number
      mvp_count: number
    }
    if (!statsAgg[row.user_id]) {
      statsAgg[row.user_id] = { played: 0, won: 0, drawn: 0, goals: 0, assists: 0, mvp: 0 }
    }
    statsAgg[row.user_id].played += row.matches_played
    statsAgg[row.user_id].won += row.matches_won
    statsAgg[row.user_id].drawn += row.matches_drawn
    statsAgg[row.user_id].goals += row.goals_scored
    statsAgg[row.user_id].assists += row.assists
    statsAgg[row.user_id].mvp += row.mvp_count
  }

  const ratingsByUser: Record<string, Record<string, number | null>[]> = {}
  for (const row of ratingsRows ?? []) {
    const rateeId = (row as { ratee_id: string }).ratee_id
    const existing = ratingsByUser[rateeId] ?? []
    existing.push(row as Record<string, number | null>)
    ratingsByUser[rateeId] = existing
  }

  const rankings: RankingRow[] = allUserIds.map((uid) => {
    const profile = userMap[uid]
    const s = statsAgg[uid] ?? { played: 0, won: 0, drawn: 0, goals: 0, assists: 0, mvp: 0 }
    const points = s.won * 3 + s.drawn * 1 + s.goals * 1 + s.assists * 0.5 + s.mvp * 2
    const primaryGroupId = myGroupIds.find((gid) => profile.groups.has(gid)) ?? myGroupIds[0]

    const userRatings = ratingsByUser[uid] ?? []
    const avgSkills = Object.fromEntries(
      SKILL_FIELDS.map((k) => [k, computeAvg(userRatings, [k])]),
    ) as unknown as SkillSet

    const ovr = userRatings.length > 0
      ? getPlayerOverall({
          id: uid,
          role: (profile.preferred_role ?? 'C') as PlayerRole,
          role2: (profile.preferred_role_2 ?? undefined) as PlayerRole | undefined,
          skills: avgSkills,
          ratingCount: userRatings.length,
        })
      : 0

    return {
      user_id: uid,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      level: profile.level,
      total_played: s.played,
      total_won: s.won,
      total_goals: s.goals,
      total_mvp: s.mvp,
      total_points: points,
      win_rate: s.played > 0 ? Math.round((s.won / s.played) * 100) : 0,
      group_count: profile.groups.size,
      primary_group_id: primaryGroupId,
      ovr,
      rating_count: userRatings.length,
    }
  })

  const pointsRankings = [...rankings].sort((a, b) => b.total_points - a.total_points || b.total_won - a.total_won)
  const ratingsRankings = [...rankings].sort((a, b) => {
    const aHasRatings = a.rating_count > 0 ? 1 : 0
    const bHasRatings = b.rating_count > 0 ? 1 : 0
    return bHasRatings - aHasRatings || b.ovr - a.ovr || b.rating_count - a.rating_count || b.total_points - a.total_points
  })

  const activeRankings = viewMode === 'ratings' ? ratingsRankings : pointsRankings
  const medals: ReactNode[] = [<IconMedalGold key="g" size={22} />, <IconMedalSilver key="s" size={22} />, <IconMedalBronze key="b" size={22} />]
  const myRank = activeRankings.findIndex((r) => r.user_id === user.id)

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Classifica
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
          Tutti i tuoi gruppi · {activeRankings.length} giocatori
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', padding: '0.25rem', background: 'var(--color-surface)', borderRadius: 999, border: '1px solid var(--color-border)' }}>
        <Link
          href="/rankings?view=points"
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
          href="/rankings?view=ratings"
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

      {myRank >= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(200,255,107,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(200,255,107,0.2)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', minWidth: 48, textAlign: 'center' }}>
            {medals[myRank] ?? `#${myRank + 1}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>La tua posizione</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)', marginTop: '0.125rem' }}>
              {viewMode === 'ratings'
                ? `${activeRankings[myRank].rating_count > 0 ? activeRankings[myRank].ovr : '—'} OVR`
                : `${formatPoints(activeRankings[myRank].total_points)} punti`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {viewMode === 'ratings' ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{activeRankings[myRank].rating_count} voti</div>
            ) : (
              <>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{activeRankings[myRank].win_rate}% win</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{activeRankings[myRank].total_goals} gol</div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <div style={{ padding: '0.375rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 999, fontSize: '0.75rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'default' }}>
          Tutti
        </div>
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}/rankings?view=${viewMode}`}
            style={{ padding: '0.375rem 0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 999, fontSize: '0.75rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-2)', whiteSpace: 'nowrap', textDecoration: 'none' }}
          >
            {g.name}
          </Link>
        ))}
      </div>

      <div>
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
              <Link key={r.user_id} href={`/groups/${r.primary_group_id}/players/${r.user_id}`} style={{ textDecoration: 'none', display: 'block' }}>
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
                      {[r.total_played, r.total_goals, r.total_mvp].map((val, i) => (
                        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-1)', textAlign: 'center' }}>
                          {val}
                        </div>
                      ))}

                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 800, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', textAlign: 'center' }}>
                        {formatPoints(r.total_points)}
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
