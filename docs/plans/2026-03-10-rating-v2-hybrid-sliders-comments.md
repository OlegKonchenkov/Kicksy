# Rating v2 — Hybrid Sliders, Comments & Group Hub

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace the flat 6-slider rating experience with expandable category cards (hybrid: category slider OR individual sub-skill sliders), add a free-text comment per player, redesign the group ratings page as a searchable hub with per-player status, and add avatar-based navigation to the post-match carousel.

**Architecture:** Extract shared rating logic into `src/lib/rating-utils.ts` (pure functions, testable). Build a single `PlayerRatingForm` client component used by both the group hub and the post-match page. The group hub switches between a LIST view and an inline RATING view without routing changes. Comments are stored in a new nullable `comment` column on `player_ratings`, displayed in a "Dicono di lui/me" section on both the player dashboard and own profile.

**Tech Stack:** Next.js 15 App Router, React, Supabase JS, Vitest, `Barlow Condensed` / `JetBrains Mono` (existing design tokens).

---

## Design System Reference

Existing CSS tokens (from `globals.css`):
- `--color-bg: #0A0C12` · `--color-surface: #111318` · `--color-elevated: #181C25`
- `--color-primary: #C8FF6B` · `--color-secondary: #FFB800` · `--color-danger: #FF3B5C`
- `--color-border: rgba(255,255,255,0.07)` · `--color-text-1..3`
- Per-category: `--color-atletismo:#3B82F6` · `--color-tecnica:#C8FF6B` · `--color-tattica:#FFB800` · `--color-mentalita:#A855F7` · `--color-difesa:#EF4444` · `--color-attacco:#F97316`
- `--font-display: 'Barlow Condensed'` · `--font-mono: 'JetBrains Mono'`
- Radii: `--radius-md:0.75rem` · `--radius-lg:1rem`

---

## Task 1: DB Migration + TypeScript Types

**Files:**
- Create: `supabase/migrations/012_player_rating_comment.sql`
- Modify: `src/types/database.ts`

### Step 1: Create migration

```sql
-- supabase/migrations/012_player_rating_comment.sql
ALTER TABLE player_ratings
  ADD COLUMN IF NOT EXISTS comment text;
```

### Step 2: Apply migration

Run this in the Supabase dashboard SQL editor or via CLI. Verify the column appears in `player_ratings`.

### Step 3: Update `PlayerRating` type in `src/types/database.ts`

Find the `PlayerRating` type (around line 140) and add `comment: string | null` after `fair_play`:

```ts
export type PlayerRating = {
  id: string
  rater_id: string
  ratee_id: string
  group_id: string
  match_id: string | null
  velocita: number
  resistenza: number
  forza: number
  salto: number
  agilita: number
  tecnica_palla: number
  dribbling: number
  passaggio: number
  tiro: number
  colpo_di_testa: number
  lettura_gioco: number
  posizionamento: number
  pressing: number
  costruzione: number
  marcatura: number
  tackle: number
  intercettamento: number
  copertura: number
  finalizzazione: number
  assist_making: number
  leadership: number
  comunicazione: number
  mentalita_competitiva: number
  fair_play: number
  comment: string | null   // ← ADD THIS
  created_at: string
}
```

### Step 4: TypeScript check

