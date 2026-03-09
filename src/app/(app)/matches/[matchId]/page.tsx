'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  finalizePostMatchWindow,
  lockMatch,
  openMatch,
  registerForMatch,
  submitMatchComment,
  submitMvpVote,
  unregisterFromMatch,
} from '@/lib/actions/matches'
import { Avatar, Button, MatchCard } from '@/components/ui'
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
  team1Name: string
  team2Name: string
}

interface MvpPollData {
  id: string
  closes_at: string | null
  options: string[]
}

type MatchCommentRow = {
  id: string
  user_id: string
  comment: string
  author: string
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

  const [mvpPoll, setMvpPoll] = useState<MvpPollData | null>(null)
  const [mvpVotes, setMvpVotes] = useState<Record<string, number>>({})
  const [myMvpVoteUserId, setMyMvpVoteUserId] = useState<string | null>(null)
  const [selectedMvpUserId, setSelectedMvpUserId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [allComments, setAllComments] = useState<MatchCommentRow[]>([])
  const [recapText, setRecapText] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [matchRes, regsRes, resultRes, myRegRes] = await Promise.all([
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

      const [{ data: adminMember }, { data: groupRes }, { data: pollRes }, { data: commentsRes }, { data: recapRes }, { data: myCommentRes }] = await Promise.all([
        supabase
          .from('group_members')
          .select('role')
          .eq('group_id', matchRes.data.group_id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('groups')
          .select('team1_name, team2_name')
          .eq('id', matchRes.data.group_id)
          .single(),
        supabase
          .from('polls')
          .select('id, closes_at, options')
          .eq('match_id', matchId)
          .eq('kind', 'mvp')
          .maybeSingle(),
        supabase
          .from('match_comments')
          .select('id, user_id, comment, profiles(username, full_name)')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false }),
        supabase
          .from('match_recaps')
          .select('summary_text')
          .eq('match_id', matchId)
          .maybeSingle(),
        supabase
          .from('match_comments')
          .select('comment')
          .eq('match_id', matchId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      if (pollRes?.id) {
        const [{ data: votesRes }, { data: myVoteRes }] = await Promise.all([
          supabase.from('poll_votes').select('option_index').eq('poll_id', pollRes.id),
          supabase.from('poll_votes').select('option_index').eq('poll_id', pollRes.id).eq('user_id', user.id).maybeSingle(),
        ])
        const counts: Record<string, number> = {}
        for (const vote of votesRes ?? []) {
          const uid = pollRes.options[vote.option_index]
          if (!uid) continue
          counts[uid] = (counts[uid] ?? 0) + 1
        }
        setMvpVotes(counts)
        setMyMvpVoteUserId(myVoteRes ? (pollRes.options[myVoteRes.option_index] ?? null) : null)
        setMvpPoll(pollRes)
      } else {
        setMvpPoll(null)
      }

      setCommentText(myCommentRes?.comment ?? '')
      setAllComments(
        (commentsRes ?? []).map((c) => {
          const p = c.profiles as unknown as { username: string; full_name: string | null } | null
          return {
            id: c.id,
            user_id: c.user_id,
            comment: c.comment,
            author: p?.full_name ?? p?.username ?? 'Utente',
          }
        }),
      )
      setRecapText(recapRes?.summary_text ?? null)

      setData({
        match: { ...matchRes.data, status: matchRes.data.status as Match['status'] },
        registrations: (regsRes.data ?? []).map((r) => ({
          ...r,
          status: r.status as RegistrationStatus,
          profile: r.profiles as unknown as RegistrationWithProfile['profile'],
        })),
        result: resultRes.data ?? null,
        myRegistration: myRegRes.data ? { ...myRegRes.data, status: myRegRes.data.status as RegistrationStatus } : null,
        isAdmin: adminMember?.role === 'admin',
        userId: user.id,
        team1Name: groupRes?.team1_name ?? 'Squadra A',
        team2Name: groupRes?.team2_name ?? 'Squadra B',
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

  async function handleVoteMvp() {
    if (!selectedMvpUserId) return
    setActionError(null)
    startTransition(async () => {
      const result = await submitMvpVote(matchId, selectedMvpUserId)
      if (result.error) { setActionError(result.error); return }
      window.location.reload()
    })
  }

  async function handleSaveComment() {
    setActionError(null)
    startTransition(async () => {
      const result = await submitMatchComment(matchId, commentText)
      if (result.error) { setActionError(result.error); return }
      window.location.reload()
    })
  }

  async function handleFinalizeWindow() {
    if (isFinalizing) return
    setIsFinalizing(true)
    await finalizePostMatchWindow(matchId)
    setIsFinalizing(false)
    window.location.reload()
  }

  useEffect(() => {
    if (!data?.result || !mvpPoll || isFinalizing) return
    if (data.result.mvp_user_id && recapText) return
    if (!mvpPoll.closes_at) return
    if (Date.now() >= new Date(mvpPoll.closes_at).getTime()) {
      handleFinalizeWindow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.result?.mvp_user_id, mvpPoll?.closes_at, recapText])

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

  const { match, registrations, result, myRegistration, isAdmin, userId, team1Name, team2Name } = data
  const isOpen = match.status === 'open'
  const isLocked = match.status === 'locked'
  const isPlayed = match.status === 'played'
  const confirmedCount = registrations.length
  const spotsLeft = match.max_players - confirmedCount
  const pollClosesAt = mvpPoll?.closes_at ? new Date(mvpPoll.closes_at) : null
  const isMvpVoteOpen = !!(pollClosesAt && pollClosesAt.getTime() > Date.now())
  const canVoteMvp = isPlayed && myRegistration?.status === 'confirmed' && isMvpVoteOpen

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Indietro
      </button>

      <MatchCard match={match} registration={myRegistration} confirmedCount={confirmedCount} />

      {isPlayed && result && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.5rem' }}>
            Risultato Finale
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>{team1Name}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-1)' }}>{result.team1_score}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-3)' }}>-</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>{team2Name}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-1)' }}>{result.team2_score}</span>
            </div>
          </div>

          {result.mvp_user_id ? (
            <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
              MVP: {registrations.find((r) => r.user_id === result.mvp_user_id)?.profile.full_name ?? registrations.find((r) => r.user_id === result.mvp_user_id)?.profile.username ?? 'N/A'}
            </div>
          ) : (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-3)' }}>
              MVP in votazione {pollClosesAt ? `fino a ${pollClosesAt.toLocaleString('it-IT')}` : ''}
            </div>
          )}

          {canVoteMvp && !myMvpVoteUserId && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <select
                value={selectedMvpUserId}
                onChange={(e) => setSelectedMvpUserId(e.target.value)}
                style={{ width: '100%', maxWidth: 360, margin: '0 auto', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', fontSize: '0.86rem' }}
              >
                <option value="">Seleziona MVP</option>
                {registrations.map((r) => (
                  <option key={r.user_id} value={r.user_id}>{r.profile.full_name ?? r.profile.username}</option>
                ))}
              </select>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="button" size="sm" onClick={handleVoteMvp} loading={isPending} disabled={!selectedMvpUserId}>
                  Vota MVP (+10 XP)
                </Button>
              </div>
            </div>
          )}

          {myMvpVoteUserId && !result.mvp_user_id && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--color-primary)' }}>
              Hai gia votato MVP
            </div>
          )}

          {Object.keys(mvpVotes).length > 0 && !result.mvp_user_id && (
            <div style={{ marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--color-text-3)' }}>
              Voti raccolti: {Object.values(mvpVotes).reduce((a, b) => a + b, 0)}
            </div>
          )}

          {myRegistration?.status === 'confirmed' && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/matches/${matchId}/result`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.875rem', background: 'var(--color-elevated)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                Le mie stats
              </Link>
              <Link href={`/matches/${matchId}/rate`} style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
                Valuta compagni
              </Link>
            </div>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-text-2)', marginBottom: '0.4rem' }}>
              Commenti post-partita
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Racconta la partita (min 20 caratteri)..."
              rows={3}
              style={{ width: '100%', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', borderRadius: 'var(--radius-md)', padding: '0.7rem', fontSize: '0.86rem', resize: 'vertical' }}
            />
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-3)' }}>{commentText.trim().length}/20+ • +8 XP al primo commento</span>
              <Button type="button" size="sm" onClick={handleSaveComment} loading={isPending} disabled={commentText.trim().length < 20}>
                Salva commento
              </Button>
            </div>
            {allComments.length > 0 && (
              <div style={{ marginTop: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: 220, overflowY: 'auto' }}>
                {allComments.map((c) => (
                  <div key={c.id} style={{ padding: '0.55rem 0.65rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-elevated)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginBottom: '0.2rem' }}>{c.author}</div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--color-text-1)' }}>{c.comment}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(recapText || (!isMvpVoteOpen && mvpPoll)) && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-text-2)', marginBottom: '0.4rem' }}>
                Resoconto della serata
              </div>
              {recapText ? (
                <p style={{ fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--color-text-1)' }}>{recapText}</p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)' }}>In elaborazione...</p>
              )}
            </div>
          )}
        </div>
      )}

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
                  {myRegistration.status === 'confirmed' ? 'Sei iscritto' : 'Sei in lista attesa'}
                </span>
              </div>
              <Button variant="ghost" onClick={handleUnregister} loading={isPending} fullWidth>
                Cancella iscrizione
              </Button>
            </div>
          )}

          {isLocked && (
            <div style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>Iscrizioni chiuse</span>
            </div>
          )}

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

          {!isAdmin && isLocked && myRegistration?.status === 'confirmed' && (
            <Link href={`/matches/${matchId}/result`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 0.95rem', background: 'var(--color-elevated)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
              Inserisci le tue stats
            </Link>
          )}
        </div>
      )}

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
                {reg.user_id === userId && (
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

