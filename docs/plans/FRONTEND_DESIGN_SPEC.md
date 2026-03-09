# Kicksy — Frontend Design Specification

> **MANDATORY**: Every UI task in the implementation plan MUST reference and follow this spec.
> This is not a suggestion. Every screen must feel like it was designed by a senior product designer.

---

## Aesthetic Direction: "Stadium Night"

**One sentence**: A premium sports broadcast app that happens to live on your phone.

**The unforgettable thing**: When you open Kicksy at night, it looks like you're inside a floodlit stadium. The lime accent pops against the near-black background like VAR lines on a dark pitch.

**What this is NOT**:
- Not a green-pitch football cliché
- Not a generic dark mode SaaS app
- Not a clone of WhatsApp or Telegram group chats
- Not purple gradients on white (the hallmark of lazy AI UI)

**Tone**: Editorial sports magazine meets mobile-first product. Bold numbers. Controlled density. Every screen has one clear hero element.

---

## Typography System

### Fonts (load via next/font/google)

```typescript
import { Barlow_Condensed, Outfit, JetBrains_Mono } from 'next/font/google'

// Display — scores, titles, ranks, numbers
// Use: ALL CAPS, weight 700-800, tight tracking
const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-display',
})

// UI — body text, labels, navigation, forms
// Use: weight 400/500/600, normal case
const outfit = Outfit({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ui',
})

// Mono — numeric stats, ratings, percentages, scores
// Use: tabular numbers, weight 400/500
const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
})
```

### Typography Scale

```css
/* Display — hero numbers, match scores, OVR */
.text-display-hero   { font-family: var(--font-display); font-size: clamp(3rem, 8vw, 5rem); font-weight: 800; letter-spacing: -0.02em; text-transform: uppercase; line-height: 0.9; }

/* Display — section titles, player names in cards */
.text-display-lg     { font-family: var(--font-display); font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; }

/* Display — card labels, stat names */
.text-display-sm     { font-family: var(--font-display); font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }

/* UI — body */
.text-body           { font-family: var(--font-ui); font-size: 1rem; font-weight: 400; line-height: 1.6; }

/* UI — labels, captions */
.text-label          { font-family: var(--font-ui); font-size: 0.75rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }

/* Mono — stats */
.text-stat           { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 500; font-variant-numeric: tabular-nums; }
```

---

## Color System

```css
:root {
  /* Backgrounds — layered depth */
  --color-bg:        #0A0C12;   /* page background */
  --color-surface:   #111318;   /* cards, modals */
  --color-elevated:  #181C25;   /* elevated cards, inputs */
  --color-overlay:   rgba(10,12,18,0.85); /* overlays */

  /* Borders */
  --color-border:    #252A36;
  --color-border-focus: #C8FF6B;

  /* Accents */
  --color-primary:   #C8FF6B;   /* lime electric — CTAs, active states */
  --color-primary-dim: rgba(200,255,107,0.12); /* subtle bg tint */
  --color-primary-glow: rgba(200,255,107,0.25); /* glow effects */
  --color-secondary: #FFB800;   /* amber — goals, level-up, achievements */
  --color-danger:    #FF3B5C;   /* red card — errors, danger */
  --color-info:      #4D9FFF;   /* blue — info, links */
  --color-success:   #00D68F;   /* green — confirmed, success */

  /* Text */
  --color-text-1:    #F0F2F5;   /* primary */
  --color-text-2:    #8891A4;   /* secondary */
  --color-text-3:    #4A5166;   /* disabled/muted */
  --color-text-inverse: #0A0C12; /* on primary bg */

  /* Macro category colors */
  --color-macro-atletismo:  #FF6B35;
  --color-macro-tecnica:    #4D9FFF;
  --color-macro-tattica:    #A78BFA;
  --color-macro-mentalita:  #FFB800;
  --color-macro-difesa:     #00D68F;
  --color-macro-attacco:    #FF3B5C;

  /* Badge tiers */
  --color-bronze: #CD7F32;
  --color-silver: #C0C0C0;
  --color-gold:   #FFD700;
  --color-special: #C8FF6B;
}
```

