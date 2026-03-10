-- ============================================================
-- Kicksy - Admin role changes: founder can revoke admins
-- Migration: 014_group_admin_role_changes.sql
-- ============================================================

DROP POLICY IF EXISTS "group_members: admin can manage" ON public.group_members;

CREATE POLICY "group_members: admin can manage"
  ON public.group_members
  FOR UPDATE
  USING (
    is_group_admin(group_id)
    AND (
      role <> 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE g.id = group_id
          AND g.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (is_group_admin(group_id));
