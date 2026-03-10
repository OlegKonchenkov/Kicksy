# Kicksy Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Kicksy by fixing toast notifications, adding badge awarding logic, and building group + player stats dashboards.

**Architecture:** All features follow the existing patterns: SSR pages with Supabase server client for data, client components only where interactivity is needed, `useToast()` for all user feedback, CSS variables for theming. No new dependencies.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, CSS-in-JS inline styles, `useToast` from `@/components/ui`

---

## 🔍 Bug Diagnosis: Toast Notifications Not Showing

**Root cause (confirmed by code audit):**

`src/app/(app)/matches/[matchId]/page.tsx` does NOT use `useToast()`. Instead it:
1. Uses a local `actionError` state shown as inline `<p>` — only for errors, never for success
2. Calls `window.location.reload()` after every successful action — this destroys the React tree (including ToastContext) before any toast could render

All other pages (result, teams, edit, ratings) correctly use `useToast()`.

**Fix:** Import `useToast`, add `showToast()` for success + error, replace `window.location.reload()` → `router.refresh()`.

---

## Task 1: Fix Match Detail Page — Toast + Reload

**Files:**
- Modify: `src/app/(app)/matches/[matchId]/page.tsx`

**What to change:**

### Step 1: Add `useToast` import
Find the import line (around line 1-10):
```typescript
import { useRouter, useParams } from 'next/navigation'
```
Add `useToast` to the existing UI import:
```typescript
import { useToast } from '@/components/ui'
```

### Step 2: Add hook inside component
After `const router = useRouter()` (around line 49), add:
```typescript
const { showToast } = useToast()
```

### Step 3: Remove `actionError` state
Delete this line (around line 64):
```typescript
const [actionError, setActionError] = useState<string | null>(null)
```

### Step 4: Replace all 9 handlers
Replace every handler using the pattern below. For EACH handler:
- `setActionError(null)` → DELETE (remove entirely)
- `if (result.error) { setActionError(result.error); return }` → `if (result.error) { showToast(result.error, 'error'); return }`
- `window.location.reload()` → `router.refresh(); showToast('...', 'success')`

Exact replacements for each handler:

**handleRegister** (~line 231):
```typescript
async function handleRegister() {
  startTransition(async () => {
    const result = await registerForMatch(matchId)
    if (result.error) { showToast(result.error, 'error'); return }
    router.refresh()
    showToast('Iscrizione confermata! ⚽', 'success')
  })
}
```

**handleUnregister** (~line 240):
```typescript
async function handleUnregister() {
  startTransition(async () => {
    const result = await unregisterFromMatch(matchId)
    if (result.error) { showToast(result.error, 'error'); return }
    router.refresh()
    showToast('Iscrizione annullata', 'info')
  })
}
```

**handleVoteMvp** (~line 249):
```typescript
async function handleVoteMvp() {
  if (!selectedMvpUserId) return
  startTransition(async () => {
    const result = await submitMvpVote(matchId, selectedMvpUserId)
    if (result.error) { showToast(result.error, 'error'); return }
    router.refresh()
    showToast('Voto MVP inviato! ⭐', 'success')
  })
}
```

**handleSaveComment** (~line 259):
```typescript
async function handleSaveComment() {
  startTransition(async () => {
    const result = await submitMatchComment(matchId, commentText)
    if (result.error) { showToast(result.error, 'error'); return }
    router.refresh()
    showToast('Commento salvato +8 XP 📝', 'success')
  })
}
```

**handleVoteTemplatePoll** (~line 268):
```typescript
async function handleVoteTemplatePoll(pollId: string) {
  const idx = selectedOptionByPoll[pollId]
  if (idx === undefined || idx < 0) return
  startTransition(async () => {
    const result = await submitPollVote(matchId, pollId, idx)
    if (result.error) { showToast(result.error, 'error'); return }
    router.refresh()
    showToast('Voto inviato! ✅', 'success')
  })
}
```