---

## Atmospheric Background Treatment

**Never use flat solid backgrounds.** Every page has atmospheric depth.

### Page background (apply to `<body>` or layout)
```css
body {
  background-color: var(--color-bg);
  background-image:
    radial-gradient(ellipse 120% 60% at 50% -10%, rgba(200,255,107,0.04) 0%, transparent 60%),
    radial-gradient(ellipse 80% 40% at 80% 100%, rgba(77,159,255,0.03) 0%, transparent 50%);
}
```

### Card surfaces — subtle grain texture
```css
.card {
  background: var(--color-surface);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
```

### Hero sections (match card, profile top)
```css
.hero-gradient {
  background: linear-gradient(
    135deg,
    rgba(200,255,107,0.08) 0%,
    transparent 40%
  ),
  var(--color-surface);
}
```

### Pitch lines decoration (subtle, use sparingly on home/match pages)
```css
.pitch-lines::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(200,255,107,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,255,107,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
```

---

## Component Specifications

### MatchCard

```
VISUAL SPEC:
┌─────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← 4px lime strip top
│ CALCETTO  ●APERTA               │  ← type badge + status dot
│ MERCOLEDÌ 12 MARZO · 20:00      │  ← font-display, uppercase
│ Campo Turro Nord                │  ← font-ui muted
├─────────────────────────────────┤
│ ●●●●●●●●○○  8 / 12             │  ← player dots + count
│ [av][av][av]+5                  │  ← avatar stack
├─────────────────────────────────┤
│         [ SONO DENTRO! ]        │  ← lime CTA full width
└─────────────────────────────────┘

KEY DETAILS:
- 4px lime top border (not gradient, solid)
- Status dot: pulse animation when 'open' (CSS @keyframes pulse)
- Player dots: filled lime for confirmed, dim border for empty slots
- Avatar stack: slight overlap (-8px), last item shows "+N" count
- On hover (desktop): subtle scale(1.01) + border-color shift to lime
- "SONO DENTRO" button: lime bg, dark text, full width, rounded-xl
- If user already registered: shows "✓ SEI DENTRO" with ghost variant
```

```tsx
// Animation spec:
// Mount: fade-up with stagger (use framer-motion, delay by index * 0.05s)
// Registration toggle: instant optimistic update + spring scale on count
```

### PlayerCard (FIFA-inspired)

```
VISUAL SPEC:
┌─────────────────────────────────┐
│ [        avatar        ]        │
│ [    circular, 80px    ]        │
│                                 │
│  82          OLEG               │  ← OVR (display-hero) + name (display-lg)
│  OVR         #31 · Esterno      │  ← label mono
│                                 │
│  ⚡ Capitano                    │  ← level badge + title (amber)
│  "Il Cecchino Notturno"         │  ← equipped title (italic, muted)
├─────────────────────────────────┤
│  ATL  ████████░░  9.0           │  ← macro bars
│  TEC  ███████░░░  7.3           │
│  TAT  ████████░░  8.0           │
│  MEN  █████████░  9.0           │
│  DIF  ████████░░  8.0           │
│  ATT  ███████░░░  7.0           │
└─────────────────────────────────┘

KEY DETAILS:
- OVR number: font-display 800, size 4rem, lime color
- Macro bars: each macro has its own color (see --color-macro-*)
- Bar fill: animated on mount (width: 0 → actual%, transition 0.6s ease-out, stagger 0.1s)
- Bar value: font-mono, right-aligned
- Hover on macro bar: tooltip showing individual skills
- Card bg: subtle hero-gradient with the player's macro color as tint
```

### TeamSplit