```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Step 5: Commit

```bash
git add supabase/migrations/012_player_rating_comment.sql src/types/database.ts
git commit -m "feat: add comment column to player_ratings"
```

---

## Task 2: Update Server Actions

**Files:**
- Modify: `src/lib/actions/matches.ts` (lines ~1218–1340)

### Step 1: Update `SkillRatings` type and both submit functions

Find the `SkillRatings` type definition. It does NOT need changing — the comment is separate.

Find `submitRatings` and update its signature and insert:

```ts
export async function submitRatings(
  matchId: string,
  groupId: string,
  ratings: Array<{ rateeId: string; skills: SkillRatings; comment?: string }>  // ← add comment?
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const rateeIds = ratings.map((r) => r.rateeId)
  const { data: existing } = await supabase
    .from('player_ratings')
    .select('ratee_id')
    .eq('rater_id', user.id)
    .eq('group_id', groupId)
    .eq('match_id', matchId)
    .in('ratee_id', rateeIds)

  const existingRateeIds = new Set((existing ?? []).map((r) => r.ratee_id))
  const newlyRatedCount = rateeIds.filter((id) => !existingRateeIds.has(id)).length

  const inserts = ratings.map(r => ({
    rater_id: user.id,
    ratee_id: r.rateeId,
    group_id: groupId,
    match_id: matchId,
    comment: r.comment ?? null,   // ← ADD
    ...r.skills,
  }))

  const { error } = await supabase
    .from('player_ratings')
    .upsert(inserts, { onConflict: 'rater_id,ratee_id,match_id', ignoreDuplicates: false })

  if (error) return { data: null, error: error.message }
  await awardProfileXP(user.id, newlyRatedCount * XP_PER_PEER_RATING)
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/profile')
  return { data: true, error: null }
}
```

Find `submitGroupRatings` and apply the same pattern:

```ts
export async function submitGroupRatings(
  groupId: string,
  ratings: Array<{ rateeId: string; skills: SkillRatings; comment?: string }>  // ← add comment?
): Promise<AsyncResult<true>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const rateeIds = ratings.map((r) => r.rateeId)
  const { data: existing } = await supabase
    .from('player_ratings')
    .select('ratee_id')
    .eq('rater_id', user.id)
    .eq('group_id', groupId)
    .is('match_id', null)
    .in('ratee_id', rateeIds)

  const existingRateeIds = new Set((existing ?? []).map((r) => r.ratee_id))
  const newlyRatedCount = rateeIds.filter((id) => !existingRateeIds.has(id)).length

  const inserts = ratings.map(r => ({
    rater_id: user.id,
    ratee_id: r.rateeId,
    group_id: groupId,
    match_id: null,
    comment: r.comment ?? null,   // ← ADD
    ...r.skills,
  }))

  const { error } = await supabase
    .from('player_ratings')
    .upsert(inserts, { onConflict: 'rater_id,ratee_id,group_id,match_id', ignoreDuplicates: false })

  if (error) return { data: null, error: error.message }
  await awardProfileXP(user.id, newlyRatedCount * XP_PER_PEER_RATING)
  revalidatePath(`/groups/${groupId}/ratings`)
  revalidatePath(`/groups/${groupId}`)
  revalidatePath('/profile')
  return { data: true, error: null }
}
```

### Step 2: TypeScript check

```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Step 3: Commit

```bash
git add src/lib/actions/matches.ts
git commit -m "feat: pass comment through submitRatings and submitGroupRatings"
```

---

## Task 3: Skill Utilities (TDD)

**Files:**
- Create: `src/lib/rating-utils.ts`
- Create: `src/lib/rating-utils.test.ts`

### Step 1: Write the failing tests first

Create `src/lib/rating-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  categoryToSkills,
  skillsToCategory,
  categoriesToSkills,
  skillsToCategories,
  isCategoryCustomized,
  CATEGORY_SKILLS,
} from './rating-utils'
import type { SkillKey, CategoryKey } from './rating-utils'

function makeSkills(val = 5): Record<SkillKey, number> {
  const all = Object.values(CATEGORY_SKILLS).flat() as SkillKey[]
  return Object.fromEntries(all.map(k => [k, val])) as Record<SkillKey, number>
}

describe('categoryToSkills', () => {
  it('sets all fisica skills to the given value', () => {
    const result = categoryToSkills('fisica', 7)
    expect(result).toEqual({ velocita: 7, resistenza: 7, forza: 7, salto: 7, agilita: 7 })
  })
  it('sets all attacco skills (only 2) to value', () => {
    const result = categoryToSkills('attacco', 9)
    expect(result).toEqual({ finalizzazione: 9, assist_making: 9 })
  })
})

describe('skillsToCategory', () => {
  it('returns exact value when all skills are uniform', () => {
    expect(skillsToCategory(makeSkills(7), 'fisica')).toBe(7)
  })
  it('returns average rounded to 1 decimal', () => {
    const skills = makeSkills(5)
    // fisica: 8 + 6 + 7 + 5 + 4 = 30 / 5 = 6.0
    skills.velocita = 8; skills.resistenza = 6; skills.forza = 7; skills.salto = 5; skills.agilita = 4
    expect(skillsToCategory(skills, 'fisica')).toBe(6)
  })
  it('rounds to 1 decimal place', () => {
    const skills = makeSkills(5)
    // tattica has 4 skills: 7+8+6+6 = 27 / 4 = 6.75 → rounds to 6.8
    skills.lettura_gioco = 7; skills.posizionamento = 8; skills.pressing = 6; skills.costruzione = 6
    expect(skillsToCategory(skills, 'tattica')).toBe(6.8)
  })
})

describe('categoriesToSkills', () => {
  it('spreads each category value to its skills', () => {
    const cats: Record<CategoryKey, number> = {
      fisica: 7, tecnica: 8, tattica: 6, difesa: 5, attacco: 9, mentalita: 4,
    }
    const result = categoriesToSkills(cats)
    expect(result.velocita).toBe(7)
    expect(result.tecnica_palla).toBe(8)
    expect(result.lettura_gioco).toBe(6)
    expect(result.marcatura).toBe(5)
    expect(result.finalizzazione).toBe(9)
    expect(result.leadership).toBe(4)
  })
})

describe('skillsToCategories', () => {
  it('computes averages for all categories', () => {
    const result = skillsToCategories(makeSkills(6))
    const keys: CategoryKey[] = ['fisica', 'tecnica', 'tattica', 'difesa', 'attacco', 'mentalita']
    for (const k of keys) expect(result[k]).toBe(6)
  })
})

describe('isCategoryCustomized', () => {
  it('returns false when all skills in category are equal', () => {
    expect(isCategoryCustomized(makeSkills(7), 'fisica')).toBe(false)
  })
  it('returns true when any skill differs', () => {
    const skills = makeSkills(7)
    skills.velocita = 9
    expect(isCategoryCustomized(skills, 'fisica')).toBe(true)
  })
  it('returns false even with different values across OTHER categories', () => {
    const skills = makeSkills(5)
    skills.finalizzazione = 9  // attacco, not fisica
    expect(isCategoryCustomized(skills, 'fisica')).toBe(false)
  })
})
```

