# Radar Chart, Maps Location, Role-Balanced Formation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add spider/radar charts to player dashboards, clickable Maps links for match location, and a visual football pitch formation view with role-aware team balancing.

**Architecture:** Three independent features; no DB migrations required. RadarChart is a new reusable SVG component. Maps integration modifies MatchCard and edit page. Formation view adds a new PitchFormation component + integrates into the existing teams page with click-to-swap admin interaction.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase, lucide-react, framer-motion, inline styles (no Tailwind classes in JSX), pure SVG for radar chart.

---

## Task 1: RadarChart SVG Component

**Files:**
- Create: `src/components/ui/RadarChart.tsx`
- Modify: `src/components/ui/index.ts`

**Step 1: Create the RadarChart component**

Create `src/components/ui/RadarChart.tsx`:

```tsx
'use client'

interface RadarChartProps {
  data: Record<string, number>   // e.g. { Fisica: 8.0, Tecnica: 7.0, ... }
  colors: Record<string, string> // same keys as data
  size?: number                   // default 220
  maxValue?: number               // default 10
}

export function RadarChart({ data, colors, size = 220, maxValue = 10 }: RadarChartProps) {
  const keys = Object.keys(data)
  const n = keys.length
  if (n < 3) return null

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36          // radius of outer ring
  const labelR = size * 0.48     // radius for labels

  // Angle for each axis (start from top, go clockwise)
  function angle(i: number) {
    return (Math.PI * 2 * i) / n - Math.PI / 2
  }

  function point(i: number, value: number) {
    const ratio = Math.min(value / maxValue, 1)
    const a = angle(i)
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }
  }

  function outerPoint(i: number) {
    const a = angle(i)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }

  function labelPoint(i: number) {
    const a = angle(i)
    return { x: cx + labelR * Math.cos(a), y: cy + labelR * Math.sin(a) }
  }

  // Build the filled polygon path from data values
  const dataPoints = keys.map((k, i) => point(i, data[k] ?? 0))
  const polyPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  // Build grid rings at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {gridLevels.map((level, li) => {
        const pts = keys.map((_, i) => {
          const a = angle(i)
          return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`
        })
        return (
          <polygon
            key={li}
            points={pts.join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        )
      })}

      {/* Axis lines from center */}
      {keys.map((_, i) => {
        const op = outerPoint(i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={op.x} y2={op.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        )
      })}

      {/* Filled data polygon */}
      <path
        d={polyPath}
        fill="rgba(200,255,107,0.15)"
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data point dots colored by category */}
      {keys.map((k, i) => {
        const p = point(i, data[k] ?? 0)
        const color = colors[k] ?? 'var(--color-primary)'
        return (
          <circle key={k} cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--color-bg)" strokeWidth={1.5} />
        )
      })}

      {/* Axis labels */}
      {keys.map((k, i) => {
        const lp = labelPoint(i)
        const color = colors[k] ?? 'var(--color-text-2)'
        // Anchor: left side = start, right side = end, top/bottom = middle
        const a = angle(i) * (180 / Math.PI)
        const anchor = Math.abs(a + 90) < 20 || Math.abs(a - 90) < 20
          ? 'middle'
          : (Math.cos(angle(i)) > 0.1 ? 'start' : Math.cos(angle(i)) < -0.1 ? 'end' : 'middle')
        return (
          <text
            key={k}
            x={lp.x}
            y={lp.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={9}
            fontFamily="var(--font-display)"
            fontWeight={700}
            textTransform="uppercase"
            letterSpacing="0.06em"
            fill={color}
            style={{ textTransform: 'uppercase' }}
          >
            {k}
          </text>
        )
      })}
    </svg>
  )
}
```

**Step 2: Export from index**

In `src/components/ui/index.ts`, add at the end:
```ts
export { RadarChart } from './RadarChart'
```

**Step 3: Commit**
```bash
git add src/components/ui/RadarChart.tsx src/components/ui/index.ts
git commit -m "feat: add RadarChart SVG component"
```

---

## Task 2: Radar Chart in Player Dashboard

**Files:**
- Modify: `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`

**Step 1: Add RadarChart import**

At the top of the file, add `RadarChart` to the existing import from `@/components/ui`:
```ts
import { Avatar, RadarChart } from '@/components/ui'
```

**Step 2: Add radar section after the skill bars section**

The current skill bars section ends around:
```tsx
        </div>
        </div>
      )}
