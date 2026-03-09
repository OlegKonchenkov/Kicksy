# Kicksy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Kicksy — a multi-tenant, mobile-first football match organizer with smart team generation, gamification, and peer rating.

**Architecture:** Next.js 15 App Router + Supabase (multi-tenant via RLS) + Tailwind v4. All heavy logic (team balancing, XP awards) in Supabase Edge Functions or server actions. Design system "Stadium Night": dark theme, lime accent, Barlow Condensed display font.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Supabase (Auth + DB + Storage + Edge Functions), Resend, Framer Motion, Vitest, Playwright.

**Design doc:** `docs/plans/2026-03-09-kicksy-design.md`

---

## PHASE 1 — Project Bootstrap

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.env.local`, `.env.example`

**Step 1: Scaffold project**
```bash
cd "C:/Users/Oleg/OneDrive - Enereco S.p.A/Documents/GitHub/Kicksy"
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

**Step 2: Install core dependencies**
```bash
npm install @supabase/supabase-js @supabase/ssr \
  framer-motion \
  resend \
  next-intl \
  date-fns \
  clsx tailwind-merge \
  lucide-react \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-toast @radix-ui/react-tabs \
  @radix-ui/react-progress @radix-ui/react-avatar \
  @radix-ui/react-slider @radix-ui/react-switch \
  openai \
  zod react-hook-form @hookform/resolvers
```

**Step 3: Install dev dependencies**
```bash
npm install -D \
  vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @playwright/test \
  @types/node
```

**Step 4: Create `.env.example`**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# AI
OPENAI_API_KEY=
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=it
```

**Step 5: Copy `.env.example` to `.env.local` and fill Supabase keys**

**Step 6: Commit**
```bash
git init
git add .
git commit -m "chore: initialize Next.js project with dependencies"
```

---

### Task 2: Configure Tailwind v4 Design System

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/utils.ts`

**Step 1: Replace `globals.css` with Stadium Night tokens**
```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-bg:        #0A0C12;
  --color-surface:   #111318;
  --color-elevated:  #181C25;
  --color-border:    #252A36;

  --color-primary:   #C8FF6B;
  --color-secondary: #FFB800;
  --color-danger:    #FF3B5C;
  --color-info:      #4D9FFF;

  --color-text-1:    #F0F2F5;
  --color-text-2:    #8891A4;
  --color-text-3:    #4A5166;

  /* Typography */
  --font-display: 'Barlow Condensed', sans-serif;
  --font-ui:      'Outfit', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  /* Spacing */
  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1.25rem;
  --radius-xl: 2rem;
}

@layer base {
  html { background: var(--color-bg); color: var(--color-text-1); }
  body { font-family: var(--font-ui); }
}
```

**Step 2: Add Google Fonts in `src/app/layout.tsx`**
```tsx
import { Barlow_Condensed, Outfit, JetBrains_Mono } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
})
const outfit = Outfit({ subsets: ['latin'], variable: '--font-ui' })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${barlowCondensed.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

**Step 3: Create `src/lib/utils.ts`**
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: Stadium Night design tokens and typography"
```

---

### Task 3: Configure Vitest + Playwright

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `src/test/setup.ts`

**Step 1: Create `vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
```

**Step 2: Create `src/test/setup.ts`**
```typescript
import '@testing-library/jest-dom'
```

