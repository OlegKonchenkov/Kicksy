-- ============================================================
-- Kicksy - Match player stats (goals/assists) + policies
-- Migration: 007_match_player_stats_and_constraints.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.match_player_stats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goals      SMALLINT NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists    SMALLINT NOT NULL DEFAULT 0 CHECK (assists >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_player_stats_match ON public.match_player_stats (match_id);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_user ON public.match_player_stats (user_id);

ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_player_stats: members can read" ON public.match_player_stats;
CREATE POLICY "match_player_stats: members can read"
  ON public.match_player_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

DROP POLICY IF EXISTS "match_player_stats: own insert or admin" ON public.match_player_stats;
CREATE POLICY "match_player_stats: own insert or admin"
  ON public.match_player_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND is_group_member(m.group_id)
        AND (user_id = auth.uid() OR is_group_admin(m.group_id))
    )
  );

DROP POLICY IF EXISTS "match_player_stats: own update or admin" ON public.match_player_stats;
CREATE POLICY "match_player_stats: own update or admin"
  ON public.match_player_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND is_group_member(m.group_id)
        AND (user_id = auth.uid() OR is_group_admin(m.group_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND is_group_member(m.group_id)
        AND (user_id = auth.uid() OR is_group_admin(m.group_id))
    )
  );

