# Teams Visibility + Dual Preferred Roles — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Show confirmed team formations to all players inside the match detail page. (2) Let each player pick up to 2 preferred roles so the team balancer has more flexibility.

**Architecture:**
Feature 1 — no DB change needed: fetch `generated_teams` (is_confirmed=true) + related profiles in the match detail `load()`, then render `<PitchFormation>` read-only. `overall` becomes optional in PitchPlayer so the match detail doesn't need to fetch ratings.
Feature 2 — one nullable column (`preferred_role_2`) added to `profiles`; `PlayerInput` gains optional `role2`; the penalty function accepts an optional `role2Map` and counts a player toward a group if EITHER role matches (consistent with how role E already counts in both DEF and MID).

**Tech Stack:** Next.js 15 App Router, React 19, Supabase JS client, Vitest, inline styles, pure TypeScript.

---

## Task 1 — Make `overall` optional in PitchFormation

**Files:**
- Modify: `src/components/ui/PitchFormation.tsx`

**Step 1: Change the PitchPlayer interface**

Find:
```ts
interface PitchPlayer {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall: number
  role?: string
}
```

Replace with:
```ts
interface PitchPlayer {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  overall?: number   // optional — not shown when absent (match detail view)
  role?: string
}
```

**Step 2: Guard the overall display in PlayerToken**