**Step 3: Add scripts to `package.json`**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test"
  }
}
```

**Step 4: Run `npm test` — should pass (0 tests)**

**Step 5: Commit**
```bash
git add -A
git commit -m "chore: configure Vitest and Playwright"
```

---

## PHASE 2 — Supabase Schema

### Task 4: Create database migrations

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Install Supabase CLI**
```bash
npm install -D supabase
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Step 2: Create `supabase/migrations/001_initial_schema.sql`**
```sql
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── SPORT CONFIGS ───────────────────────────────────────────────────────────
create table sport_configs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  positions   text[] not null default '{}',
  skill_attributes jsonb not null default '{}',
  match_size_rules jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- ─── GROUPS ──────────────────────────────────────────────────────────────────
create table groups (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text unique not null,
  sport_config_id uuid references sport_configs(id),
  invite_code     text unique not null default substr(md5(random()::text), 1, 8),
  avatar_url      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

-- ─── GROUP MEMBERS ────────────────────────────────────────────────────────────
create table group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'player' check (role in ('super_admin','admin','player','guest')),
  joined_at  timestamptz default now(),
  banned_at  timestamptz,
  unique (group_id, user_id)
);

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  nickname              text,
  avatar_url            text,
  bio                   text,
  preferred_number      int,
  preferred_position    text,
  secondary_positions   text[] default '{}',
  play_style_tags       text[] default '{}',
  onboarding_completed  boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── MATCHES ──────────────────────────────────────────────────────────────────
create table matches (
  id              uuid primary key default uuid_generate_v4(),
  group_id        uuid not null references groups(id) on delete cascade,
  title           text not null,
  location        text,
  sport_config_id uuid references sport_configs(id),
  status          text not null default 'draft'
                  check (status in ('draft','open','confirmed','completed','cancelled')),
  min_players     int default 6,
  max_players     int default 12,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);

create table match_slots (
  id         uuid primary key default uuid_generate_v4(),
  match_id   uuid not null references matches(id) on delete cascade,
  starts_at  timestamptz not null,
  confirmed  boolean default false
);

create table match_registrations (
  id            uuid primary key default uuid_generate_v4(),
  match_id      uuid not null references matches(id) on delete cascade,
  slot_id       uuid references match_slots(id),
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'in' check (status in ('in','out','maybe')),
  registered_at timestamptz default now(),
  unique (match_id, user_id)
);

create table match_results (
  id            uuid primary key default uuid_generate_v4(),
  match_id      uuid not null references matches(id) on delete cascade,
  team_a_score  int not null,
  team_b_score  int not null,
  notes         text,
  recorded_by   uuid references auth.users(id),
  recorded_at   timestamptz default now()
);

create table match_goals (
  id       uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id  uuid not null references auth.users(id),
  team     text not null check (team in ('a','b')),
  count    int not null default 1
);

create table generated_teams (
  id                   uuid primary key default uuid_generate_v4(),
  match_id             uuid not null references matches(id) on delete cascade,
  team_a_player_ids    uuid[] not null,
  team_b_player_ids    uuid[] not null,
  algorithm_version    text default 'v1',
  balance_score        numeric,
  constraints_applied  jsonb default '{}',
  locked               boolean default false,
  created_at           timestamptz default now()
);

-- ─── RATING ───────────────────────────────────────────────────────────────────
create table player_ratings (
  id           uuid primary key default uuid_generate_v4(),
  rater_id     uuid not null references auth.users(id),
  rated_id     uuid not null references auth.users(id),
  group_id     uuid not null references groups(id),
  match_id     uuid references matches(id),
  skill_scores jsonb not null,
  season       text not null default to_char(now(), 'YYYY'),
  created_at   timestamptz default now(),
  unique (rater_id, rated_id, group_id, season, match_id)
);

create table player_stats (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id),
  group_id          uuid not null references groups(id),
  season            text not null default to_char(now(), 'YYYY'),
  overall_score     numeric(4,2) default 0,
  macro_scores      jsonb default '{}',
  matches_played    int default 0,
  goals             int default 0,
  wins              int default 0,
  losses            int default 0,
  reliability_score numeric(4,2) default 1.0,
  rater_score       numeric(4,2) default 1.0,
  xp                int default 0,
  level             int default 1,
  equipped_title    text,
  updated_at        timestamptz default now(),
  unique (user_id, group_id, season)
);

-- ─── POLLS ────────────────────────────────────────────────────────────────────
create table poll_templates (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid references groups(id) on delete cascade,
  title       text not null,
  description text,
  emoji       text,
  is_global   boolean default true,
  created_at  timestamptz default now()
);

create table polls (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references matches(id) on delete cascade,
  template_id uuid references poll_templates(id),
  title       text not null,
  emoji       text,
  status      text not null default 'open' check (status in ('open','closed')),
  closes_at   timestamptz,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table poll_votes (
  id            uuid primary key default uuid_generate_v4(),
  poll_id       uuid not null references polls(id) on delete cascade,
  voter_id      uuid not null references auth.users(id),
  voted_for_id  uuid not null references auth.users(id),
  created_at    timestamptz default now(),
  unique (poll_id, voter_id)
);

-- ─── GAMIFICATION ─────────────────────────────────────────────────────────────
create table badges (
  id           uuid primary key default uuid_generate_v4(),
  code         text unique not null,
  name         text not null,
  description  text,
  icon         text,
  category     text not null check (category in ('presence','performance','community','seasonal')),
  tier         text not null check (tier in ('bronze','silver','gold','special')),
  trigger_rule jsonb not null default '{}'
);

create table player_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id),
  group_id   uuid not null references groups(id),
  badge_id   uuid not null references badges(id),
  match_id   uuid references matches(id),
  earned_at  timestamptz default now(),
  unique (user_id, group_id, badge_id)
);

create table player_titles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id),
  group_id   uuid not null references groups(id),
  title_code text not null,
  equipped   boolean default false,
  earned_at  timestamptz default now(),
  unique (user_id, group_id, title_code)
);

create table monthly_challenges (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references groups(id),
  month      text not null,
  challenges jsonb not null,
  active     boolean default true,
  unique (group_id, month)
);

create table challenge_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id),
  group_id     uuid not null references groups(id),
  challenge_id text not null,
  month        text not null,
  progress     int default 0,
  completed    boolean default false,
  completed_at timestamptz,
  unique (user_id, group_id, challenge_id, month)
);

-- ─── CONSTRAINTS ──────────────────────────────────────────────────────────────
create table team_constraints (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references groups(id),
  player_a_id uuid not null references auth.users(id),
  player_b_id uuid not null references auth.users(id),
  type        text not null check (type in ('never_together','prefer_apart','always_together')),
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id),
  type       text not null,
  payload    jsonb default '{}',
  read       boolean default false,
  created_at timestamptz default now()
);
```

**Step 3: Push migration**
```bash
npx supabase db push
```

**Step 4: Verify tables exist in Supabase dashboard**

**Step 5: Commit**
```bash
git add supabase/
git commit -m "feat: initial database schema"
```

---

### Task 5: RLS Policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Create RLS policies**
```sql
-- Helper function
create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and banned_at is null
  )
$$;

create or replace function is_group_admin(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
    and role in ('admin','super_admin') and banned_at is null
  )
$$;

-- Enable RLS
alter table groups enable row level security;
alter table group_members enable row level security;
alter table profiles enable row level security;
alter table matches enable row level security;
alter table match_slots enable row level security;
alter table match_registrations enable row level security;
alter table match_results enable row level security;
alter table match_goals enable row level security;
alter table generated_teams enable row level security;
alter table player_ratings enable row level security;
alter table player_stats enable row level security;
alter table poll_templates enable row level security;
alter table polls enable row level security;
alter table poll_votes enable row level security;
alter table badges enable row level security;
alter table player_badges enable row level security;
alter table player_titles enable row level security;
alter table monthly_challenges enable row level security;
alter table challenge_progress enable row level security;
alter table team_constraints enable row level security;
alter table notifications enable row level security;

-- PROFILES: users see/edit own, others see basic info
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- GROUPS: members see their groups, anyone can read public
create policy "groups_select" on groups for select using (is_group_member(id));
create policy "groups_insert" on groups for insert with check (auth.uid() is not null);
create policy "groups_update" on groups for update using (is_group_admin(id));

-- GROUP_MEMBERS: members see their group
create policy "gm_select" on group_members for select using (is_group_member(group_id));
create policy "gm_insert" on group_members for insert with check (auth.uid() is not null);
create policy "gm_update" on group_members for update using (is_group_admin(group_id));
create policy "gm_delete" on group_members for delete using (is_group_admin(group_id) or user_id = auth.uid());

-- MATCHES
create policy "matches_select" on matches for select using (is_group_member(group_id));
create policy "matches_insert" on matches for insert with check (is_group_admin(group_id));
create policy "matches_update" on matches for update using (is_group_admin(group_id));

-- MATCH_SLOTS
create policy "slots_select" on match_slots for select using (
  exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
);
create policy "slots_all" on match_slots for all using (
  exists (select 1 from matches m where m.id = match_id and is_group_admin(m.group_id))
);

-- MATCH_REGISTRATIONS
create policy "reg_select" on match_registrations for select using (
  exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id))
);
create policy "reg_insert" on match_registrations for insert with check (user_id = auth.uid());
create policy "reg_update" on match_registrations for update using (user_id = auth.uid());

-- PLAYER_STATS (readable by group members)
create policy "stats_select" on player_stats for select using (is_group_member(group_id));
create policy "stats_all" on player_stats for all using (user_id = auth.uid());

-- POLL_VOTES: can't see others' votes until poll closed
create policy "votes_select" on poll_votes for select using (
  voter_id = auth.uid() or
  exists (select 1 from polls p join matches m on p.match_id = m.id
          where p.id = poll_id and (p.status = 'closed' or is_group_admin(m.group_id)))
);
create policy "votes_insert" on poll_votes for insert with check (voter_id = auth.uid());

-- NOTIFICATIONS: own only
create policy "notif_select" on notifications for select using (user_id = auth.uid());
create policy "notif_update" on notifications for update using (user_id = auth.uid());
```

