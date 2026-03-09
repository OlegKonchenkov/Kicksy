import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { Zap, Target, Users, Trophy, BarChart2, Star } from 'lucide-react'

interface PageProps {
  params: Promise<{ groupId: string }>
}

interface MemberProfile {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

interface PlayerStat {
  user_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_scored: number
  assists: number
  mvp_count: number
  clean_sheets: number
}

interface Match {
  id: string
  title: string
  scheduled_at: string
}

interface MatchResult {
  match_id: string
  team1_score: number
  team2_score: number
  mvp_user_id: string | null
}

export default async function GroupStatsPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [groupRes, memberRes] = await Promise.all([
    supabase.from('groups').select('id, name, avatar_url').eq('id', groupId).single(),
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

  // Parallel queries for all data
  const [membersRes, matchesRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id, profiles(username, full_name, avatar_url)')
      .eq('group_id', groupId)
      .eq('is_active', true),
    supabase
      .from('matches')
      .select('id, title, scheduled_at')
      .eq('group_id', groupId)
      .eq('status', 'played')
      .order('scheduled_at', { ascending: false })
      .limit(10),
  ])

  const members: MemberProfile[] = (membersRes.data ?? []).map((m) => {
    const profile = m.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null
    return {
      user_id: m.user_id,
      username: profile?.username ?? '',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })

  const memberIds = members.map((m) => m.user_id)
  const matches: Match[] = matchesRes.data ?? []
  const matchIds = matches.map((m) => m.id)

  // Get stats and results in parallel (only if there's data)
  const [statsRes, resultsRes] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from('player_stats')
          .select('user_id, matches_played, matches_won, matches_drawn, matches_lost, goals_scored, assists, mvp_count, clean_sheets')
          .eq('group_id', groupId)
          .in('user_id', memberIds)
      : Promise.resolve({ data: [] }),
    matchIds.length > 0
      ? supabase
          .from('match_results')
          .select('match_id, team1_score, team2_score, mvp_user_id')
          .in('match_id', matchIds)
      : Promise.resolve({ data: [] }),
  ])

  const statsRows: PlayerStat[] = (statsRes.data ?? []) as PlayerStat[]
  const matchResults: MatchResult[] = (resultsRes.data ?? []) as MatchResult[]

  // Build stats map
  const statsMap: Record<string, PlayerStat> = {}
  for (const s of statsRows) {
    statsMap[s.user_id] = s
  }

  // Build results map
  const resultsMap: Record<string, MatchResult> = {}
  for (const r of matchResults) {
    resultsMap[r.match_id] = r
  }

  // Build profiles map
  const profilesMap: Record<string, MemberProfile> = {}
  for (const m of members) {
    profilesMap[m.user_id] = m
  }

  // --- Aggregate stats ---
  const totalMatches = matches.length

  // Sum goals from match_results (avoids double-counting)
  const totalGoals = matchResults.reduce(
    (acc, r) => acc + (r.team1_score ?? 0) + (r.team2_score ?? 0),
    0,
  )

  const activePlayers = statsRows.filter((s) => s.matches_played > 0).length

  const avgGoalsPerMatch =
    totalMatches > 0 ? Math.round((totalGoals / totalMatches) * 10) / 10 : 0

  // --- Top performers ---
  const capocannoniere = statsRows.reduce<PlayerStat | null>(
    (best, s) => (best === null || s.goals_scored > best.goals_scored ? s : best),
    null,
  )

  const reMvp = statsRows.reduce<PlayerStat | null>(
    (best, s) => (best === null || s.mvp_count > best.mvp_count ? s : best),
    null,
  )

  const ironMan = statsRows.reduce<PlayerStat | null>(
    (best, s) => (best === null || s.matches_played > best.matches_played ? s : best),
    null,
  )

  // --- Bar chart data: top 8 by goals ---
  const topGoalScorers = [...statsRows]
    .filter((s) => s.goals_scored > 0)
    .sort((a, b) => b.goals_scored - a.goals_scored)
    .slice(0, 8)

  const maxGoals = topGoalScorers.length > 0 ? topGoalScorers[0].goals_scored : 0

  // Helper: display name
  const displayName = (userId: string) => {
    const p = profilesMap[userId]
    if (!p) return '?'
    return p.full_name?.split(' ')[0] ?? p.username
  }

