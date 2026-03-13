import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchCard } from '@/components/ui'
import { IconSoccerBall } from '@/components/ui/Icons'
import type { Match, MatchRegistration, MatchStatus, RegistrationStatus } from '@/types'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get all groups the user belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const groupIds = (memberships ?? []).map(m => m.group_id)

  if (groupIds.length === 0) {
    return (
      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Partite
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSoccerBall size={28} color="var(--color-text-3)" />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', maxWidth: 240 }}>
            Entra in un gruppo per vedere le partite
          </p>
          <Link href="/groups" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
            I miei gruppi →
          </Link>
        </div>
      </div>
    )
  }

  // Fetch all matches from user's groups + their registrations
  const [matchesRes, myRegsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .in('group_id', groupIds)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('match_registrations')
      .select('*')
      .eq('user_id', user.id),
  ])

  const allMatches = (matchesRes.data ?? []).map(m => ({
    ...m,
    status: m.status as MatchStatus,
  }))

  // Get confirmed counts
  const matchIds = allMatches.map(m => m.id)
  const { data: confirmedRegs } = matchIds.length > 0
    ? await supabase
        .from('match_registrations')
        .select('match_id')
        .in('match_id', matchIds)
        .eq('status', 'confirmed')
    : { data: [] }

  const confirmedCounts: Record<string, number> = {}
  for (const r of (confirmedRegs ?? [])) {
    confirmedCounts[r.match_id] = (confirmedCounts[r.match_id] ?? 0) + 1
  }

  const myRegs = (myRegsRes.data ?? [])
  const myRegMap: Record<string, MatchRegistration> = {}
  for (const r of myRegs) {
    myRegMap[r.match_id] = { ...r, status: r.status as RegistrationStatus }
  }

  // Split: upcoming vs past
  const now = new Date()
  const upcoming = allMatches.filter(m => new Date(m.scheduled_at) >= now && m.status !== 'cancelled' && m.status !== 'played')
  const past = allMatches.filter(m => new Date(m.scheduled_at) < now || m.status === 'played')

  // Group info map
  const groupNameMap: Record<string, string> = {}
  for (const m of (memberships ?? [])) {
    groupNameMap[m.group_id] = (m.groups as unknown as { name: string })?.name ?? 'Gruppo'
  }

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
        Partite
      </h1>

      {/* Upcoming */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Prossime
        </h2>
        {upcoming.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>Nessuna partita in programma</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcoming.map(m => (
              <div key={m.id}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                  {groupNameMap[m.group_id] ?? 'Gruppo'}
                </div>
                <Link href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                  <MatchCard
                    match={m}
                    registration={myRegMap[m.id] ?? null}
                    confirmedCount={confirmedCounts[m.id] ?? 0}
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Passate
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {past.slice(0, 10).map(m => (
              <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                <MatchCard
                  match={m}
                  registration={myRegMap[m.id] ?? null}
                  confirmedCount={confirmedCounts[m.id] ?? 0}
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