**Step 2: Push**
```bash
npx supabase db push
```

**Step 3: Commit**
```bash
git add supabase/
git commit -m "feat: RLS policies for all tables"
```

---

### Task 6: Seed data

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Create seed**
```sql
-- Football sport config
insert into sport_configs (name, positions, skill_attributes, match_size_rules) values (
  'Calcio',
  array['P','D','C','E','W','A'],
  '{
    "skills": [
      {"key":"velocita","label":"Velocità","macro":"atletismo","weight_global":6},
      {"key":"resistenza","label":"Resistenza","macro":"atletismo","weight_global":4},
      {"key":"forza","label":"Forza","macro":"atletismo","weight_global":2},
      {"key":"controllo_palla","label":"Controllo palla","macro":"tecnica","weight_global":7},
      {"key":"dribbling","label":"Dribbling","macro":"tecnica","weight_global":4},
      {"key":"passaggi_corti","label":"Passaggi corti","macro":"tecnica","weight_global":7},
      {"key":"passaggi_lunghi","label":"Passaggi lunghi","macro":"tecnica","weight_global":3},
      {"key":"senso_tattico","label":"Senso Tattico","macro":"tattica","weight_global":7},
      {"key":"visione","label":"Visione","macro":"tattica","weight_global":5},
      {"key":"adattabilita","label":"Adattabilità Multiruolo","macro":"tattica","weight_global":2},
      {"key":"agonismo","label":"Agonismo","macro":"mentalita","weight_global":5},
      {"key":"freddezza","label":"Freddezza","macro":"mentalita","weight_global":4},
      {"key":"comunicazione","label":"Comunicazione","macro":"mentalita","weight_global":3},
      {"key":"attenzione","label":"Attenzione","macro":"mentalita","weight_global":6},
      {"key":"contrasti","label":"Contrasti","macro":"difesa","weight_global":5},
      {"key":"letture","label":"Letture","macro":"difesa","weight_global":5},
      {"key":"predisposizione_difendere","label":"Predisposizione a Difendere","macro":"difesa","weight_global":4},
      {"key":"tiro","label":"Tiro","macro":"attacco","weight_global":5},
      {"key":"colpo_di_testa","label":"Colpo di Testa","macro":"attacco","weight_global":1},
      {"key":"fiuto_del_gol","label":"Fiuto del Gol","macro":"attacco","weight_global":6},
      {"key":"voglia_di_correre","label":"Voglia di Correre","macro":"atletismo","weight_global":5},
      {"key":"costanza","label":"Costanza di Rendimento","macro":"mentalita","weight_global":4}
    ],
    "macros": [
      {"key":"atletismo","label":"Atletismo","weight":18},
      {"key":"tecnica","label":"Tecnica","weight":24},
      {"key":"tattica","label":"Tattica","weight":19},
      {"key":"mentalita","label":"Mentalità","weight":19},
      {"key":"difesa","label":"Difesa","weight":12},
      {"key":"attacco","label":"Attacco","weight":14}
    ],
    "role_weights": {
      "D": {"velocita":5,"resistenza":5,"forza":4,"controllo_palla":4,"dribbling":1,"passaggi_corti":5,"passaggi_lunghi":2,"senso_tattico":8,"visione":5,"adattabilita":2,"agonismo":5,"freddezza":4,"comunicazione":5,"attenzione":8,"contrasti":8,"letture":8,"predisposizione_difendere":8,"tiro":1,"colpo_di_testa":2,"fiuto_del_gol":1,"voglia_di_correre":4,"costanza":5},
      "C": {"velocita":3,"resistenza":6,"forza":2,"controllo_palla":8,"dribbling":4,"passaggi_corti":8,"passaggi_lunghi":5,"senso_tattico":8,"visione":7,"adattabilita":3,"agonismo":5,"freddezza":3,"comunicazione":4,"attenzione":7,"contrasti":4,"letture":5,"predisposizione_difendere":3,"tiro":3,"colpo_di_testa":1,"fiuto_del_gol":2,"voglia_di_correre":4,"costanza":5},
      "E": {"velocita":8,"resistenza":7,"forza":2,"controllo_palla":7,"dribbling":7,"passaggi_corti":6,"passaggi_lunghi":3,"senso_tattico":5,"visione":4,"adattabilita":6,"agonismo":4,"freddezza":3,"comunicazione":2,"attenzione":5,"contrasti":4,"letture":3,"predisposizione_difendere":4,"tiro":5,"colpo_di_testa":1,"fiuto_del_gol":3,"voglia_di_correre":6,"costanza":5},
      "W": {"velocita":6,"resistenza":3,"forza":1,"controllo_palla":9,"dribbling":9,"passaggi_corti":6,"passaggi_lunghi":2,"senso_tattico":5,"visione":9,"adattabilita":5,"agonismo":3,"freddezza":7,"comunicazione":1,"attenzione":4,"contrasti":2,"letture":2,"predisposizione_difendere":1,"tiro":8,"colpo_di_testa":2,"fiuto_del_gol":8,"voglia_di_correre":3,"costanza":4},
      "A": {"velocita":5,"resistenza":3,"forza":4,"controllo_palla":7,"dribbling":4,"passaggi_corti":4,"passaggi_lunghi":1,"senso_tattico":5,"visione":3,"adattabilita":2,"agonismo":7,"freddezza":8,"comunicazione":3,"attenzione":6,"contrasti":1,"letture":3,"predisposizione_difendere":1,"tiro":9,"colpo_di_testa":6,"fiuto_del_gol":9,"voglia_di_correre":3,"costanza":6}
    }
  }',
  '{"thresholds": [
    {"min":2,"max":12,"label":"Calcetto","teams":2},
    {"min":14,"max":18,"label":"Calciotto","teams":2},
    {"min":20,"max":24,"label":"Calcio a 11","teams":2}
  ]}'
);

-- Badges
insert into badges (code, name, description, icon, category, tier, trigger_rule) values
  ('presence_5','Sempre in Campo I','5 partite giocate','⚽','presence','bronze','{"type":"matches_played","threshold":5}'),
  ('presence_20','Sempre in Campo II','20 partite giocate','⚽','presence','silver','{"type":"matches_played","threshold":20}'),
  ('presence_50','Sempre in Campo III','50 partite giocate','⚽','presence','gold','{"type":"matches_played","threshold":50}'),
  ('streak_3','En Plein I','3 partite consecutive','🔥','presence','bronze','{"type":"streak","threshold":3}'),
  ('streak_5','En Plein II','5 partite consecutive','🔥','presence','silver','{"type":"streak","threshold":5}'),
  ('streak_10','En Plein III','10 partite consecutive','🔥','presence','gold','{"type":"streak","threshold":10}'),
  ('goals_5','Cannoniere I','5 gol segnati','💥','performance','bronze','{"type":"goals","threshold":5}'),
  ('goals_20','Cannoniere II','20 gol segnati','💥','performance','silver','{"type":"goals","threshold":20}'),
  ('goals_50','Cannoniere III','50 gol segnati','💥','performance','gold','{"type":"goals","threshold":50}'),
  ('wins_5','Imbattibile I','5 vittorie','🏆','performance','bronze','{"type":"wins","threshold":5}'),
  ('wins_20','Imbattibile II','20 vittorie','🏆','performance','silver','{"type":"wins","threshold":20}'),
  ('wins_50','Imbattibile III','50 vittorie','🏆','performance','gold','{"type":"wins","threshold":50}'),
  ('mvp_1','MVP I','Primo premio MVP','⭐','performance','bronze','{"type":"mvp_count","threshold":1}'),
  ('mvp_5','MVP II','5 premi MVP','⭐','performance','silver','{"type":"mvp_count","threshold":5}'),
  ('mvp_15','MVP III','15 premi MVP','⭐','performance','gold','{"type":"mvp_count","threshold":15}'),
  ('rating_5','Talent Scout I','5 valutazioni completate','👁️','community','bronze','{"type":"ratings_given","threshold":5}'),
  ('rating_20','Talent Scout II','20 valutazioni completate','👁️','community','silver','{"type":"ratings_given","threshold":20}'),
  ('rating_50','Talent Scout III','50 valutazioni completate','👁️','community','gold','{"type":"ratings_given","threshold":50}'),
  ('poll_5','Giurato I','5 votazioni post-partita','🗳️','community','bronze','{"type":"polls_voted","threshold":5}'),
  ('poll_20','Giurato II','20 votazioni post-partita','🗳️','community','silver','{"type":"polls_voted","threshold":20}'),
  ('match_org_1','Organizzatore I','Prima partita creata','🤝','community','bronze','{"type":"matches_created","threshold":1}'),
  ('match_org_5','Organizzatore II','5 partite create','🤝','community','silver','{"type":"matches_created","threshold":5}'),
  ('season_top_scorer','Capocannoniere','Top scorer di stagione','🥇','seasonal','special','{"type":"season_top_scorer"}'),
  ('season_rank_1','Re della Classifica','#1 overall a fine stagione','👑','seasonal','special','{"type":"season_rank_1"}'),
  ('season_iron','Presenze di Ferro','Zero assenze in stagione','💎','seasonal','special','{"type":"season_perfect_attendance"}');

-- Poll templates
insert into poll_templates (group_id, title, description, emoji, is_global) values
  (null, 'Migliore in campo', 'Chi ha dominato stasera?', '⭐', true),
  (null, 'MVP Difensivo', 'Il muro invalicabile della serata', '🛡️', true),
  (null, 'Più ignorante', 'Il giocatore più irruento', '😤', true),
  (null, 'Gol più bello', 'La rete più spettacolare', '💥', true),
  (null, 'Sorpresa della serata', 'Chi ha sorpreso tutti', '🎪', true),
  (null, 'Bidone di giornata', 'Chi ha deluso le aspettative', '🗑️', true),
  (null, 'Uomo Spogliatoio', 'Il cuore del gruppo', '🤝', true);
```