```
VISUAL SPEC:
┌─────────────┬───────┬─────────────┐
│   TEAM A    │  VS   │   TEAM B    │
│   OVR 72    │       │   OVR 71    │
├─────────────┤  ⚡   ├─────────────┤
│ [player]    │       │ [player]    │
│ [player]    │       │ [player]    │
│ [player]    │       │ [player]    │
└─────────────┴───────┴─────────────┘

KEY DETAILS:
- VS separator: font-display, animated entrance (scale 0 → 1, bounce)
- Initial reveal: each player card flips in (rotateY 90→0, stagger 0.08s per player)
- OVR difference: if diff < 0.5, show "⚖ Squadre bilanciate" in lime
- Player rows: avatar + name + position badge + mini OVR
- Admin mode: drag handle on players (swap between teams)
- "Rigenera" button: outline style, shake animation on click while loading
- "Blocca" button: lock icon, turns solid on lock
```

### RatingSlider

```
VISUAL SPEC (per skill):

  Velocità                           7
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ░░░░░░░░░░░░░░████████████░░░░░░░░

  Track: var(--color-border), height 4px, rounded
  Fill:  dynamic color:
    1-3: var(--color-danger)
    4-5: #FF9500
    6-7: var(--color-secondary)
    8-9: var(--color-success)
    10:  var(--color-primary) + glow

  Thumb: 20px circle, border 2px white, fill = track color
  Value: font-mono, right side, updates live
  Label: font-display sm, left, uppercase

KEY DETAILS:
- Smooth transition on color change (transition: all 0.2s)
- Thumb: scale(1.2) on :active
- Group by macro with collapsible section headers
- Section header shows macro average as you rate
- Mobile: large thumb target (44px minimum)
```

### BottomNav

```
VISUAL SPEC:
┌────────────────────────────────────┐
│  🏠     ⚽     📊     👤     🏆   │
│  Home  Match  Stats  Profilo  Rank │
│        ●                           │  ← active indicator
└────────────────────────────────────┘

KEY DETAILS:
- Background: var(--color-surface) + backdrop-blur(20px)
- Border-top: 1px solid var(--color-border)
- Active tab: icon + label in var(--color-primary)
- Active indicator: 2px wide pill under icon, animate width 0→2rem on tab change
- Inactive: var(--color-text-3) icon, no label (saves space on mobile)
- Active: icon + label visible
- Notification badge: small red dot on Match icon when new match available
- Safe-area-inset-bottom: always add for iOS notch
- Height: 64px + safe area
```

### BadgeShelf

```
VISUAL SPEC:
┌───────────────────────────────────┐
│  BADGE (12)                       │
│                                   │
│  [⚽🥉] [🔥🥈] [💥🥉] [⭐🥈]    │
│  [🏆🥉] [👁️🥉] [🗳️🥉] [+5 →]  │
│                                   │
│  ✨ ULTIMO SBLOCCATO              │
│  [⭐ MVP II — 5 premi MVP ]       │  ← highlighted with glow
└───────────────────────────────────┘

KEY DETAILS:
- Badge grid: 4 columns, gap-3
- Locked badges: opacity 0.3, grayscale filter
- Last earned badge: separate highlight card with amber glow
- Tier indicators: small pip below icon (bronze/silver/gold/special colors)
- Tap badge: sheet/modal with full description + earn date
- Hover (desktop): tooltip with name and description
```

### XPBar

```
VISUAL SPEC:
  Titolare → Veterano                    800 / 800 XP
  ████████████████████████████████░░░░░  [LEVEL UP →]

  Progress:
  - Track: var(--color-border), 8px height, rounded
  - Fill: gradient from var(--color-primary) to #A8FF2B
  - Animated: on mount, width 0 → actual (1s ease-out)
  - On XP gain: flash animation (briefly brighter), then smooth fill

  Labels:
  - Left: "CurrentLevel → NextLevel" in font-ui/500
  - Right: "XP / XP_NEXT" in font-mono
```

### StatNumber (animated counter)

```tsx
// Framer Motion implementation spec:
import { useMotionValue, useSpring, useTransform } from 'framer-motion'

// On mount: animate from 0 to actual value
// Duration: 1.2s, spring: stiffness 50, damping 15
// Format: apply number formatting (decimal, percentage, etc.)
// Color: optional — pass colorClass to highlight the number
```

### LevelUpOverlay (full-screen celebration)

