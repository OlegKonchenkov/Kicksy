# FIFA Card + Badge Showcase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain player hero card with a tier-based FIFA-style card showing OVR + 6 skill bars, and replace the basic BadgeShelf with a full grid of all 21 badges (earned + locked silhouettes with unlock hints).

**Architecture:** Two new shared UI components (`PlayerFIFACard`, `BadgeShowcase`) used by both the group player dashboard and the personal profile page. OVR is computed server-side from `getPlayerOverall()` in `team-balancer.ts`. All 21 badges are fetched alongside earned badges so locked ones can be shown.

**Tech Stack:** Next.js 15 App Router (server components), React inline styles, Supabase JS client, existing `getPlayerOverall` from `src/lib/team-balancer.ts`.

---

## Context: key types and functions

```ts
// src/lib/team-balancer.ts
export interface SkillSet {
  velocita: number; resistenza: number; forza: number; salto: number; agilita: number
  tecnica_palla: number; dribbling: number; passaggio: number; tiro: number; colpo_di_testa: number
  lettura_gioco: number; posizionamento: number; pressing: number; costruzione: number
  marcatura: number; tackle: number; intercettamento: number; copertura: number
  finalizzazione: number; assist_making: number
  leadership: number; comunicazione: number; mentalita_competitiva: number; fair_play: number
}

export interface PlayerInput {
  id: string
  role: PlayerRole     // 'D' | 'C' | 'E' | 'W' | 'A'
  role2?: PlayerRole
  skills: SkillSet
  ratingCount: number
}

// Returns 0-100 (e.g. all-5.5 skills → 55, all-8 → ~80)
export function getPlayerOverall(player: PlayerInput): number
```

OVR tier thresholds (ratingCount === 0 → show "—", no tier):
- 60–74 → Bronze (`#cd7f32`)
- 75–84 → Silver (`#a8a8a8`)
- 85–91 → Gold (`#FFD700`)
- 92+ → Elite (`#C8FF6B`)

Category skill mapping (matches `CATEGORY_SKILLS` in `rating-utils.ts`):
```
FIS: velocita, resistenza, forza, salto, agilita
TEC: tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa
TAT: lettura_gioco, posizionamento, pressing, costruzione
DIF: marcatura, tackle, intercettamento, copertura
ATT: finalizzazione, assist_making
MEN: leadership, comunicazione, mentalita_competitiva, fair_play
```

Category colors (for skill bars):
```
FIS: '#3B82F6'  TEC: '#C8FF6B'  TAT: '#FFB800'
DIF: '#EF4444'  ATT: '#F97316'  MEN: '#A855F7'
```

---

## Task 1: `PlayerFIFACard` component

**Files:**
- Create: `src/components/ui/PlayerFIFACard.tsx`
- Modify: `src/components/ui/index.ts`

**Step 1: Create the component**

