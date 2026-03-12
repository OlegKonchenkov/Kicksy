-- ============================================================
-- Kicksy - Player badges: group members can read all earned badges
-- Migration: 021_player_badges_group_members_read_all.sql
-- ============================================================

DROP POLICY IF EXISTS "player_badges: group members can see equipped" ON public.player_badges;
DROP POLICY IF EXISTS "player_badges: group members can read all" ON public.player_badges;

CREATE POLICY "player_badges: group members can read all"
  ON public.player_badges
  FOR SELECT
  USING (is_group_member(group_id));

