-- ============================================================
-- Kicksy - Match registrations: admin can delete
-- Migration: 015_match_registrations_admin_delete.sql
-- ============================================================

DROP POLICY IF EXISTS "registrations: admin delete" ON public.match_registrations;

CREATE POLICY "registrations: admin delete"
  ON public.match_registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND is_group_admin(m.group_id)
    )
  );

