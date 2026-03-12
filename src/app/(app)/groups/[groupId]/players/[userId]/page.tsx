import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, RadarChart, PlayerFIFACard, BadgeShowcase } from '@/components/ui'
import type { FIFASkillBar } from '@/components/ui'
import { getPlayerOverall } from '@/lib/team-balancer'
import type { SkillSet } from '@/lib/team-balancer'

interface PageProps {
  params: Promise<{ groupId: string; userId: string }>
}

const roleLabels: Record<string, string> = {
  D: 'Difensore',
  C: 'Centrocampista',
  E: 'Esterno',
  W: 'Trequartista',
  A: 'Attaccante',
}

const categoryColors: Record<string, string> = {
  Fisica: '#FF6B6B',
  Tecnica: '#FFD93D',
  Tattica: '#6BCB77',
  Difesa: '#4D96FF',
  Attacco: 'var(--color-primary)',
  Mentalità: '#C77DFF',
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

export default async function GroupPlayerPage({ params }: PageProps) {
  const { groupId, userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify viewer is active member of group
  const { data: viewerMember } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!viewerMember) redirect('/groups')

  // Verify target player is active member of this group
  const { data: targetMember } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!targetMember) notFound()

  const isMe = user.id === userId

  // Parallel fetch all data
  const [profileRes, groupRes, statsRes, badgesRes, ratingsRes, commentsRes, allBadgesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, full_name, avatar_url, xp, level, bio, preferred_role, preferred_role_2')
      .eq('id', userId)
      .single(),
    supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single(),
    supabase
      .from('player_stats')
      .select('matches_played, matches_won, matches_drawn, matches_lost, goals_scored, assists, mvp_count, clean_sheets')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('player_badges')
      .select('earned_at, badges(key, name_it, icon, tier)')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false }),
    supabase
      .from('player_ratings')
      .select('velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
      .eq('group_id', groupId)
      .eq('ratee_id', userId),
    supabase
      .from('player_ratings')
      .select('comment, rater_id, created_at')
      .eq('group_id', groupId)
      .eq('ratee_id', userId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('badges').select('*').order('tier').order('condition_value'),
  ])

  if (profileRes.error) notFound()
  if (groupRes.error) notFound()

  const profile = profileRes.data
  const group = groupRes.data
  const stats = statsRes.data
  const badgeRows = badgesRes.data ?? []
  const ratingRows = (ratingsRes.data ?? []) as Record<string, number | null>[]

  // Comments
  const rawComments = (commentsRes.data ?? []) as { comment: string | null; rater_id: string; created_at: string }[]
  const raterIds = rawComments.map(c => c.rater_id)
  const { data: raterProfiles } = raterIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', raterIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null }[] }
  const raterMap = Object.fromEntries((raterProfiles ?? []).map(p => [p.id, p]))
  const comments = rawComments
    .filter(c => c.comment)
    .map(c => ({
      text: c.comment as string,
      raterId: c.rater_id,
      raterUsername: raterMap[c.rater_id]?.username ?? 'Anonimo',
      raterAvatar: raterMap[c.rater_id]?.avatar_url ?? null,
      createdAt: c.created_at,
    }))

  // Skill category averages
  const skillCategories = [
    { name: 'Fisica', fields: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'] },
    { name: 'Tecnica', fields: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'] },
    { name: 'Tattica', fields: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'] },
    { name: 'Difesa', fields: ['marcatura', 'tackle', 'intercettamento', 'copertura'] },
    { name: 'Attacco', fields: ['finalizzazione', 'assist_making'] },
    { name: 'Mentalità', fields: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'] },
  ]

  const skillAverages = skillCategories.map(cat => ({
    name: cat.name,
    avg: computeAvg(ratingRows, cat.fields),
  }))

  // ── Per-skill averages for OVR ─────────────────────────────────────────────
  const SKILL_FIELDS: (keyof SkillSet)[] = [
    'velocita', 'resistenza', 'forza', 'salto', 'agilita',
    'tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa',
    'lettura_gioco', 'posizionamento', 'pressing', 'costruzione',
    'marcatura', 'tackle', 'intercettamento', 'copertura',
    'finalizzazione', 'assist_making',
    'leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play',
  ]

  const avgSkills = Object.fromEntries(
    SKILL_FIELDS.map(k => [k, computeAvg(ratingRows, [k])])
  ) as unknown as SkillSet

  const ovr = ratingRows.length > 0
    ? getPlayerOverall({
        id: userId,
        role: (profile.preferred_role ?? 'C') as import('@/types').PlayerRole,
        role2: profile.preferred_role_2 as import('@/types').PlayerRole | undefined,
        skills: avgSkills,
        ratingCount: ratingRows.length,
      })
    : 0

  // ── FIFA skill bars (6 categories) ────────────────────────────────────────
  const fifaSkillBars: FIFASkillBar[] = [
    { abbr: 'FIS', label: 'Fisica',    value: skillAverages[0].avg, color: '#3B82F6' },
    { abbr: 'TEC', label: 'Tecnica',   value: skillAverages[1].avg, color: '#C8FF6B' },
    { abbr: 'TAT', label: 'Tattica',   value: skillAverages[2].avg, color: '#FFB800' },
    { abbr: 'DIF', label: 'Difesa',    value: skillAverages[3].avg, color: '#EF4444' },
    { abbr: 'ATT', label: 'Attacco',   value: skillAverages[4].avg, color: '#F97316' },
    { abbr: 'MEN', label: 'Mentalità', value: skillAverages[5].avg, color: '#A855F7' },
  ]

  // ── All badges for showcase ────────────────────────────────────────────────
  const allBadges = (allBadgesRes.data ?? []) as import('@/types').Badge[]

  // Stats values
  const matchesPlayed = stats?.matches_played ?? 0
  const matchesWon = stats?.matches_won ?? 0
  const goalsScored = stats?.goals_scored ?? 0
  const assistsCount = stats?.assists ?? 0
  const mvpCount = stats?.mvp_count ?? 0
  const winPct = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : null

  const hasStats = matchesPlayed > 0
  const hasRatings = ratingRows.length > 0
  const hasBadges = badgeRows.length > 0
  const isEmpty = !hasStats && !hasRatings && !hasBadges

  const isTargetUserAdmin = targetMember.role === 'admin'

  function relativeTime(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days === 0) return 'oggi'
    if (days === 1) return 'ieri'
    if (days < 7) return `${days}g fa`
    if (days < 30) return `${Math.floor(days / 7)}sett fa`
    return `${Math.floor(days / 30)}mesi fa`
  }

  const displayName = profile.full_name ?? profile.username

  // Adapt badgeRows for BadgeShowcase: it needs PlayerBadge & { badge: Badge }
  // The Supabase join returns `badges` (nested), so we map to `badge`
  const earnedBadgesForShowcase = badgeRows
    .filter(row => row.badges != null)
    .map((row, idx) => {
      const b = row.badges as unknown as import('@/types').Badge
      return {
        id: String(idx),
        user_id: userId,
        badge_id: b.id,
        group_id: groupId,
        earned_at: row.earned_at,
        equipped: false,
        badge: b,
      }
    })

  return (
    <div style={{ padding: '1.5rem 1rem 3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href={`/groups/${groupId}/rankings`}
            style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}
          >
            ←
          </Link>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-1)',
              lineHeight: 1,
            }}>
              Giocatore
            </h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
              {group.name}
            </div>
          </div>
        </div>
        {isMe && (
          <Link
            href="/profile"
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Il mio profilo →
          </Link>
        )}
      </div>

      {/* Player FIFA card */}
      <PlayerFIFACard
        player={{
          user_id: userId,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          level: profile.level,
          preferred_role: profile.preferred_role,
          preferred_role_2: profile.preferred_role_2,
        }}
        ovr={ovr}
        skillBars={fifaSkillBars}
        isMe={isMe}
        isAdmin={isTargetUserAdmin}
      />

      {/* Empty state */}
      {isEmpty && (
        <div style={{
          padding: '2.5rem 1rem',
          textAlign: 'center',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--color-border)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚽</div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', fontWeight: 600, marginBottom: '0.25rem' }}>
            Nessuna statistica ancora
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
            Nessuna statistica ancora per questo giocatore
          </p>
        </div>
      )}

      {/* Stats grid — always shown if matches_played > 0 */}
      {hasStats && (
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
            Statistiche
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.625rem',
          }}>
            {[
              { label: 'Partite', value: matchesPlayed },
              { label: 'Vittorie', value: matchesWon },
              { label: 'Win %', value: winPct !== null ? `${winPct}%` : '—' },
              { label: 'Gol', value: goalsScored },
              { label: 'Assist', value: assistsCount },
              { label: 'MVP', value: mvpCount },
            ].map(cell => (
              <div
                key={cell.label}
                style={{
                  padding: '0.875rem 0.75rem',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  lineHeight: 1,
                }}>
                  {cell.value}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-3)',
                }}>
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Radar chart */}
      {hasRatings && skillAverages.some(s => s.avg > 0) && (
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
            Profilo Skill
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
              data={Object.fromEntries(skillAverages.map(s => [s.name, s.avg]))}
              colors={categoryColors}
              size={220}
            />
          </div>
        </div>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            💬 Dicono di {isMe ? 'te' : 'lui'} ({comments.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {comments.slice(0, 3).map((c, i) => (
              <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTime(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  &ldquo;{c.text}&rdquo;
                </p>
              </div>
            ))}
            {comments.length > 3 && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, padding: '0.25rem 0' }}>
                  Vedi tutti ({comments.length - 3} altri)
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {comments.slice(3).map((c, i) => (
                    <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTime(c.createdAt)}</span>
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

      {/* Badge Showcase */}
      {(hasBadges || allBadges.length > 0) && (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.25rem',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-2)',
            marginBottom: '1rem',
          }}>🏅 Badge</h3>
          <BadgeShowcase earnedBadges={earnedBadgesForShowcase} allBadges={allBadges} />
        </div>
      )}

    </div>
  )
}