```tsx
// src/components/ui/PlayerFIFACard.tsx
'use client'

import { Avatar } from '@/components/ui/Avatar'
import type { PlayerRole } from '@/types'

export type FIFASkillBar = {
  abbr: string       // 'FIS', 'TEC', 'TAT', 'DIF', 'ATT', 'MEN'
  label: string      // 'Fisica', etc.
  value: number      // 1–10 average; 0 = no ratings
  color: string      // hex
}

export type PlayerFIFACardProps = {
  player: {
    user_id: string
    username: string
    full_name: string | null
    avatar_url: string | null
    level: number
    preferred_role: PlayerRole | null
    preferred_role_2?: PlayerRole | null
  }
  /** 0 = no ratings yet (shows "—" and no tier) */
  ovr: number
  skillBars: FIFASkillBar[]   // always 6 items, same order as above
  isMe?: boolean
  isAdmin?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  D: 'Difensore', C: 'Centrocampista', E: 'Esterno', W: 'Trequartista', A: 'Attaccante',
}

type Tier = { label: string; color: string; glow: string }

function getTier(ovr: number, hasRatings: boolean): Tier | null {
  if (!hasRatings) return null
  if (ovr >= 92) return { label: 'ELITE', color: '#C8FF6B', glow: 'rgba(200,255,107,0.25)' }
  if (ovr >= 85) return { label: 'ORO',   color: '#FFD700', glow: 'rgba(255,215,0,0.20)'   }
  if (ovr >= 75) return { label: 'ARG',   color: '#a8a8a8', glow: 'rgba(168,168,168,0.18)' }
  if (ovr >= 60) return { label: 'BRZ',   color: '#cd7f32', glow: 'rgba(205,127,50,0.20)'  }
  return null
}

export function PlayerFIFACard({
  player, ovr, skillBars, isMe = false, isAdmin = false,
}: PlayerFIFACardProps) {
  const hasRatings = ovr > 0
  const tier = getTier(ovr, hasRatings)

  const cardBg = tier
    ? `radial-gradient(ellipse at 85% 110%, ${tier.glow}, transparent 60%), var(--color-surface)`
    : 'var(--color-surface)'
  const cardBorder = tier
    ? `1px solid ${tier.color}30`
    : `1px solid ${isMe ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}`

  return (
    <div style={{
      background: cardBg,
      borderRadius: 'var(--radius-lg)',
      border: cardBorder,
      padding: '1.125rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
    }}>
      {/* ── Row 1: avatar + name + OVR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {/* Avatar */}
        <div style={{
          flexShrink: 0,
          filter: tier ? `drop-shadow(0 0 8px ${tier.glow})` : undefined,
        }}>
          <Avatar
            src={player.avatar_url}
            name={player.full_name ?? player.username}
            size="lg"
          />
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.375rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {player.full_name ?? player.username}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.375rem' }}>
            {/* Level */}
            <span style={{
              padding: '0.125rem 0.4rem',
              background: 'rgba(200,255,107,0.12)',
              border: '1px solid rgba(200,255,107,0.3)',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}>Lv.{player.level}</span>
            {/* Role */}
            {player.preferred_role && (
              <span style={{
                padding: '0.125rem 0.4rem',
                background: 'var(--color-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-2)',
              }}>{ROLE_LABELS[player.preferred_role] ?? player.preferred_role}</span>
            )}
            {/* Admin */}
            {isAdmin && (
              <span style={{
                padding: '0.125rem 0.4rem',
                background: 'rgba(255,184,0,0.12)',
                border: '1px solid rgba(255,184,0,0.3)',
                borderRadius: 999,
                fontFamily: 'var(--font-display)',
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--color-secondary)',
              }}>Admin</span>
            )}
          </div>
        </div>

        {/* OVR block */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: hasRatings ? '2rem' : '1.25rem',
            fontWeight: 700,
            lineHeight: 1,
            color: tier ? tier.color : 'var(--color-text-3)',
          }}>
            {hasRatings ? ovr : '—'}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: tier ? tier.color : 'var(--color-text-3)',
            marginTop: '0.1rem',
          }}>
            {tier ? tier.label : 'OVR'}
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{
        height: 1,
        background: tier ? `${tier.color}20` : 'var(--color-border)',
      }} />

      {/* ── Skill bars: 2 columns × 3 rows ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.25rem' }}>
        {skillBars.map(bar => (
          <div key={bar.abbr} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* Label */}
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: bar.color,
              width: 26,
              flexShrink: 0,
            }}>{bar.abbr}</span>
            {/* Bar track */}
            <div style={{
              flex: 1,
              height: 4,
              background: 'var(--color-elevated)',
              borderRadius: 999,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: hasRatings ? `${Math.round((bar.value / 10) * 100)}%` : '0%',
                background: bar.color,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }} />
            </div>
            {/* Value */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: hasRatings ? bar.color : 'var(--color-text-3)',
              width: 18,
              textAlign: 'right',
              flexShrink: 0,
            }}>
              {hasRatings ? bar.value.toFixed(1) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Add export to index.ts**

Add at the end of `src/components/ui/index.ts`:
```ts
export { PlayerFIFACard } from './PlayerFIFACard'
export type { PlayerFIFACardProps, FIFASkillBar } from './PlayerFIFACard'
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add src/components/ui/PlayerFIFACard.tsx src/components/ui/index.ts
git commit -m "feat: add PlayerFIFACard component with tier system and skill bars"
```

---

## Task 2: `BadgeShowcase` component

**Files:**
- Create: `src/components/ui/BadgeShowcase.tsx`
- Modify: `src/components/ui/index.ts`

**Step 1: Create the component**

```tsx
// src/components/ui/BadgeShowcase.tsx
'use client'

