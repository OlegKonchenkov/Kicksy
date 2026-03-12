-- ============================================================
-- Kicksy - Badge triggers: win_streak, invites_sent, early_adopter
-- Migration: 018_badges_win_streak_invites_early_adopter.sql
-- ============================================================

ALTER TABLE public.player_stats
  ADD COLUMN IF NOT EXISTS current_win_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invites_sent INTEGER NOT NULL DEFAULT 0;

-- Extend invite join RPC with:
-- - early_adopter badge (one-time per user)
-- - invites_sent increment for group creator on successful new join/reactivation
-- - automatic inviter badge award
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
  v_creator_id UUID;
  v_prev_is_active BOOLEAN;
  v_join_is_new BOOLEAN := FALSE;
  v_early_badge RECORD;
  v_invites_sent INTEGER;
  v_badge RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  SELECT
    u.id,
    (
      COALESCE(
        NULLIF(u.raw_user_meta_data->>'username', ''),
        NULLIF(SPLIT_PART(u.email, '@', 1), ''),
        'player'
      )
      || '_' || RIGHT(REPLACE(u.id::text, '-', ''), 6)
    ) AS username,
    NULLIF(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), ''),
    NULLIF(COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'), '')
  FROM auth.users u
  WHERE u.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  SELECT g.id, g.created_by
  INTO v_group_id, v_creator_id
  FROM public.groups g
  WHERE g.invite_code = UPPER(TRIM(p_invite_code))
    AND g.invite_link_enabled = TRUE
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invite_code_not_found';
  END IF;

  SELECT gm.is_active
  INTO v_prev_is_active
  FROM public.group_members gm
  WHERE gm.group_id = v_group_id
    AND gm.user_id = v_user_id
  LIMIT 1;

  INSERT INTO public.group_members (group_id, user_id, role, is_active)
  VALUES (v_group_id, v_user_id, 'member', TRUE)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET is_active = TRUE;

  v_join_is_new := v_prev_is_active IS NULL OR v_prev_is_active = FALSE;

  -- Early adopter: assign once per user (first successful group join/create flow touchpoint).
  IF v_join_is_new THEN
    SELECT b.id, b.name_it, b.icon
    INTO v_early_badge
    FROM public.badges b
    WHERE b.condition_type = 'early_adopter'
      AND b.condition_value <= 1
    ORDER BY b.condition_value ASC
    LIMIT 1;

    IF v_early_badge.id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.player_badges pb
        WHERE pb.user_id = v_user_id
          AND pb.badge_id = v_early_badge.id
      )
    THEN
      INSERT INTO public.player_badges (user_id, badge_id, group_id, equipped)
      VALUES (v_user_id, v_early_badge.id, v_group_id, FALSE)
      ON CONFLICT (user_id, badge_id, group_id) DO NOTHING;

      INSERT INTO public.notifications (user_id, type, title, body, read)
      VALUES (
        v_user_id,
        'badge_earned',
        COALESCE(v_early_badge.icon, '🏅') || ' Badge sbloccato!',
        COALESCE(v_early_badge.name_it, 'Nuovo badge'),
        FALSE
      );
    END IF;
  END IF;

  -- Count accepted invites for group creator when a member really joins/reactivates.
  IF v_join_is_new
    AND v_creator_id IS NOT NULL
    AND v_creator_id <> v_user_id
  THEN
    INSERT INTO public.player_stats (user_id, group_id, invites_sent)
    VALUES (v_creator_id, v_group_id, 1)
    ON CONFLICT (user_id, group_id)
    DO UPDATE SET invites_sent = public.player_stats.invites_sent + 1;

    SELECT ps.invites_sent
    INTO v_invites_sent
    FROM public.player_stats ps
    WHERE ps.user_id = v_creator_id
      AND ps.group_id = v_group_id
    LIMIT 1;

    FOR v_badge IN
      SELECT b.id, b.name_it, b.icon
      FROM public.badges b
      WHERE b.condition_type = 'invites_sent'
        AND v_invites_sent >= b.condition_value
        AND NOT EXISTS (
          SELECT 1
          FROM public.player_badges pb
          WHERE pb.user_id = v_creator_id
            AND pb.badge_id = b.id
            AND pb.group_id = v_group_id
        )
    LOOP
      INSERT INTO public.player_badges (user_id, badge_id, group_id, equipped)
      VALUES (v_creator_id, v_badge.id, v_group_id, FALSE)
      ON CONFLICT (user_id, badge_id, group_id) DO NOTHING;

      INSERT INTO public.notifications (user_id, type, title, body, read)
      VALUES (
        v_creator_id,
        'badge_earned',
        COALESCE(v_badge.icon, '🏅') || ' Badge sbloccato!',
        COALESCE(v_badge.name_it, 'Nuovo badge'),
        FALSE
      );
    END LOOP;
  END IF;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(TEXT) TO authenticated;

