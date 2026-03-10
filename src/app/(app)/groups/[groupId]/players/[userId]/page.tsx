import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, RadarChart } from '@/components/ui'

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
  const [profileRes, groupRes, statsRes, badgesRes, ratingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, full_name, avatar_url, xp, level, bio, preferred_role')
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
  ])

  if (profileRes.error) notFound()
  if (groupRes.error) notFound()

  const profile = profileRes.data
  const group = groupRes.data
  const stats = statsRes.data
  const badgeRows = badgesRes.data ?? []
  const ratingRows = (ratingsRes.data ?? []) as Record<string, number | null>[]

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

  // Badge tier colors
  const tierColor = (tier: string | null | undefined) => {
    if (tier === 'gold') return '#FFD700'
    if (tier === 'silver') return '#C0C0C0'
    if (tier === 'bronze') return '#CD7F32'
    return 'var(--color-border)'
  }

  const displayName = profile.full_name ?? profile.username

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

      {/* Player hero card */}
      <div style={{
        padding: '1.25rem',
        background: isMe ? 'rgba(200,255,107,0.05)' : 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isMe ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{ filter: isMe ? 'drop-shadow(0 0 12px rgba(200,255,107,0.4))' : undefined, flexShrink: 0 }}>
          <Avatar src={profile.avatar_url} name={displayName} size="lg" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName}
          </div>

          {/* Level + role + admin badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
            {/* Level badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.15rem 0.5rem',
              background: 'rgba(200,255,107,0.12)',
              border: '1px solid rgba(200,255,107,0.3)',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}>
              Lv.{profile.level}
            </span>

            {/* Role badge */}
            {profile.preferred_role && roleLabels[profile.preferred_role] && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.5rem',
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-2)',
              }}>
                {roleLabels[profile.preferred_role]}
              </span>
            )}

            {/* Admin badge */}
            {targetMember.role === 'admin' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.15rem 0.5rem',
                background: 'rgba(255,215,0,0.12)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFD700',
              }}>
                Admin
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-3)',
              marginTop: '0.5rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {profile.bio}
            </div>
          )}
        </div>
      </div>

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

      {/* Skill ratings */}
      {hasRatings && (
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
            Rating Medio Compagni ({ratingRows.length} valutazion{ratingRows.length === 1 ? 'e' : 'i'})
          </h2>

          <div style={{
            padding: '1rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
          }}>
            {skillAverages.map(({ name, avg }) => {
              const color = categoryColors[name] ?? 'var(--color-primary)'
              const pct = Math.min((avg / 10) * 100, 100)
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Category label */}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color,
                    width: '4.5rem',
                    flexShrink: 0,
                  }}>
                    {name}
                  </div>

                  {/* Progress bar track */}
                  <div style={{
                    flex: 1,
                    height: 8,
                    background: 'var(--color-elevated)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 999,
                    }} />
                  </div>

                  {/* Numeric value */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color,
                    width: '2.25rem',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}>
                    {avg.toFixed(1)}
                  </div>
                </div>
              )
            })}
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

      {/* Badges */}
      {hasBadges && (
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
            Badge del Gruppo
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {badgeRows.map((row, idx) => {
              const badge = row.badges as unknown as { key: string; name_it: string; icon: string; tier: string | null } | null
              if (!badge) return null
              const borderCol = tierColor(badge.tier)
              return (
                <div
                  key={`${badge.key}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    background: 'var(--color-surface)',
                    border: `1px solid ${borderCol}`,
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    color: 'var(--color-text-1)',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{badge.icon}</span>
                  <span>{badge.name_it}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