**handleFinalizeWindow** (~line 279):
```typescript
async function handleFinalizeWindow() {
  if (isFinalizing) return
  setIsFinalizing(true)
  await finalizePostMatchWindow(matchId)
  setIsFinalizing(false)
  router.refresh()
}
```

### Step 5: Remove inline actionError display
Find and DELETE this JSX block in the render (around line 512):
```tsx
{actionError && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>{actionError}</p>}
```

### Step 6: Verify no remaining references
Search for `actionError` in the file — should return 0 results.
Search for `window.location.reload` in the file — should return 0 results.

### Step 7: Commit
```bash
git add src/app/\(app\)/matches/\[matchId\]/page.tsx
git commit -m "fix: replace window.location.reload with router.refresh + add toast notifications in match detail"
```

---

## Task 2: Badge Awarding Logic

**Files:**
- Modify: `src/lib/actions/matches.ts`
- Modify: `src/lib/actions/groups.ts`

**What to add:**

### Step 1: Add `awardBadgesIfEarned` helper in `matches.ts`

Add this function BEFORE `finalizePostMatchWindow` (find that function at ~line 943):

```typescript
// ============================================================
// BADGE AWARDING HELPER
// ============================================================
async function awardBadgesIfEarned(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  groupId: string,
  stats: {
    matches_played?: number
    matches_won?: number
    goals_scored?: number
    assists?: number
    mvp_count?: number
    clean_sheets?: number
  }
): Promise<void> {
  try {
    // Build list of condition checks against seeded badge keys
    const conditionChecks: Array<{ condition_type: string; condition_value: number }> = []

    if (stats.matches_played !== undefined) {
      conditionChecks.push(
        { condition_type: 'matches_played', condition_value: 1 },
        { condition_type: 'matches_played', condition_value: 10 },
        { condition_type: 'matches_played', condition_value: 25 },
        { condition_type: 'matches_played', condition_value: 50 },
      )
    }
    if (stats.matches_won !== undefined) {
      conditionChecks.push({ condition_type: 'matches_won', condition_value: 1 })
    }
    if (stats.goals_scored !== undefined) {
      conditionChecks.push(
        { condition_type: 'goals_scored', condition_value: 1 },
        { condition_type: 'goals_scored', condition_value: 10 },
        { condition_type: 'goals_scored', condition_value: 25 },
      )
    }
    if (stats.assists !== undefined) {
      conditionChecks.push(
        { condition_type: 'assists', condition_value: 1 },
        { condition_type: 'assists', condition_value: 10 },
      )
    }
    if (stats.mvp_count !== undefined) {
      conditionChecks.push(
        { condition_type: 'mvp_count', condition_value: 1 },
        { condition_type: 'mvp_count', condition_value: 5 },
        { condition_type: 'mvp_count', condition_value: 10 },
      )
    }
    if (stats.clean_sheets !== undefined) {
      conditionChecks.push({ condition_type: 'clean_sheets', condition_value: 5 })
    }

    if (conditionChecks.length === 0) return

    // Fetch all relevant badges
    const { data: allBadges } = await admin
      .from('badges')
      .select('id, condition_type, condition_value')
      .in('condition_type', [...new Set(conditionChecks.map(c => c.condition_type))])

    if (!allBadges || allBadges.length === 0) return

    // Determine which badges the player qualifies for
    const qualifiedBadgeIds: string[] = []
    for (const badge of allBadges) {
      const statValue = stats[badge.condition_type as keyof typeof stats] ?? 0
      if (statValue >= badge.condition_value) {
        qualifiedBadgeIds.push(badge.id)
      }
    }

    if (qualifiedBadgeIds.length === 0) return

    // Fetch already-earned badges to avoid duplicates
    const { data: existing } = await admin
      .from('player_badges')
      .select('badge_id')
      .eq('user_id', userId)
      .in('badge_id', qualifiedBadgeIds)

    const alreadyEarned = new Set((existing ?? []).map((b: { badge_id: string }) => b.badge_id))
    const newBadgeIds = qualifiedBadgeIds.filter(id => !alreadyEarned.has(id))

    if (newBadgeIds.length === 0) return

    // Insert new badges (ignore conflicts just in case)
    await admin
      .from('player_badges')
      .upsert(
        newBadgeIds.map(badgeId => ({
          user_id: userId,
          badge_id: badgeId,
          group_id: groupId,
          equipped: false,
        })),
        { onConflict: 'user_id,badge_id,group_id', ignoreDuplicates: true }
      )

    // Send a notification for each new badge
    const { data: badgeDetails } = await admin
      .from('badges')
      .select('id, name_it, icon')
      .in('id', newBadgeIds)

    if (badgeDetails && badgeDetails.length > 0) {
      await admin.from('notifications').upsert(
        badgeDetails.map((b: { id: string; name_it: string; icon: string }) => ({
          user_id: userId,
          type: 'badge_earned',
          title: `${b.icon} Badge sbloccato!`,
          body: b.name_it,
          is_read: false,
        })),
        { ignoreDuplicates: false }
      )
    }
  } catch {
    // Badge awarding is non-critical — never throw
  }
}
```

