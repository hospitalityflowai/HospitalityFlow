-- Hospitality Flow — Platform suspension is authoritative (Audit 2 Remediation Step 1)
-- Safe to re-run (CREATE OR REPLACE).
--
-- platform_access.access_status = 'suspended' is a global application deny.
-- It overrides hotel_members presence and operator capability for app access /
-- password-reset eligibility. Membership and platform access remain separate
-- concepts; deleting hotel_members still removes workspace-data access via RLS.
-- Does not change RLS policies. There is no emergency operator bypass.

-- ---------------------------------------------------------------------------
-- get_my_platform_access: check suspension BEFORE membership / operator allow
-- ---------------------------------------------------------------------------
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
  v_has_membership boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'is_operator', false,
      'has_membership', false,
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

  v_has_membership := EXISTS (
    SELECT 1
    FROM public.hotel_members hm
    WHERE hm.user_id = v_user_id
  );

  -- Resolve platform_access status (user_id match preferred over email-only).
  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  -- Global deny: suspension overrides membership and operator success paths.
  IF v_status = 'suspended' THEN
    RETURN json_build_object(
      'allowed', false,
      'access_status', 'suspended',
      'has_membership', v_has_membership,
      'is_operator', v_is_operator,
      'reason', 'SUSPENDED'
    );
  END IF;

  -- Hotel membership remains the primary workspace access signal when not suspended.
  IF v_has_membership THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'active',
      'has_membership', true,
      'is_operator', v_is_operator
    );
  END IF;

  -- Operator-only accounts (no hotel membership) may sign in for invite tooling
  -- only when not suspended.
  IF v_is_operator THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'operator',
      'has_membership', false,
      'is_operator', true
    );
  END IF;

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
    'has_membership', false,
    'is_operator', false,
    'reason', 'NOT_APPROVED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_platform_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_platform_access() TO authenticated;

COMMENT ON FUNCTION public.get_my_platform_access() IS
  'Platform access for the signed-in user. Suspension is a global deny (checked before membership/operator). is_operator is independent of hotel membership when not suspended.';

-- ---------------------------------------------------------------------------
-- is_password_reset_allowed: suspension denies reset even with membership
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_password_reset_allowed(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_status text;
BEGIN
  IF coalesce(v_email, '') = '' THEN
    RETURN false;
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_email;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR lower(pa.email) = v_email
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  -- Suspended accounts are never eligible for HF password-reset delivery.
  IF v_status = 'suspended' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id) THEN
    RETURN true;
  END IF;

  RETURN v_status IN ('active', 'invited');
END;
$$;

REVOKE ALL ON FUNCTION public.is_password_reset_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_password_reset_allowed(text) TO service_role;

COMMENT ON FUNCTION public.is_password_reset_allowed(text) IS
  'Whether HF may send a password-reset email. Suspended platform_access always denies; otherwise membership or invited/active status allows.';

-- ---------------------------------------------------------------------------
-- create_hotel_workspace: explicit suspended rejection (idempotent replace)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_hotel_workspace(
  p_name text,
  p_property_type text,
  p_number_of_rooms integer,
  p_city text,
  p_country text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_hotel_id uuid;
  v_email text;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to a hotel workspace';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  IF v_status = 'suspended' THEN
    RAISE EXCEPTION 'Platform access is suspended';
  END IF;

  IF coalesce(v_status, 'none') NOT IN ('active', 'invited') THEN
    RAISE EXCEPTION 'Platform access has not been approved';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Hotel name is required';
  END IF;

  INSERT INTO public.hotels (
    name,
    property_type,
    number_of_rooms,
    city,
    country,
    status
  )
  VALUES (
    trim(p_name),
    p_property_type,
    p_number_of_rooms,
    trim(p_city),
    trim(p_country),
    'active'
  )
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.hotel_members (hotel_id, user_id, role)
  VALUES (v_hotel_id, v_user_id, 'owner');

  UPDATE public.platform_access
  SET access_status = 'active',
      user_id = v_user_id,
      email = v_email,
      updated_at = now()
  WHERE user_id = v_user_id
     OR lower(email) = v_email;

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- create_operator_pilot_lab_workspace: deny suspended operators
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_operator_pilot_lab_workspace()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_operator boolean := false;
  v_email text;
  v_status text;
  v_existing_hotel_id uuid;
  v_existing_name text;
  v_existing_role text;
  v_hotel_id uuid;
  v_lab_name text := 'Hospitality Flow Pilot Lab';
  v_lab_property_type text := 'Internal testing workspace';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_operator := EXISTS (
    SELECT 1
    FROM public.platform_operators po
    WHERE po.user_id = v_user_id
  );

  IF NOT v_is_operator THEN
    RAISE EXCEPTION 'Only platform operators may provision the Pilot Lab workspace';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  IF v_status = 'suspended' THEN
    RAISE EXCEPTION 'Platform access is suspended';
  END IF;

  SELECT hm.hotel_id, h.name, hm.role
  INTO v_existing_hotel_id, v_existing_name, v_existing_role
  FROM public.hotel_members hm
  INNER JOIN public.hotels h ON h.id = hm.hotel_id
  WHERE hm.user_id = v_user_id
  ORDER BY hm.created_at ASC
  LIMIT 1;

  IF v_existing_hotel_id IS NOT NULL THEN
    IF v_existing_name = v_lab_name THEN
      RETURN json_build_object(
        'hotel_id', v_existing_hotel_id,
        'role', v_existing_role,
        'created', false,
        'name', v_lab_name
      );
    END IF;

    RAISE EXCEPTION 'User already belongs to a hotel workspace';
  END IF;

  INSERT INTO public.hotels (
    name,
    property_type,
    number_of_rooms,
    city,
    country,
    status
  )
  VALUES (
    v_lab_name,
    v_lab_property_type,
    1,
    'Internal',
    'United Kingdom',
    'active'
  )
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.hotel_members (hotel_id, user_id, role)
  VALUES (v_hotel_id, v_user_id, 'owner');

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner',
    'created', true,
    'name', v_lab_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator_pilot_lab_workspace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_operator_pilot_lab_workspace() TO authenticated;

COMMENT ON FUNCTION public.create_operator_pilot_lab_workspace() IS
  'Platform operators only (not suspended). Provisions one private Hospitality Flow Pilot Lab workspace for the caller, or returns the existing Pilot Lab membership.';
