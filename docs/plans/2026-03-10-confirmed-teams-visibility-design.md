# Confirmed Teams Visibility in Match Detail — Design

**Date:** 2026-03-10
**Status:** Approved

## Problem

After an admin confirms team formations on `/matches/[matchId]/teams`, no other player can see them. The "Genera Squadre" button in the match detail page is admin-only. Non-admin players have no way to know which team they're on before the match.

## Goal

When an admin confirms team formations, all players see the `PitchFormation` view directly inside the match detail page, read-only.

## Design

### Data

In the match detail `load()`, add a parallel query:

```ts
supabase
  .from('generated_teams')
  .select('team1_user_ids, team2_user_ids')
  .eq('match_id', matchId)
  .eq('is_confirmed', true)
  .maybeSingle()
```

If the result is non-null, fetch profiles for all player IDs:

```ts
supabase
  .from('profiles')
  .select('id, username, full_name, avatar_url, preferred_role')
  .in('id', [...team1_user_ids, ...team2_user_ids])
```

Build two `PitchPlayer[]` arrays from the result. `overall` is not fetched — `PitchFormation` receives it as `undefined` (see component change below).

### PitchFormation component change

`overall` in `PitchPlayer` becomes **optional** (`overall?: number`).
`PlayerToken` shows the overall div only when `overall` is defined and `> 0`.
No behavior change for the `/teams` page which still passes overalls.

### Match detail JSX

Add a `confirmedTeams` state (`null | { team1: PitchPlayer[], team2: PitchPlayer[] }`), set from the query result.

Insert a **"Formazioni"** section between `<MatchCard>` and the actions block, rendered whenever `confirmedTeams !== null` (shown in `locked` and `played` states alike):

```
┌─────────────────────────────┐
│ MatchCard                   │
├─────────────────────────────┤
│ [Formazioni section — NEW]  │
│  H2: "Formazioni"           │
│  PitchFormation read-only   │
│  isAdmin=false, no onSwap   │
├─────────────────────────────┤
│ [admin actions / reg btn]   │
├─────────────────────────────┤
│ [result, MVP, comments...]  │
├─────────────────────────────┤
│ Iscritti                    │
└─────────────────────────────┘
```

### Admin button change

When `confirmedTeams !== null`, rename the "Genera Squadre" link to **"Modifica Squadre ✏️"** so it's clear teams already exist.

## Files affected

| File | Change |
|------|--------|
| `src/components/ui/PitchFormation.tsx` | `overall?: number` optional; hide display when undefined/0 |
| `src/app/(app)/matches/[matchId]/page.tsx` | fetch `generated_teams` + profiles; add `confirmedTeams` state; add Formazioni section; rename admin button |

## No DB changes required

`generated_teams.is_confirmed` already exists. No new columns or migrations needed.