import type { Badge, PlayerBadge } from '@/types'

export type BadgeShowcaseProps = {
  earnedBadges: Array<PlayerBadge & { badge: Badge }>
  allBadges: Badge[]
}

const TIER_CONFIG = {
  bronze: { color: '#cd7f32', glow: 'rgba(205,127,50,0.45)',  bg: 'rgba(205,127,50,0.12)' },
  silver: { color: '#a8a8a8', glow: 'rgba(168,168,168,0.40)', bg: 'rgba(168,168,168,0.10)' },
  gold:   { color: '#FFD700', glow: 'rgba(255,215,0,0.45)',   bg: 'rgba(255,215,0,0.12)'  },
}

// Maps condition_type + condition_value → short Italian hint
function badgeHint(badge: Badge): string {
  const n = badge.condition_value
  switch (badge.condition_type) {
    case 'matches_played':  return `${n} partite`
    case 'goals_scored':    return `${n} gol`
    case 'matches_won':     return `${n} vittorie`
    case 'win_streak':      return `${n} vitt. di fila`
    case 'mvp_count':       return `${n} MVP`
    case 'assists':         return `${n} assist`
    case 'ratings_given':   return `${n} valutazioni`
    case 'groups_created':  return 'Crea un gruppo'
    case 'invites_sent':    return `${n} inviti`
    case 'early_adopter':   return 'Pioniere'
    case 'clean_sheets':    return `${n} clean sheet`
    default:                return ''
  }
}

function EarnedBadgeItem({ pb }: { pb: PlayerBadge & { badge: Badge } }) {
  const { badge } = pb
  const tier = TIER_CONFIG[badge.tier]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: tier.bg,
        border: `2px solid ${pb.equipped ? tier.color : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        boxShadow: pb.equipped ? `0 0 14px ${tier.glow}` : 'none',
        position: 'relative',
        transition: 'all 0.2s',
      }}>
        {badge.icon}
        {pb.equipped && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 11, height: 11, borderRadius: '50%',
            background: tier.color, border: '2px solid var(--color-bg)',
          }} />
        )}
      </div>
      <span style={{
        fontSize: '0.58rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: pb.equipped ? tier.color : 'var(--color-text-2)',
        textAlign: 'center',
        maxWidth: 52,
        lineHeight: 1.2,
      }}>{badge.name_it}</span>
    </div>
  )
}

function LockedBadgeItem({ badge }: { badge: Badge }) {
  const tier = TIER_CONFIG[badge.tier]
  const hint = badgeHint(badge)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--color-elevated)',
        border: `2px solid ${tier.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        filter: 'grayscale(1)',
        opacity: 0.38,
        position: 'relative',
      }}>
        {badge.icon}
        {/* Lock overlay */}
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.55rem',
        }}>🔒</div>
      </div>
      <span style={{
        fontSize: '0.58rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-3)',
        textAlign: 'center',
        maxWidth: 52,
        lineHeight: 1.2,
      }}>{badge.name_it}</span>
      {hint && (
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: `${tier.color}70`,
          textAlign: 'center',
          maxWidth: 52,
          lineHeight: 1.2,
        }}>{hint}</span>
      )}
    </div>
  )
}

