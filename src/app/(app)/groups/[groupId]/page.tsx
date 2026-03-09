import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'
import { MatchCard } from '@/components/ui'
import { CalendarDays, Trophy, Star } from 'lucide-react'

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch group + membership check
  const [groupRes, memberRes, matchesRes] = await Promise.all([
    supabase.from('groups').select('*').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .order('scheduled_at', { ascending: false })
      .limit(5),
  ])

  if (groupRes.error) notFound()
  if (!memberRes.data) redirect('/groups') // not a member

  const group = groupRes.data
  const isAdmin = memberRes.data.role === 'admin'
  const matches = matchesRes.data ?? []

  // Get member count
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('is_active', true)

  const [membersForRatingsRes, myGroupRatingsRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .neq('user_id', user.id),
    supabase
      .from('player_ratings')
      .select('ratee_id')
      .eq('group_id', groupId)
      .eq('rater_id', user.id)
      .is('match_id', null),
  ])

  const membersToRate = new Set((membersForRatingsRes.data ?? []).map((m) => m.user_id))
  const alreadyRated = new Set((myGroupRatingsRes.data ?? []).map((r) => r.ratee_id))
  let pendingRatingsCount = 0
  for (const memberId of membersToRate) {
    if (!alreadyRated.has(memberId)) pendingRatingsCount += 1
  }

  // Get my registrations for upcoming matches
  const upcomingIds = matches
    .filter(m => m.status === 'open' || m.status === 'draft')
    .map(m => m.id)

  const { data: myRegs } = upcomingIds.length > 0
    ? await supabase
        .from('match_registrations')
        .select('*')
        .in('match_id', upcomingIds)
        .eq('user_id', user.id)
    : { data: [] }

  // Get confirmed counts for each match
  const { data: allRegs } = matches.length > 0
    ? await supabase
        .from('match_registrations')
        .select('match_id')
        .in('match_id', matches.map(m => m.id))
        .eq('status', 'confirmed')
    : { data: [] }

  const confirmedCounts: Record<string, number> = {}
  for (const r of (allRegs ?? [])) {
    confirmedCounts[r.match_id] = (confirmedCounts[r.match_id] ?? 0) + 1
  }

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back */}
      <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-3)', fontSize: '0.875rem', textDecoration: 'none', width: 'fit-content' }}>
        ← I miei gruppi
      </Link>

      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Avatar src={group.avatar_url} name={group.name} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', lineHeight: 1.1 }}>
            {group.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
              👥 {memberCount ?? 0} membri
            </span>
            {isAdmin && (
              <Link href={`/groups/${groupId}/settings`} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Impostazioni
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Invite code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Codice:
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.12em' }}>
          {group.invite_code}
        </span>
        <span style={{ fontSize: '0.75rem', color: group.invite_link_enabled ? '#22c55e' : 'var(--color-danger)' }}>
          {group.invite_link_enabled ? '● Attivo' : '● Disattivo'}
        </span>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <Link href={`/groups/${groupId}/matches`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textDecoration: 'none', minHeight: 80 }}>
          <CalendarDays size={22} color="var(--color-text-2)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>Partite</span>
        </Link>
        <Link href={`/groups/${groupId}/rankings`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textDecoration: 'none', minHeight: 80 }}>
          <Trophy size={22} color="var(--color-text-2)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>Classifica</span>
        </Link>
        <Link href={`/groups/${groupId}/ratings`} style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', textDecoration: 'none', minHeight: 64 }}>
          <Star size={18} color="var(--color-text-2)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>Valuta membri</span>
          {pendingRatingsCount > 0 && (
            <span
              style={{
                marginLeft: '0.25rem',
                padding: '0.18rem 0.5rem',
                borderRadius: 999,
                background: 'rgba(200,255,107,0.16)',
                border: '1px solid rgba(200,255,107,0.45)',
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {pendingRatingsCount}
            </span>
          )}
        </Link>
      </div>

      {/* Recent matches */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>
            Partite Recenti
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isAdmin && (
              <Link href={`/groups/${groupId}/matches/new`} style={{ padding: '0.375rem 0.75rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                + Nuova
              </Link>
            )}
            <Link href={`/groups/${groupId}/matches`} style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Vedi tutte →
            </Link>
          </div>
        </div>

        {matches.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center', gap: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
            <span style={{ fontSize: '2rem' }}>📅</span>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>Nessuna partita ancora</p>
            {isAdmin && (
              <Link href={`/groups/${groupId}/matches/new`} style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 700 }}>
                Crea la prima partita →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {matches.map(m => {
              const myReg = myRegs?.find(r => r.match_id === m.id) ?? null
              return (
                <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: 'none' }}>
                  <MatchCard
                    match={{ ...m, status: m.status as import('@/types').MatchStatus }}
                    registration={myReg ? { ...myReg, status: myReg.status as import('@/types').RegistrationStatus } : null}
                    confirmedCount={confirmedCounts[m.id] ?? 0}
                  />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