```
(the closing of the `{hasRatings && (` block)

After that closing `)}`, add:

```tsx
      {/* Radar chart */}
      {hasRatings && skillAverages.every(s => s.avg > 0) && (
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-3)',
            marginBottom: '0.875rem',
          }}>
            Profilo Skill
          </h2>
          <div style={{
            padding: '1.25rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <RadarChart
              data={Object.fromEntries(skillAverages.map(s => [s.name, s.avg]))}
              colors={categoryColors}
              size={220}
            />
          </div>
        </div>
      )}
```

**Step 3: Commit**
```bash
git add src/app/\(app\)/groups/\[groupId\]/players/\[userId\]/page.tsx
git commit -m "feat: add radar chart to player dashboard"
```

---

## Task 3: Radar Chart in Profile Page

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`

**Step 1: Add RadarChart import and fetch peer ratings**

In `src/app/(app)/profile/page.tsx`:

Add `RadarChart` to the `@/components/ui` import at the top.

Change the data fetching: add a fifth parallel query for `player_ratings` across ALL groups:
```ts
const [profileRes, statsRes, badgesRes, groupsRes, ratingsRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  supabase.from('player_stats').select('*').eq('user_id', user.id),
  supabase.from('player_badges').select('*, badges(*)').eq('user_id', user.id).order('earned_at', { ascending: false }),
  supabase
    .from('group_members')
    .select('group_id, groups(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true),
  supabase
    .from('player_ratings')
    .select('velocita,resistenza,forza,salto,agilita,tecnica_palla,dribbling,passaggio,tiro,colpo_di_testa,lettura_gioco,posizionamento,pressing,costruzione,marcatura,tackle,intercettamento,copertura,finalizzazione,assist_making,leadership,comunicazione,mentalita_competitiva,fair_play')
    .eq('ratee_id', user.id),
])
```

**Step 2: Compute skill averages from peer ratings**

After the existing `const winRate = ...` line, add:

```ts
const ratingRows = (ratingsRes.data ?? []) as Record<string, number | null>[]
const hasProfileRatings = ratingRows.length > 0

const profileCategoryColors: Record<string, string> = {
  Fisica: '#FF6B6B', Tecnica: '#FFD93D', Tattica: '#6BCB77',
  Difesa: '#4D96FF', Attacco: 'var(--color-primary)', 'Mentalità': '#C77DFF',
}

const profileSkillCategories = [
  { name: 'Fisica', fields: ['velocita', 'resistenza', 'forza', 'salto', 'agilita'] },
  { name: 'Tecnica', fields: ['tecnica_palla', 'dribbling', 'passaggio', 'tiro', 'colpo_di_testa'] },
  { name: 'Tattica', fields: ['lettura_gioco', 'posizionamento', 'pressing', 'costruzione'] },
  { name: 'Difesa', fields: ['marcatura', 'tackle', 'intercettamento', 'copertura'] },
  { name: 'Attacco', fields: ['finalizzazione', 'assist_making'] },
  { name: 'Mentalità', fields: ['leadership', 'comunicazione', 'mentalita_competitiva', 'fair_play'] },
]

function computeProfileAvg(rows: Record<string, number | null>[], fields: string[]): number {
  let sum = 0; let count = 0
  for (const row of rows) {
    for (const f of fields) {
      const v = row[f]; if (v != null) { sum += v; count++ }
    }
  }
  return count === 0 ? 0 : Math.round((sum / count) * 10) / 10
}

const profileSkillAverages = profileSkillCategories.map(cat => ({
  name: cat.name,
  avg: computeProfileAvg(ratingRows, cat.fields),
}))
```

**Step 3: Add radar section in the JSX**

In the return JSX, after the `{/* Autovalutazione */}` section (which has the list of group links), add a new section:

```tsx
      {hasProfileRatings && (
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-3)',
            marginBottom: '0.875rem',
          }}>
            Profilo Skill (media compagni)
          </h2>
          <div style={{
            padding: '1.25rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <RadarChart
              data={Object.fromEntries(profileSkillAverages.map(s => [s.name, s.avg]))}
              colors={profileCategoryColors}
              size={220}
            />
          </div>
        </div>
      )}
```

**Step 4: Commit**
```bash
git add src/app/\(app\)/profile/page.tsx
git commit -m "feat: add radar chart to profile page with aggregated peer ratings"
```

---

## Task 4: Google Maps Location Link