Find the overall `<div>` in `PlayerToken` (it's the last element in the button):
```tsx
      <div style={{
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(255,255,255,0.5)',
      }}>
        {player.overall}
      </div>
```

Replace with:
```tsx
      {player.overall !== undefined && player.overall > 0 && (
        <div style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.5)',
        }}>
          {player.overall}
        </div>
      )}
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors (the `/teams` page passes `overall: number` which satisfies `overall?: number`).

**Step 4: Commit**
```bash
git add src/components/ui/PitchFormation.tsx
git commit -m "feat: make PitchFormation overall optional for read-only views"
```

---

## Task 2 — Show confirmed teams in match detail for all players

**Files:**
- Modify: `src/app/(app)/matches/[matchId]/page.tsx`

**Step 1: Add import and state**

At the top of the file, add `PitchFormation` to the existing UI import:
```ts
import { Avatar, Button, MatchCard, PitchFormation, useToast } from '@/components/ui'
```

Inside `MatchDetailPage`, after the existing `useState` declarations, add:
```ts
type ConfirmedPlayer = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role?: string
}
const [confirmedTeams, setConfirmedTeams] = useState<{
  team1: ConfirmedPlayer[]
  team2: ConfirmedPlayer[]
} | null>(null)
```

**Step 2: Fetch confirmed teams in load()**

In the `load()` function, add a parallel query alongside the existing `Promise.all`. The existing block is:
```ts
const [matchRes, regsRes, resultRes, myRegRes] = await Promise.all([
  supabase.from('matches').select('*').eq('id', matchId).single(),
  ...
])
```

Replace with:
```ts
const [matchRes, regsRes, resultRes, myRegRes, teamsRes] = await Promise.all([
  supabase.from('matches').select('*').eq('id', matchId).single(),
  supabase
    .from('match_registrations')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('match_id', matchId)
    .eq('status', 'confirmed'),
  supabase.from('match_results').select('*').eq('match_id', matchId).maybeSingle(),
  supabase
    .from('match_registrations')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle(),
  supabase
    .from('generated_teams')
    .select('team1_user_ids, team2_user_ids')
    .eq('match_id', matchId)
    .eq('is_confirmed', true)
    .maybeSingle(),
])
```

**Step 3: Process confirmed teams after the first Promise.all**

After the `if (matchRes.error)` guard, and before the second large `Promise.all`, add:
```ts
// Load confirmed teams and their profiles (if any)
if (teamsRes.data) {
  const allIds = [
    ...(teamsRes.data.team1_user_ids as string[]),
    ...(teamsRes.data.team2_user_ids as string[]),
  ]
  const { data: teamProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, preferred_role')
    .in('id', allIds)

  const profileMap = Object.fromEntries(
    (teamProfiles ?? []).map((p) => [p.id, p])
  )
  const toPlayer = (id: string): ConfirmedPlayer => {
    const p = profileMap[id]
    return {
      id,
      username: p?.username ?? id,
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      role: p?.preferred_role ?? undefined,
    }
  }
  setConfirmedTeams({
    team1: (teamsRes.data.team1_user_ids as string[]).map(toPlayer),
    team2: (teamsRes.data.team2_user_ids as string[]).map(toPlayer),
  })
}
```

**Step 4: Add the Formazioni section in JSX**

In the `return` JSX, after the `<MatchCard ... />` line and BEFORE the `{!isPlayed && (` block, add:
```tsx
      {confirmedTeams && (
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
            Formazioni
          </h2>
          <PitchFormation
            team1={confirmedTeams.team1}
            team2={confirmedTeams.team2}
            team1Name={data.team1Name}
            team2Name={data.team2Name}
            isAdmin={false}
          />
        </div>
      )}
```

**Step 5: Rename "Genera Squadre" when teams already confirmed**

Find the `<Link href={`/matches/${matchId}/teams`}` that shows "Genera Squadre" (inside the `isLocked` + `isAdmin` block):
```tsx
                  <Link href={`/matches/${matchId}/teams`} style={{ ... }}>
                    Genera Squadre
                  </Link>
```

Replace the label only:
```tsx
                  <Link href={`/matches/${matchId}/teams`} style={{ ... }}>
                    {confirmedTeams ? 'Modifica Squadre ✏️' : 'Genera Squadre'}
                  </Link>
```

**Step 6: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 7: Commit**
```bash
git add src/app/\(app\)/matches/\[matchId\]/page.tsx
git commit -m "feat: show confirmed team formations to all players in match detail"
```

---

## Task 3 — DB migration + types for preferred_role_2

**Step 1: Run migration in Supabase**

In the Supabase Dashboard → SQL Editor (or any migration runner), run:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_role_2 text
  CHECK (preferred_role_2 IN ('D', 'C', 'E', 'W', 'A'));
```

**Step 2: Update TypeScript types**

In `src/types/database.ts`, find the `ProfileRow` interface (or equivalent) where `preferred_role` is defined:
```ts
preferred_role: PlayerRole | null
```

Add immediately after:
```ts
preferred_role_2: PlayerRole | null
```

Also in the update/insert types (search for `preferred_role?: PlayerRole | null` and add alongside each):
```ts
preferred_role_2?: PlayerRole | null
```

**Step 3: Add role2 to PlayerInput**

In `src/lib/team-balancer.ts`, find:
```ts
export interface PlayerInput {
  id: string
  role: PlayerRole
  skills: SkillSet
  /** Number of peer ratings received — used for Bayesian smoothing */
  ratingCount: number
}
```

Replace with:
```ts
export interface PlayerInput {
  id: string
  role: PlayerRole
  role2?: PlayerRole  // optional secondary preferred role
  skills: SkillSet
  /** Number of peer ratings received — used for Bayesian smoothing */
  ratingCount: number
}
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors (`role2` is optional so all existing callers still compile).

**Step 5: Commit**
```bash
git add src/types/database.ts src/lib/team-balancer.ts
git commit -m "feat: add preferred_role_2 to profile types and role2 to PlayerInput"
```

---

## Task 4 — Team balancer: use secondary role in penalty (WITH TESTS)

**Files:**
- Modify: `src/lib/team-balancer.ts`
- Modify: `src/lib/team-balancer.test.ts`

**Step 1: Export `computeRoleImbalancePenalty` and add role2Map param**

In `src/lib/team-balancer.ts`, find:
```ts
function computeRoleImbalancePenalty(
  team1: string[],
  team2: string[],
  roleMap: Map<string, PlayerRole>
): number {
  const groups: Array<{ roles: PlayerRole[] }> = [
    { roles: ['D', 'E'] },
    { roles: ['C', 'E'] },
    { roles: ['A', 'W'] },
  ]
  let penalty = 0
  for (const { roles } of groups) {
    const t1 = team1.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const t2 = team2.filter(id => roles.includes(roleMap.get(id) ?? 'C')).length
    const diff = Math.abs(t1 - t2)
    if (diff > 1) penalty += (diff - 1) * 30
  }
  return penalty
}
```

Replace with:
```ts
export function computeRoleImbalancePenalty(
  team1: string[],
  team2: string[],
  roleMap: Map<string, PlayerRole>,
  role2Map?: Map<string, PlayerRole>
): number {
  const groups: Array<{ roles: PlayerRole[] }> = [
    { roles: ['D', 'E'] },
    { roles: ['C', 'E'] },
    { roles: ['A', 'W'] },
  ]
  const matchesGroup = (id: string, roles: PlayerRole[]) => {
    const r1 = roleMap.get(id)
    const r2 = role2Map?.get(id)
    return (r1 !== undefined && roles.includes(r1)) ||
           (r2 !== undefined && roles.includes(r2))
  }
  let penalty = 0
  for (const { roles } of groups) {
    const t1 = team1.filter(id => matchesGroup(id, roles)).length
    const t2 = team2.filter(id => matchesGroup(id, roles)).length
    const diff = Math.abs(t1 - t2)
    if (diff > 1) penalty += (diff - 1) * 30
  }
  return penalty
}
```

**Step 2: Build role2Map in generateBalancedTeams**

In `generateBalancedTeams`, after:
```ts
  const roleMap = new Map<string, PlayerRole>()
  for (const p of players) roleMap.set(p.id, p.role)
```

Add:
```ts
  const role2Map = new Map<string, PlayerRole>()
  for (const p of players) if (p.role2) role2Map.set(p.id, p.role2)
```

**Step 3: Pass role2Map to all computeRoleImbalancePenalty calls**

There are 4 calls in the function. Replace each occurrence of:
```ts
computeRoleImbalancePenalty(...)
```
...by adding `role2Map` as the 4th argument:

1. Line `let bestRolePenalty = computeRoleImbalancePenalty(bestT1, bestT2, roleMap)` →
   `let bestRolePenalty = computeRoleImbalancePenalty(bestT1, bestT2, roleMap, role2Map)`

2. Line `const currentRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)` →
   `const currentRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap, role2Map)`

3. Line `const newRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap)` →
   `const newRolePenalty = computeRoleImbalancePenalty(team1, team2, roleMap, role2Map)`

4. Line in `bestRolePenalty = newRolePenalty` — this one is already fine (no call).

**Step 4: Write the failing tests**

In `src/lib/team-balancer.test.ts`, add to the imports:
```ts
import { generateBalancedTeams, getPlayerOverall, computeRoleImbalancePenalty, type PlayerInput } from './team-balancer'
```

Add a new `describe` block at the end of the file:
```ts
describe('computeRoleImbalancePenalty', () => {
  it('returns 0 when both teams have balanced role distribution', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['a', 'D'], ['b', 'D'],
      ['c', 'C'], ['d', 'C'],
    ])
    expect(computeRoleImbalancePenalty(['a', 'c'], ['b', 'd'], roleMap)).toBe(0)
  })

  it('penalizes when all defenders on one team', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['d1', 'D'], ['d2', 'D'], ['d3', 'D'],
      ['m1', 'C'], ['m2', 'C'], ['m3', 'C'],
    ])
    const penalty = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'],
      ['m1', 'm2', 'm3'],
      roleMap
    )
    // DEF: |3-0|=3 → (3-1)*30=60; MID: |0-3|=3 → 60; ATT: 0
    expect(penalty).toBe(120)
  })

  it('reduces penalty when secondary role fills a group gap', () => {
    const roleMap = new Map<string, PlayerRole>([
      ['d1', 'D'], ['d2', 'D'], ['d3', 'D'],
      ['m1', 'C'], ['m2', 'C'], ['m3', 'C'],
    ])
    // d1 has secondary role C → counts in MID group too
    const role2Map = new Map<string, PlayerRole>([['d1', 'C']])

    const withoutRole2 = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'], ['m1', 'm2', 'm3'], roleMap
    )
    const withRole2 = computeRoleImbalancePenalty(
      ['d1', 'd2', 'd3'], ['m1', 'm2', 'm3'], roleMap, role2Map
    )
    // With role2: MID: t1=1 (d1 via C), t2=3 → diff=2 → 30; total=90 < 120
    expect(withRole2).toBeLessThan(withoutRole2)
    expect(withRole2).toBe(90)
  })

  it('does not break when role2Map is empty', () => {
    const roleMap = new Map<string, PlayerRole>([['a', 'A'], ['b', 'D']])
    const role2Map = new Map<string, PlayerRole>()
    expect(() =>
      computeRoleImbalancePenalty(['a'], ['b'], roleMap, role2Map)
    ).not.toThrow()
  })
})
```

**Step 5: Run tests to confirm they fail (expected)**
```bash
npx vitest run src/lib/team-balancer.test.ts
```
Expected: NEW tests fail because `computeRoleImbalancePenalty` is not yet exported and doesn't have the new signature.

**Step 6: Apply the code changes from Steps 1-3 above**

(Already written above — make all edits to `src/lib/team-balancer.ts`)

**Step 7: Run tests again — all should pass**
```bash
npx vitest run
```
Expected: ALL tests pass (6 existing + 4 new = 10 total).

**Step 8: Commit**
```bash
git add src/lib/team-balancer.ts src/lib/team-balancer.test.ts
git commit -m "feat: extend role penalty to use secondary role (role2) for better flexibility"
```

---

## Task 5 — Profile edit: 2-role selection UI

**Files:**
- Modify: `src/app/(app)/profile/edit/page.tsx`

**Step 1: Add preferredRole2 state**

After:
```ts
const [preferredRole, setPreferredRole] = useState<RoleValue | ''>('')
```
Add:
```ts
const [preferredRole2, setPreferredRole2] = useState<RoleValue | ''>('')
```

**Step 2: Fetch preferred_role_2**

Find:
```ts
        .select('username, full_name, preferred_role, avatar_url')
