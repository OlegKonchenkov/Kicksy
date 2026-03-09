'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, Button, useToast } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { submitGroupRatings } from '@/lib/actions/matches'

const CATEGORIES = [
  { key: 'fisica', label: 'Fisica', emoji: '💪', color: '#ef4444', skills: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'] as const },
  { key: 'tecnica', label: 'Tecnica', emoji: '⚽', color: '#3b82f6', skills: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'] as const },
  { key: 'tattica', label: 'Tattica', emoji: '🧠', color: '#8b5cf6', skills: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'] as const },
  { key: 'difesa', label: 'Difesa', emoji: '🛡️', color: '#06b6d4', skills: ['marcatura', 'tackle', 'intercettamento', 'copertura'] as const },
  { key: 'attacco', label: 'Attacco', emoji: '🎯', color: 'var(--color-primary)', skills: ['finalizzazione', 'assist_making'] as const },
  { key: 'mentalita', label: 'Mentalità', emoji: '🔥', color: '#f59e0b', skills: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'] as const },
] as const

type SkillKey = typeof CATEGORIES[number]['skills'][number]
type CategoryRatings = Record<typeof CATEGORIES[number]['key'], number>

type Target = {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  self: boolean
}

function defaultCats(): CategoryRatings {
  return Object.fromEntries(CATEGORIES.map((c) => [c.key, 5])) as CategoryRatings
}

function toSkills(cats: CategoryRatings): Record<SkillKey, number> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const cat of CATEGORIES) {
    const value = cats[cat.key] ?? 5
    for (const skill of cat.skills) result[skill] = value
  }
  return result as Record<SkillKey, number>
}

function fromSkills(row: Record<string, number>): CategoryRatings {
  const out = defaultCats()
  for (const cat of CATEGORIES) {
    const vals = cat.skills.map((k) => Number(row[k] ?? 5))
    out[cat.key] = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  }
  return out
}

function CategorySlider({ label, emoji, color, value, onChange }: {
  label: string
  emoji: string
  color: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{emoji}</span>
          <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--color-text-2)' }}>{label}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
    </div>
  )
}

export default function GroupRatingsPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const groupId = params.groupId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targets, setTargets] = useState<Target[]>([])
  const [idx, setIdx] = useState(0)
  const [allRatings, setAllRatings] = useState<Record<string, CategoryRatings>>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: memberRow } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      if (!memberRow) { router.replace('/groups'); return }

      const [{ data: members }, { data: existing }] = await Promise.all([
        supabase
          .from('group_members')
          .select('user_id, profiles(username, full_name, avatar_url)')
          .eq('group_id', groupId)
          .eq('is_active', true),
        supabase
          .from('player_ratings')
          .select('ratee_id, velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
          .eq('group_id', groupId)
          .eq('rater_id', user.id)
          .is('match_id', null),
      ])

      const rows = members ?? []
      const mapped = rows.map((r) => {
        const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null
        return {
          user_id: r.user_id,
          username: p?.username ?? '',
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          self: r.user_id === user.id,
        }
      })

      const ordered = [...mapped.filter((m) => m.self), ...mapped.filter((m) => !m.self)]
      const defaults: Record<string, CategoryRatings> = {}
      for (const t of ordered) defaults[t.user_id] = defaultCats()
      for (const e of existing ?? []) defaults[e.ratee_id] = fromSkills(e as unknown as Record<string, number>)

      setTargets(ordered)
      setAllRatings(defaults)
      setLoading(false)
    }
    load()
  }, [groupId, router])

  const current = targets[idx]
  const currentRatings = current ? (allRatings[current.user_id] ?? defaultCats()) : defaultCats()

  function setCat(catKey: keyof CategoryRatings, value: number) {
    if (!current) return
    setAllRatings((prev) => ({
      ...prev,
      [current.user_id]: {
        ...(prev[current.user_id] ?? defaultCats()),
        [catKey]: value,
      },
    }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const payload = targets.map((t) => ({
        rateeId: t.user_id,
        skills: toSkills(allRatings[t.user_id] ?? defaultCats()),
      }))
      const res = await submitGroupRatings(groupId, payload)
      if (res.error) { setError(res.error); return }
      showToast('Valutazioni gruppo salvate', 'success')
      router.replace(`/groups/${groupId}`)
    })
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-3)' }}>Caricamento...</div>
  }

  if (!current) {
    return (
      <div style={{ padding: '1.5rem 1rem' }}>
        <p style={{ color: 'var(--color-text-3)', marginBottom: '1rem' }}>Nessun membro da valutare.</p>
        <Link href={`/groups/${groupId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>Torna al gruppo →</Link>
      </div>
    )
  }

  const progress = Math.round(((idx + 1) / targets.length) * 100)

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button type="button" onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}>
        ← Indietro
      </button>

      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          Valutazioni Gruppo
        </h1>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {current.self ? 'Prima: autovalutazione personale' : 'Valuta un compagno del gruppo'}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary)' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>{idx + 1}/{targets.length}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <Avatar src={current.avatar_url} name={current.full_name ?? current.username} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)' }}>{current.full_name ?? current.username}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>@{current.username}{current.self ? ' · Tu' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        {CATEGORIES.map((cat) => (
          <CategorySlider
            key={cat.key}
            label={cat.label}
            emoji={cat.emoji}
            color={cat.color}
            value={currentRatings[cat.key]}
            onChange={(v) => setCat(cat.key, v)}
          />
        ))}
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8125rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button type="button" variant="ghost" fullWidth onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
          Indietro
        </Button>
        {idx < targets.length - 1 ? (
          <Button type="button" fullWidth onClick={() => setIdx((i) => Math.min(targets.length - 1, i + 1))}>
            Avanti →
          </Button>
        ) : (
          <Button type="button" fullWidth loading={isPending} onClick={handleSave}>
            Salva valutazioni ✓
          </Button>
        )}
      </div>
    </div>
  )
}