**Files:**
- Modify: `src/components/ui/MatchCard.tsx`
- Modify: `src/app/(app)/matches/[matchId]/edit/page.tsx`

### 4a: MatchCard — clickable location

In `src/components/ui/MatchCard.tsx`, find:
```tsx
        {match.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-text-2)' }}>
            📍 {match.location}
          </span>
        )}
```

Replace with:
```tsx
        {match.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8125rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            📍 {match.location}
          </a>
        )}
```

### 4b: Edit page — "Verifica su Maps" link

In `src/app/(app)/matches/[matchId]/edit/page.tsx`, find the `<Input label="Luogo" ...>` line and add immediately after it:

```tsx
              {location.trim() && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none' }}
                >
                  📍 Verifica su Maps →
                </a>
              )}
```

**Step 3: Commit**
```bash
git add src/components/ui/MatchCard.tsx src/app/\(app\)/matches/\[matchId\]/edit/page.tsx
git commit -m "feat: make match location a clickable Google Maps link"
```

---

## Task 5: Role Imbalance Penalty in Team Balancer

**Files:**
- Modify: `src/lib/team-balancer.ts`

**Step 1: Add role group classification helper**

In `src/lib/team-balancer.ts`, after the `countNeverTogetherViolations` function (around line 186), add:

```ts
// ─── Role balance penalty ─────────────────────────────────────────────────

/**
 * Penalizes uneven role distribution across teams.
 * Groups: DEF={D,E}, MID={C,E}, ATT={A,W}
 * Note: E counts in BOTH DEF and MID groups.
 * Returns total penalty score.
 */
function computeRoleImbalancePenalty(
  team1: string[],
  team2: string[],
  roleMap: Map<string, PlayerRole>
): number {
  // For each role group, count per team
  const groups: { label: string; roles: PlayerRole[] }[] = [
    { label: 'DEF', roles: ['D', 'E'] },
    { label: 'MID', roles: ['C', 'E'] },
    { label: 'ATT', roles: ['A', 'W'] },
  ]

  let penalty = 0
  for (const { roles } of groups) {
    const t1count = team1.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const t2count = team2.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const diff = Math.abs(t1count - t2count)
    if (diff > 1) penalty += (diff - 1) * 30
  }
  return penalty
}
```

**Step 2: Thread roleMap through generateBalancedTeams**

In `generateBalancedTeams`, after building `overalls` map (around line 211), add:
```ts
  // Build role lookup map
  const roleMap = new Map<string, PlayerRole>()
  for (const p of players) roleMap.set(p.id, p.role)
```

**Step 3: Add role penalty to cost function**

In the simulated annealing loop, find:
```ts
    const prevCost = Math.abs(s1 - s2) + currentViolations * 1000
    const newCost = newDiff + newViolations * 1000
```

Replace with:
```ts
    const currentRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    // After the swap, compute new role penalty:
    const newRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    const prevCost = Math.abs(s1 - s2) + currentViolations * 1000 + currentRolePenalty
    const newCost = newDiff + newViolations * 1000 + newRolePenalty
```

Note: at this point in the code, team1[i1] is already swapped to id2 and team2[i2] to id1, so `newRolePenalty` measures the post-swap state, and `currentRolePenalty` is computed before the swap but reflects current state — we need to compute it BEFORE the swap lines. See the exact position in the file to be sure.

Actually, to be precise, look at the code flow:
1. `team1[i1] = id2; team2[i2] = id1` ← swap happens
2. `newViolations = countNeverTogetherViolations(...)` ← counts AFTER swap
3. `prevCost = ... currentViolations * 1000` ← pre-swap state

So compute `currentRolePenalty` BEFORE the swap (after `const id2 = team2[i2]` but before `team1[i1] = id2`):
```ts
    const currentRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    // ... swap ...
    team1[i1] = id2
    team2[i2] = id1
    // ... newViolations = ...
    const newRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
    const prevCost = Math.abs(s1 - s2) + currentViolations * 1000 + currentRolePenalty
    const newCost = newDiff + newViolations * 1000 + newRolePenalty
```

Also update best-tracking to include role penalty in comparison:
```ts
    if (newViolations < bestViolations ||
        (newViolations === bestViolations && newRolePenalty < bestRolePenalty) ||
        (newViolations === bestViolations && newRolePenalty === bestRolePenalty && newDiff < bestDiff)) {
```