```
Replace with:
```ts
        .select('username, full_name, preferred_role, preferred_role_2, avatar_url')
```

Find the data loading block:
```ts
            setPreferredRole((data.preferred_role as RoleValue) ?? '')
```
Add after it:
```ts
            setPreferredRole2((data.preferred_role_2 as RoleValue) ?? '')
```

**Step 3: Save preferred_role_2**

In the `supabase.from('profiles').update({...})` call, find:
```ts
          preferred_role: preferredRole || null,
```
Add after:
```ts
          preferred_role_2: preferredRole2 || null,
```

**Step 4: Update role button click logic**

Find the role button `onClick`:
```ts
                  onClick={() => setPreferredRole(isSelected ? '' : opt.value)}
```

Replace with:
```ts
                  onClick={() => {
                    if (opt.value === preferredRole) {
                      // Deselect primary; secondary (if any) becomes primary
                      setPreferredRole(preferredRole2)
                      setPreferredRole2('')
                    } else if (opt.value === preferredRole2) {
                      // Deselect secondary
                      setPreferredRole2('')
                    } else if (!preferredRole) {
                      setPreferredRole(opt.value)
                    } else if (!preferredRole2) {
                      // Set as secondary (can't select same role twice)
                      if (opt.value !== preferredRole) setPreferredRole2(opt.value)
                    }
                  }}
