import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, XPBar, BadgeShelf, RadarChart } from '@/components/ui'
import type { PlayerBadge, Badge } from '@/types'
import Link from 'next/link'

type GroupMembership = {
  group_id: string
  groups: { id: string; name: string } | null
}

const ROLE_LABELS: Record<string, { label: string; emoji: string }> = {
  D: { label: 'Difensore', emoji: '🛡️' },
  C: { label: 'Centrocampista', emoji: '🧠' },
  E: { label: 'Esterno', emoji: '⚡' },
  W: { label: 'Trequartista', emoji: '🪄' },
  A: { label: 'Attaccante', emoji: '🎯' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, statsRes, badgesRes, groupsRes, ratingsRes, commentsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('player_stats').select('*').eq('user_id', user.id),
    supabase.from('player_badges').select('*, badges(*)').eq('user_id', user.id).order('earned_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('group_id, groups(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true),
    supabase
      .from('player_ratings')
      .select('velocita,resistenza,forza,salto,agilita,tecnica_palla,dribbling,passaggio,tiro,colpo_di_testa,lettura_gioco,posizionamento,pressing,costruzione,marcatura,tackle,intercettamento,copertura,finalizzazione,assist_making,leadership,comunicazione,mentalita_competitiva,fair_play')
      .eq('ratee_id', user.id),
    supabase
      .from('player_ratings')
      .select('comment, rater_id, created_at')
      .eq('ratee_id', user.id)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/onboarding')

  const allStats = statsRes.data ?? []
  const totals = allStats.reduce(
    (acc, s) => ({
      played: acc.played + s.matches_played,
      won: acc.won + s.matches_won,
      drawn: acc.drawn + s.matches_drawn,
      lost: acc.lost + s.matches_lost,
      goals: acc.goals + s.goals_scored,
      assists: acc.assists + s.assists,
      mvp: acc.mvp + s.mvp_count,
    }),
    { played: 0, won: 0, drawn: 0, lost: 0, goals: 0, assists: 0, mvp: 0 },
  )

  const winRate = totals.played > 0 ? Math.round((totals.won / totals.played) * 100) : 0

  const ratingRows = (ratingsRes.data ?? []) as Record<string, number | null>[]
  const hasProfileRatings = ratingRows.length > 0

  const profileCategoryColors: Record<string, string> = {
    'Fisica': '#FF6B6B', 'Tecnica': '#FFD93D', 'Tattica': '#6BCB77',
    'Difesa': '#4D96FF', 'Attacco': 'var(--color-primary)', 'Mentalità': '#C77DFF',
  }

  const profileSkillCategories = [
    { name: 'Fisica', fields: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'] },
    { name: 'Tecnica', fields: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'] },
    { name: 'Tattica', fields: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'] },
    { name: 'Difesa', fields: ['marcatura', 'tackle', 'intercettamento', 'copertura'] },
    { name: 'Attacco', fields: ['finalizzazione', 'assist_making'] },
    { name: 'Mentalità', fields: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'] },
  ]

  function computeProfileAvg(rows: Record<string, number | null>[], fields: string[]): number {
    let sum = 0; let count = 0
    for (const row of rows) {
      for (const f of fields) {
        const v = row[f]; if (v != null) { sum += v; count++ }
      }
    }
    return count === 0 ? 0 : Math.round((sum / count) * 10) / 10
  }

  const profileSkillAverages = profileSkillCategories.map(cat => ({
    name: cat.name,
    avg: computeProfileAvg(ratingRows, cat.fields),
  }))

  // Comments
  function relativeTimeProfile(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days === 0) return 'oggi'
    if (days === 1) return 'ieri'
    if (days < 7) return `${days}g fa`
    if (days < 30) return `${Math.floor(days / 7)}sett fa`
    return `${Math.floor(days / 30)}mesi fa`
  }
  const rawProfileComments = (commentsRes.data ?? []) as { comment: string | null; rater_id: string; created_at: string }[]
  const profileRaterIds = rawProfileComments.map(c => c.rater_id)
  const { data: profileRaterProfiles } = profileRaterIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', profileRaterIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null }[] }
  const profileRaterMap = Object.fromEntries((profileRaterProfiles ?? []).map(p => [p.id, p]))
  const profileComments = rawProfileComments
    .filter(c => c.comment)
    .map(c => ({
      text: c.comment as string,
      raterId: c.rater_id,
      raterUsername: profileRaterMap[c.rater_id]?.username ?? 'Anonimo',
      raterAvatar: profileRaterMap[c.rater_id]?.avatar_url ?? null,
      createdAt: c.created_at,
    }))

  const role = profile.preferred_role ? ROLE_LABELS[profile.preferred_role] : null
  const role2 = profile.preferred_role_2 ? ROLE_LABELS[profile.preferred_role_2] : null

  const badges = (badgesRes.data ?? []).map((pb) => ({
    ...pb,
    badge: pb.badges as unknown as Badge,
  })) as (PlayerBadge & { badge: Badge })[]

  const groups = ((groupsRes.data ?? []) as unknown as GroupMembership[])
    .map((row) => ({ id: row.group_id, name: row.groups?.name ?? 'Gruppo' }))

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Profilo
        </h1>
        <Link href="/profile/edit" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Modifica
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Avatar src={profile.avatar_url} name={profile.full_name ?? profile.username} size="xl" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
            {profile.full_name ?? profile.username}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>@{profile.username}</div>
          {(role || role2) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
              {role && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>{role.emoji}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{role.label}</span>
                </div>
              )}
              {role2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>{role2.emoji}</span>
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{role2.label} (2°)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <XPBar xp={profile.xp} compact={false} />
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Statistiche
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem' }}>
          {[
            { label: 'Partite', value: totals.played, emoji: '⚽' },
            { label: 'Vinte', value: totals.won, emoji: '🏆' },
            { label: 'Gol', value: totals.goals, emoji: '🎯' },
            { label: 'MVP', value: totals.mvp, emoji: '⭐' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.875rem 0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', gap: '0.25rem' }}>
              <span style={{ fontSize: '1.125rem' }}>{stat.emoji}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', fontWeight: 700 }}>{stat.label}</span>
            </div>
          ))}
        </div>
        {totals.played > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginTop: '0.625rem' }}>
            <div style={{ padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>{winRate}%</div>
              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>Win Rate</div>
            </div>
            <div style={{ padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{totals.assists}</div>
              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>Assist</div>
            </div>
            <div style={{ padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{totals.drawn}</div>
              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>Pareggi</div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Autovalutazione
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {groups.length === 0 ? (
            <div style={{ padding: '0.875rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>
              Unisciti a un gruppo per impostare l&apos;autovalutazione.
            </div>
          ) : (
            groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}/ratings?self=1`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  textDecoration: 'none',
                  color: 'var(--color-text-1)',
                }}
              >
                <span style={{ fontSize: '0.875rem' }}>{g.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Modifica
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {hasProfileRatings && (
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-3)',
            marginBottom: '0.875rem',
          }}>
            Profilo Skill (media compagni)
          </h2>
          <div style={{
            padding: '1.25rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <RadarChart
              data={Object.fromEntries(profileSkillAverages.map(s => [s.name, s.avg]))}
              colors={profileCategoryColors}
              size={220}
            />
          </div>
        </div>
      )}

      {profileComments.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            💬 Dicono di me ({profileComments.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profileComments.slice(0, 3).map((c, i) => (
              <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTimeProfile(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  &ldquo;{c.text}&rdquo;
                </p>
              </div>
            ))}
            {profileComments.length > 3 && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, padding: '0.25rem 0' }}>
                  Vedi tutti ({profileComments.length - 3} altri)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {profileComments.slice(3).map((c, i) => (
                    <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTimeProfile(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                        &ldquo;{c.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)' }}>
            Badge ({badges.length})
          </h2>
        </div>
        <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <BadgeShelf badges={badges} maxVisible={9} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link href="/profile/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textDecoration: 'none' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-1)' }}>Impostazioni</span>
          <span style={{ color: 'var(--color-text-3)' }}>›</span>
        </Link>
      </div>
    </div>
  )
}