### Step 2: Run tests — expect all to FAIL

```bash
npx vitest run src/lib/rating-utils.test.ts
```

Expected: FAIL — `Cannot find module './rating-utils'`

### Step 3: Implement `src/lib/rating-utils.ts`

```ts
// src/lib/rating-utils.ts

export type SkillKey =
  | 'velocita' | 'resistenza' | 'forza' | 'salto' | 'agilita'
  | 'tecnica_palla' | 'dribbling' | 'passaggio' | 'tiro' | 'colpo_di_testa'
  | 'lettura_gioco' | 'posizionamento' | 'pressing' | 'costruzione'
  | 'marcatura' | 'tackle' | 'intercettamento' | 'copertura'
  | 'finalizzazione' | 'assist_making'
  | 'leadership' | 'comunicazione' | 'mentalita_competitiva' | 'fair_play'

export type CategoryKey = 'fisica' | 'tecnica' | 'tattica' | 'difesa' | 'attacco' | 'mentalita'

export const CATEGORY_SKILLS: Record<CategoryKey, SkillKey[]> = {
  fisica:    ['velocita', 'resistenza', 'forza', 'salto', 'agilita'],
  tecnica:   ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'],
  tattica:   ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'],
  difesa:    ['marcatura', 'tackle', 'intercettamento', 'copertura'],
  attacco:   ['finalizzazione', 'assist_making'],
  mentalita: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'],
}

/** Given a category value (1–10), produce a partial skill map with all skills = value */
export function categoryToSkills(category: CategoryKey, value: number): Partial<Record<SkillKey, number>> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const skill of CATEGORY_SKILLS[category]) result[skill] = value
  return result
}

/** Average of all skills in a category, rounded to 1 decimal */
export function skillsToCategory(skills: Partial<Record<SkillKey, number>>, category: CategoryKey): number {
  const keys = CATEGORY_SKILLS[category]
  const sum = keys.reduce((acc, k) => acc + (skills[k] ?? 5), 0)
  return Math.round((sum / keys.length) * 10) / 10
}

/** Expand 6 category values into all 24 skills */
export function categoriesToSkills(cats: Record<CategoryKey, number>): Record<SkillKey, number> {
  const result: Partial<Record<SkillKey, number>> = {}
  for (const [cat, value] of Object.entries(cats) as [CategoryKey, number][]) {
    for (const skill of CATEGORY_SKILLS[cat]) result[skill] = value
  }
  return result as Record<SkillKey, number>
}

/** Compute category averages from a full 24-skill map */
export function skillsToCategories(skills: Partial<Record<SkillKey, number>>): Record<CategoryKey, number> {
  const result: Partial<Record<CategoryKey, number>> = {}
  for (const [cat, keys] of Object.entries(CATEGORY_SKILLS) as [CategoryKey, SkillKey[]][]) {
    const vals = keys.map(k => skills[k] ?? 5)
    result[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  return result as Record<CategoryKey, number>
}

/** True if any skill in a category differs from the others (user has customized it) */
export function isCategoryCustomized(skills: Partial<Record<SkillKey, number>>, category: CategoryKey): boolean {
  const keys = CATEGORY_SKILLS[category]
  const vals = keys.map(k => skills[k] ?? 5)
  return vals.some(v => v !== vals[0])
}
```

### Step 4: Run tests — expect all to PASS

