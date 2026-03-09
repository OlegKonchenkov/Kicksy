-- ============================================================
-- Kicksy - Fix groups SELECT policy for creator flow
-- Migration: 003_fix_groups_select_policy_for_creator.sql
-- ============================================================

-- The onboarding flow creates a group and immediately does:
--   insert(...).select('id').single()
-- With the previous policy, SELECT was allowed only to members,
-- but creator membership is inserted right after, so RETURNING/SELECT failed.

DROP POLICY IF EXISTS "groups: members can read" ON public.groups;

CREATE POLICY "groups: members or creator can read"
  ON public.groups
  FOR SELECT
  USING (
    is_group_member(id) OR created_by = auth.uid()
  );
