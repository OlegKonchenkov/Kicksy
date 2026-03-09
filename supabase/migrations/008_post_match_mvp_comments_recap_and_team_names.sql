-- ============================================================
-- Kicksy - Post-match MVP voting, comments, AI recap, team names
-- Migration: 008_post_match_mvp_comments_recap_and_team_names.sql
-- ============================================================

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS team1_name TEXT NOT NULL DEFAULT 'Squadra A',
  ADD COLUMN IF NOT EXISTS team2_name TEXT NOT NULL DEFAULT 'Squadra B';

ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'generic';

CREATE UNIQUE INDEX IF NOT EXISTS uq_mvp_poll_per_match
  ON public.polls (match_id)
  WHERE kind = 'mvp';

CREATE TABLE IF NOT EXISTS public.match_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.match_recaps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id      UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  summary_text  TEXT NOT NULL,
  model         TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_match_comments_match ON public.match_comments (match_id);
CREATE INDEX IF NOT EXISTS idx_match_comments_user ON public.match_comments (user_id);

ALTER TABLE public.match_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_recaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_comments: members can read" ON public.match_comments;
CREATE POLICY "match_comments: members can read"
  ON public.match_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

DROP POLICY IF EXISTS "match_comments: own or admin insert" ON public.match_comments;
CREATE POLICY "match_comments: own or admin insert"
  ON public.match_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.matches m
      LEFT JOIN public.group_members gm
        ON gm.group_id = m.group_id
       AND gm.user_id = auth.uid()
       AND gm.is_active = TRUE
      WHERE m.id = match_id
        AND (
          user_id = auth.uid()
          OR gm.role = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "match_comments: own or admin update" ON public.match_comments;
CREATE POLICY "match_comments: own or admin update"
  ON public.match_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      LEFT JOIN public.group_members gm
        ON gm.group_id = m.group_id
       AND gm.user_id = auth.uid()
       AND gm.is_active = TRUE
      WHERE m.id = match_id
        AND (
          user_id = auth.uid()
          OR gm.role = 'admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.matches m
      LEFT JOIN public.group_members gm
        ON gm.group_id = m.group_id
       AND gm.user_id = auth.uid()
       AND gm.is_active = TRUE
      WHERE m.id = match_id
        AND (
          user_id = auth.uid()
          OR gm.role = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "match_recaps: members can read" ON public.match_recaps;
CREATE POLICY "match_recaps: members can read"
  ON public.match_recaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

DROP POLICY IF EXISTS "match_recaps: admin can manage" ON public.match_recaps;
CREATE POLICY "match_recaps: admin can manage"
  ON public.match_recaps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

