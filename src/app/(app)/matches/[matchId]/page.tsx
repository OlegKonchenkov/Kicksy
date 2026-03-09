'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registerForMatch, unregisterFromMatch, lockMatch, openMatch } from '@/lib/actions/matches'
import { Avatar, Button, MatchCard, TeamSplit } from '@/components/ui'
import Link from 'next/link'
import type { Match, MatchRegistration, MatchResult, RegistrationStatus } from '@/types'

interface RegistrationWithProfile extends MatchRegistration {
  profile: { username: string; full_name: string | null; avatar_url: string | null }
}

interface MatchData {
  match: Match
  registrations: RegistrationWithProfile[]
  result: MatchResult | null
  myRegistration: MatchRegistration | null
  isAdmin: boolean
  userId: string
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<MatchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [matchRes, regsRes, resultRes, memberRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase
          .from('match_registrations')
          .select('*, profiles(username, full_name, avatar_url)')
          .eq('match_id', matchId)
          .eq('status', 'confirmed'),
        supabase.from('match_results').select('*').eq('match_id', matchId).maybeSingle(),
        supabase
          .from('match_registrations')
          .select('*')
          .eq('match_id', matchId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (matchRes.error) { setError('Partita non trovata'); setLoading(false); return }

      // Check admin
      const { data: adminMember } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', matchRes.data.group_id)
        .eq('user_id', user.id)
        .single()

      setData({
        match: { ...matchRes.data, status: matchRes.data.status as Match['status'] },
        registrations: (regsRes.data ?? []).map(r => ({
          ...r,
          status: r.status as RegistrationStatus,
          profile: r.profiles as unknown as RegistrationWithProfile['profile'],
        })),
        result: resultRes.data ?? null,
        myRegistration: memberRes.data ? { ...memberRes.data, status: memberRes.data.status as RegistrationStatus } : null,
        isAdmin: adminMember?.role === 'admin',
        userId: user.id,
      })
      setLoading(false)
    }
    load()
  }, [matchId, router])

  async function handleRegister() {
    setActionError(null)
    startTransition(async () => {
      const result = await registerForMatch(matchId)
      if (result.error) { setActionError(result.error); return }
      // Reload
      router.refresh()
      window.location.reload()
    })
  }

  async function handleUnregister() {
    setActionError(null)
    startTransition(async () => {
      const result = await unregisterFromMatch(matchId)
      if (result.error) { setActionError(result.error); return }
      window.location.reload()
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error ?? 'Errore caricamento'}</p>
        <button onClick={() => router.back()} style={{ marginTop: '1rem', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Indietro
        </button>
      </div>
    )
  }

  const { match, registrations, result, myRegistration, isAdmin } = data
  const isOpen = match.status === 'open'
  const isLocked = match.status === 'locked'
  const isPlayed = match.status === 'played'
  const confirmedCount = registrations.length
  const spotsLeft = match.max_players - confirmedCount

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Indietro
      </button>

      {/* Match card overview */}
      <MatchCard
        match={match}
        registration={myRegistration}
        confirmedCount={confirmedCount}
      />

      {/* Result (if played) */}
      {isPlayed && result && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.5rem' }}>
            Risultato Finale
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-1)' }}>{result.team1_score}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-3)' }}>—</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-1)' }}>{result.team2_score}</span>
          </div>
          {result.mvp_user_id && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
              🌟 MVP: {registrations.find(r => r.user_id === result.mvp_user_id)?.profile.username ?? 'N/A'}
            </div>
          )}
        </div>
      )}

      {/* Registration CTA */}
      {!isPlayed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {actionError && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{actionError}</p>}

          {isOpen && !myRegistration && (
            <Button onClick={handleRegister} loading={isPending} fullWidth size="lg">
              {spotsLeft > 0 ? `Iscriviti (${spotsLeft} posti rimasti)` : 'Entra in lista attesa'}
            </Button>
          )}

          {isOpen && myRegistration && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ padding: '0.875rem', background: 'rgba(200,255,107,0.08)', border: '1px solid rgba(200,255,107,0.3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {myRegistration.status === 'confirmed' ? '✓ Sei iscritto!' : '⏳ Sei in lista attesa'}
                </span>
              </div>
              <Button variant="ghost" onClick={handleUnregister} loading={isPending} fullWidth>
                Cancella iscrizione
              </Button>
            </div>
          )}

          {isLocked && (
            <div style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>🔒 Iscrizioni chiuse</span>
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/matches/${matchId}/edit`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.875rem', background: 'var(--color-elevated)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                Modifica
              </Link>
              {isOpen && (
                <Button variant="secondary" size="sm" onClick={() => startTransition(async () => { await lockMatch(matchId); window.location.reload() })} loading={isPending}>
                  Chiudi iscrizioni
                </Button>
              )}
              {match.status === 'draft' && (
                <Button variant="secondary" size="sm" onClick={() => startTransition(async () => { await openMatch(matchId); window.location.reload() })} loading={isPending}>
                  Apri iscrizioni
                </Button>
              )}
              {isLocked && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => startTransition(async () => { await openMatch(matchId); window.location.reload() })} loading={isPending}>
                    Riapri
                  </Button>
                  <Link href={`/matches/${matchId}/teams`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                    Genera Squadre
                  </Link>
                  <Link href={`/matches/${matchId}/result`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.875rem', background: 'var(--color-elevated)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                    Inserisci Risultato
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Players list */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)', marginBottom: '0.875rem' }}>
          Iscritti ({confirmedCount}/{match.max_players})
        </h2>

        {registrations.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
            <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Nessun iscritto ancora</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {registrations.map((reg, i) => (
              <div key={reg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-3)', minWidth: 18, textAlign: 'center' }}>{i + 1}</span>
                <Avatar src={reg.profile.avatar_url} name={reg.profile.full_name ?? reg.profile.username} size="xs" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reg.profile.full_name ?? reg.profile.username}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>@{reg.profile.username}</div>
                </div>
                {reg.user_id === data.userId && (
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>Tu</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