**Step 2: Apply seed**
```bash
npx supabase db reset --linked
# or manually: psql < supabase/seed.sql
```

**Step 3: Commit**
```bash
git add supabase/
git commit -m "feat: seed sport config, badges, poll templates"
```

---

## PHASE 3 — Supabase Client + Auth

### Task 7: Supabase client setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

**Step 1: Create `src/lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create `src/lib/supabase/server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 3: Create `src/middleware.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isAppRoute = request.nextUrl.pathname.startsWith('/app')

  if (!user && isAppRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
```

**Step 4: Generate TypeScript types from Supabase**
```bash
npx supabase gen types typescript --linked > src/types/supabase.ts
```

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: Supabase client, server, middleware setup"
```

---

### Task 8: Auth — Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/actions.ts`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/api/auth/callback/route.ts`

**Step 1: Create `src/app/api/auth/callback/route.ts`**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if profile needs onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/app/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

**Step 2: Create `src/app/(auth)/login/actions.ts`**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) throw error
  return data.url
}
```

**Step 3: Create login page `src/app/(auth)/login/page.tsx`**
```tsx
'use client'
import { signInWithGoogle } from './actions'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function LoginPage() {
  async function handleGoogleLogin() {
    const url = await signInWithGoogle()
    window.location.href = url
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-gradient-radial from-[#0F1A0A] via-[var(--color-bg)] to-[var(--color-bg)] opacity-60" />
      <div className="absolute inset-0"
        style={{background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(200,255,107,0.06) 0%, transparent 70%)'}}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-7xl font-[var(--font-display)] font-extrabold uppercase tracking-tight text-[var(--color-text-1)] leading-none">
            KICKSY
          </span>
          <span className="text-[var(--color-text-2)] text-sm tracking-widest uppercase">
            Organizza. Gioca. Vinci.
          </span>
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold py-4 px-6 rounded-xl text-base hover:brightness-110 active:scale-95 transition-all"
          whileTap={{ scale: 0.97 }}
        >
          <GoogleIcon />
          Accedi con Google
        </motion.button>

        <p className="text-[var(--color-text-3)] text-xs text-center">
          Accedendo accetti i termini di utilizzo.<br />Solo per il tuo gruppo di amici.
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
```

