# Design: FIFA Card + Badge Showcase

**Date:** 2026-03-10
**Status:** Approved

---

## Overview

Two visual features to make the player dashboard more engaging and gamified:

1. **FIFA Card** — replaces the plain hero card at the top of `/groups/[groupId]/players/[userId]` with a tier-based styled card showing OVR score and 6 category skill bars
2. **Badge Showcase** — replaces the basic BadgeShelf with a full grid of all 21 badges (earned + locked), showing locked ones as blurred silhouettes with unlock hints

Both features also apply to `/profile` (self view).

---

## Feature 1: PlayerFIFACard Component

### Layout

Compact horizontal card. Two rows:

**Row 1:** Avatar (md) · Name (CAPS, display font) · OVR number (large, mono, top-right)
**Row 2:** @username · Level badge · Role label
**Row 3:** Divider
**Row 4:** 6 skill bars in 2 columns × 3 rows (FIS/TEC/TAT left, DIF/ATT/MEN right)

Each skill bar:
- Label: 3-letter abbreviation (FIS, TEC, TAT, DIF, ATT, MEN)
- Mini bar: filled width proportional to value/10, colored with category color
- Value: number (1 decimal if has ratings, "—" if no ratings)

### Tier System

OVR is computed from `getPlayerOverall()` (0–100 scale). Tiers:

| OVR | Tier | Name | Gradient / Glow |
|-----|------|------|-----------------|
| 0–59 | — | Nessun tier | `--color-surface` dark, no gradient |
| 60–74 | Bronze | Bronzo | `#cd7f32` copper warm, subtle radial glow bottom-right |
| 75–84 | Silver | Argento | `#a8a8a8` steel cool, gradient top-left to bottom-right |
| 85–91 | Gold | Oro | `#FFD700` amber shimmer, stronger glow |
| 92+ | Elite | Elite | `#C8FF6B` brand lime glow, special shimmer |

Background: `radial-gradient(ellipse at 80% 100%, {tierColor}18, transparent 65%)` over `--color-surface`.
Border: `1px solid {tierColor}35` (subtle tier tint).

### Skill bar colors (per category)

- FIS (Fisica): `#3B82F6` blue
- TEC (Tecnica): `#C8FF6B` lime
- TAT (Tattica): `#FFB800` amber
- DIF (Difesa): `#EF4444` red
- ATT (Attacco): `#F97316` orange
- MEN (Mentalità): `#A855F7` purple

### OVR computation

In the server component, compute average of all 24 individual skills from `ratingRows`, then pass to `getPlayerOverall({ user_id, skills: avgSkills, preferred_role })`.
If no rating rows → OVR = 0 (show "—" instead of number, no tier gradient).

### Component API

```ts
// src/components/ui/PlayerFIFACard.tsx
export type FIFACardProps = {
  player: {
    user_id: string
    username: string
    full_name: string | null
    avatar_url: string | null
    level: number
    preferred_role: string | null
    preferred_role_2?: string | null
  }
  ovr: number          // 0 = no ratings yet
  skillAverages: Array<{ name: string; abbr: string; value: number; color: string }>
  isMe?: boolean
  isAdmin?: boolean
}
```

### Placement

**Replaces** the `{/* Player hero card */}` div in:
- `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`
- `src/app/(app)/profile/page.tsx`

---

## Feature 2: BadgeShowcase Component

### Layout

Two sections in a single vertical column:

**Section 1: "✅ Sbloccati (N)"** — visible only if N > 0
Grid: `display: flex; flex-wrap: wrap; gap: 12px`
Badge items: same as current `BadgeItem` with tier glow + equipped dot

**Section 2: "🔒 Da sbloccare (N)"**
Same grid layout, locked style:
- Emoji: `filter: grayscale(1); opacity: 0.4`
- Circle border: `1px solid {tierColor}30` (dim tier hint)
- Lock overlay: `🔒` icon (12px, absolute top-right of circle)
- Name: dim (`--color-text-3`), readable
- Hint: short condition text below name (e.g. `25 gol`, `50 partite`)

### Data requirements

Currently only earned badges are fetched. Need to add:

```ts
supabase.from('badges').select('*')
```

Then compute `lockedBadges = allBadges.filter(b => !earnedKeys.has(b.key))`.

### Hint text mapping

Map `condition_type + condition_value` → short Italian hint:

| condition_type | template |
|---------------|----------|
| `matches_played` | `{N} partite` |
| `goals_scored` | `{N} gol` |
| `matches_won` | `{N} vittorie` |
| `win_streak` | `{N} vittorie di fila` |
| `mvp_count` | `{N} MVP` |
| `assists` | `{N} assist` |
| `ratings_given` | `{N} valutazioni` |
| `groups_created` | `Crea un gruppo` |
| `invites_sent` | `{N} inviti` |
| `early_adopter` | `Pioniere` |
| `clean_sheets` | `{N} clean sheet` |

### Component API

```ts
// src/components/ui/BadgeShowcase.tsx
export type BadgeShowcaseProps = {
  earnedBadges: Array<PlayerBadge & { badge: Badge }>
  allBadges: Badge[]
}
```

### Placement

**Replaces** `BadgeShelf` usage in:
- `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx`
- `src/app/(app)/profile/page.tsx`

`BadgeShelf` remains for other compact contexts (e.g. MatchCard, if used).

---

## Files to create / modify

| Action | File |
|--------|------|
| Create | `src/components/ui/PlayerFIFACard.tsx` |
| Create | `src/components/ui/BadgeShowcase.tsx` |
| Modify | `src/components/ui/index.ts` — add exports |
| Modify | `src/app/(app)/groups/[groupId]/players/[userId]/page.tsx` |
| Modify | `src/app/(app)/profile/page.tsx` |

---

## Out of scope

- Share/export card as image
- Progress bars on locked badges (keeping it simple: hint text only)
- Animations/transitions on card tier
