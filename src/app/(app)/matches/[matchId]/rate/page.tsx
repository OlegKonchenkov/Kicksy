'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui'
import { submitRatings } from '@/lib/actions/matches'

/* ─── Skill categories ───────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    key: 'fisica', label: 'Fisica', emoji: '💪', color: '#ef4444',
    skills: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'] as const,
  },
  {
    key: 'tecnica', label: 'Tecnica', emoji: '⚽', color: '#3b82f6',
    skills: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'] as const,
  },
  {
    key: 'tattica', label: 'Tattica', emoji: '🧠', color: '#8b5cf6',
    skills: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'] as const,
  },
  {
    key: 'difesa', label: 'Difesa', emoji: '🛡️', color: '#06b6d4',
    skills: ['marcatura', 'tackle', 'intercettamento', 'copertura'] as const,
  },
  {
    key: 'attacco', label: 'Attacco', emoji: '🎯', color: 'var(--color-primary)',
    skills: ['finalizzazione', 'assist_making'] as const,
  },
  {
    key: 'mentalita', label: 'Mentalità', emoji: '❤️‍🔥', color: '#f59e0b',
    skills: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'] as const,
  },
] as const

type SkillKey = typeof CATEGORIES[number]['skills'][number]
type CategoryRatings = Record<typeof CATEGORIES[number]['key'], number>

function makeDefaultSkills(catRatings: CategoryRatings): Record<SkillKey, number> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const cat of CATEGORIES) {
    const val = catRatings[cat.key] ?? 5
    for (const sk of cat.skills) {
      result[sk] = val
    }
  }
  return result as Record<SkillKey, number>
}

/* ─── Slider component (inline, no deps) ────────────────────────────────── */
function CategorySlider({ label, emoji, color, value, onChange }: {
  label: string; emoji: string; color: string; value: number; onChange: (v: number) => void
}) {
  const labels = ['Scarso', 'Sufficiente', 'Buono', 'Ottimo', 'Fenomeno']
  const labelIdx = Math.round((value - 1) / 2.25)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{emoji}</span>
          <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--color-text-2)' }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700, color }}>
            {value}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {labels[Math.max(0, Math.min(4, labelIdx))]}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={1} max={10} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ width: 3, height: 6, borderRadius: 1, background: i < value ? color : 'var(--color-border)', opacity: i < value ? 1 : 0.4 }} />
        ))}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
interface Matchmate {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export default function RatePage() {
  const params = useParams()
  const router = useRouter()
  const matchId = params.matchId as string