**Step 4: Configure Google OAuth in Supabase dashboard**
- Go to Authentication → Providers → Google
- Add Client ID and Secret from Google Cloud Console
- Add redirect URL: `{NEXT_PUBLIC_APP_URL}/api/auth/callback`

**Step 5: Test login flow in browser**

**Step 6: Commit**
```bash
git add -A
git commit -m "feat: Google OAuth login page and callback"
```

---

### Task 9: Onboarding Flow

**Files:**
- Create: `src/app/(app)/app/onboarding/page.tsx`
- Create: `src/app/(app)/app/onboarding/actions.ts`
- Create: `src/components/onboarding/ProfileStep.tsx`
- Create: `src/components/onboarding/SelfRatingStep.tsx`

**Step 1: Create multi-step onboarding with profile + self-rating**

`src/app/(app)/app/onboarding/page.tsx` — 2-step form:
- Step 1: display_name, nickname, preferred_number, preferred_position, secondary_positions[], bio (textarea), play_style_tags
- Step 2: self-rating sliders for all 22 skills (grouped by macro, explained as "Come ti valuti?")
- Saves to `profiles` + inserts first `player_ratings` (self, match_id null, auto-marked as self-rating)

Use `react-hook-form` + `zod` for validation.
Animate transitions between steps with Framer Motion `AnimatePresence`.

**Step 2: Create profile action**
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveProfile(data: ProfileFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('profiles').upsert({
    id: user.id,
    ...data,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/app')
}
```

**Step 3: Test onboarding completion → redirects to /app**

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: onboarding flow with profile and self-rating"
```

---

## PHASE 4 — Design System Components

### Task 10: Core UI Components

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/ProgressBar.tsx`
- Create: `src/components/ui/BottomNav.tsx`
- Create: `src/components/ui/StatNumber.tsx`

**Step 1: Write failing tests for Button**
```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

test('renders children', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})

test('applies variant classes', () => {
  render(<Button variant="danger">Delete</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-[var(--color-danger)]')
})

test('shows loading spinner when loading', () => {
  render(<Button loading>Save</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

**Step 2: Run test — FAIL**
```bash
npm test -- Button
```

**Step 3: Implement `Button.tsx`**
```tsx
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[var(--color-primary)] text-[var(--color-bg)] hover:brightness-110': variant === 'primary',
            'bg-[var(--color-elevated)] text-[var(--color-text-1)] border border-[var(--color-border)] hover:border-[var(--color-primary)]': variant === 'secondary',
            'bg-transparent text-[var(--color-text-2)] hover:text-[var(--color-text-1)]': variant === 'ghost',
            'bg-[var(--color-danger)] text-white hover:brightness-110': variant === 'danger',
            'px-3 py-2 text-sm': size === 'sm',
            'px-5 py-3 text-base': size === 'md',
            'px-6 py-4 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

**Step 4: Run tests — PASS**

**Step 5: Implement remaining components** following same pattern:
- `Card.tsx` — surface/elevated variants, optional glow on hover
- `Input.tsx` — dark styled, focus ring lime
- `Avatar.tsx` — circular, fallback initials, online dot
- `ProgressBar.tsx` — animated fill, lime color
- `StatNumber.tsx` — animated counter using Framer Motion `useMotionValue` + `useSpring`
- `BottomNav.tsx` — 5 tabs (Home, Partite, Stats, Profilo, Classifica), active indicator lime, fixed bottom

**Step 6: Commit**
```bash
git add -A
git commit -m "feat: core UI component library"
```

---

## PHASE 5 — Groups Feature

### Task 11: Create Group + Join Flow

**Files:**
- Create: `src/app/(app)/app/groups/new/page.tsx`
- Create: `src/app/(app)/app/groups/join/[code]/page.tsx`
- Create: `src/app/(app)/app/groups/actions.ts`

**Step 1: Test group creation action**
```typescript
// src/app/(app)/app/groups/__tests__/actions.test.ts
import { createGroup } from '../actions'

test('createGroup returns group with invite_code', async () => {
  // Mock supabase — test logic only
  const result = generateInviteCode()
  expect(result).toHaveLength(8)
})

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}
```

**Step 2: Implement group actions**
```typescript
'use server'
export async function createGroup(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, slug: `${slug}-${Date.now()}`, created_by: user!.id })
    .select()
    .single()

  if (error) throw error

  // Add creator as admin
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user!.id,
    role: 'admin',
  })

  // Initialize player_stats for creator
  await supabase.from('player_stats').insert({
    user_id: user!.id,
    group_id: group.id,
  })

  revalidatePath('/app')
  redirect(`/app/groups/${group.id}`)
}