### Step 2: Call `awardBadgesIfEarned` in `finalizePostMatchWindow`

Inside `finalizePostMatchWindow`, after the mvp_count upsert block (after `admin.from('player_stats').upsert(...)` for the MVP winner, around line 1022), add:

```typescript
// Award badges for MVP milestone
const { data: mvpStats } = await admin
  .from('player_stats')
  .select('matches_played, matches_won, goals_scored, assists, mvp_count, clean_sheets')
  .eq('user_id', winnerId)
  .eq('group_id', matchData.group_id)
  .maybeSingle()

if (mvpStats) {
  await awardBadgesIfEarned(admin, winnerId, matchData.group_id, mvpStats)
}
```

### Step 3: Call `awardBadgesIfEarned` in `submitMatchResult`

Find the `submitMatchResult` function. After the loop where player stats are updated via `increment_player_stats` RPC (and the fallback upsert), at the point where stats are finalized for each player, add badge checking.

Locate the section in `submitMatchResult` where `(supabase as any).rpc('increment_player_stats', {...})` is called for each confirmed player (around line 624-670). After that block (still inside the player loop or just after), add:

```typescript
// After stats are updated, fetch fresh stats and award badges
// Use admin client so we can read stats regardless of RLS
try {
  const adminForBadges = await createAdminClient()
  for (const uid of confirmedIds) {
    const { data: freshStats } = await adminForBadges
      .from('player_stats')
      .select('matches_played, matches_won, goals_scored, assists, mvp_count, clean_sheets')
      .eq('user_id', uid)
      .eq('group_id', groupId)
      .maybeSingle()
    if (freshStats) {
      await awardBadgesIfEarned(adminForBadges, uid, groupId, freshStats)
    }
  }
} catch {
  // Non-critical
}
```

**Note:** You need to find exactly where `confirmedIds` and `groupId` are available in `submitMatchResult`. Read the function carefully to find the right insertion point.

### Step 4: Add `group_founder` badge in `groups.ts`

In `src/lib/actions/groups.ts`, find the `createGroup` function. After the group and membership insert succeeds, add:

```typescript
// Award group_founder badge
try {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = await createAdminClient()
  const { data: founderBadge } = await admin
    .from('badges')
    .select('id')
    .eq('key', 'group_founder')
    .maybeSingle()
  if (founderBadge) {
    await admin.from('player_badges').upsert(
      { user_id: user.id, badge_id: founderBadge.id, group_id: newGroup.id, equipped: false },
      { onConflict: 'user_id,badge_id,group_id', ignoreDuplicates: true }
    )
  }
} catch { /* non-critical */ }
```

### Step 5: Commit
```bash
git add src/lib/actions/matches.ts src/lib/actions/groups.ts
git commit -m "feat: implement badge awarding logic for match stats and group creation"
```