Add `bestRolePenalty` variable initialization before the loop:
```ts
  let bestRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)
```

**Step 4: Commit**
```bash
git add src/lib/team-balancer.ts
git commit -m "feat: add role distribution penalty to team balancer"
```

---

## Task 6: PitchFormation Component

**Files:**
- Create: `src/components/ui/PitchFormation.tsx`
- Modify: `src/components/ui/index.ts`

**Step 1: Create PitchFormation component**

Create `src/components/ui/PitchFormation.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Avatar } from './Avatar'

interface PitchPlayer {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
  role?: string // PlayerRole: D, C, E, W, A
}

interface PitchFormationProps {
  team1: PitchPlayer[]
  team2: PitchPlayer[]
  team1Name: string
  team2Name: string
  isAdmin?: boolean
  onSwap?: (id1: string, id2: string) => void
}

// Assign players to formation rows based on roles
function assignRows(players: PitchPlayer[]): { att: PitchPlayer[]; mid: PitchPlayer[]; def: PitchPlayer[] } {
  const att: PitchPlayer[] = []
  const mid: PitchPlayer[] = []
  const def: PitchPlayer[] = []

  for (const p of players) {
    const r = p.role ?? 'C'
    if (r === 'A' || r === 'W') att.push(p)
    else if (r === 'D') def.push(p)
    else def.push(p) // E, C → will rebalance
  }

  // Rebalance: move excess from def to mid
  // Ideally DEF ~3, MID ~3, ATT ~2 for 8 players
  const total = players.length
  const targetDef = Math.max(1, Math.round(total * 0.375))
  const targetAtt = Math.max(1, att.length || Math.round(total * 0.25))

  // Move items from def to mid if def is overfull
  while (def.length > targetDef && mid.length < total - targetDef - targetAtt) {
    mid.push(def.pop()!)
  }
  // If mid is still empty, move some from def
  if (mid.length === 0 && def.length > 1) {
    mid.push(def.splice(Math.floor(def.length / 2), 1)[0])
  }

  return { att, mid, def }
}

const ROLE_COLORS: Record<string, string> = {
  D: '#4D96FF',
  E: '#4D96FF',
  C: '#FFD93D',
  W: 'var(--color-primary)',
  A: 'var(--color-primary)',
}

function PlayerToken({
  player,
  isSelected,
  isSwapTarget,
  onClick,
}: {
  player: PitchPlayer
  isSelected: boolean
  isSwapTarget: boolean
  onClick: () => void
}) {
  const roleColor = ROLE_COLORS[player.role ?? 'C'] ?? 'var(--color-text-2)'
  const name = (player.full_name ?? player.username).split(' ')[0]

  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '4px 2px',
        outline: 'none',
        position: 'relative',
      }}
    >
      <div style={{
        borderRadius: '50%',
        border: `2.5px solid ${isSelected ? 'var(--color-primary)' : isSwapTarget ? '#FFD93D' : roleColor}`,
        boxShadow: isSelected
          ? '0 0 0 3px rgba(200,255,107,0.35), 0 0 12px rgba(200,255,107,0.3)'
          : isSwapTarget
            ? '0 0 0 3px rgba(255,217,61,0.35)'
            : 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}>
        <Avatar src={player.avatar_url} name={player.full_name ?? player.username} size="sm" />
      </div>
      <div style={{
        fontSize: '0.6rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-1)',
        whiteSpace: 'nowrap',
        maxWidth: 48,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        transition: 'color 0.15s',
      }}>
        {name}
      </div>
      <div style={{
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-3)',
      }}>
        {player.overall}
      </div>
    </button>
  )
}

function FormationRows({
  players,
  selectedId,
  swapTargetTeam,
  onTokenClick,
  flipVertical,
}: {
  players: PitchPlayer[]
  selectedId: string | null
  swapTargetTeam: boolean
  onTokenClick: (id: string) => void
  flipVertical: boolean
}) {
  const { att, mid, def } = assignRows(players)
  const rows = flipVertical ? [def, mid, att] : [att, mid, def]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'space-around' }}>
      {rows.map((rowPlayers, ri) => (
        <div key={ri} style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
          {rowPlayers.map((p) => (
            <PlayerToken
              key={p.id}
              player={p}
              isSelected={selectedId === p.id}
              isSwapTarget={swapTargetTeam && selectedId !== null && selectedId !== p.id}
              onClick={() => onTokenClick(p.id)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PitchFormation({
  team1,
  team2,
  team1Name,
  team2Name,
  isAdmin = false,
  onSwap,
}: PitchFormationProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<1 | 2 | null>(null)

  function handleTokenClick(id: string, team: 1 | 2) {
    if (!isAdmin || !onSwap) {
      // Non-admin: no interaction
      return
    }

    if (selectedId === null) {
      // First selection
      setSelectedId(id)
      setSelectedTeam(team)
      return
    }

    if (selectedId === id) {
      // Deselect
      setSelectedId(null)
      setSelectedTeam(null)
      return
    }

    if (selectedTeam === team) {
      // Same team: change selection
      setSelectedId(id)
      return
    }

    // Different team: swap
    onSwap(selectedId, id)
    setSelectedId(null)
    setSelectedTeam(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {isAdmin && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--color-text-3)',
          fontFamily: 'var(--font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {selectedId ? '⚡ Tocca un giocatore dell\'altra squadra per scambiarlo' : 'Tocca un giocatore per selezionarlo'}
        </p>
      )}

      {/* The pitch */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #1a5c2a 0%, #1e6b31 50%, #1a5c2a 100%)',
        borderRadius: 'var(--radius-lg)',
        border: '2px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        padding: '0.75rem 0.25rem',
      }}>
        {/* Pitch markings */}
        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: 1,
          background: 'rgba(255,255,255,0.25)',
          transform: 'translateY(-50%)',
        }} />
        {/* Center circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 60,
          height: 60,
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
        }} />

        {/* Team name top */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '0.25rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {team1Name}
        </div>

        {/* Team 1 formation (top half) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <FormationRows
            players={team1}
            selectedId={selectedTeam === 1 ? selectedId : null}
            swapTargetTeam={selectedTeam === 2}
            onTokenClick={(id) => handleTokenClick(id, 1)}
            flipVertical={false}
          />
        </div>

        {/* Divider */}
        <div style={{ height: 8 }} />

        {/* Team 2 formation (bottom half) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <FormationRows
            players={team2}
            selectedId={selectedTeam === 2 ? selectedId : null}
            swapTargetTeam={selectedTeam === 1}
            onTokenClick={(id) => handleTokenClick(id, 2)}
            flipVertical={true}
          />
        </div>

        {/* Team name bottom */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '0.25rem',
          position: 'relative',
          zIndex: 1,
        }}>
          {team2Name}
        </div>
      </div>

      {/* Role legend */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[{ label: 'Difesa', color: '#4D96FF' }, { label: 'Centrocampo', color: '#FFD93D' }, { label: 'Attacco', color: 'var(--color-primary)' }].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Export from index**

Add to `src/components/ui/index.ts`:
```ts
export { PitchFormation } from './PitchFormation'
```

**Step 3: Commit**
```bash
git add src/components/ui/PitchFormation.tsx src/components/ui/index.ts
git commit -m "feat: add PitchFormation component with click-to-swap"
```

---

## Task 7: Integrate PitchFormation into Teams Page

**Files:**
- Modify: `src/app/(app)/matches/[matchId]/teams/page.tsx`

**Step 1: Add imports and view state**

At the top of the file, add `PitchFormation` to imports:
```ts
import { Button, TeamSplit, PitchFormation, useToast } from '@/components/ui'
```

In the component state section (after the other `useState` declarations), add:
```ts
const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch')
```

**Step 2: Extend PlayerData type with role**

Change `PlayerData` interface from:
```ts
interface PlayerData {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
}
```
To:
```ts
interface PlayerData {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
  role?: string
}
```

**Step 3: Pass role when building allPlayers**

Find the `const allPlayers: PlayerData[]` block and update it to include role:
```ts
      const allPlayers: PlayerData[] = regs.map((r) => {
        const p = r.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null; preferred_role: string | null }
        return {
          id: r.user_id,
          username: p?.username ?? r.user_id,
          full_name: p?.full_name ?? null,
          avatar_url: p?.avatar_url ?? null,
          overall: 0,
          role: p?.preferred_role ?? 'C',
        }
      })
