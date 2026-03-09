-- ============================================================
-- Kicksy — RLS Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- Enable RLS on all public tables
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_ratings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_titles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- GROUPS
-- ============================================================
CREATE POLICY "groups: members can read"
  ON public.groups FOR SELECT USING (is_group_member(id));

CREATE POLICY "groups: authenticated can create"
  ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "groups: admin can update"
  ON public.groups FOR UPDATE USING (is_group_admin(id));

CREATE POLICY "groups: admin can delete"
  ON public.groups FOR DELETE USING (is_group_admin(id));

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE POLICY "group_members: members can read"
  ON public.group_members FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "group_members: can join"
  ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "group_members: admin can manage"
  ON public.group_members FOR UPDATE USING (is_group_admin(group_id));

CREATE POLICY "group_members: can leave"
  ON public.group_members FOR DELETE USING (
    user_id = auth.uid() OR is_group_admin(group_id)
  );

-- ============================================================
-- MATCHES
-- ============================================================
CREATE POLICY "matches: members can read"
  ON public.matches FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "matches: admin can create"
  ON public.matches FOR INSERT WITH CHECK (is_group_admin(group_id));

CREATE POLICY "matches: admin can update"
  ON public.matches FOR UPDATE USING (is_group_admin(group_id));

CREATE POLICY "matches: admin can delete"
  ON public.matches FOR DELETE USING (is_group_admin(group_id));

-- ============================================================
-- MATCH REGISTRATIONS
-- ============================================================
CREATE POLICY "registrations: members can read"
  ON public.match_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

CREATE POLICY "registrations: self register"
  ON public.match_registrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "registrations: self update"
  ON public.match_registrations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "registrations: admin update"
  ON public.match_registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

CREATE POLICY "registrations: self delete"
  ON public.match_registrations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- GENERATED TEAMS
-- ============================================================
CREATE POLICY "teams: members can read"
  ON public.generated_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

CREATE POLICY "teams: admin can manage"
  ON public.generated_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

-- ============================================================
-- MATCH RESULTS
-- ============================================================
CREATE POLICY "results: members can read"
  ON public.match_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

CREATE POLICY "results: admin can insert"
  ON public.match_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

CREATE POLICY "results: admin can update"
  ON public.match_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

-- ============================================================
-- MATCH GOALS
-- ============================================================
CREATE POLICY "goals: members can read"
  ON public.match_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_member(m.group_id)
    )
  );

CREATE POLICY "goals: admin can manage"
  ON public.match_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND is_group_admin(m.group_id)
    )
  );

-- ============================================================
-- PLAYER STATS
-- ============================================================
CREATE POLICY "player_stats: members can read"
  ON public.player_stats FOR SELECT USING (is_group_member(group_id));

-- Service role manages stats (updated by edge functions)
CREATE POLICY "player_stats: service role manage"
  ON public.player_stats FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- PLAYER RATINGS
-- ============================================================
CREATE POLICY "ratings: group members can read"
  ON public.player_ratings FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "ratings: members can insert own"
  ON public.player_ratings FOR INSERT
  WITH CHECK (
    rater_id = auth.uid()
    AND is_group_member(group_id)
  );

-- No updates or deletes on ratings (immutable)

-- ============================================================
-- BADGES (public catalog)
-- ============================================================
CREATE POLICY "badges: public read"
  ON public.badges FOR SELECT USING (TRUE);

-- ============================================================
-- PLAYER BADGES
-- ============================================================
CREATE POLICY "player_badges: own read"
  ON public.player_badges FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "player_badges: group members can see equipped"
  ON public.player_badges FOR SELECT
  USING (equipped = TRUE);

CREATE POLICY "player_badges: own update equipped"
  ON public.player_badges FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- PLAYER TITLES
-- ============================================================
CREATE POLICY "player_titles: own read"
  ON public.player_titles FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "player_titles: group members can see equipped"
  ON public.player_titles FOR SELECT USING (equipped = TRUE);

CREATE POLICY "player_titles: own update equipped"
  ON public.player_titles FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- MONTHLY CHALLENGES
-- ============================================================
CREATE POLICY "challenges: members can read"
  ON public.monthly_challenges FOR SELECT
  USING (is_global = TRUE OR (group_id IS NOT NULL AND is_group_member(group_id)));

CREATE POLICY "challenge_progress: own read"
  ON public.challenge_progress FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- POLLS
-- ============================================================
CREATE POLICY "poll_templates: members can read"
  ON public.poll_templates FOR SELECT
  USING (is_global = TRUE OR (group_id IS NOT NULL AND is_group_member(group_id)));

CREATE POLICY "polls: members can read"
  ON public.polls FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "polls: admin can create"
  ON public.polls FOR INSERT WITH CHECK (is_group_admin(group_id));

CREATE POLICY "poll_votes: members can read"
  ON public.poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND is_group_member(p.group_id)
    )
  );

CREATE POLICY "poll_votes: members can vote"
  ON public.poll_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND is_group_member(p.group_id)
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "notifications: own read"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: own update read"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());