  const [loading, setLoading] = useState(true)
  const [groupId, setGroupId] = useState('')
  const [matchmates, setMatchmates] = useState<Matchmate[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [allCatRatings, setAllCatRatings] = useState<Record<string, CategoryRatings>>({})
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      // Get match details + confirmed players
      const [matchRes, regsRes] = await Promise.all([
        supabase.from('matches').select('group_id, status').eq('id', matchId).single(),
        supabase
          .from('match_registrations')
          .select('user_id, profiles(username, full_name, avatar_url)')
          .eq('match_id', matchId)
          .eq('status', 'confirmed'),
      ])

      if (matchRes.error || matchRes.data.status !== 'played') {
        router.replace(`/matches/${matchId}`)
        return
      }

      setGroupId(matchRes.data.group_id)

      const mates = (regsRes.data ?? [])
        .filter(r => r.user_id !== user.id)
        .map(r => {
          const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null
          return {
            user_id: r.user_id,
            username: p?.username ?? '',
            full_name: p?.full_name ?? null,
            avatar_url: p?.avatar_url ?? null,
          }
        })

      setMatchmates(mates)

      // Check if already rated
      const { data: existingRatings } = await supabase
        .from('player_ratings')
        .select('ratee_id')
        .eq('rater_id', user.id)
        .eq('match_id', matchId)

      const alreadyRated = new Set((existingRatings ?? []).map(r => r.ratee_id))
      const remaining = mates.filter(m => !alreadyRated.has(m.user_id))

      if (remaining.length === 0) {
        setDone(true)
      } else {
        setMatchmates(remaining)
      }

      // Init default ratings (5 for each category)
      const defaults: Record<string, CategoryRatings> = {}
      for (const m of mates) {
        defaults[m.user_id] = Object.fromEntries(
          CATEGORIES.map(c => [c.key, 5])
        ) as CategoryRatings
      }
      setAllCatRatings(defaults)
      setLoading(false)
    })
  }, [matchId, router])

  const currentPlayer = matchmates[currentIdx]
  const catRatings = currentPlayer ? (allCatRatings[currentPlayer.user_id] ?? Object.fromEntries(CATEGORIES.map(c => [c.key, 5])) as CategoryRatings) : {} as CategoryRatings

  const setCatValue = (catKey: string, val: number) => {
    if (!currentPlayer) return
    setAllCatRatings(prev => ({
      ...prev,
      [currentPlayer.user_id]: { ...prev[currentPlayer.user_id], [catKey]: val },
    }))
  }

  const handleNext = async () => {
    if (currentIdx < matchmates.length - 1) {
      setCurrentIdx(idx => idx + 1)
    } else {
      // All players rated — submit
      startTransition(async () => {
        const ratingsPayload = matchmates.map(m => ({
          rateeId: m.user_id,
          skills: makeDefaultSkills(allCatRatings[m.user_id] ?? Object.fromEntries(CATEGORIES.map(c => [c.key, 5])) as CategoryRatings),
        }))
        const res = await submitRatings(matchId, groupId, ratingsPayload)
        if (!res.error) setDone(true)
      })
    }
  }

  if (loading) return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <span style={{ color: 'var(--color-text-3)' }}>Caricamento…</span>
    </div>
  )

  if (done || skipped) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: '1.25rem', textAlign: 'center', padding: '2rem' }}>
      <span style={{ fontSize: '3rem' }}>{done ? '⭐' : '👍'}</span>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
        {done ? 'Valutazioni inviate!' : 'Valutazioni saltate'}
      </h2>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
        {done ? 'Grazie! Le tue valutazioni aiutano a migliorare il bilanciamento squadre.' : 'Potrai valutare i compagni la prossima volta.'}
      </p>
      <Link
        href={`/matches/${matchId}`}
        style={{ padding: '0.875rem 1.75rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
      >
        Torna alla partita →
      </Link>
    </div>
  )

  if (matchmates.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
      <span style={{ fontSize: '2.5rem' }}>👥</span>
      <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Nessun compagno di squadra da valutare</p>
      <Link href={`/matches/${matchId}`} style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}>← Torna alla partita</Link>
    </div>
  )

  const progress = Math.round(((currentIdx) / matchmates.length) * 100)

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
            Valuta Compagni
          </h1>
          <button
            onClick={() => setSkipped(true)}
            style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Salta
          </button>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: 4, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary)', borderRadius: 999, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {currentIdx + 1} / {matchmates.length}
          </span>
        </div>
      </div>

      {/* Current player card */}
      {currentPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <Avatar src={currentPlayer.avatar_url} name={currentPlayer.full_name ?? currentPlayer.username} size="lg" />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
              {currentPlayer.full_name ?? currentPlayer.username}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>
              @{currentPlayer.username}
            </div>
          </div>
        </div>
      )}

      {/* Category sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        {CATEGORIES.map(cat => (
          <CategorySlider
            key={cat.key}
            label={cat.label}
            emoji={cat.emoji}
            color={cat.color}
            value={catRatings[cat.key] ?? 5}
            onChange={v => setCatValue(cat.key, v)}
          />
        ))}
      </div>

      {/* Navigation */}
      <button
        onClick={handleNext}
        disabled={isPending}
        style={{
          padding: '0.9375rem',
          background: 'var(--color-primary)',
          color: 'var(--color-bg)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.9rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: isPending ? 'default' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending
          ? 'Invio…'
          : currentIdx < matchmates.length - 1
          ? `Prossimo → (${matchmates.length - currentIdx - 1} rimanenti)`
          : 'Invia valutazioni ✓'}
      </button>
    </div>
  )
}