```

**Step 4: Add handleSwap function**

After `handleSaveTeamNames`, add:
```ts
  function handleSwap(id1: string, id2: string) {
    if (!teamsResult) return
    // id1 is from team1, id2 is from team2 (or vice versa — determine which)
    const inTeam1 = teamsResult.team1.some(p => p.id === id1)
    const p1 = inTeam1
      ? teamsResult.team1.find(p => p.id === id1)!
      : teamsResult.team2.find(p => p.id === id1)!
    const p2 = inTeam1
      ? teamsResult.team2.find(p => p.id === id2)!
      : teamsResult.team1.find(p => p.id === id2)!

    const newTeam1 = inTeam1
      ? teamsResult.team1.map(p => p.id === id1 ? p2 : p)
      : teamsResult.team1.map(p => p.id === id2 ? p1 : p)
    const newTeam2 = inTeam1
      ? teamsResult.team2.map(p => p.id === id2 ? p1 : p)
      : teamsResult.team2.map(p => p.id === id1 ? p2 : p)

    const s1 = newTeam1.reduce((sum, p) => sum + p.overall, 0)
    const s2 = newTeam2.reduce((sum, p) => sum + p.overall, 0)

    setTeamsResult({
      ...teamsResult,
      team1: newTeam1,
      team2: newTeam2,
      team1Strength: Math.round(s1 * 10) / 10,
      team2Strength: Math.round(s2 * 10) / 10,
      balanceScore: teamsResult.balanceScore, // keep old score after manual swap
    })
    setConfirmed(false) // require re-confirm after manual swap
    showToast('Scambio effettuato! Ricordati di confermare le squadre.', 'info')
  }
