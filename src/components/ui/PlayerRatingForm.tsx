'use client'

import { useState, useCallback } from 'react'
import type { SkillKey, CategoryKey } from '@/lib/rating-utils'
import {
  CATEGORY_SKILLS,
  categoryToSkills,
  skillsToCategory,
  isCategoryCustomized,
} from '@/lib/rating-utils'
import { Avatar } from '@/components/ui/Avatar'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RatingPlayer = {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
}

export type PlayerRatingFormProps = {
  player: RatingPlayer
  /** Pre-fill from an existing rating row (24 skill values) */
  initialSkills?: Partial<Record<SkillKey, number>>
  initialComment?: string
  onSubmit: (skills: Record<SkillKey, number>, comment: string) => void | Promise<void>
  onBack?: () => void
  submitLabel?: string
  isSubmitting?: boolean
  /** Shows "X / total" progress indicator */
  progress?: { current: number; total: number }
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES: Array<{
  key: CategoryKey
  label: string
  emoji: string
  color: string
  skills: Array<{ key: SkillKey; label: string }>
}> = [
  {
    key: 'fisica', label: 'Fisica', emoji: '💪', color: '#3B82F6',
    skills: [
      { key: 'velocita', label: 'Velocità' },
      { key: 'resistenza', label: 'Resistenza' },
      { key: 'forza', label: 'Forza' },
      { key: 'salto', label: 'Salto' },
      { key: 'agilita', label: 'Agilità' },
    ],
  },
  {
    key: 'tecnica', label: 'Tecnica', emoji: '⚽', color: '#C8FF6B',
    skills: [
      { key: 'tecnica_palla', label: 'Controllo palla' },
      { key: 'dribbling', label: 'Dribbling' },
      { key: 'passaggio', label: 'Passaggio' },
      { key: 'tiro', label: 'Tiro' },
      { key: 'colpo_di_testa', label: 'Colpo di testa' },
    ],
  },
  {
    key: 'tattica', label: 'Tattica', emoji: '🧠', color: '#FFB800',
    skills: [
      { key: 'lettura_gioco', label: 'Lettura del gioco' },
      { key: 'posizionamento', label: 'Posizionamento' },
      { key: 'pressing', label: 'Pressing' },
      { key: 'costruzione', label: 'Costruzione' },
    ],
  },
  {
    key: 'difesa', label: 'Difesa', emoji: '🛡️', color: '#EF4444',
    skills: [
      { key: 'marcatura', label: 'Marcatura' },
      { key: 'tackle', label: 'Tackle' },
      { key: 'intercettamento', label: 'Intercettamento' },
      { key: 'copertura', label: 'Copertura' },
    ],
  },
  {
    key: 'attacco', label: 'Attacco', emoji: '🎯', color: '#F97316',
    skills: [
      { key: 'finalizzazione', label: 'Finalizzazione' },
      { key: 'assist_making', label: 'Assist' },
    ],
  },
  {
    key: 'mentalita', label: 'Mentalità', emoji: '🔥', color: '#A855F7',
    skills: [
      { key: 'leadership', label: 'Leadership' },
      { key: 'comunicazione', label: 'Comunicazione' },
      { key: 'mentalita_competitiva', label: 'Mentalità comp.' },
      { key: 'fair_play', label: 'Fair play' },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDefaultSkills(initial?: Partial<Record<SkillKey, number>>): Record<SkillKey, number> {
  const all = Object.values(CATEGORY_SKILLS).flat() as SkillKey[]
  return Object.fromEntries(all.map(k => [k, initial?.[k] ?? 5])) as Record<SkillKey, number>
}

const COMMENT_MAX = 150
const COMMENT_PLACEHOLDERS = [
  'Cosa hai notato che nessun altro ha visto?',
  'Una cosa che fa bene, una che può migliorare…',
  'Il momento della partita che ti ha colpito di più…',
  'Descrivilo in una frase sola.',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function PlayerRatingForm({
  player,
  initialSkills,
  initialComment = '',
  onSubmit,
  onBack,
  submitLabel = 'Salva',
  isSubmitting = false,
  progress,
}: PlayerRatingFormProps) {
  const [skills, setSkills] = useState<Record<SkillKey, number>>(() => makeDefaultSkills(initialSkills))
  const [expanded, setExpanded] = useState<Set<CategoryKey>>(new Set())
  const [comment, setComment] = useState(initialComment)
  const placeholder = COMMENT_PLACEHOLDERS[player.user_id.charCodeAt(0) % COMMENT_PLACEHOLDERS.length]

  const toggleExpand = useCallback((catKey: CategoryKey) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(catKey) ? next.delete(catKey) : next.add(catKey)
      return next
    })
  }, [])

  const setCategoryValue = useCallback((catKey: CategoryKey, value: number) => {
    const partial = categoryToSkills(catKey, value)
    setSkills(prev => ({ ...prev, ...partial }))
  }, [])

  const setSkillValue = useCallback((skillKey: SkillKey, value: number) => {
    setSkills(prev => ({ ...prev, [skillKey]: value }))
  }, [])

  const handleSubmit = async () => {
    await onSubmit(skills, comment.trim())
  }

  const commentColor = comment.length > 145 ? '#FF3B5C' : comment.length > 120 ? '#FFB800' : 'var(--color-text-3)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Progress bar */}
      {progress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((progress.current / progress.total) * 100)}%`, background: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
            {progress.current} / {progress.total}
          </span>
        </div>
      )}

      {/* Player card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Avatar src={player.avatar_url} name={player.full_name ?? player.username} size="lg" />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
            {player.full_name ?? player.username}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>
            @{player.username}
          </div>
        </div>
      </div>

      {/* Category cards */}
      {CATEGORIES.map(cat => {
        const isOpen = expanded.has(cat.key)
        const catValue = skillsToCategory(skills, cat.key)
        const customized = isCategoryCustomized(skills, cat.key)

        return (
          <div
            key={cat.key}
            style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: `1px solid ${isOpen ? cat.color + '40' : 'var(--color-border)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}
          >
            {/* Category header */}
            <div style={{ padding: '0.875rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? '0' : '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>{cat.emoji}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-2)' }}>
                    {cat.label}
                  </span>
                  {customized && (
                    <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.375rem', background: cat.color + '20', color: cat.color, borderRadius: 999, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em' }}>
                      ⚡ custom
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: cat.color }}>
                    {isOpen ? catValue.toFixed(1) : catValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpand(cat.key)}
                    style={{ background: 'none', border: `1px solid ${cat.color}40`, borderRadius: 4, padding: '0.125rem 0.375rem', cursor: 'pointer', color: cat.color, fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    {isOpen ? '▲ chiudi' : '▾ dettaglio'}
                  </button>
                </div>
              </div>

              {/* Collapsed: single category slider */}
              {!isOpen && (
                <div>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={Math.round(catValue)}
                    onChange={e => setCategoryValue(cat.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: cat.color, cursor: 'pointer', margin: 0 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} style={{ width: 3, height: 5, borderRadius: 1, background: i < Math.round(catValue) ? cat.color : 'var(--color-border)', opacity: i < Math.round(catValue) ? 1 : 0.35 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expanded: individual skill sliders */}
            {isOpen && (
              <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: `1px solid ${cat.color}20` }}>
                <div style={{ height: '0.5rem' }} />
                {cat.skills.map((skill, idx) => (
                  <div key={skill.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', animationDelay: `${idx * 40}ms` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        {skill.label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, color: cat.color }}>
                        {skills[skill.key]}
                      </span>
                    </div>
                    <input
                      type="range" min={1} max={10} step={1}
                      value={skills[skill.key]}
                      onChange={e => setSkillValue(skill.key, Number(e.target.value))}
                      style={{ width: '100%', accentColor: cat.color, cursor: 'pointer', height: '2px', margin: 0 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Comment card */}
      <div style={{ background: 'var(--color-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontSize: '0.875rem' }}>💬</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-2)' }}>
              Commento
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>(facoltativo)</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: commentColor, transition: 'color 0.2s' }}>
            {comment.length} / {COMMENT_MAX}
          </span>
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value.slice(0, COMMENT_MAX))}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-1)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-ui, sans-serif)',
            padding: '0.75rem',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.5,
          }}
        />
        <p style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginTop: '0.375rem' }}>
          Visibile ai compagni del gruppo.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ flex: 1, padding: '0.875rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer' }}
          >
            ← Indietro
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ flex: 2, padding: '0.9375rem', background: isSubmitting ? 'var(--color-border)' : 'var(--color-primary)', color: isSubmitting ? 'var(--color-text-3)' : 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: isSubmitting ? 'default' : 'pointer' }}
        >
          {isSubmitting ? 'Salvataggio…' : submitLabel}
        </button>
      </div>
    </div>
  )
}
