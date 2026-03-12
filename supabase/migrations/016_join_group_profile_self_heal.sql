-- ============================================================
-- Kicksy - Self-heal missing profiles for invite join flow
-- Migration: 016_join_group_profile_self_heal.sql
-- ============================================================

-- 1) Backfill any auth user that does not yet have a public profile.
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
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2) Harden invite join RPC: if profile is missing, create it before inserting membership.
CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(p_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_id UUID;
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

  SELECT g.id
  INTO v_group_id
  FROM public.groups g
  WHERE g.invite_code = UPPER(TRIM(p_invite_code))
    AND g.invite_link_enabled = TRUE
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invite_code_not_found';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role, is_active)
  VALUES (v_group_id, v_user_id, 'member', TRUE)
  ON CONFLICT (group_id, user_id)
  DO UPDATE SET is_active = TRUE;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(TEXT) TO authenticated;

