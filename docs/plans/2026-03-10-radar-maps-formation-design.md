# Kicksy — Radar Chart, Maps Location, Role-Balanced Formation Design

**Date**: 2026-03-10
**Status**: Approved
**Features**: 3 independent enhancements

---

## Feature 1: Radar/Spider Chart

### Goal
Visualize the 6 skill categories for each player as a hexagonal radar (spider) chart, complementing the existing bar chart.

### Technical Approach
- **Pure SVG** component — zero new dependencies, consistent with project style
- New file: `src/components/ui/radar-chart.tsx`
- 6 axes (Fisica, Tecnica, Tattica, Difesa, Attacco, Mentalità), scale 0–10
- Colors: same `categoryColors` map already defined in player dashboard
- Area fill: semi-transparent colored polygon + lime outline (`var(--color-primary)`)
- Axis labels placed at each vertex

### Placement
1. **Player dashboard** (`/groups/[groupId]/players/[userId]/page.tsx`): new section "Profilo skill" below existing bar chart, shown only when ratings exist
2. **Profile page** (`/profile/page.tsx`): new section showing averaged peer ratings across ALL groups; requires fetching `player_ratings` where `ratee_id = user.id`; shown only if at least 1 rating exists

### Component Interface
```tsx
<RadarChart
  data={{ Fisica: 8.0, Tecnica: 7.0, Tattica: 5.0, Difesa: 8.0, Attacco: 8.0, "Mentalità": 7.0 }}
  size={220}
  colors={{ Fisica: '#FF6B6B', ... }}
/>
```

### Export
Add `RadarChart` to `src/components/ui/index.ts`

---

## Feature 2: Google Maps Location Link

### Goal
Make the match location field clickable — opens Google Maps navigation to the exact address.

### Technical Approach
Zero DB changes. Location stays as `TEXT`.

#### Match detail page (`/matches/[matchId]/page.tsx`)
- Wrap location display in `<a href="https://www.google.com/maps/search/?api=1&query=ENCODED" target="_blank" rel="noopener noreferrer">`
- Add `MapPin` lucide icon before the text
- Style: lime color + underline on hover

#### Edit match page (`/matches/[matchId]/edit/page.tsx`)
- Below the `<Input label="Luogo" ...>` field, add a small "📍 Verifica su Maps →" link
- Only shown when `location.trim()` is non-empty
- Opens `https://www.google.com/maps/search/?api=1&query=ENCODED` in new tab

---

## Feature 3: Role-Balanced Teams + Visual Formation

### 3a. Role Distribution in Team Balancer

**File**: `src/lib/team-balancer.ts`

Add `roleImbalancePenalty` to the simulated annealing cost function:
- Role groups: **DEF** = {D, E}, **MID** = {C, E}, **ATT** = {A, W}
  - Note: E (Esterno) counts in both DEF and MID groups — assign to the group with fewer members on that team
- For each role group, compute `|count_team1 - count_team2|`; if > 1, add `30 * excess` to cost
- Weight: 30 per unit excess (lighter than neverTogether=1000, heavier than pure strength diff)

```
newCost = strengthDiff + violations * 1000 + roleImbalance * 30
```

Return extended `TeamBalanceResult` with `roleBalance` info for display.

### 3b. Visual Pitch Component

**New file**: `src/components/ui/pitch-formation.tsx`

A CSS football pitch with two halves (or stacked on mobile):

```
┌──────────────────────────────┐
│  TEAM A    │    TEAM B        │
│                               │
│   ○ ○      │      ○ ○         │  ← ATT row
│   ○ ○ ○    │    ○ ○ ○         │  ← MID row
│   ○ ○ ○    │    ○ ○ ○         │  ← DEF row
│                               │
└──────────────────────────────┘
```

- Background: CSS green gradient with white center line + center circle
- Player token: 44px circle with `Avatar` component inside, name below (truncated), OVR number
- Border color = role category color (DEF=blue, MID=yellow, ATT=lime)
- **Click-to-swap** (admin only):
  1. Tap player → highlighted with lime ring + pulsing animation
  2. Tap another player on other team → immediate swap, re-render
  3. Tap same player again → deselect
  4. After swaps, "Conferma Squadre" button saves final result

### 3c. Auto Formation Layout

Formation rows derived from player roles:
- ATT row: role A or W
- MID row: role C; role E if DEF already has enough
- DEF row: role D; role E if MID already has enough
- Fallback: if player has no role or unknown, goes to MID row
- Players within each row evenly distributed horizontally

### 3d. Teams Page Integration

**File**: `src/app/(app)/matches/[matchId]/teams/page.tsx`

- Add toggle tabs at top: `[ 📋 Lista | ⚽ Campo ]`
- Default view: **Campo** (formation)
- Lista: existing `TeamSplit` component (unchanged)
- `PitchFormation` component receives:
  - `team1: PlayerData[]`, `team2: PlayerData[]`
  - `team1Name`, `team2Name`
  - `isAdmin: boolean`
  - `onSwap: (id1: string, id2: string) => void` callback
- After swap, parent state updates both teams in memory; "Conferma" saves to DB

---

## Implementation Order

1. `RadarChart` SVG component
2. Player dashboard → add radar section
3. Profile page → add radar section (fetch ratings)
4. Match detail → location as Maps link
5. Edit match → "Verifica su Maps" link
6. Team balancer → role imbalance penalty
7. `PitchFormation` component (CSS pitch + click-to-swap)
8. Teams page → integrate PitchFormation + toggle

---

## Files to Create
- `src/components/ui/radar-chart.tsx`
- `src/components/ui/pitch-formation.tsx`

## Files to Modify
- `src/components/ui/index.ts` — export new components
- `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx` — add radar
- `src/app/(app)/profile/page.tsx` — add radar + fetch ratings
- `src/app/(app)/matches/[matchId]/page.tsx` — location → Maps link
- `src/app/(app)/matches/[matchId]/edit/page.tsx` — Maps verify link
- `src/lib/team-balancer.ts` — role imbalance penalty
- `src/app/(app)/matches/[matchId]/teams/page.tsx` — pitch view + toggle

## No DB Migrations Required
All changes are frontend/logic only.