export async function joinGroupByCode(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!group) throw new Error('Codice non valido')

  await supabase.from('group_members').upsert({
    group_id: group.id,
    user_id: user!.id,
    role: 'player',
  })

  await supabase.from('player_stats').upsert({
    user_id: user!.id,
    group_id: group.id,
  })

  redirect(`/app/groups/${group.id}`)
}
```

**Step 3: Create Join page with invite link detection**
```tsx
// If user arrives at /app/groups/join/ABCD123, auto-shows confirmation
// QR code or share link: {APP_URL}/app/groups/join/{invite_code}
```

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: group creation and join by invite code"
```

---

## PHASE 6 — Matches Feature

### Task 12: Match Creation + List

**Files:**
- Create: `src/app/(app)/app/matches/page.tsx`
- Create: `src/app/(app)/app/matches/new/page.tsx`
- Create: `src/app/(app)/app/matches/actions.ts`
- Create: `src/components/match/MatchCard.tsx`

**Step 1: Test match size detection**
```typescript
// src/lib/algorithms/__tests__/matchSize.test.ts
import { detectMatchSize } from '../matchSize'

test('returns calcetto for 10 players', () => {
  expect(detectMatchSize(10, defaultConfig)).toBe('Calcetto')
})
test('returns calciotto for 16 players', () => {
  expect(detectMatchSize(16, defaultConfig)).toBe('Calciotto')
})
test('returns calcio a 11 for 22 players', () => {
  expect(detectMatchSize(22, defaultConfig)).toBe('Calcio a 11')
})
```

**Step 2: Implement `src/lib/algorithms/matchSize.ts`**
```typescript
export function detectMatchSize(count: number, config: MatchSizeConfig): string {
  const threshold = config.thresholds
    .slice()
    .reverse()
    .find(t => count >= t.min)
  return threshold?.label ?? 'Calcetto'
}
```

**Step 3: Run tests — PASS**

**Step 4: Implement `MatchCard.tsx`** — card with:
- Lime gradient header strip
- Match title, location, date/time
- Live player count with pulsing dot `●●●○○○ 8/12`
- Status badge (Aperta / Confermata / Completata)
- "PARTECIPO" CTA button (if status=open)

**Step 5: Match list page** — fetch matches for active group, sort by date, "Prossima" featured card at top

**Step 6: Match creation form** — title, location, min/max players, notes + min 1 slot date/time picker (add more slots button)

**Step 7: Commit**
```bash
git add -A
git commit -m "feat: match listing and creation with slots"
```

---

### Task 13: Match Registration + Date Voting

**Files:**
- Create: `src/app/(app)/app/matches/[id]/page.tsx`
- Create: `src/app/(app)/app/matches/[id]/actions.ts`

**Step 1: Tests**
```typescript
// Test registration toggle
test('user can register for match', async () => { ... })
test('user can unregister from match', async () => { ... })
test('cannot register when match full', async () => { ... })
```

**Step 2: Registration action**
```typescript
export async function toggleRegistration(matchId: string, slotId: string, status: 'in' | 'out') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('match_registrations').upsert({
    match_id: matchId,
    slot_id: slotId,
    user_id: user!.id,
    status,
  })

  // Award XP if registering
  if (status === 'in') {
    await awardXP(user!.id, matchId, 'registration', 20)
  }

  revalidatePath(`/app/matches/${matchId}`)
}
```

**Step 3: Match detail page** — shows:
- Match header (type auto-detected from registered count)
- Date options with vote counts, radio to vote preferred
- Registered players avatar grid
- Big "SONO DENTRO!" / "NON CI SONO" button

**Step 4: Admin: confirm date** — collapses other slots, sets match status to 'confirmed'

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: match registration and slot voting"
```

---

## PHASE 7 — Team Generation

### Task 14: Team Balancing Algorithm

**Files:**
- Create: `src/lib/algorithms/teamBalancer.ts`
- Create: `src/lib/algorithms/__tests__/teamBalancer.test.ts`

**Step 1: Write failing tests**
```typescript
import { generateTeams } from '../teamBalancer'

const mockPlayers: Player[] = [
  { id: '1', overall: 8, position: 'A', macroScores: {...} },
  { id: '2', overall: 7, position: 'D', macroScores: {...} },
  { id: '3', overall: 6, position: 'C', macroScores: {...} },
  { id: '4', overall: 8, position: 'D', macroScores: {...} },
]

test('generates two teams with equal player count', () => {
  const result = generateTeams(mockPlayers, [], defaultSportConfig)
  expect(result.teamA.length).toBe(2)
  expect(result.teamB.length).toBe(2)
})

test('overall difference between teams is minimal', () => {
  const players = Array.from({ length: 10 }, (_, i) => ({
    id: String(i), overall: Math.random() * 5 + 5, position: 'C', macroScores: {}
  }))
  const result = generateTeams(players, [], defaultSportConfig)
  const diff = Math.abs(avg(result.teamA.map(p => p.overall)) - avg(result.teamB.map(p => p.overall)))
  expect(diff).toBeLessThan(1.5)
})

test('never_together constraint is respected', () => {
  const constraints = [{ type: 'never_together', playerAId: '1', playerBId: '2' }]
  const result = generateTeams(mockPlayers, constraints, defaultSportConfig)
  const teamAIds = result.teamA.map(p => p.id)
  expect(teamAIds.includes('1') && teamAIds.includes('2')).toBe(false)
})
```

**Step 2: Run — FAIL**

**Step 3: Implement `teamBalancer.ts`**

Full implementation of:
- `computeRoleWeightedScore(player, sportConfig)` — role-specific weighted score
- `snakeDraft(players)` — alternating pick
- `satisfiesHardConstraints(teams, constraints)` — check never_together
- `balanceScore(teams)` — negative of (2×overallDiff + rolePenalty)
- `swapRandomPair(teamA, teamB)` — random player swap
- `generateTeams(players, constraints, sportConfig)` — main SA loop (1000 iterations, cooling 0.995)

**Step 4: Run tests — PASS**

**Step 5: Create Supabase Edge Function `generate-teams`**
```typescript
// supabase/functions/generate-teams/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { matchId } = await req.json()
  // fetch players, constraints, sport_config
  // run generateTeams()
  // save to generated_teams table
  // return result
})
```

**Step 6: Commit**
```bash
git add -A
git commit -m "feat: team balancing algorithm with simulated annealing"
```

---

### Task 15: Teams UI

**Files:**
- Create: `src/app/(app)/app/matches/[id]/teams/page.tsx`
- Create: `src/components/teams/TeamSplit.tsx`
- Create: `src/components/teams/PlayerTeamCard.tsx`

**Step 1: `TeamSplit.tsx`** — Side-by-side layout:
- "TEAM A" vs "TEAM B" with OVR averages
- Animated separator with "VS"
- Player list with position badge, overall, avatar
- Admin: "Rigenera" and "Blocca Squadre" buttons
- Flip card animation reveal on first load

**Step 2: Admin: generate teams** — calls Edge Function, saves result, shows UI

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: team generation UI with flip reveal animation"
```

