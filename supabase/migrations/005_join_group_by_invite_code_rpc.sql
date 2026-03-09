-- ============================================================
-- Kicksy - Join group by invite code RPC
-- Migration: 005_join_group_by_invite_code_rpc.sql
-- ============================================================

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
