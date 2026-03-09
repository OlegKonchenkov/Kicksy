-- ============================================================
-- Kicksy — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  preferred_role  TEXT CHECK (preferred_role IN ('D','C','E','W','A')),
  xp              INTEGER NOT NULL DEFAULT 0,
  level           SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON public.profiles USING gin (username gin_trgm_ops);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE public.groups (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  description           TEXT,
  avatar_url            TEXT,
  sport_type            TEXT NOT NULL DEFAULT 'football',
  invite_code           TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
  invite_link_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  max_members           INTEGER,
  created_by            UUID NOT NULL REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_invite_code ON public.groups (invite_code);
CREATE INDEX idx_groups_created_by  ON public.groups (created_by);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE public.group_members (
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  display_name  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members (user_id);

-- Helper: is current user a member of this group?
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND is_active = TRUE
  );
$$;

-- Helper: is current user an admin of this group?
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND role     = 'admin'
      AND is_active = TRUE
  );
$$;

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE public.matches (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id               UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  scheduled_at           TIMESTAMPTZ NOT NULL,
  location               TEXT,
  max_players            INTEGER NOT NULL DEFAULT 10,
  min_players            INTEGER NOT NULL DEFAULT 6,
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','open','locked','played','cancelled')),
  registration_deadline  TIMESTAMPTZ,
  team_size              INTEGER NOT NULL DEFAULT 5,
  created_by             UUID NOT NULL REFERENCES public.profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_group         ON public.matches (group_id);
CREATE INDEX idx_matches_scheduled     ON public.matches (scheduled_at);
CREATE INDEX idx_matches_status_group  ON public.matches (status, group_id);

-- ============================================================
-- MATCH REGISTRATIONS
-- ============================================================
CREATE TABLE public.match_registrations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id       UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed','waitlist','declined')),
  team_id        SMALLINT CHECK (team_id IN (1, 2)),
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

CREATE INDEX idx_registrations_match  ON public.match_registrations (match_id);
CREATE INDEX idx_registrations_user   ON public.match_registrations (user_id);

-- ============================================================
-- GENERATED TEAMS
-- ============================================================
CREATE TABLE public.generated_teams (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id          UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team1_user_ids    UUID[] NOT NULL,
  team2_user_ids    UUID[] NOT NULL,
  team1_strength    NUMERIC(5,2) NOT NULL,
  team2_strength    NUMERIC(5,2) NOT NULL,
  balance_score     NUMERIC(5,2) NOT NULL,  -- 0-100
  algorithm_version TEXT NOT NULL DEFAULT '1.0',
  is_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_teams_match ON public.generated_teams (match_id);

-- ============================================================
-- MATCH RESULTS
-- ============================================================
CREATE TABLE public.match_results (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  team1_score  SMALLINT NOT NULL DEFAULT 0,
  team2_score  SMALLINT NOT NULL DEFAULT 0,
  mvp_user_id  UUID REFERENCES public.profiles(id),
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MATCH GOALS (detailed goal log)
-- ============================================================
CREATE TABLE public.match_goals (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scorer_id  UUID NOT NULL REFERENCES public.profiles(id),
  assist_id  UUID REFERENCES public.profiles(id),
  team_id    SMALLINT NOT NULL CHECK (team_id IN (1,2)),
  minute     SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_goals_match  ON public.match_goals (match_id);
CREATE INDEX idx_match_goals_scorer ON public.match_goals (scorer_id);

-- ============================================================
-- PLAYER STATS (per group)
-- ============================================================
CREATE TABLE public.player_stats (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id         UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  matches_played   INTEGER NOT NULL DEFAULT 0,
  matches_won      INTEGER NOT NULL DEFAULT 0,
  matches_drawn    INTEGER NOT NULL DEFAULT 0,
  matches_lost     INTEGER NOT NULL DEFAULT 0,
  goals_scored     INTEGER NOT NULL DEFAULT 0,
  assists          INTEGER NOT NULL DEFAULT 0,
  clean_sheets     INTEGER NOT NULL DEFAULT 0,
  mvp_count        INTEGER NOT NULL DEFAULT 0,
  xp_from_matches  INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_id)
);

CREATE INDEX idx_player_stats_group ON public.player_stats (group_id);

-- ============================================================
-- PLAYER RATINGS (22 skills)
-- ============================================================
CREATE TABLE public.player_ratings (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rater_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id               UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  match_id               UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  -- Atletismo
  velocita               SMALLINT NOT NULL CHECK (velocita BETWEEN 1 AND 10),
  resistenza             SMALLINT NOT NULL CHECK (resistenza BETWEEN 1 AND 10),
  forza                  SMALLINT NOT NULL CHECK (forza BETWEEN 1 AND 10),
  salto                  SMALLINT NOT NULL CHECK (salto BETWEEN 1 AND 10),
  agilita                SMALLINT NOT NULL CHECK (agilita BETWEEN 1 AND 10),
  -- Tecnica
  tecnica_palla          SMALLINT NOT NULL CHECK (tecnica_palla BETWEEN 1 AND 10),
  dribbling              SMALLINT NOT NULL CHECK (dribbling BETWEEN 1 AND 10),
  passaggio              SMALLINT NOT NULL CHECK (passaggio BETWEEN 1 AND 10),
  tiro                   SMALLINT NOT NULL CHECK (tiro BETWEEN 1 AND 10),
  colpo_di_testa         SMALLINT NOT NULL CHECK (colpo_di_testa BETWEEN 1 AND 10),
  -- Tattica
  lettura_gioco          SMALLINT NOT NULL CHECK (lettura_gioco BETWEEN 1 AND 10),
  posizionamento         SMALLINT NOT NULL CHECK (posizionamento BETWEEN 1 AND 10),
  pressing               SMALLINT NOT NULL CHECK (pressing BETWEEN 1 AND 10),
  costruzione            SMALLINT NOT NULL CHECK (costruzione BETWEEN 1 AND 10),
  -- Difesa
  marcatura              SMALLINT NOT NULL CHECK (marcatura BETWEEN 1 AND 10),
  tackle                 SMALLINT NOT NULL CHECK (tackle BETWEEN 1 AND 10),
  intercettamento        SMALLINT NOT NULL CHECK (intercettamento BETWEEN 1 AND 10),
  copertura              SMALLINT NOT NULL CHECK (copertura BETWEEN 1 AND 10),
  -- Attacco
  finalizzazione         SMALLINT NOT NULL CHECK (finalizzazione BETWEEN 1 AND 10),
  assist_making          SMALLINT NOT NULL CHECK (assist_making BETWEEN 1 AND 10),
  -- Mentalità
  leadership             SMALLINT NOT NULL CHECK (leadership BETWEEN 1 AND 10),
  comunicazione          SMALLINT NOT NULL CHECK (comunicazione BETWEEN 1 AND 10),
  mentalita_competitiva  SMALLINT NOT NULL CHECK (mentalita_competitiva BETWEEN 1 AND 10),
  fair_play              SMALLINT NOT NULL CHECK (fair_play BETWEEN 1 AND 10),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each rater can rate the same player once per match context
  UNIQUE NULLS NOT DISTINCT (rater_id, ratee_id, group_id, match_id),
  CHECK (rater_id <> ratee_id)
);

CREATE INDEX idx_ratings_ratee_group ON public.player_ratings (ratee_id, group_id);
CREATE INDEX idx_ratings_match       ON public.player_ratings (match_id);

-- ============================================================
-- BADGES
-- ============================================================
CREATE TABLE public.badges (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key              TEXT NOT NULL UNIQUE,
  name_it          TEXT NOT NULL,
  name_en          TEXT NOT NULL,
  description_it   TEXT NOT NULL,
  description_en   TEXT NOT NULL,
  icon             TEXT NOT NULL,
  tier             TEXT NOT NULL CHECK (tier IN ('bronze','silver','gold')),
  condition_type   TEXT NOT NULL,
  condition_value  INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- PLAYER BADGES
-- ============================================================
CREATE TABLE public.player_badges (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES public.badges(id),
  group_id   UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  equipped   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, badge_id, group_id)
);

CREATE INDEX idx_player_badges_user ON public.player_badges (user_id);

-- ============================================================
-- PLAYER TITLES
-- ============================================================
CREATE TABLE public.player_titles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_key   TEXT NOT NULL,
  title_text  TEXT NOT NULL,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  equipped    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, title_key)
);

CREATE INDEX idx_player_titles_user ON public.player_titles (user_id);

-- ============================================================
-- MONTHLY CHALLENGES
-- ============================================================
CREATE TABLE public.monthly_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title_it        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  description_it  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  condition_type  TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  xp_reward       INTEGER NOT NULL DEFAULT 50,
  badge_id        UUID REFERENCES public.badges(id),
  starts_at       DATE NOT NULL,
  ends_at         DATE NOT NULL,
  is_global       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.challenge_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id  UUID NOT NULL REFERENCES public.monthly_challenges(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress      INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  UNIQUE (challenge_id, user_id)
);

-- ============================================================
-- POLLS
-- ============================================================
CREATE TABLE public.poll_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  question_it TEXT NOT NULL,
  question_en TEXT NOT NULL,
  options_it  TEXT[] NOT NULL,
  options_en  TEXT[] NOT NULL,
  is_global   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.polls (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id     UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  options      TEXT[] NOT NULL,
  closes_at    TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.poll_votes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id       UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index  SMALLINT NOT NULL,
  voted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read) WHERE read = FALSE;

-- ============================================================
-- UPDATED_AT trigger utility
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_player_stats_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