---

## PHASE 8 — Results & Voting

### Task 16: Match Results

**Files:**
- Create: `src/app/(app)/app/matches/[id]/result/page.tsx`
- Create: `src/app/(app)/app/matches/[id]/result/actions.ts`

**Step 1: Admin result form** — score A vs B, optional goal recorder per player
**Step 2: On submit** — save to `match_results` + `match_goals`, update `player_stats` (matches_played, goals, wins/losses), award XP (presence +30, win +25, goal +15), run badge checker
**Step 3: Commit**
```bash
git add -A
git commit -m "feat: match result recording and stats update"
```

---

### Task 17: Post-Match Polls

**Files:**
- Create: `src/app/(app)/app/matches/[id]/polls/page.tsx`
- Create: `src/components/polls/PollCard.tsx`
- Create: `src/components/polls/PollResults.tsx`

**Step 1: Admin: create polls** — select from templates or custom title, set closes_at
**Step 2: `PollCard.tsx`** — Swipe on mobile (touch events), tap on desktop. Shows player avatars to vote on. One vote per poll.
**Step 3: `PollResults.tsx`** — Bar chart with percentages, winner highlighted. Only shown when poll is closed or user is admin.
**Step 4: On vote** — award XP (+10), check "Giurato" badge progress
**Step 5: Commit**
```bash
git add -A
git commit -m "feat: post-match polls with swipe voting UI"
```

---

## PHASE 9 — Gamification Engine

### Task 18: XP + Level Engine

**Files:**
- Create: `src/lib/gamification/xpEngine.ts`
- Create: `src/lib/gamification/__tests__/xpEngine.test.ts`
- Create: `src/lib/gamification/badgeChecker.ts`

**Step 1: Tests**
```typescript
import { calculateLevel, LEVEL_THRESHOLDS } from '../xpEngine'

test('level 1 at 0 XP', () => expect(calculateLevel(0)).toBe(1))
test('level 2 at 150 XP', () => expect(calculateLevel(150)).toBe(2))
test('level 8 at 12000 XP', () => expect(calculateLevel(12000)).toBe(8))
test('capped at 8', () => expect(calculateLevel(99999)).toBe(8))
```

**Step 2: Implement**
```typescript
export const LEVEL_THRESHOLDS = [0, 150, 400, 800, 1500, 3000, 6000, 12000]
export const LEVEL_TITLES = ['Pivetto','Jolly','Titolare','Veterano','Capitano','Bandiera','Fenomeno','Pallone d\'Oro']

export function calculateLevel(xp: number): number {
  return LEVEL_THRESHOLDS.filter(t => xp >= t).length
}

export async function awardXP(userId: string, groupId: string, action: XPAction, amount: number) {
  // Update player_stats.xp, recalculate level, trigger level-up notification if changed
}
```

**Step 3: Badge checker** — after each relevant action, check trigger_rules for applicable badges, insert into `player_badges` if threshold met, send notification

**Step 4: Monthly challenges** — check progress on challenge_progress, complete if met

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: XP engine, level system, badge checker"
```

---

### Task 19: Gamification UI

**Files:**
- Create: `src/components/gamification/XPBar.tsx`
- Create: `src/components/gamification/BadgeShelf.tsx`
- Create: `src/components/gamification/LevelUpOverlay.tsx`
- Create: `src/components/gamification/MonthlyChallenges.tsx`

**Step 1: `XPBar.tsx`** — Animated progress bar to next level, current level title displayed
**Step 2: `BadgeShelf.tsx`** — Grid of badges, latest earned has glow effect, locked ones grayed out
**Step 3: `LevelUpOverlay.tsx`** — Full-screen celebration: confetti (canvas-confetti), new title display, dismiss after 3s
**Step 4: `MonthlyChallenges.tsx`** — Card per challenge with progress bar and XP reward shown
**Step 5: Install canvas-confetti**
```bash
npm install canvas-confetti @types/canvas-confetti
```
**Step 6: Commit**
```bash
git add -A
git commit -m "feat: gamification UI components with animations"
```

---

## PHASE 10 — Dashboard & Profile

### Task 20: Player Profile Page

**Files:**
- Create: `src/app/(app)/app/profile/page.tsx`
- Create: `src/app/(app)/app/profile/[userId]/page.tsx`
- Create: `src/components/player/PlayerCard.tsx`
- Create: `src/components/player/MacroSkillBars.tsx`

**Step 1: `PlayerCard.tsx`** — FIFA-inspired card:
- Avatar, nickname, preferred number
- Equipped title below nickname
- OVR large number (font-display)
- Level badge + title (Titolare, Capitano, etc.)
- 6 macro bars with labels and values

**Step 2: Profile page** — PlayerCard at top, XPBar, BadgeShelf, stats grid (matches, goals, wins, win%), recent matches list

**Step 3: Edit profile** — modal/sheet to update nickname, position, bio, equipped title, avatar upload

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: player profile with FIFA-style card"
```

---

### Task 21: Dashboard + Rankings

**Files:**
- Create: `src/app/(app)/app/page.tsx` (home dashboard)
- Create: `src/app/(app)/app/ranking/page.tsx`
- Create: `src/components/charts/MiniChart.tsx`

