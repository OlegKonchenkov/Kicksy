-- ============================================================
-- Kicksy - Backfill early_adopter (Pioniere) for active members
-- Migration: 019_backfill_early_adopter_badge.sql
-- ============================================================

INSERT INTO public.player_badges (user_id, badge_id, group_id, equipped)
SELECT
  gm.user_id,
  b.id,
  gm.group_id,
  FALSE
FROM public.group_members gm
JOIN public.badges b
  ON b.condition_type = 'early_adopter'
 AND b.condition_value <= 1
LEFT JOIN public.player_badges pb
  ON pb.user_id = gm.user_id
 AND pb.group_id = gm.group_id
 AND pb.badge_id = b.id
WHERE gm.is_active = TRUE
  AND pb.id IS NULL;