```bash
npx vitest run src/lib/rating-utils.test.ts
```

Expected: `15 tests passed`

### Step 5: Commit

```bash
git add src/lib/rating-utils.ts src/lib/rating-utils.test.ts
git commit -m "feat: add rating-utils with skill/category conversion helpers (TDD)"
```

---

## Task 4: PlayerRatingForm Shared Component

**Files:**
- Create: `src/components/ui/PlayerRatingForm.tsx`
- Modify: `src/components/ui/index.ts` (add export)

This is the core UI component used by both the group hub and the post-match page.

### Step 1: Create `src/components/ui/PlayerRatingForm.tsx`

```tsx
'use client'

import { useState, useCallback } from 'react'
import type { SkillKey, CategoryKey } from '@/lib/rating-utils'
import {
  CATEGORY_SKILLS,
  categoryToSkills,
  skillsToCategory,
  categoriesToSkills,
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
```

### Step 2: Export from index

Open `src/components/ui/index.ts` and add:

```ts
export { PlayerRatingForm } from './PlayerRatingForm'
export type { PlayerRatingFormProps, RatingPlayer } from './PlayerRatingForm'
```

### Step 3: TypeScript check

```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Step 4: Commit

```bash
git add src/components/ui/PlayerRatingForm.tsx src/components/ui/index.ts
git commit -m "feat: add PlayerRatingForm shared component with expandable categories and comment"
```

---

## Task 5: Group Ratings Hub

**Files:**
- Modify: `src/app/(app)/groups/[groupId]/ratings/page.tsx` (complete rewrite)

This page becomes a client component with two internal views: LIST and RATING.

```tsx
'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Avatar, PlayerRatingForm, useToast } from '@/components/ui'
import type { RatingPlayer } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { submitGroupRatings } from '@/lib/actions/matches'
import { categoriesToSkills, skillsToCategories, CATEGORY_SKILLS } from '@/lib/rating-utils'
import type { SkillKey, CategoryKey } from '@/lib/rating-utils'

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
        if (self) { setSelectedPlayer(self); setView('rating') }
      }
    }
    void load()
  }, [groupId, router, selfOnly])

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
    const isSequential = sequentialQueue.length > 0 || ratedIds.has(selectedPlayer.user_id) === false
    const totalToRate = unrated.length + (ratedIds.has(selectedPlayer.user_id) ? 0 : 1)
    const doneCount = members.length - unrated.length + (ratedIds.has(selectedPlayer.user_id) ? 1 : 0)

    return (
      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => { setView('list'); setSelectedPlayer(null); setSequentialQueue([]) }}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', fontSize: '0.875rem', padding: 0, textAlign: 'left' }}
        >
          ← Torna alla lista
        </button>
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
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>🔍</span>
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
```

### Step 2: TypeScript check + run tests

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 errors, 15 tests passed.

### Step 3: Commit

```bash
git add src/app/\(app\)/groups/\[groupId\]/ratings/page.tsx
git commit -m "feat: redesign group ratings as searchable hub with per-player status and list/rating views"
```

---

## Task 6: Post-Match Rating — Avatar Nav + PlayerRatingForm

**Files:**
- Modify: `src/app/(app)/matches/[matchId]/rate/page.tsx` (complete rewrite)

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar, PlayerRatingForm } from '@/components/ui'
import type { RatingPlayer } from '@/components/ui'
import { submitRatings } from '@/lib/actions/matches'
import type { SkillKey } from '@/lib/rating-utils'
import { CATEGORY_SKILLS } from '@/lib/rating-utils'

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
      if (res.error) return
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
      <span style={{ fontSize: '3rem' }}>{done ? '⭐' : '👍'}</span>
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
      <span style={{ fontSize: '2.5rem' }}>👥</span>
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
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>✓</div>
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
```

### Step 2: TypeScript check + run tests

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 errors, 15 tests passed.

### Step 3: Commit

```bash
git add src/app/\(app\)/matches/\[matchId\]/rate/page.tsx
git commit -m "feat: post-match rating with avatar nav bar and expandable skill categories"
```

---

## Task 7: Comments Display on Player Dashboard + Profile

**Files:**
- Modify: `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`

### Step 1: Add comments query to player dashboard

In `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`, extend the `Promise.all` to add a comments query (add after `ratingsRes`):

```ts
// In the Promise.all, ADD a 6th item:
supabase
  .from('player_ratings')
  .select('comment, rater_id, created_at')
  .eq('group_id', groupId)
  .eq('ratee_id', userId)
  .not('comment', 'is', null)
  .order('created_at', { ascending: false })
  .limit(20),
```

