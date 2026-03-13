'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Avatar, PlayerRatingForm, useToast } from '@/components/ui'
import type { RatingPlayer } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { submitGroupRatings } from '@/lib/actions/matches'
import { CATEGORY_SKILLS } from '@/lib/rating-utils'
import type { SkillKey } from '@/lib/rating-utils'
import { IconSearch } from '@/components/ui/Icons'

type Member = RatingPlayer & {
  ratedAt: string | null   // ISO string if rated, null if not
  existingSkills: Partial<Record<SkillKey, number>> | null
  existingComment: string | null
}

type View = 'list' | 'rating'

export default function GroupRatingsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const groupId = params.groupId as string
  const selfOnly = searchParams.get('self') === '1'
  const firstFlow = searchParams.get('first') === '1'
  const nextParam = searchParams.get('next')
  const nextPath = nextParam && nextParam.startsWith('/') ? nextParam : `/groups/${groupId}`

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<View>('list')
  const [selectedPlayer, setSelectedPlayer] = useState<Member | null>(null)
  const [sequentialQueue, setSequentialQueue] = useState<string[]>([])  // user_ids
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setCurrentUserId(user.id)

      const { data: memberRow } = await supabase
        .from('group_members').select('user_id')
        .eq('group_id', groupId).eq('user_id', user.id).eq('is_active', true).maybeSingle()
      if (!memberRow) { router.replace('/groups'); return }

      const [{ data: membersData }, { data: existingData }] = await Promise.all([
        supabase.from('group_members')
          .select('user_id, profiles(username, full_name, avatar_url)')
          .eq('group_id', groupId).eq('is_active', true),
        supabase.from('player_ratings')
          .select('ratee_id, created_at, comment, velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
          .eq('group_id', groupId).eq('rater_id', user.id).is('match_id', null),
      ])

      const existingMap = new Map<string, { ratedAt: string; skills: Partial<Record<SkillKey, number>>; comment: string | null }>()
      for (const row of existingData ?? []) {
        const skills: Partial<Record<SkillKey, number>> = {}
        const skillKeys = Object.values(CATEGORY_SKILLS).flat() as SkillKey[]
        for (const k of skillKeys) {
          const v = (row as Record<string, unknown>)[k]
          if (typeof v === 'number') skills[k] = v
        }
        existingMap.set(row.ratee_id, { ratedAt: row.created_at, skills, comment: row.comment ?? null })
      }

      const rows = membersData ?? []
      const allMembers: Member[] = rows.map(r => {
        const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null
        const existing = existingMap.get(r.user_id)
        return {
          user_id: r.user_id,
          username: p?.username ?? '',
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          ratedAt: existing?.ratedAt ?? null,
          existingSkills: existing?.skills ?? null,
          existingComment: existing?.comment ?? null,
        }
      })

      // If selfOnly, filter to only self
      const ordered = selfOnly
        ? allMembers.filter(m => m.user_id === user.id)
        : [
            ...allMembers.filter(m => m.user_id === user.id),
            ...allMembers.filter(m => m.user_id !== user.id),
          ]

      setMembers(ordered)
      setRatedIds(new Set(existingMap.keys()))
      setLoading(false)

      // If selfOnly, go directly to rating for self
      if (selfOnly) {
        const self = ordered.find(m => m.user_id === user.id)
        if (self) {
          if (firstFlow && self.ratedAt) {
            router.replace(nextPath)
            return
          }
          setSelectedPlayer(self)
          setView('rating')
        }
      }
    }
    void load()
  }, [firstFlow, groupId, nextPath, router, selfOnly])

  const unrated = useMemo(() => members.filter(m => !ratedIds.has(m.user_id)), [members, ratedIds])
  const rated = useMemo(() => members.filter(m => ratedIds.has(m.user_id) && m.user_id !== currentUserId), [members, ratedIds, currentUserId])

  const filtered = (list: Member[]) =>
    search.trim() === '' ? list : list.filter(m =>
      (m.full_name ?? m.username).toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
    )

  function openPlayer(member: Member, queue?: string[]) {
    setSelectedPlayer(member)
    if (queue) setSequentialQueue(queue)
    setView('rating')
  }

  function startSequential() {
    const queue = unrated.map(m => m.user_id)
    if (queue.length === 0) return
    const first = unrated[0]
    openPlayer(first, queue.slice(1))
  }

  async function handleSubmit(skills: Record<SkillKey, number>, comment: string) {
    if (!selectedPlayer) return
    startTransition(async () => {
      const res = await submitGroupRatings(groupId, [{ rateeId: selectedPlayer.user_id, skills, comment: comment || undefined }])
      if (res.error) { showToast(res.error, 'error'); return }
      showToast('Valutazione salvata ✓', 'success')
      setRatedIds(prev => new Set([...prev, selectedPlayer.user_id]))
      if (selfOnly) {
        router.replace(nextPath)
        return
      }
      // Advance in sequential mode or return to list
      if (sequentialQueue.length > 0) {
        const nextId = sequentialQueue[0]
        const nextPlayer = members.find(m => m.user_id === nextId)
        if (nextPlayer) { setSelectedPlayer(nextPlayer); setSequentialQueue(q => q.slice(1)); return }
      }
      setView('list')
      setSelectedPlayer(null)
      setSequentialQueue([])
    })
  }

  function formatRatedAt(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (days === 0) return 'oggi'
    if (days === 1) return 'ieri'
    if (days < 7) return `${days}g fa`
    if (days < 30) return `${Math.floor(days / 7)}sett fa`
    return `${Math.floor(days / 30)}mesi fa`
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--color-text-3)' }}>Caricamento...</div>

  // ── RATING VIEW ──────────────────────────────────────────────────────────
  if (view === 'rating' && selectedPlayer) {
    const isSequential = sequentialQueue.length > 0 || !ratedIds.has(selectedPlayer.user_id)
    const doneCount = members.length - unrated.length + (ratedIds.has(selectedPlayer.user_id) ? 1 : 0)

    return (
      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!(selfOnly && firstFlow) && (
          <button
            type="button"
            onClick={() => { setView('list'); setSelectedPlayer(null); setSequentialQueue([]) }}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}
          >
            ← Torna alla lista
          </button>
        )}
        <PlayerRatingForm
          player={selectedPlayer}
          initialSkills={selectedPlayer.existingSkills ?? undefined}
          initialComment={selectedPlayer.existingComment ?? ''}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel={sequentialQueue.length > 0 ? `Salva e prossimo → (${sequentialQueue.length} rimanenti)` : 'Salva valutazione ✓'}
          progress={isSequential ? { current: doneCount, total: members.length } : undefined}
        />
      </div>
    )
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}
      >
        ← Indietro
      </button>

      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          {selfOnly ? 'Autovalutazione' : 'Valuta Giocatori'}
        </h1>
        {!selfOnly && (
          <p style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
            {unrated.length} da valutare · {ratedIds.size} completati
          </p>
        )}
      </div>

      {/* Search */}
      {!selfOnly && (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}><IconSearch size={16} color="var(--color-text-3)" /></span>
          <input
            type="text"
            placeholder="Cerca giocatore…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '2.25rem', paddingRight: '0.875rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-1)', fontSize: '0.875rem', outline: 'none' }}
          />
        </div>
      )}

      {/* Valuta tutti CTA */}
      {!selfOnly && unrated.length > 0 && search === '' && (
        <button
          type="button"
          onClick={startSequential}
          style={{ padding: '0.875rem 1rem', background: 'var(--color-primary-dim)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'center' }}
        >
          Valuta tutti ({unrated.length}) →
        </button>
      )}

      {/* Da valutare */}
      {filtered(unrated).length > 0 && (
        <div>
          {!selfOnly && (
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.5rem' }}>
              Da valutare ({filtered(unrated).length})
            </h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {filtered(unrated).map(member => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => openPlayer(member)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <Avatar src={member.avatar_url} name={member.full_name ?? member.username} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.full_name ?? member.username}
                    {member.user_id === currentUserId && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: '0.375rem' }}>(tu)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>@{member.username}</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  Valuta →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Già valutati */}
      {!selfOnly && filtered(rated).length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.5rem' }}>
            Già valutati ({filtered(rated).length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {filtered(rated).map(member => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => openPlayer(member)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%', opacity: 0.7 }}
              >
                <Avatar src={member.avatar_url} name={member.full_name ?? member.username} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.full_name ?? member.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>@{member.username}</div>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
                  ✓ {member.ratedAt ? formatRatedAt(member.ratedAt) : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered(unrated).length === 0 && filtered(rated).length === 0 && (
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>Nessun giocatore trovato.</p>
      )}
    </div>
  )
}
