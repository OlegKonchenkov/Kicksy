import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'

interface PageProps {
  params: Promise<{ groupId: string }>
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
}

export default async function GroupRankingsPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  // Get all active members with their profiles
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(username, full_name, avatar_url, level)')
    .eq('group_id', groupId)
    .eq('is_active', true)

  const memberIds = (members ?? []).map(m => m.user_id)

  // Get player stats for this group
  const { data: statsRows } = memberIds.length > 0
    ? await supabase
        .from('player_stats')
        .select('*')
        .eq('group_id', groupId)
        .in('user_id', memberIds)
    : { data: [] }

  // Build ranking
  type StatRow = { user_id: string; matches_played: number; matches_won: number; matches_drawn: number; matches_lost: number; goals_scored: number; assists: number; mvp_count: number }
  const statsMap: Record<string, StatRow> = {}
  for (const s of statsRows ?? []) {
    statsMap[s.user_id] = s as unknown as StatRow
  }

  const rankings: RankingRow[] = (members ?? []).map(m => {
    const profile = m.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; level: number } | null
    const stats = statsMap[m.user_id]
    const played = stats?.matches_played ?? 0
    const won = stats?.matches_won ?? 0

    // Points: 3 per win, 1 per draw, +1 per goal, +0.5 per assist, +2 per MVP
    const drawn = stats?.matches_drawn ?? 0
    const goals = stats?.goals_scored ?? 0
    const assists = stats?.assists ?? 0
    const mvp = stats?.mvp_count ?? 0
    const points = Math.round(won * 3 + drawn * 1 + goals * 1 + assists * 0.5 + mvp * 2)

    return {
      user_id: m.user_id,
      username: profile?.username ?? '',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      level: profile?.level ?? 1,
      matches_played: played,
      matches_won: won,
      goals_scored: goals,
      assists: assists,
      mvp_count: mvp,
      win_rate: played > 0 ? Math.round((won / played) * 100) : 0,
      points,
    }
  })

  // Sort by points desc, then wins desc
  rankings.sort((a, b) => b.points - a.points || b.matches_won - a.matches_won)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
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

      {/* Top 3 podium */}
      {rankings.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem 1rem 1rem' }}>
          {/* 2nd */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Avatar src={rankings[1].avatar_url} name={rankings[1].full_name ?? rankings[1].username} size="md" />
            <div style={{ fontSize: '1.25rem' }}>🥈</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-2)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rankings[1].full_name?.split(' ')[0] ?? rankings[1].username}
            </div>
            <div style={{ width: '100%', height: 56, background: 'rgba(192,192,192,0.15)', border: '1px solid rgba(192,192,192,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: '#c0c0c0' }}>
              {rankings[1].points}pt
            </div>
          </div>
          {/* 1st */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <div style={{ filter: 'drop-shadow(0 0 16px rgba(200,255,107,0.5))' }}>
              <Avatar src={rankings[0].avatar_url} name={rankings[0].full_name ?? rankings[0].username} size="lg" />
            </div>
            <div style={{ fontSize: '1.5rem' }}>🥇</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rankings[0].full_name?.split(' ')[0] ?? rankings[0].username}
            </div>
            <div style={{ width: '100%', height: 80, background: 'rgba(200,255,107,0.12)', border: '1px solid rgba(200,255,107,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {rankings[0].points}pt
            </div>
          </div>
          {/* 3rd */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Avatar src={rankings[2].avatar_url} name={rankings[2].full_name ?? rankings[2].username} size="md" />
            <div style={{ fontSize: '1.25rem' }}>🥉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-2)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rankings[2].full_name?.split(' ')[0] ?? rankings[2].username}
            </div>
            <div style={{ width: '100%', height: 44, background: 'rgba(205,127,50,0.12)', border: '1px solid rgba(205,127,50,0.3)', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: '#cd7f32' }}>
              {rankings[2].points}pt
            </div>
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Classifica Completa
        </h2>

        {/* Column headers */}
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
                {/* Rank */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: idx < 3 ? 'var(--color-primary)' : 'var(--color-text-3)', textAlign: 'center' }}>
                  {medal ?? `${idx + 1}`}
                </div>

                {/* Player */}
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

                {/* Stats */}
                {[r.matches_played, r.goals_scored, r.mvp_count].map((val, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-1)', textAlign: 'center' }}>
                    {val}
                  </div>
                ))}

                {/* Points */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 800, color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', textAlign: 'center' }}>
                  {r.points}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Points legend */}
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
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: 'var(--color-elevated)', borderRadius: 999 }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>{item.label}:</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
