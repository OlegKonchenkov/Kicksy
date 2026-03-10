# Dual Preferred Roles — Design

**Date:** 2026-03-10
**Status:** Approved

## Problem

Each player can select only one preferred role. If many players in a group share the same role, the team balancer has little flexibility to form balanced formations. Allowing a secondary role gives the balancer more options without changing the core algorithm.

## Goal

Players can select up to 2 preferred roles (primary + optional secondary). The team balancer uses both to achieve better role distribution across teams.

## Design

### DB Migration

Add a nullable column to `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN preferred_role_2 text;
```

Constraint: same check constraint as `preferred_role` (values: D, C, E, W, A). Both columns remain nullable independently.

### Types

In `src/types/database.ts`, add to `ProfileRow`:
```ts
preferred_role_2: PlayerRole | null
```

Add `role2?: PlayerRole` to `PlayerInput` in `src/lib/team-balancer.ts`.

### Profile Edit UI (`/profile/edit`)

The existing role pill buttons change to support 1 or 2 selected roles:

- **0 selected** → all pills unselected (grey)
- **1 selected** → that pill is lime (primary role)
- **2 selected** → first pill lime (primary), second pill amber `#f59e0b` with `(2°)` label suffix or ring

Interaction:
- Click unselected → if 0 selected: set as primary; if 1 selected: set as secondary; if 2 selected: already have 2, ignore
- Click primary → deselect primary; secondary (if any) becomes new primary
- Click secondary → deselect secondary only

Persist: `preferred_role` = primary, `preferred_role_2` = secondary (or null).

### Profile View & Player Dashboard

Show up to 2 role badges side-by-side where currently one badge is shown.

### Team Balancer Integration

**`PlayerInput`** gains `role2?: PlayerRole`.

**In `generateBalancedTeams`**: build a second map:
```ts
const role2Map = new Map<string, PlayerRole>()
for (const p of players) if (p.role2) role2Map.set(p.id, p.role2)
```

**In `computeRoleImbalancePenalty`**: count a player toward a group if EITHER their primary OR secondary role matches the group:

```ts
const matchesGroup = (id: string, roles: PlayerRole[]) => {
  const r1 = roleMap.get(id)
  const r2 = role2Map?.get(id)
  return (r1 !== undefined && roles.includes(r1)) ||
         (r2 !== undefined && roles.includes(r2))
}
const t1count = team1.filter(id => matchesGroup(id, roles)).length
const t2count = team2.filter(id => matchesGroup(id, roles)).length
```

This is consistent with how `E` already counts in both DEF and MID. A player with D primary and C secondary behaves similarly: counted in both groups, giving the balancer more flexibility.

**In `teams/page.tsx`**: include `preferred_role_2` in the profiles join query and pass it as `role2` in the `PlayerInput`.

### PitchFormation assignRows

No change needed. Placement is always by primary role only — the secondary role is purely for balancer logic.

### Onboarding page

Add a secondary role picker step (optional): "Giochi anche come?" with the same pill UI, skippable.

## Files affected

| File | Change |
|------|--------|
| DB | `ALTER TABLE profiles ADD COLUMN preferred_role_2 text` |
| `src/types/database.ts` | Add `preferred_role_2` to ProfileRow |
| `src/lib/team-balancer.ts` | Add `role2?` to PlayerInput; update `computeRoleImbalancePenalty` |
| `src/app/(app)/profile/edit/page.tsx` | Support 2-role selection UI |
| `src/app/(app)/profile/page.tsx` | Show 2nd role badge |
| `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx` | Show 2nd role badge |
| `src/app/(app)/matches/[matchId]/teams/page.tsx` | Include `preferred_role_2` in query, pass as `role2` |
| `src/app/(auth)/onboarding/page.tsx` | Optional secondary role step |

## Trade-offs

- **Pro**: No algorithm change; just extends the penalty function to use more information
- **Pro**: Fully backward-compatible; `role2` is optional everywhere
- **Con**: DB migration required (one-liner ALTER TABLE)
- **Con**: Overlapping-role players (D+C) are counted in two groups simultaneously, which slightly inflates group counts. This is the same behavior E already has and is acceptable.