```

**Step 5: Replace TeamSplit rendering with toggle + both views**

Find:
```tsx
      <TeamSplit
        team1={teamsResult.team1}
        team2={teamsResult.team2}
        team1Strength={teamsResult.team1Strength}
        team2Strength={teamsResult.team2Strength}
        balanceScore={teamsResult.balanceScore}
        team1Name={team1Name}
        team2Name={team2Name}
      />
```

Replace with:
```tsx
      {/* View toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--color-border)' }}>
        {(['pitch', 'list'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              flex: 1,
              padding: '0.45rem 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              transition: 'background 0.15s, color 0.15s',
              background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
              color: viewMode === mode ? '#0A0C12' : 'var(--color-text-3)',
            }}
          >
            {mode === 'pitch' ? '⚽ Campo' : '📋 Lista'}
          </button>
        ))}
      </div>

      {viewMode === 'pitch' ? (
        <PitchFormation
          team1={teamsResult.team1}
          team2={teamsResult.team2}
          team1Name={team1Name}
          team2Name={team2Name}
          isAdmin={data?.isAdmin ?? false}
          onSwap={handleSwap}
        />
      ) : (
        <TeamSplit
          team1={teamsResult.team1}
          team2={teamsResult.team2}
          team1Strength={teamsResult.team1Strength}
          team2Strength={teamsResult.team2Strength}
          balanceScore={teamsResult.balanceScore}
          team1Name={team1Name}
          team2Name={team2Name}
        />
      )}
```

Note: `data` is not available in the teams page (it's client-side); instead use a separate `isAdmin` state. Check how the page determines admin status — since the page already requires the user to be there, you can add:
```ts
  const [isAdmin, setIsAdmin] = useState(false)
```
And in the `load()` function where `adminMember` is set:
```ts
      // After fetching groupData, check if user is admin:
      const { data: adminCheck } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', matchData.group_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      setIsAdmin(adminCheck?.role === 'admin')
```

**Step 6: Commit**
```bash
git add src/app/\(app\)/matches/\[matchId\]/teams/page.tsx
git commit -m "feat: integrate PitchFormation with view toggle and click-to-swap into teams page"
```

---

## Task 8: TypeScript Check + Final Commit

**Step 1: Run TypeScript check**
```bash
npx tsc --noEmit
```
Fix any type errors found.

**Step 2: Run tests**
```bash
npx vitest run
```
Expected: 6/6 tests pass.

**Step 3: Commit design doc**
```bash
git add docs/plans/
git commit -m "docs: add radar-maps-formation design and implementation plan"
```

**Step 4: Push**
```bash
git push origin master
```

---

## Summary of Commits

1. `feat: add RadarChart SVG component`
2. `feat: add radar chart to player dashboard`
3. `feat: add radar chart to profile page with aggregated peer ratings`
4. `feat: make match location a clickable Google Maps link`
5. `feat: add role distribution penalty to team balancer`
6. `feat: add PitchFormation component with click-to-swap`
7. `feat: integrate PitchFormation with view toggle and click-to-swap into teams page`
8. `docs: add radar-maps-formation design and implementation plan`
