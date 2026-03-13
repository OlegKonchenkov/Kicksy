'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar, PlayerRatingForm } from '@/components/ui'
import type { RatingPlayer } from '@/components/ui'
import { submitRatings } from '@/lib/actions/matches'
import type { SkillKey } from '@/lib/rating-utils'
import { IconStar, IconThumbsUp, IconSoccerBall, IconCheck } from '@/components/ui/Icons'
import { useToast } from '@/components/ui'

export default function RatePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string

  const [loading, setLoading] = useState(true)
  const [groupId, setGroupId] = useState('')
  const [matchmates, setMatchmates] = useState<RatingPlayer[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const [matchRes, regsRes] = await Promise.all([
        supabase.from('matches').select('group_id, status').eq('id', matchId).single(),
        supabase.from('match_registrations')
          .select('user_id, profiles(username, full_name, avatar_url)')
          .eq('match_id', matchId).eq('status', 'confirmed'),
      ])

      if (matchRes.error || matchRes.data.status !== 'played') {
        router.replace(`/matches/${matchId}`); return
      }

      setGroupId(matchRes.data.group_id)

      const mates: RatingPlayer[] = (regsRes.data ?? [])
        .filter(r => r.user_id !== user.id)
        .map(r => {
          const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null
          return { user_id: r.user_id, username: p?.username ?? '', full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null }
        })

      // Filter to unrated
      const { data: existingRatings } = await supabase
        .from('player_ratings').select('ratee_id')
        .eq('rater_id', user.id).eq('match_id', matchId)

      const alreadyRated = new Set((existingRatings ?? []).map(r => r.ratee_id))
      const remaining = mates.filter(m => !alreadyRated.has(m.user_id))

      if (remaining.length === 0) { setDone(true) } else { setMatchmates(remaining) }
      setLoading(false)
    })
  }, [matchId, router])

  const currentPlayer = matchmates[currentIdx]

  async function handleSubmit(skills: Record<SkillKey, number>, comment: string) {
    if (!currentPlayer) return
    startTransition(async () => {
      const res = await submitRatings(matchId, groupId, [{
        rateeId: currentPlayer.user_id,
        skills,
        comment: comment || undefined,
      }])
      if (res.error) { showToast('Errore nel salvataggio', 'error'); return }
      showToast('Valutazione salvata', 'success')
      if (currentIdx < matchmates.length - 1) {
        setCurrentIdx(i => i + 1)
      } else {
        setDone(true)
      }
    })
  }

  if (loading) return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span style={{ color: 'var(--color-text-3)' }}>Caricamento…</span></div>

  if (done || skipped) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '1.25rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: done ? 'rgba(255,215,0,0.12)' : 'rgba(200,255,107,0.12)', border: `1px solid ${done ? 'rgba(255,215,0,0.3)' : 'rgba(200,255,107,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {done ? <IconStar size={32} color="#FFD700" /> : <IconThumbsUp size={32} color="var(--color-primary)" />}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
        {done ? 'Valutazioni inviate!' : 'Valutazioni saltate'}
      </h2>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
        {done ? 'Grazie! Le tue valutazioni aiutano a migliorare il bilanciamento squadre.' : 'Potrai valutare i compagni la prossima volta.'}
      </p>
      <Link href={`/matches/${matchId}`} style={{ padding: '0.875rem 1.75rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}>
        Torna alla partita →
      </Link>
    </div>
  )

  if (matchmates.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconSoccerBall size={28} color="var(--color-text-3)" />
      </div>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Nessun compagno da valutare</p>
      <Link href={`/matches/${matchId}`} style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>← Torna alla partita</Link>
    </div>
  )

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Valuta Compagni
        </h1>
        <button onClick={() => setSkipped(true)} style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Salta
        </button>
      </div>

      {/* Avatar navigation bar */}
      <div style={{ display: 'flex', gap: '0.625rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {matchmates.map((m, i) => (
          <button
            key={m.user_id}
            type="button"
            onClick={() => setCurrentIdx(i)}
            style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${i === currentIdx ? 'var(--color-primary)' : i < currentIdx ? '#22c55e' : 'var(--color-border)'}`, overflow: 'hidden', transition: 'border-color 0.2s', position: 'relative' }}>
              <Avatar src={m.avatar_url} name={m.full_name ?? m.username} size="md" />
              {i < currentIdx && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={16} color="#fff" /></div>
              )}
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === currentIdx ? 'var(--color-primary)' : i < currentIdx ? '#22c55e' : 'var(--color-border)' }} />
          </button>
        ))}
      </div>

      {/* Rating form for current player */}
      {currentPlayer && (
        <PlayerRatingForm
          player={currentPlayer}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel={currentIdx < matchmates.length - 1 ? `Prossimo → (${matchmates.length - currentIdx - 1} rimanenti)` : 'Invia valutazioni ✓'}
          progress={{ current: currentIdx + 1, total: matchmates.length }}
        />
      )}
    </div>
  )
}