```
VISUAL SPEC:
┌────────────────────────────────────┐
│                                    │
│  🎉 LEVEL UP!                     │  ← font-display hero, amber
│                                    │
│      ⚡ CAPITANO                   │  ← scale-in with spring
│                                    │
│  "Il Capitano Eterno"              │  ← new title if unlocked
│                                    │
│  [  FIGO! CHIUDI  ]                │  ← dismiss CTA
│                                    │
│  🎊 confetti raining 🎊           │
└────────────────────────────────────┘

KEY DETAILS:
- Full-screen overlay, z-index top
- Background: radial gradient dark center + confetti
- Canvas-confetti: colors [#C8FF6B, #FFB800, #FF3B5C, #4D9FFF]
- Auto-dismiss after 4s if not tapped
- Spring entrance: overlay fades in, title scales from 0.5
- Sound: optional (vibrate API on mobile if available)
- Use Framer Motion AnimatePresence for exit
```

---

## Animation Principles

### The Golden Rule
**One high-impact animation per screen > ten subtle ones.**

Pick the hero animation for each screen:
- Home: match card stagger reveal on first load
- Match detail: registration count bounce on join
- Teams: flip-card reveal of player assignments
- Profile: macro bars filling on mount
- Ranking: numbers counting up on enter
- Badge: celebration overlay on unlock

### Standard Timings
```
Fast:    150ms  — micro feedback (button press, toggle)
Medium:  300ms  — state changes (tab switch, modal open)
Slow:    600ms  — page transitions, bar fills
Hero:    1200ms — celebrations, level-up, first load reveals
```

### Framer Motion Patterns

```tsx
// Page enter (stagger children)
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
}

// Button press feedback
whileTap={{ scale: 0.97 }}

// Card hover
whileHover={{ scale: 1.01, borderColor: 'var(--color-primary)' }}

// Number count-up — see StatNumber component

// Score reveal flip
initial={{ rotateY: 90, opacity: 0 }}
animate={{ rotateY: 0, opacity: 1 }}
transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.08 }}
```

---

## Mobile-First Rules

### Touch Targets
- **Minimum 44×44px** for any interactive element
- CTA buttons: full width on mobile, min-height 52px
- Bottom nav items: full-width tap zones
- Slider thumbs: 44px tap area (even if visually smaller)

### Safe Areas (iOS)
```css
.bottom-nav { padding-bottom: max(env(safe-area-inset-bottom), 16px); }
.page-content { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
```

### Scroll Behavior
```css
html { scroll-behavior: smooth; }
.scroll-container { -webkit-overflow-scrolling: touch; }
/* Prevent body scroll when modal open */
body.modal-open { overflow: hidden; position: fixed; width: 100%; }
```

### Swipe Gestures
- PollCard voting: swipe left/right (use Framer Motion drag with dragConstraints)
- Sheet/modals: swipe down to dismiss (dragElastic, dragConstraints top: 0)

---

## Screen-by-Screen Directives

### Login
- Full viewport, no scroll
- Atmospheric dark bg with subtle lime glow from bottom
- KICKSY wordmark: font-display 800, size clamp(4rem, 10vw, 6rem)
- Google button: lime bg, dark text, Google icon, subtle lift on hover
- Tagline: italic, muted, small — "Organizza. Gioca. Vinci."
- NO: logo animations that delay the CTA
- YES: fast entrance (300ms fade-up from bottom)

### Home Dashboard
- Opening animation: stagger reveal (featured match → personal stats → challenges)
- Featured match card: slightly larger than list cards, full card width
- Stats strip: 3 numbers in a row (Presenze, Gol, Win%) with font-mono
- Monthly challenges: horizontal scroll on mobile, 2-col on desktop
- Recent activity: minimalist list, time-relative labels ("2h fa", "ieri")

### Match Detail
- Sticky header with match title + status badge
- Slot voting: radio-style with vote count bar — animate bar width on selection
- Player grid: 5-column avatar grid on mobile, shows "+N" overflow
- Registration CTA: sticky bottom bar on mobile with lime button
- Confirmed state: disable slot voting, show confirmed date prominently

