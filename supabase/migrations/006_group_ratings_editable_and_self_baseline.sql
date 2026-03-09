-- ============================================================
-- Kicksy - Group ratings editable over time + self baseline
-- Migration: 006_group_ratings_editable_and_self_baseline.sql
-- ============================================================

-- Allow self-rating only for general group ratings (match_id is null),
-- while keeping post-match ratings strictly peer-to-peer.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT c.conname
  INTO v_conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public.player_ratings'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%rater_id <> ratee_id%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.player_ratings DROP CONSTRAINT %I', v_conname);
  END IF;
END;
$$;

ALTER TABLE public.player_ratings
  ADD CONSTRAINT player_ratings_self_only_for_group_baseline
  CHECK (rater_id <> ratee_id OR match_id IS NULL);

-- Enable editing only for general group ratings created by the current user.
DROP POLICY IF EXISTS "ratings: own general update" ON public.player_ratings;
CREATE POLICY "ratings: own general update"
  ON public.player_ratings
  FOR UPDATE
  USING (
    rater_id = auth.uid()
    AND match_id IS NULL
    AND is_group_member(group_id)
  )
  WITH CHECK (
    rater_id = auth.uid()
    AND match_id IS NULL
    AND is_group_member(group_id)
  );