```

**Step 5: Update button visual state**

Find:
```ts
              const isSelected = preferredRole === opt.value
```

Replace with:
```ts
              const isPrimary = preferredRole === opt.value
              const isSecondary = preferredRole2 === opt.value
              const isSelected = isPrimary || isSecondary
```

Find the button style (the `background`, `border`, `color` lines), which currently uses `isSelected`:
```ts
                    background: isSelected ? 'rgba(200,255,107,0.15)' : 'var(--color-elevated)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    ...
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-2)',
                    ...
                    fontWeight: isSelected ? 700 : 400,
```

Replace those lines with:
```ts
                    background: isPrimary
                      ? 'rgba(200,255,107,0.15)'
                      : isSecondary
                        ? 'rgba(245,158,11,0.12)'
                        : 'var(--color-elevated)',
                    border: `1px solid ${isPrimary ? 'var(--color-primary)' : isSecondary ? '#f59e0b' : 'var(--color-border)'}`,
                    ...
                    color: isPrimary ? 'var(--color-primary)' : isSecondary ? '#f59e0b' : 'var(--color-text-2)',
                    ...
                    fontWeight: isSelected ? 700 : 400,
```

Also add a label suffix for secondary:
```tsx
                  <span>{opt.emoji}</span>
                  <span>{opt.label}{isSecondary ? ' (2°)' : ''}</span>
```

**Step 6: Add helper hint text**

After the role button group `</div>`, add:
```tsx
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
            Seleziona fino a 2 ruoli. Il primo è il ruolo principale.
          </p>
```

**Step 7: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 8: Commit**
```bash
git add src/app/\(app\)/profile/edit/page.tsx
git commit -m "feat: allow selecting up to 2 preferred roles in profile edit"
```

---

## Task 6 — Profile view + player dashboard: show 2nd role badge

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`

### 6a — Profile view page

In `src/app/(app)/profile/page.tsx`, find:
```ts
  const role = profile.preferred_role ? ROLE_LABELS[profile.preferred_role] : null
```

Add after:
```ts
  const role2 = profile.preferred_role_2 ? ROLE_LABELS[profile.preferred_role_2] : null
```

(`ROLE_LABELS` is already defined in that file — same map works for both roles.)

