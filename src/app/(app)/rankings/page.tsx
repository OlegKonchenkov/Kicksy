import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'

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
}

export default async function RankingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all groups the user belongs to
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const myGroupIds = (memberRows ?? []).map(r => r.group_id)

  const groups = (memberRows ?? []).map(r => {
    const g = r.groups as unknown as { id: string; name: string } | null
    return g
  }).filter(Boolean) as { id: string; name: string }[]

  if (myGroupIds.length === 0) {
    redirect('/onboarding')
  }

  // Get all group members across my groups
  const { data: allMembers } = await supabase
    .from('group_members')
    .select('user_id, group_id, profiles(username, full_name, avatar_url, level)')
    .in('group_id', myGroupIds)
    .eq('is_active', true)

  // Deduplicate users
  const userMap: Record<string, { username: string; full_name: string | null; avatar_url: string | null; level: number; groups: Set<string> }> = {}
  for (const m of allMembers ?? []) {
    const p = m.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; level: number } | null
    if (!p) continue
    if (!userMap[m.user_id]) {
      userMap[m.user_id] = { ...p, groups: new Set() }
    }
    userMap[m.user_id].groups.add(m.group_id)
  }

  const allUserIds = Object.keys(userMap)

  // Get aggregated stats across all my groups
  const { data: statsRows } = allUserIds.length > 0
    ? await supabase
        .from('player_stats')
        .select('*')
        .in('user_id', allUserIds)
        .in('group_id', myGroupIds)
    : { data: [] }

  // Aggregate stats per user
  const statsAgg: Record<string, { played: number; won: number; drawn: number; goals: number; assists: number; mvp: number }> = {}
  for (const s of statsRows ?? []) {
    if (!statsAgg[s.user_id]) {
      statsAgg[s.user_id] = { played: 0, won: 0, drawn: 0, goals: 0, assists: 0, mvp: 0 }
    }
    statsAgg[s.user_id].played += s.matches_played
    statsAgg[s.user_id].won += s.matches_won
    statsAgg[s.user_id].drawn += s.matches_drawn
    statsAgg[s.user_id].goals += s.goals_scored
    statsAgg[s.user_id].assists += s.assists
    statsAgg[s.user_id].mvp += s.mvp_count
  }

  const rankings: RankingRow[] = allUserIds.map(uid => {
    const profile = userMap[uid]
    const s = statsAgg[uid] ?? { played: 0, won: 0, drawn: 0, goals: 0, assists: 0, mvp: 0 }
    const points = Math.round(s.won * 3 + s.drawn * 1 + s.goals * 1 + s.assists * 0.5 + s.mvp * 2)
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
    }
  })

  rankings.sort((a, b) => b.total_points - a.total_points || b.total_won - a.total_won)

  const medals = ['🥇', '🥈', '🥉']
  const myRank = rankings.findIndex(r => r.user_id === user.id)

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Classifica
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
          Tutti i tuoi gruppi · {rankings.length} giocatori
        </p>
      </div>

      {/* My position banner */}
      {myRank >= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(200,255,107,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(200,255,107,0.2)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', minWidth: 48, textAlign: 'center' }}>
            {medals[myRank] ?? `#${myRank + 1}`}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>La tua posizione</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)', marginTop: '0.125rem' }}>
              {rankings[myRank].total_points} punti
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{rankings[myRank].win_rate}% win</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{rankings[myRank].total_goals} gol</div>
          </div>
        </div>
      )}

      {/* Group filter links */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <div style={{ padding: '0.375rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 999, fontSize: '0.75rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'default' }}>
          Tutti
        </div>
        {groups.map(g => (
          <Link
            key={g.id}
            href={`/groups/${g.id}/rankings`}
            style={{ padding: '0.375rem 0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 999, fontSize: '0.75rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-2)', whiteSpace: 'nowrap', textDecoration: 'none' }}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {/* Column headers */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem', gap: '0.25rem', padding: '0 1rem 0.5rem', alignItems: 'center' }}>
          {['#', 'Giocatore', 'PG', 'Gol', 'MVP', 'Pt'].map(h => (
            <span key={h} style={{ fontSize: '0.6rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, textAlign: h === 'Giocatore' ? 'left' : 'center' }}>
              {h}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {rankings.map((r, idx) => {
            const isMe = r.user_id === user.id
            const medal = medals[idx]
            return (
              <div
                key={r.user_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem',
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

                {[r.total_played, r.total_goals, r.total_mvp].map((val, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-1)', textAlign: 'center' }}>
                    {val}
                  </div>
                ))}

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 800, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', textAlign: 'center' }}>
                  {r.total_points}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
