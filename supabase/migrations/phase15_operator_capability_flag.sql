-- Hospitality Flow — Phase 15: Independent operator capability flag
-- Safe to re-run.
--
-- Hotel membership and platform operator privileges are separate capabilities.
-- Users who are both hotel members and platform_operators keep access_status
-- 'active' (workspace unchanged) while is_operator reports true so the Operator
-- Dashboard entry point can appear alongside the hotel workspace.
-- Does not change RLS, invitation logic, Demo Mode, or tenant isolation.

CREATE OR REPLACE FUNCTION public.get_my_platform_access()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_status text;
  v_is_operator boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'is_operator', false,
      'reason', 'NOT_AUTHENTICATED'
    );
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  v_is_operator := EXISTS (
    SELECT 1
    FROM public.platform_operators po
    WHERE po.user_id = v_user_id
  );

  -- Hotel membership remains the primary workspace access signal.
  IF EXISTS (SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id) THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'active',
      'has_membership', true,
      'is_operator', v_is_operator
    );
  END IF;

  -- Operator-only accounts (no hotel membership) may sign in for invite tooling.
  IF v_is_operator THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'operator',
      'has_membership', false,
      'is_operator', true
    );
  END IF;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  IF v_status IN ('active', 'invited') THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', v_status,
      'has_membership', false,
      'is_operator', false
    );
  END IF;

  RETURN json_build_object(
    'allowed', false,
    'access_status', coalesce(v_status, 'none'),
    'is_operator', false,
    'reason', 'NOT_APPROVED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_platform_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_platform_access() TO authenticated;

COMMENT ON FUNCTION public.get_my_platform_access() IS
  'Returns platform access for the signed-in user. access_status reflects hotel/invite access; is_operator is an independent platform_operators capability flag.';
