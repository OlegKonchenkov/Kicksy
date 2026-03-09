import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MatchCard } from '@/components/ui'
import type { MatchStatus, RegistrationStatus } from '@/types'

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function GroupMatchesPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify membership + group info
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
  const isAdmin = memberRes.data.role === 'admin'

  // Fetch all matches for this group
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('group_id', groupId)
    .order('scheduled_at', { ascending: false })

  const allMatches = matches ?? []
  const now = new Date().toISOString()

  const upcoming = allMatches.filter(m =>
    (m.status === 'open' || m.status === 'draft' || m.status === 'locked') &&
    m.scheduled_at >= now
  )
  const past = allMatches.filter(m =>
    m.status === 'played' || m.status === 'cancelled' || m.scheduled_at < now
  )

  // My registrations
  const allIds = allMatches.map(m => m.id)
  const { data: myRegs } = allIds.length > 0
    ? await supabase
        .from('match_registrations')
        .select('*')
        .in('match_id', allIds)
        .eq('user_id', user.id)
    : { data: [] }

  // Confirmed counts
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

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href={`/groups/${groupId}`} style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>
            ←
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', lineHeight: 1 }}>
              Partite
            </h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>{group.name}</div>
          </div>
        </div>
        {isAdmin && (
          <Link
            href={`/groups/${groupId}/matches/new`}
            style={{ padding: '0.5rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
          >
            + Nuova
          </Link>
        )}
      </div>

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Totali', value: allMatches.length, color: 'var(--color-text-2)' },
          { label: 'In arrivo', value: upcoming.length, color: 'var(--color-primary)' },
          { label: 'Passate', value: past.filter(m => m.status === 'played').length, color: 'var(--color-text-3)' },
        ].map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 999 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color: p.color }}>{p.value}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            In Arrivo
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {upcoming.map(m => {
              const myReg = myRegs?.find(r => r.match_id === m.id) ?? null
              return (
                <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                  <MatchCard
                    match={{ ...m, status: m.status as MatchStatus }}
                    registration={myReg ? { ...myReg, status: myReg.status as RegistrationStatus } : null}
                    confirmedCount={confirmedCounts[m.id] ?? 0}
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Storiche
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {past.map(m => {
              const myReg = myRegs?.find(r => r.match_id === m.id) ?? null
              return (
                <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                  <MatchCard
                    match={{ ...m, status: m.status as MatchStatus }}
                    registration={myReg ? { ...myReg, status: myReg.status as RegistrationStatus } : null}
                    confirmedCount={confirmedCounts[m.id] ?? 0}
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allMatches.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem', textAlign: 'center', gap: '0.875rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
          <span style={{ fontSize: '2.5rem' }}>📅</span>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-1)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Nessuna partita ancora
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
            {isAdmin ? 'Crea la prima partita per questo gruppo!' : 'L\'admin deve creare la prima partita'}
          </p>
          {isAdmin && (
            <Link
              href={`/groups/${groupId}/matches/new`}
              style={{ padding: '0.625rem 1.25rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
            >
              Crea partita →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