export function BadgeShowcase({ earnedBadges, allBadges }: BadgeShowcaseProps) {
  const earnedKeys = new Set(earnedBadges.map(pb => pb.badge.key))
  const lockedBadges = allBadges.filter(b => !earnedKeys.has(b.key))

  const sectionLabel: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-3)',
    marginBottom: '0.625rem',
  }

  const grid: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.875rem 1rem',
    alignItems: 'flex-start',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {earnedBadges.length > 0 && (
        <div>
          <div style={sectionLabel}>✅ Sbloccati ({earnedBadges.length})</div>
          <div style={grid}>
            {earnedBadges.map(pb => <EarnedBadgeItem key={pb.id} pb={pb} />)}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <div style={sectionLabel}>🔒 Da sbloccare ({lockedBadges.length})</div>
          <div style={grid}>
            {lockedBadges.map(b => <LockedBadgeItem key={b.id} badge={b} />)}
          </div>
        </div>
      )}

      {earnedBadges.length === 0 && allBadges.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          Nessun badge disponibile.
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add export to index.ts**

```ts
export { BadgeShowcase } from './BadgeShowcase'
export type { BadgeShowcaseProps } from './BadgeShowcase'
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors. Note: if `Badge` type doesn't have `condition_type` / `condition_value` fields, add them — see next task.

**Step 4: Commit**

```bash
git add src/components/ui/BadgeShowcase.tsx src/components/ui/index.ts
git commit -m "feat: add BadgeShowcase with locked/unlocked grid and unlock hints"
```

---

## Task 3: Extend `Badge` type with condition fields

The `BadgeShowcase` uses `badge.condition_type` and `badge.condition_value`. Check `src/types/database.ts`:

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Check current Badge type**

Open `src/types/database.ts` and find the `Badge` type. It should have `condition_type` and `condition_value`. If missing, add them:

```ts
export type Badge = {
  id: string
  key: string
  name_it: string
  name_en: string
  description_it: string
  description_en: string
  icon: string
  tier: BadgeTier
  condition_type: string      // ← add if missing
  condition_value: number     // ← add if missing
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Commit (only if changed)**

```bash
git add src/types/database.ts
git commit -m "fix: add condition_type/condition_value to Badge type"
```

---

## Task 4: Update player dashboard (`[userId]/page.tsx`)

**Files:**
- Modify: `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`

### Step 1: Add imports at top of file

Replace:
```ts
import { Avatar, RadarChart } from '@/components/ui'
```
With:
```ts
import { Avatar, RadarChart, PlayerFIFACard, BadgeShowcase } from '@/components/ui'
import type { FIFASkillBar } from '@/components/ui'
import { getPlayerOverall } from '@/lib/team-balancer'
import type { SkillSet } from '@/lib/team-balancer'
```

### Step 2: Add all-badges query to Promise.all

The current `Promise.all` has 6 items. Add a 7th:

```ts
const [profileRes, groupRes, statsRes, badgesRes, ratingsRes, commentsRes, allBadgesRes] = await Promise.all([
  // ... existing 6 queries unchanged ...
  supabase.from('badges').select('*').order('tier').order('condition_value'),
])
```

### Step 3: Compute per-skill averages (24 skills) and OVR

Add this block after the `skillAverages` computation (after line ~152):

```ts
// ── Per-skill averages for OVR ─────────────────────────────────────────────
const SKILL_FIELDS: (keyof SkillSet)[] = [
  'velocita', 'resistenza', 'forza', 'salto', 'agilita',
  'tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa',
  'lettura_gioco', 'posizionamento', 'pressing', 'costruzione',
  'marcatura', 'tackle', 'intercettamento', 'copertura',
  'finalizzazione', 'assist_making',
  'leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play',
]

const avgSkills = Object.fromEntries(
  SKILL_FIELDS.map(k => [k, computeAvg(ratingRows, [k])])
) as SkillSet

const ovr = ratingRows.length > 0
  ? getPlayerOverall({
      id: userId,
      role: (profile.preferred_role ?? 'C') as import('@/types').PlayerRole,
      role2: profile.preferred_role_2 as import('@/types').PlayerRole | undefined,
      skills: avgSkills,
      ratingCount: ratingRows.length,
    })
  : 0

// ── FIFA skill bars (6 categories) ────────────────────────────────────────
const fifaSkillBars: FIFASkillBar[] = [
  { abbr: 'FIS', label: 'Fisica',    value: skillAverages[0].avg, color: '#3B82F6' },
  { abbr: 'TEC', label: 'Tecnica',   value: skillAverages[1].avg, color: '#C8FF6B' },
  { abbr: 'TAT', label: 'Tattica',   value: skillAverages[2].avg, color: '#FFB800' },
  { abbr: 'DIF', label: 'Difesa',    value: skillAverages[3].avg, color: '#EF4444' },
  { abbr: 'ATT', label: 'Attacco',   value: skillAverages[4].avg, color: '#F97316' },
  { abbr: 'MEN', label: 'Mentalità', value: skillAverages[5].avg, color: '#A855F7' },
]

// ── All badges for showcase ────────────────────────────────────────────────
const allBadges = (allBadgesRes.data ?? []) as import('@/types').Badge[]
```

### Step 4: Replace hero card JSX with `PlayerFIFACard`

Find the `{/* Player hero card */}` div (lines ~233–400 approximately) and replace the entire div with:

```tsx
{/* Player FIFA card */}
<PlayerFIFACard
  player={{
    user_id: userId,
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    level: profile.level,
    preferred_role: profile.preferred_role,
    preferred_role_2: profile.preferred_role_2,
  }}
  ovr={ovr}
  skillBars={fifaSkillBars}
  isMe={isMe}
  isAdmin={isCurrentUserAdmin}
/>
```

Note: the old hero card section also contains Level/Role/Admin badges and the "link to my profile" button. Keep those separately OR include `isAdmin` in the card. The card already renders level, role, admin badges — so the old inline badges can be removed.

The "Il mio profilo →" link should be kept as a standalone element below the card (it was already outside the hero card div before the card).

### Step 5: Replace `BadgeShelf` usage with `BadgeShowcase`

Find the `{hasBadges && (` section (around line ~596) and replace it with:

```tsx
{/* Badge Showcase */}
{(hasBadges || allBadges.length > 0) && (
  <div style={{
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    padding: '1.25rem',
  }}>
    <h3 style={{
      fontFamily: 'var(--font-display)',
      fontSize: '0.8125rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-text-2)',
      marginBottom: '1rem',
    }}>🏅 Badge</h3>
    <BadgeShowcase earnedBadges={badgeRows} allBadges={allBadges} />
  </div>
)}
```

### Step 6: TypeScript check

```bash
npx tsc --noEmit
```
Expected: 0 errors. Fix any type errors before continuing.

### Step 7: Commit

```bash
git add "src/app/(app)/groups/[groupId]/players/[userId]/page.tsx"
git commit -m "feat: FIFA card + badge showcase on player dashboard"
```

---

## Task 5: Update profile page (`profile/page.tsx`)

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`

### Step 1: Add imports

Add alongside existing imports:
```ts
import { PlayerFIFACard, BadgeShowcase } from '@/components/ui'
import type { FIFASkillBar } from '@/components/ui'
import { getPlayerOverall } from '@/lib/team-balancer'
import type { SkillSet } from '@/lib/team-balancer'
```

### Step 2: Add all-badges query

Same as Task 4 Step 2: add `supabase.from('badges').select('*').order('tier').order('condition_value')` as a new item in the `Promise.all` and destructure `allBadgesRes`.

### Step 3: Add OVR + skill bars computation

Same logic as Task 4 Step 3. In `profile/page.tsx` the user's own rating data comes from `ratingRows` (ratings received from peers). The `profile.preferred_role` is the profile's role. Add the same block.

### Step 4: Replace hero section with `PlayerFIFACard`

Find the profile hero card (the div with avatar, name, level, XPBar) and replace the avatar+name+badges portion with:

```tsx
<PlayerFIFACard
  player={{
    user_id: profile.id,
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    level: profile.level,
    preferred_role: profile.preferred_role,
    preferred_role_2: profile.preferred_role_2,
  }}
  ovr={ovr}
  skillBars={fifaSkillBars}
  isMe={true}
/>
```

Keep the `XPBar` section below the card (it's separate in the profile page).

### Step 5: Replace BadgeShelf with BadgeShowcase

Same as Task 4 Step 5: find the badges section and replace `<BadgeShelf>` with `<BadgeShowcase earnedBadges={badges} allBadges={allBadges} />`.

### Step 6: TypeScript check + tests

```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errors, 20 tests pass.

### Step 7: Commit

```bash
git add "src/app/(app)/profile/page.tsx"
git commit -m "feat: FIFA card + badge showcase on profile page"
```

---

## Task 6: Push

```bash
git push origin master
```

---

## Verification checklist

- [ ] Player dashboard shows FIFA card (avatar, name, level, role, OVR number, 6 skill bars)
- [ ] No ratings → OVR shows "—", no tier gradient
- [ ] 60-74 OVR → Bronze copper glow
- [ ] 75-84 OVR → Silver cool gradient
- [ ] 85-91 OVR → Gold amber shimmer
- [ ] 92+ OVR → Elite lime glow (brand color)
- [ ] Badge grid shows earned badges with tier glow + equipped dot
- [ ] Badge grid shows all locked badges as greyed silhouette + 🔒 + hint text
- [ ] Profile page shows same FIFA card with `isMe=true` (lime name)
- [ ] TypeScript: 0 errors
- [ ] Tests: 20/20 pass