Find the JSX where role is displayed (look for `{role && (`), then add the secondary badge immediately after the primary:
```tsx
            {role2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem' }}>{role2.emoji}</span>
                <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {role2.label} (2°)
                </span>
              </div>
            )}
```

Update the profiles select query to include `preferred_role_2`:
```ts
      supabase.from('profiles').select('*, preferred_role_2').eq('id', user.id).single(),
```
Actually, the profiles query likely already selects `*` — check the actual query. If it's `select('*')`, no change needed. If it lists fields explicitly, add `preferred_role_2` to the list.

### 6b — Player dashboard

In `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`, update the select query:
```ts
      .select('username, full_name, avatar_url, xp, level, bio, preferred_role, preferred_role_2')
```

Find where the role badge is rendered (search for `profile.preferred_role && roleLabels`):
```tsx
            {profile.preferred_role && roleLabels[profile.preferred_role] && (
              <span style={{ ... }}>
                {roleLabels[profile.preferred_role]}
              </span>
            )}
```

Add after it:
```tsx
            {profile.preferred_role_2 && roleLabels[profile.preferred_role_2] && (
              <span style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: 999,
                fontSize: '0.75rem',
                color: '#f59e0b',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}>
                {roleLabels[profile.preferred_role_2]} (2°)
              </span>
            )}
```

Also update the TypeScript type for `profile` in that file to include `preferred_role_2: string | null`.

**Step: TypeScript check**
```bash
npx tsc --noEmit
```

**Step: Commit**
```bash
git add src/app/\(app\)/profile/page.tsx src/app/\(app\)/groups/\[groupId\]/players/\[userId\]/page.tsx
git commit -m "feat: show secondary preferred role badge in profile and player dashboard"
```

---

## Task 7 — Teams page: pass role2 to PlayerInput

**Files:**
- Modify: `src/app/(app)/matches/[matchId]/teams/page.tsx`

**Step 1: Include preferred_role_2 in the profiles join**

Find:
```ts
        .select('user_id, profiles(username, full_name, avatar_url, preferred_role)')
```
Replace with:
```ts
        .select('user_id, profiles(username, full_name, avatar_url, preferred_role, preferred_role_2)')
```

**Step 2: Update the profile type cast**

Find:
```ts
        const profile = reg.profiles as unknown as {
          username: string; full_name: string | null; avatar_url: string | null; preferred_role: string | null
        }
```
Replace with:
```ts
        const profile = reg.profiles as unknown as {
          username: string; full_name: string | null; avatar_url: string | null
          preferred_role: string | null; preferred_role_2: string | null
        }
```
(There are TWO such casts in the file — update BOTH.)

**Step 3: Pass role2 in PlayerInput construction**

Find the `return { id: reg.user_id, role: ..., skills: ... }` block (inside the `inputs` map):
```ts
        return {
          id: reg.user_id,
          role: (profile.preferred_role ?? 'C') as PlayerInput['role'],
          skills: avgSkills,
          ratingCount,
        }
```

Replace with:
```ts
        return {
          id: reg.user_id,
          role: (profile.preferred_role ?? 'C') as PlayerInput['role'],
          role2: profile.preferred_role_2 ? profile.preferred_role_2 as PlayerInput['role'] : undefined,
          skills: avgSkills,
          ratingCount,
        }
```

**Step 4: TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 5: Run all tests**
```bash
npx vitest run
```
Expected: 10/10 pass.

**Step 6: Commit**
```bash
git add src/app/\(app\)/matches/\[matchId\]/teams/page.tsx
git commit -m "feat: pass preferred_role_2 as role2 to team balancer"
```

---

## Task 8 — Final checks + push

**Step 1: Full TypeScript check**
```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 2: Run full test suite**
```bash
npx vitest run
```
Expected: 10/10 tests pass.

**Step 3: Commit docs**
```bash
git add docs/plans/
git commit -m "docs: add teams-visibility and dual-roles design and implementation plan"
```

**Step 4: Push**
```bash
git push origin master
```

---

## Summary of commits

1. `feat: make PitchFormation overall optional for read-only views`
2. `feat: show confirmed team formations to all players in match detail`
3. `feat: add preferred_role_2 to profile types and role2 to PlayerInput`
4. `feat: extend role penalty to use secondary role (role2) for better flexibility`
5. `feat: allow selecting up to 2 preferred roles in profile edit`
6. `feat: show secondary preferred role badge in profile and player dashboard`
7. `feat: pass preferred_role_2 as role2 to team balancer`
8. `docs: add teams-visibility and dual-roles design and implementation plan`