### Generated Teams
- Page arrives with dramatic black background → teams flip in
- Split 50/50 columns with VS in the center (font-display, huge)
- Balance indicator: color-coded diff (green if balanced, yellow/red if skewed)
- Each player row: avatar + name + position pill + role-weighted OVR

### Profile
- Top section: full-bleed gradient bg with macro color as tint
- Avatar: 80px circle with online dot and level badge overlay
- OVR number: 3rem font-display, lime
- Title: italic, amber, below nickname
- Macro bars: color-coded per macro, animated on mount
- Badge shelf: scrollable row on profile (3 most recent + "view all")
- Stats grid: 2×2 on mobile (Partite, Gol, Vittorie, Win%)

### Ranking
- List with position number (font-display, dim) + player info + OVR
- #1: special treatment (amber background tint, crown emoji)
- #2-3: slight tint variation
- Current user: always highlighted with primary border
- Animated on enter: numbers count up to position
- Filter tabs: Generale / Gol / Presenze / Win% — pill tabs

### Polls
- Large player avatar per option, centered
- Vote progress (only after voting or when closed): horizontal bar
- Anonymous until closed: show "X voti" not who voted
- Swipe gesture: left = next player, right = previous
- Desktop: click to select, confirm button

---

## What Will Be Rejected

The implementing agent MUST NOT ship any of the following:
- ❌ Purple or blue gradient on white/light background
- ❌ Inter, Roboto, or Arial as primary fonts
- ❌ Flat solid color backgrounds on any major page
- ❌ Cards with no border and no depth
- ❌ Green football pitch imagery (too literal/cliché)
- ❌ Generic emoji-only icons where Lucide icons exist
- ❌ Touch targets smaller than 44px
- ❌ Missing safe-area handling on iOS
- ❌ Animations that block interaction (always allow pointer-events)
- ❌ Color scheme inconsistencies (always use CSS variables)
- ❌ Unstyled loading states (every async action needs a skeleton or spinner)

---

## Loading & Empty States

### Skeletons
Every data-dependent component needs a skeleton:
```tsx
// Pattern: pulsing lime tint
<div className="animate-pulse bg-[var(--color-elevated)] rounded-lg h-20 w-full" />
```

### Empty States
Not "No data found." Each empty state has personality:
- No matches: "Nessuna partita in programma. Sei il boss — creane una!"
- No badges: "Nessun badge ancora. Scendi in campo e guadagnateli!"
- No ratings: "Ancora nessuna valutazione. Gioca qualche partita!"

Each empty state: icon + heading + subtext + optional CTA button.

---

## Responsive Breakpoints

```
Mobile:  < 640px  — single column, bottom nav, full-width cards
Tablet:  640-1024px — 2 columns, bottom or side nav
Desktop: > 1024px  — 3 columns, sidebar nav, wider cards, hover states
```

Desktop is a bonus — mobile is the product.

---

## Utility Classes to Define

```css
/* Glow effects */
.glow-primary { box-shadow: 0 0 20px var(--color-primary-glow); }
.glow-secondary { box-shadow: 0 0 20px rgba(255,184,0,0.25); }

/* Text glow */
.text-glow { text-shadow: 0 0 20px var(--color-primary-glow); }

/* Position badge */
.position-badge {
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.position-badge.D { background: rgba(0,214,143,0.15); color: var(--color-macro-difesa); }
.position-badge.C { background: rgba(77,159,255,0.15); color: var(--color-macro-tecnica); }
.position-badge.E { background: rgba(255,107,53,0.15); color: var(--color-macro-atletismo); }
.position-badge.W { background: rgba(167,139,250,0.15); color: var(--color-macro-tattica); }
.position-badge.A { background: rgba(255,59,92,0.15); color: var(--color-macro-attacco); }
.position-badge.P { background: rgba(255,184,0,0.15); color: var(--color-secondary); }

/* Status dot */
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-success);
}
.status-dot.open { animation: pulse-dot 2s ease-in-out infinite; }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
```