  return (
    <div style={{ padding: '1.5rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          href={`/groups/${groupId}`}
          style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}
        >
          ←
        </Link>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-1)',
              lineHeight: 1,
            }}
          >
            Statistiche
          </h1>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
            {group.name}
          </div>
        </div>
      </div>

      {/* Hero stat cards — 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          {
            icon: <BarChart2 size={20} color="var(--color-primary)" />,
            label: 'Partite',
            value: totalMatches,
            sub: 'giocate',
          },
          {
            icon: <Target size={20} color="var(--color-primary)" />,
            label: 'Gol Totali',
            value: totalGoals,
            sub: 'in totale',
          },
          {
            icon: <Users size={20} color="var(--color-primary)" />,
            label: 'Giocatori',
            value: activePlayers,
            sub: 'attivi',
          },
          {
            icon: <Zap size={20} color="var(--color-primary)" />,
            label: 'Media Gol',
            value: avgGoalsPerMatch,
            sub: 'per partita',
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: '1rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {card.icon}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-3)',
                }}
              >
                {card.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-3)',
            marginBottom: '0.875rem',
          }}
        >
          Top Performers
        </h2>

        {statsRows.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
              Nessuna statistica ancora — gioca la prima partita!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {/* Capocannoniere */}
            {capocannoniere && capocannoniere.goals_scored > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(200,255,107,0.06)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(200,255,107,0.18)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(200,255,107,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Target size={18} color="var(--color-primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-3)',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Capocannoniere
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar
                      src={profilesMap[capocannoniere.user_id]?.avatar_url ?? null}
                      name={displayName(capocannoniere.user_id)}
                      size="xs"
                    />
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>
                      {displayName(capocannoniere.user_id)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}
                >
                  {capocannoniere.goals_scored}
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginLeft: '0.2rem' }}>gol</span>
                </div>
              </div>
            )}

            {/* Re MVP */}
            {reMvp && reMvp.mvp_count > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(251,191,36,0.06)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(251,191,36,0.18)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(251,191,36,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Star size={18} color="#fbbf24" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-3)',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Re MVP
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar
                      src={profilesMap[reMvp.user_id]?.avatar_url ?? null}
                      name={displayName(reMvp.user_id)}
                      size="xs"
                    />
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>
                      {displayName(reMvp.user_id)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#fbbf24',
                    flexShrink: 0,
                  }}
                >
                  {reMvp.mvp_count}
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginLeft: '0.2rem' }}>MVP</span>
                </div>
              </div>
            )}

            {/* Iron Man */}
            {ironMan && ironMan.matches_played > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  background: 'rgba(99,179,237,0.06)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(99,179,237,0.18)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(99,179,237,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} color="#63b3ed" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-3)',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Iron Man
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Avatar
                      src={profilesMap[ironMan.user_id]?.avatar_url ?? null}
                      name={displayName(ironMan.user_id)}
                      size="xs"
                    />
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>
                      {displayName(ironMan.user_id)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#63b3ed',
                    flexShrink: 0,
                  }}
                >
                  {ironMan.matches_played}
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginLeft: '0.2rem' }}>PG</span>
                </div>
              </div>
            )}

            {/* No top performers yet */}
            {(!capocannoniere || capocannoniere.goals_scored === 0) &&
              (!reMvp || reMvp.mvp_count === 0) &&
              (!ironMan || ironMan.matches_played === 0) && (
                <div
                  style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--color-border)',
                  }}
                >
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                    Nessun top performer ancora
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Goals bar chart */}
      {topGoalScorers.length > 0 && (
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-3)',
              marginBottom: '0.875rem',
            }}
          >
            Gol per Giocatore
          </h2>
          <div
            style={{
              padding: '1rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            {topGoalScorers.map((s, idx) => {
              const pct = maxGoals > 0 ? (s.goals_scored / maxGoals) * 100 : 0
              const name = displayName(s.user_id)
              const profile = profilesMap[s.user_id]
              return (
                <div key={s.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  {/* Rank */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text-3)',
                      width: '1rem',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  {/* Avatar */}
                  <Avatar src={profile?.avatar_url ?? null} name={name} size="xs" />
                  {/* Name */}
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-1)',
                      fontWeight: 600,
                      width: '4.5rem',
                      flexShrink: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name}
                  </div>
                  {/* Bar */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: 'var(--color-elevated)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: idx === 0
                          ? 'var(--color-primary)'
                          : 'rgba(200,255,107,0.45)',
                        borderRadius: 999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  {/* Value */}
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text-2)',
                      width: '1.5rem',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {s.goals_scored}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent results */}
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-3)',
            marginBottom: '0.875rem',
          }}
        >
          Ultimi Risultati
        </h2>

        {matches.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <Trophy size={28} color="var(--color-text-3)" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
              Nessuna partita giocata ancora
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {matches.map((match) => {
              const result = resultsMap[match.id]
              const mvpProfile = result?.mvp_user_id ? profilesMap[result.mvp_user_id] : null
              const date = new Date(match.scheduled_at)
              const dateStr = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Date */}
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--color-text-3)',
                        width: '2.5rem',
                        flexShrink: 0,
                        textAlign: 'center',
                      }}
                    >
                      {dateStr}
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        flex: 1,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-text-1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {match.title}
                    </div>

                    {/* Score */}
                    {result ? (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'var(--color-primary)',
                          flexShrink: 0,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {result.team1_score} – {result.team2_score}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--color-text-3)',
                          flexShrink: 0,
                        }}
                      >
                        –
                      </div>
                    )}

                    {/* MVP avatar */}
                    {mvpProfile && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          flexShrink: 0,
                        }}
                      >
                        <Star size={10} color="#fbbf24" />
                        <Avatar
                          src={mvpProfile.avatar_url ?? null}
                          name={mvpProfile.full_name?.split(' ')[0] ?? mvpProfile.username}
                          size="xs"
                        />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
