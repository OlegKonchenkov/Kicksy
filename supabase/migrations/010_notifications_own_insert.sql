-- ============================================================
-- Kicksy - Allow authenticated users to insert own notifications
-- Migration: 010_notifications_own_insert.sql
-- ============================================================

DROP POLICY IF EXISTS "notifications: own insert" ON public.notifications;
CREATE POLICY "notifications: own insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

