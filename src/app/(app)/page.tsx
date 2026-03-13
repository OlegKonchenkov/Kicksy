import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchCard, XPBar } from '@/components/ui'
import { IconGroup, IconMatch, IconSoccerBall, IconChevronRight } from '@/components/ui/Icons'
import type { MatchStatus, RegistrationStatus } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, xp, level')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Check if user has groups
  const { count: groupCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (!groupCount || groupCount === 0) redirect('/onboarding')

  // Get user's group IDs + names
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const groupIds = (memberRows ?? []).map(r => r.group_id)
  const groupNames: Record<string, string> = {}
  for (const r of memberRows ?? []) {
    const g = r.groups as unknown as { id: string; name: string } | null
    if (g) groupNames[g.id] = g.name
  }

  // Upcoming matches
  const now = new Date().toISOString()
  const { data: upcomingMatches } = groupIds.length > 0
    ? await supabase
        .from('matches')
        .select('*')
        .in('group_id', groupIds)
        .in('status', ['open', 'draft', 'locked'])
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
        .limit(5)
    : { data: [] }

  // Recent past matches
  const { data: recentMatches } = groupIds.length > 0
    ? await supabase
        .from('matches')
        .select('*')
        .in('group_id', groupIds)
        .eq('status', 'played')
        .lt('scheduled_at', now)
        .order('scheduled_at', { ascending: false })
        .limit(3)
    : { data: [] }

  const allDisplayed = [...(upcomingMatches ?? []), ...(recentMatches ?? [])]
  const allIds = allDisplayed.map(m => m.id)

  // My registrations + confirmed counts
  const { data: myRegs } = allIds.length > 0
    ? await supabase
        .from('match_registrations')
        .select('*')
        .in('match_id', allIds)
        .eq('user_id', user.id)
    : { data: [] }

  const { data: confirmedRows } = allIds.length > 0
    ? await supabase
        .from('match_registrations')
        .select('match_id')
        .in('match_id', allIds)
        .eq('status', 'confirmed')
    : { data: [] }

  const confirmedCounts: Record<string, number> = {}
  for (const r of confirmedRows ?? []) {
    confirmedCounts[r.match_id] = (confirmedCounts[r.match_id] ?? 0) + 1
  }

  const displayName = profile.full_name?.split(' ')[0] ?? profile.username ?? 'Campione'

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Greeting */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', lineHeight: 1.1 }}>
          Ciao, {displayName}
        </h1>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          Pronto per il prossimo match?
          <IconSoccerBall size={14} color="var(--color-text-3)" />
        </p>
      </div>

      {/* XP bar */}
      <div style={{ padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <XPBar xp={profile.xp} compact={false} />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <Link href="/groups" className="card-interactive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '1.125rem 0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textDecoration: 'none', minHeight: 84 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconGroup size={22} color="var(--color-info)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>Gruppi</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{groupCount} attivi</span>
        </Link>
        <Link href="/matches" className="card-interactive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '1.125rem 0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textDecoration: 'none', minHeight: 84 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconMatch size={22} color="var(--color-primary)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>Partite</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            {(upcomingMatches ?? []).length > 0 ? `${(upcomingMatches ?? []).length} in arrivo` : 'Nessuna'}
          </span>
        </Link>
      </div>

      {/* Upcoming matches */}
      {(upcomingMatches ?? []).length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)' }}>
              In Arrivo
            </h2>
            <Link href="/matches" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Vedi tutte
              <IconChevronRight size={14} color="var(--color-primary)" />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(upcomingMatches ?? []).map(m => {
              const myReg = myRegs?.find(r => r.match_id === m.id) ?? null
              return (
                <div key={m.id}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem', fontWeight: 700 }}>
                    {groupNames[m.group_id] ?? ''}
                  </div>
                  <Link href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                    <MatchCard
                      match={{ ...m, status: m.status as MatchStatus }}
                      registration={myReg ? { ...myReg, status: myReg.status as RegistrationStatus } : null}
                      confirmedCount={confirmedCounts[m.id] ?? 0}
                    />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No upcoming matches empty state */}
      {(upcomingMatches ?? []).length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', textAlign: 'center', gap: '0.875rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSoccerBall size={28} color="var(--color-text-3)" />
          </div>
          <div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Nessuna partita in arrivo
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
              Crea una partita o aspetta che l&apos;admin ne programmi una
            </p>
          </div>
          <Link href="/groups" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
            Vai ai gruppi
          </Link>
        </div>
      )}

      {/* Recent results */}
      {(recentMatches ?? []).length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Risultati Recenti
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(recentMatches ?? []).map(m => {
              const myReg = myRegs?.find(r => r.match_id === m.id) ?? null
              return (
                <div key={m.id}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem', fontWeight: 700 }}>
                    {groupNames[m.group_id] ?? ''}
                  </div>
                  <Link href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                    <MatchCard
                      match={{ ...m, status: m.status as MatchStatus }}
                      registration={myReg ? { ...myReg, status: myReg.status as RegistrationStatus } : null}
                      confirmedCount={confirmedCounts[m.id] ?? 0}
                    />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
