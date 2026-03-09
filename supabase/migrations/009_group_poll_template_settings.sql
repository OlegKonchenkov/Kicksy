-- ============================================================
-- Kicksy - Group poll template settings
-- Migration: 009_group_poll_template_settings.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.group_poll_template_settings (
  group_id     UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL REFERENCES public.poll_templates(id) ON DELETE CASCADE,
  is_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, template_id)
);

ALTER TABLE public.group_poll_template_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_poll_template_settings: members can read" ON public.group_poll_template_settings;
CREATE POLICY "group_poll_template_settings: members can read"
  ON public.group_poll_template_settings FOR SELECT
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "group_poll_template_settings: admin can manage" ON public.group_poll_template_settings;
CREATE POLICY "group_poll_template_settings: admin can manage"
  ON public.group_poll_template_settings FOR ALL
  USING (is_group_admin(group_id))
  WITH CHECK (is_group_admin(group_id));