---

## Task 3: Group Stats Dashboard

**Files:**
- Create: `src/app/(app)/groups/[groupId]/stats/page.tsx`
- Modify: `src/app/(app)/groups/[groupId]/page.tsx` (add nav link)

### Step 1: Create the page file

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'

interface PageProps {
  params: Promise<{ groupId: string }>
}

export default async function GroupStatsPage({ params }: PageProps) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [groupRes, memberRes] = await Promise.all([
    supabase.from('groups').select('id, name, avatar_url').eq('id', groupId).single(),
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (groupRes.error) notFound()
  if (!memberRes.data) redirect('/groups')

  const group = groupRes.data

  // All active members with profiles
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(username, full_name, avatar_url)')
    .eq('group_id', groupId)
    .eq('is_active', true)

  const memberIds = (members ?? []).map(m => m.user_id)

  // Player stats for this group
  const { data: allStats } = memberIds.length > 0
    ? await supabase
        .from('player_stats')
        .select('user_id, matches_played, matches_won, matches_drawn, matches_lost, goals_scored, assists, mvp_count')
        .eq('group_id', groupId)
        .in('user_id', memberIds)
    : { data: [] }

  // Recent matches with results
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, title, scheduled_at, status')
    .eq('group_id', groupId)
    .eq('status', 'played')
    .order('scheduled_at', { ascending: false })
    .limit(8)

  const matchIds = (recentMatches ?? []).map(m => m.id)
  const { data: results } = matchIds.length > 0
    ? await supabase
        .from('match_results')
        .select('match_id, team1_score, team2_score, mvp_user_id')
        .in('match_id', matchIds)
    : { data: [] }

  const resultsMap = Object.fromEntries((results ?? []).map(r => [r.match_id, r]))
  const mvpIds = [...new Set((results ?? []).map(r => r.mvp_user_id).filter(Boolean))] as string[]
  const { data: mvpProfiles } = mvpIds.length > 0
    ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', mvpIds)
    : { data: [] }
  const mvpMap = Object.fromEntries((mvpProfiles ?? []).map(p => [p.id, p]))

  // Aggregate group stats
  const statsRows = allStats ?? []
  const totalMatches = recentMatches?.length ?? 0  // played matches
  const totalGoals = statsRows.reduce((s, r) => s + (r.goals_scored ?? 0), 0)
  const activePlayers = statsRows.filter(r => (r.matches_played ?? 0) > 0).length

  // Top performers
  type StatRow = typeof statsRows[0]
  const byGoals = [...statsRows].sort((a, b) => (b.goals_scored ?? 0) - (a.goals_scored ?? 0))
  const byMvp = [...statsRows].sort((a, b) => (b.mvp_count ?? 0) - (a.mvp_count ?? 0))
  const byPlayed = [...statsRows].sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0))

  const profileMap = Object.fromEntries(
    (members ?? []).map(m => [
      m.user_id,
      m.profiles as unknown as { username: string; full_name: string | null; avatar_url: string | null } | null,
    ])
  )

  const getName = (uid: string) => {
    const p = profileMap[uid]
    return p?.full_name?.split(' ')[0] ?? p?.username ?? '?'
  }

  // CSS bar chart data: top 8 by goals
  const chartData = byGoals.slice(0, 8).filter(r => (r.goals_scored ?? 0) > 0)
  const maxGoals = chartData[0]?.goals_scored ?? 1

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/groups/${groupId}`} style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', lineHeight: 1 }}>
            Statistiche
          </h1>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>{group.name}</div>
        </div>
      </div>

      {/* Hero stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {[
          { label: 'Partite Giocate', value: totalMatches, icon: '⚽' },
          { label: 'Gol Segnati', value: totalGoals, icon: '🎯' },
          { label: 'Giocatori Attivi', value: activePlayers, icon: '👥' },
          { label: 'Media Gol/Partita', value: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : '—', icon: '📊' },
        ].map(card => (
          <div key={card.label} style={{ padding: '1.125rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Top Performers
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
          {[
            { title: 'Capocannoniere', icon: '🎯', row: byGoals[0], value: byGoals[0]?.goals_scored ?? 0, unit: 'gol' },
            { title: 'Re MVP', icon: '⭐', row: byMvp[0], value: byMvp[0]?.mvp_count ?? 0, unit: 'mvp' },
            { title: 'Iron Man', icon: '🏟️', row: byPlayed[0], value: byPlayed[0]?.matches_played ?? 0, unit: 'partite' },
          ].map(item => {
            const hasData = item.row && item.value > 0
            const profile = item.row ? profileMap[item.row.user_id] : null
            return (
              <div key={item.title} style={{ padding: '0.875rem 0.75rem', background: hasData ? 'rgba(200,255,107,0.06)' : 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: `1px solid ${hasData ? 'rgba(200,255,107,0.2)' : 'var(--color-border)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                {hasData ? (
                  <>
                    <Avatar src={profile?.avatar_url ?? null} name={profile?.full_name ?? profile?.username ?? '?'} size="sm" />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {item.row ? getName(item.row.user_id) : '—'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-primary)' }}>{item.value} <span style={{ fontSize: '0.6rem', color: 'var(--color-text-3)' }}>{item.unit}</span></div>
                  </>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>—</div>
                )}
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.title}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Goals bar chart */}
      {chartData.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Gol per Giocatore
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            {chartData.map(row => {
              const pct = Math.round(((row.goals_scored ?? 0) / maxGoals) * 100)
              const profile = profileMap[row.user_id]
              return (
                <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div style={{ width: 56, fontSize: '0.75rem', color: 'var(--color-text-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {profile?.full_name?.split(' ')[0] ?? profile?.username ?? '?'}
                  </div>
                  <div style={{ flex: 1, height: 20, background: 'var(--color-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                  </div>
                  <div style={{ width: 24, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right', flexShrink: 0 }}>
                    {row.goals_scored}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Recent matches form */}
      {(recentMatches ?? []).length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Ultimi Risultati
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(recentMatches ?? []).map(match => {
              const result = resultsMap[match.id]
              const mvpProfile = result?.mvp_user_id ? mvpMap[result.mvp_user_id] : null
              return (
                <Link key={match.id} href={`/matches/${match.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>
                        {new Date(match.scheduled_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {result ? (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)', flexShrink: 0 }}>
                        {result.team1_score} – {result.team2_score}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>N/D</div>
                    )}
                    {mvpProfile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.65rem' }}>⭐</span>
                        <Avatar src={mvpProfile.avatar_url} name={mvpProfile.full_name ?? mvpProfile.username} size="xs" />
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {statsRows.every(r => (r.matches_played ?? 0) === 0) && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          Nessuna statistica ancora — gioca la prima partita!
        </div>
      )}
    </div>
  )
}
```

### Step 2: Add link in group detail page

In `src/app/(app)/groups/[groupId]/page.tsx`, find the quick-action grid (the `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' ...}}>` around line 204).

After the "Rankings" link and before the "Valuta membri" full-width link, add a new grid item. The grid is currently 2 columns — update `gridTemplateColumns` to remain `1fr 1fr` but add the stats link as a new row:

```tsx
import { BarChart2 } from 'lucide-react'  // add to existing lucide import

// In the grid, after the Rankings link:
<Link
  href={`/groups/${groupId}/stats`}
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    padding: '1rem',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    textDecoration: 'none',
    minHeight: 80,
  }}
>
  <BarChart2 size={22} color="var(--color-text-2)" />
  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)' }}>
    Statistiche
  </span>
</Link>
```

### Step 3: Commit
```bash
git add src/app/\(app\)/groups/\[groupId\]/stats/page.tsx src/app/\(app\)/groups/\[groupId\]/page.tsx
git commit -m "feat: add group stats dashboard with hero cards, top performers, goals chart, recent results"
```

---

## Task 4: Player Detail Dashboard within Group

**Files:**
- Create: `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`
- Modify: `src/app/(app)/groups/[groupId]/rankings/page.tsx` (make rows clickable)

### Step 1: Create the player detail page

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'

interface PageProps {
  params: Promise<{ groupId: string; userId: string }>
}

export default async function GroupPlayerPage({ params }: PageProps) {
  const { groupId, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify viewer is a group member
  const { data: viewerMember } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!viewerMember) redirect('/groups')

  const [groupRes, profileRes, playerMemberRes, statsRes, badgesRes] = await Promise.all([
    supabase.from('groups').select('id, name').eq('id', groupId).single(),
    supabase.from('profiles').select('username, full_name, avatar_url, xp, level, bio, preferred_role').eq('id', userId).single(),
    supabase
      .from('group_members')
      .select('display_name, joined_at, role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('player_stats')
      .select('matches_played, matches_won, matches_drawn, matches_lost, goals_scored, assists, mvp_count, clean_sheets')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .maybeSingle(),
    supabase
      .from('player_badges')
      .select('earned_at, badges(key, name_it, icon, tier)')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .order('earned_at', { ascending: false }),
  ])

  if (groupRes.error) notFound()
  if (!playerMemberRes) notFound()

  const group = groupRes.data
  const profile = profileRes.data
  const stats = statsRes.data
  const badges = badgesRes.data ?? []

  // Fetch avg ratings for this player in this group
  const { data: ratingsRaw } = await supabase
    .from('player_ratings')
    .select('velocita, resistenza, forza, salto, agilita, tecnica_palla, dribbling, passaggio, tiro, colpo_di_testa, lettura_gioco, posizionamento, pressing, costruzione, marcatura, tackle, intercettamento, copertura, finalizzazione, assist_making, leadership, comunicazione, mentalita_competitiva, fair_play')
    .eq('ratee_id', userId)
    .eq('group_id', groupId)

  // Aggregate ratings into 6 categories
  type RatingRow = NonNullable<typeof ratingsRaw>[0]
  const avg = (fields: (keyof RatingRow)[], rows: RatingRow[]): number => {
    if (rows.length === 0) return 0
    const total = rows.reduce((s, r) => s + fields.reduce((fs, f) => fs + (r[f] as number), 0), 0)
    return Math.round(total / (rows.length * fields.length) * 10) / 10
  }
  const rows = ratingsRaw ?? []
  const categories = [
    { label: 'Fisica', value: avg(['velocita','resistenza','forza','salto','agilita'], rows), color: '#FF6B6B' },
    { label: 'Tecnica', value: avg(['tecnica_palla','dribbling','passaggio','tiro','colpo_di_testa'], rows), color: '#FFD93D' },
    { label: 'Tattica', value: avg(['lettura_gioco','posizionamento','pressing','costruzione'], rows), color: '#6BCB77' },
    { label: 'Difesa', value: avg(['marcatura','tackle','intercettamento','copertura'], rows), color: '#4D96FF' },
    { label: 'Attacco', value: avg(['finalizzazione','assist_making'], rows), color: 'var(--color-primary)' },
    { label: 'Mentalità', value: avg(['leadership','comunicazione','mentalita_competitiva','fair_play'], rows), color: '#C77DFF' },
  ]
  const hasRatings = rows.length > 0

  const played = stats?.matches_played ?? 0
  const won = stats?.matches_won ?? 0
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0

  const displayName = profile?.full_name ?? profile?.username ?? 'Giocatore'
  const isMe = userId === user.id

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href={`/groups/${groupId}/rankings`} style={{ color: 'var(--color-text-3)', fontSize: '1.25rem', textDecoration: 'none', lineHeight: 1 }}>←</Link>
        <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{group.name}</div>
        {isMe && (
          <Link href="/profile" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Il mio profilo →
          </Link>
        )}
      </div>

      {/* Player hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <Avatar src={profile?.avatar_url ?? null} name={displayName} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: isMe ? 'var(--color-primary)' : 'var(--color-text-1)', lineHeight: 1 }}>
            {displayName}
            {isMe && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', verticalAlign: 'middle' }}>Tu</span>}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', fontWeight: 700 }}>
              Lv.{profile?.level ?? 1}
            </span>
            {playerMemberRes?.role === 'admin' && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)', fontWeight: 700 }}>
                ⭐ Admin
              </span>
            )}
            {profile?.preferred_role && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>
                Ruolo: {profile.preferred_role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <section>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          Statistiche nel Gruppo
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
          {[
            { label: 'Partite', value: played },
            { label: 'Vittorie', value: won },
            { label: 'Win %', value: `${winRate}%` },
            { label: 'Gol', value: stats?.goals_scored ?? 0 },
            { label: 'Assist', value: stats?.assists ?? 0 },
            { label: 'MVP', value: stats?.mvp_count ?? 0 },
          ].map(s => (
            <div key={s.label} style={{ padding: '0.875rem 0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill ratings */}
      {hasRatings && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Rating Medio Compagni ({rows.length} valutazioni)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            {categories.map(cat => (
              <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 64, fontSize: '0.7rem', color: 'var(--color-text-2)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>
                  {cat.label}
                </div>
                <div style={{ flex: 1, height: 8, background: 'var(--color-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(cat.value / 10) * 100}%`, background: cat.color, borderRadius: 4 }} />
                </div>
                <div style={{ width: 28, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: cat.color, textAlign: 'right', flexShrink: 0 }}>
                  {cat.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
            Badge del Gruppo
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {badges.map(pb => {
              const badge = pb.badges as unknown as { key: string; name_it: string; icon: string; tier: string } | null
              if (!badge) return null
              const tierColor = badge.tier === 'gold' ? '#FFD700' : badge.tier === 'silver' ? '#C0C0C0' : '#CD7F32'
              return (
                <div key={pb.earned_at} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', background: 'var(--color-surface)', borderRadius: 999, border: `1px solid ${tierColor}33` }}>
                  <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
                  <span style={{ fontSize: '0.7rem', color: tierColor, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{badge.name_it}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
```

### Step 2: Make rankings rows clickable

In `src/app/(app)/groups/[groupId]/rankings/page.tsx`, wrap each player row with a `Link` to the player detail page.

Find the `.map((r, idx) => { ... return (<div key={r.user_id} style={{...}}>` (around line 179).

Change it to:
```tsx
import Link from 'next/link'

// Replace the outer <div key={r.user_id} ...> with:
<Link
  key={r.user_id}
  href={`/groups/${groupId}/players/${r.user_id}`}
  style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem', gap: '0.25rem', alignItems: 'center', padding: '0.75rem 1rem', background: isMe ? 'rgba(200,255,107,0.08)' : 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${isMe ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}` }}
>
  {/* ...same content... */}
</Link>
```

### Step 3: Commit
```bash
git add src/app/\(app\)/groups/\[groupId\]/players/\[userId\]/page.tsx src/app/\(app\)/groups/\[groupId\]/rankings/page.tsx
git commit -m "feat: add per-player detail dashboard with stats, skill ratings, badges; make rankings rows clickable"
```

---

## Summary

| Task | Description | Status |
|---|---|---|
| 1 | Fix match detail toast + router.refresh | ⏳ |
| 2 | Badge awarding in finalizePostMatchWindow + submitMatchResult + createGroup | ⏳ |
| 3 | Group stats dashboard /groups/[groupId]/stats | ⏳ |
| 4 | Player detail dashboard /groups/[groupId]/players/[userId] | ⏳ |

**Group logo**: Already implemented in settings page — no changes needed.
**win_streak badge**: Skipped — requires tracking consecutive wins across matches, no suitable column exists.