**Step 1: Home dashboard** — featured next match card, personal stats summary (presenze, gol, win%), monthly challenges preview, recent activity feed

**Step 2: Rankings page** — leaderboard by OVR, with filters (by macro: Atletismo, Gol, Win%, etc.), animated rank numbers, trend arrows (↑↓)

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: dashboard and ranking pages"
```

---

## PHASE 11 — Rating System UI

### Task 22: Peer Rating Flow

**Files:**
- Create: `src/app/(app)/app/rate/page.tsx`
- Create: `src/components/rating/RatingForm.tsx`
- Create: `src/lib/algorithms/ratingCalculator.ts`

**Step 1: Rating calculator tests**
```typescript
import { computeBayesianOverall } from '../ratingCalculator'

test('returns group mean when n=0', () => {
  expect(computeBayesianOverall(0, 0, 7.0)).toBeCloseTo(7.0)
})
test('Bayesian shrinks toward mean for small n', () => {
  const score = computeBayesianOverall(1, 10, 7.0)
  expect(score).toBeGreaterThan(7.0)
  expect(score).toBeLessThan(10)
})
test('converges to actual rating for large n', () => {
  const score = computeBayesianOverall(100, 9.0, 7.0)
  expect(score).toBeCloseTo(9.0, 1)
})
```

**Step 2: Implement Bayesian calculator**
```typescript
export function computeBayesianOverall(n: number, rawScore: number, groupMean: number, k = 5): number {
  if (n === 0) return groupMean
  return (n * rawScore + k * groupMean) / (n + k)
}
```

**Step 3: `RatingForm.tsx`** — Per each player to rate:
- Grouped sliders by macro (Atletismo, Tecnica, etc.)
- Each skill: colored slider 1-10 with value display
- "Segni particolari" text input
- Progress indicator (player X of Y)
- Saves to `player_ratings`, triggers stat recalculation

**Step 4: Trigger stat recalc on save** — Supabase Edge Function or server action that recalculates `player_stats.overall_score` with Bayesian formula + anti-abuse filtering

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: peer rating flow with Bayesian calculation"
```

---

## PHASE 12 — Notifications + Email

### Task 23: In-App Notifications + Resend

**Files:**
- Create: `src/lib/notifications/notifier.ts`
- Create: `src/lib/email/resend.ts`
- Create: `src/components/ui/NotificationBell.tsx`

**Step 1: Resend client**
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMatchConfirmedEmail(to: string, matchDetails: MatchDetails) {
  await resend.emails.send({
    from: 'Kicksy <noreply@kicksy.app>',
    to,
    subject: `✅ Partita confermata: ${matchDetails.title}`,
    html: matchConfirmedTemplate(matchDetails),
  })
}
```

**Step 2: Notification bell** — badge count, dropdown with notifications list, mark as read

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: in-app notifications and Resend email"
```

---

## PHASE 13 — AI Features (Predisposte)

### Task 24: AI Resoconti + Image Generation

**Files:**
- Create: `src/lib/ai/matchReport.ts`
- Create: `src/lib/ai/imageGen.ts`
- Create: `src/app/api/ai/match-report/route.ts`

**Step 1: GPT-4.1 match report**
```typescript
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateMatchReport(matchData: MatchReportData): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: 'Sei un telecronista sportivo divertente e sarcastico. Scrivi resoconti brevi (max 200 parole) di partite tra amici in italiano, con umorismo e riferimenti ai nickname dei giocatori.' },
      { role: 'user', content: `Partita: ${JSON.stringify(matchData)}` }
    ],
    max_tokens: 300,
  })
  return completion.choices[0].message.content ?? ''
}
```

**Step 2: Gemini image generation placeholder** — structure ready, key from env, wired to group avatar / badge image generation

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: AI match reports (GPT-4.1) and image gen placeholder"
```

---

## PHASE 14 — i18n

### Task 25: i18n Setup

**Files:**
- Create: `src/i18n/it.json`
- Create: `src/i18n/en.json`
- Create: `src/lib/i18n/index.ts`

**Step 1: Configure next-intl**
```bash
# next.config.ts: add next-intl plugin
```

**Step 2: Move all hardcoded strings to `it.json`**
```json
{
  "match": {
    "join": "Sono Dentro!",
    "leave": "Non Ci Sono",
    "status_open": "Aperta",
    "status_confirmed": "Confermata"
  },
  "gamification": {
    "level_up": "Sei salito di livello!",
    "badge_earned": "Badge sbloccato!"
  }
}
```

**Step 3: `en.json` — same keys, English values (skeleton ready)**

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: i18n setup with next-intl, IT strings extracted"
```

---

## PHASE 15 — Polish + PWA

### Task 26: PWA + Meta

**Files:**
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx`

**Step 1: Add Web App Manifest**
```json
{
  "name": "Kicksy",
  "short_name": "Kicksy",
  "description": "Organizza le tue partite",
  "start_url": "/app",
  "display": "standalone",
  "background_color": "#0A0C12",
  "theme_color": "#C8FF6B",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2: Meta tags in layout** — OG, Twitter card, viewport

**Step 3: Final smoke test** — run through full user flow on mobile viewport

**Step 4: Final commit**
```bash
git add -A
git commit -m "feat: PWA manifest and production polish"
```

---

## Quick Reference

### Key Commands
```bash
npm run dev              # dev server
npm test                 # unit tests (Vitest)
npm run test:e2e         # E2E (Playwright)
npx supabase db push     # push migrations
npx supabase gen types typescript --linked > src/types/supabase.ts
npx supabase functions serve  # local edge functions
```

### Environment Setup Checklist
- [ ] Supabase project created
- [ ] Google OAuth configured in Supabase
- [ ] `.env.local` filled with Supabase keys
- [ ] Resend account + domain verified
- [ ] OpenAI API key (GPT-4.1)
- [ ] Gemini API key
- [ ] Vercel project linked

### Task Order (Critical Path)
1→2→3→4→5→6→7→8→9→10→11→12→13→14→15→16→17→18→19→20→21→22→23→24→25→26