Destructure it:
```ts
const [profileRes, groupRes, statsRes, badgesRes, ratingsRes, commentsRes] = await Promise.all([...])
```

Then fetch rater profiles:
```ts
const rawComments = (commentsRes.data ?? []) as { comment: string | null; rater_id: string; created_at: string }[]
const raterIds = rawComments.map(c => c.rater_id)
const { data: raterProfiles } = raterIds.length > 0
  ? await supabase.from('profiles').select('id, username, avatar_url').in('id', raterIds)
  : { data: [] as { id: string; username: string; avatar_url: string | null }[] }

const raterMap = Object.fromEntries((raterProfiles ?? []).map(p => [p.id, p]))
const comments = rawComments
  .filter(c => c.comment)
  .map(c => ({
    text: c.comment as string,
    raterId: c.rater_id,
    raterUsername: raterMap[c.rater_id]?.username ?? 'Anonimo',
    raterAvatar: raterMap[c.rater_id]?.avatar_url ?? null,
    createdAt: c.created_at,
  }))
```

Helper for relative time (add near the other helpers at top of file):
```ts
function relativeTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days}g fa`
  if (days < 30) return `${Math.floor(days / 7)}sett fa`
  return `${Math.floor(days / 30)}mesi fa`
}
```

Add the comments JSX section in the render, below the skill radar and above badges. Insert this block:

```tsx
{comments.length > 0 && (
  <div>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
      💬 Dicono di {isMe ? 'te' : 'lui'} ({comments.length})
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {comments.slice(0, 3).map((c, i) => (
        <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTime(c.createdAt)}</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
            &ldquo;{c.text}&rdquo;
          </p>
        </div>
      ))}
      {comments.length > 3 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, padding: '0.25rem 0' }}>
            Vedi tutti ({comments.length - 3} altri)
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {comments.slice(3).map((c, i) => (
              <div key={i} style={{ padding: '0.875rem 1rem', background: 'var(--color-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  <Avatar src={c.raterAvatar} name={c.raterUsername} size="xs" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>@{c.raterUsername}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{relativeTime(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  &ldquo;{c.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  </div>
)}
```

### Step 2: Add comments to own profile page

In `src/app/(app)/profile/page.tsx`, extend the `Promise.all` with a 6th query:

```ts
supabase
  .from('player_ratings')
  .select('comment, rater_id, created_at')
  .eq('ratee_id', user.id)
  .not('comment', 'is', null)
  .order('created_at', { ascending: false })
  .limit(20),
```

Destructure and process raters the same way as in Step 1, then add the same JSX section in the profile render (between the radar chart and the badges section).

In profile page the title changes to `Dicono di me`.

### Step 3: TypeScript check + run tests

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 errors, 15 tests passed.

### Step 4: Commit

```bash
git add src/app/\(app\)/groups/\[groupId\]/players/\[userId\]/page.tsx src/app/\(app\)/profile/page.tsx
git commit -m "feat: add 'Dicono di lui/me' comments section to player dashboard and profile"
```

---

## Task 8: Final Checks + Push

### Step 1: Full TypeScript check

```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Step 2: Full test suite

```bash
npx vitest run
```

Expected: all tests pass (15 rating-utils + 10 team-balancer = 25 total).

### Step 3: Commit docs

```bash
git add docs/plans/
git commit -m "docs: add rating-v2 hybrid sliders comments hub design and implementation plan"
```

### Step 4: Push

```bash
git push origin master
```

---

## Files Changed Summary

| File | Type | Change |
|------|------|--------|
| `supabase/migrations/012_player_rating_comment.sql` | NEW | Add `comment text` column |
| `src/types/database.ts` | MODIFY | Add `comment: string \| null` to `PlayerRating` |
| `src/lib/actions/matches.ts` | MODIFY | Add `comment?` to both submit functions |
| `src/lib/rating-utils.ts` | NEW | Pure skill↔category conversion utilities |
| `src/lib/rating-utils.test.ts` | NEW | 15 unit tests (TDD) |
| `src/components/ui/PlayerRatingForm.tsx` | NEW | Expandable hybrid slider + comment component |
| `src/components/ui/index.ts` | MODIFY | Export PlayerRatingForm |
| `src/app/(app)/groups/[groupId]/ratings/page.tsx` | REWRITE | Hub: list+search+status+sequential mode |
| `src/app/(app)/matches/[matchId]/rate/page.tsx` | REWRITE | Avatar nav bar + PlayerRatingForm |
| `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx` | MODIFY | Comments section |
| `src/app/(app)/profile/page.tsx` | MODIFY | Comments section |
