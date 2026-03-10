-- ============================================================
-- Kicksy - Only founder can delete group
-- Migration: 013_groups_delete_founder_only.sql
-- ============================================================

DROP POLICY IF EXISTS "groups: admin can delete" ON public.groups;
DROP POLICY IF EXISTS "groups: founder can delete" ON public.groups;

CREATE POLICY "groups: founder can delete"
  ON public.groups
  FOR DELETE
  USING (created_by = auth.uid());
