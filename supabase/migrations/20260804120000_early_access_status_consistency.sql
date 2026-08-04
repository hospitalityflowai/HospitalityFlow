-- Hospitality Flow — Early Access status consistency
-- Safe to re-run (CREATE OR REPLACE).
--
-- Fixes split-brain where platform_access.access_status can be invited/active
-- while early_access_applications.founding_status remains pending.
--
-- Status meanings (unchanged):
--   founding_status = 'accepted'  → application was approved
--   access_status   = 'invited'   → invitation was issued
--   access_status   = 'active'    → hotel workspace is active

-- ---------------------------------------------------------------------------
-- mark_pilot_applicant_invited: reconcile founding_status; never downgrade active
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_pilot_applicant_invited(
  p_application_id uuid,
  p_operator_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.early_access_applications%ROWTYPE;
  v_email text;
  v_access_id uuid;
  v_prev_status text;
  v_founding_updated boolean := false;
BEGIN
  IF p_application_id IS NULL OR p_operator_user_id IS NULL THEN
    RAISE EXCEPTION 'application_id and operator_user_id are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.platform_operators po
    WHERE po.user_id = p_operator_user_id
  ) THEN
    RAISE EXCEPTION 'Caller is not an authorised operator';
  END IF;

  SELECT * INTO v_app
  FROM public.early_access_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.founding_status = 'declined' THEN
    RAISE EXCEPTION 'Application was declined and cannot be invited';
  END IF;

  v_email := lower(trim(v_app.email));

  SELECT pa.id, pa.access_status
  INTO v_access_id, v_prev_status
  FROM public.platform_access pa
  WHERE pa.early_access_application_id = p_application_id
     OR lower(pa.email) = v_email
  ORDER BY CASE
    WHEN pa.early_access_application_id = p_application_id THEN 0
    ELSE 1
  END, pa.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prev_status = 'suspended' THEN
    RAISE EXCEPTION 'Applicant access is suspended';
  END IF;

  /* Idempotent approval: never change declined (guarded above). */
  UPDATE public.early_access_applications
  SET founding_status = 'accepted'
  WHERE id = p_application_id
    AND founding_status IS DISTINCT FROM 'accepted';

  v_founding_updated := FOUND;

  /* Active accounts: reconcile founding only — never downgrade to invited. */
  IF v_prev_status = 'active' THEN
    RETURN json_build_object(
      'ok', true,
      'application_id', p_application_id,
      'email', v_email,
      'access_status', 'active',
      'previous_access_status', v_prev_status,
      'platform_access_id', v_access_id,
      'founding_status', 'accepted',
      'founding_status_updated', v_founding_updated,
      'access_unchanged', true
    );
  END IF;

  IF v_access_id IS NULL THEN
    INSERT INTO public.platform_access (
      email,
      access_status,
      early_access_application_id,
      invited_at,
      invited_by
    )
    VALUES (
      v_email,
      'invited',
      p_application_id,
      now(),
      p_operator_user_id
    )
    RETURNING id INTO v_access_id;
  ELSE
    UPDATE public.platform_access
    SET access_status = 'invited',
        email = v_email,
        early_access_application_id = coalesce(early_access_application_id, p_application_id),
        invited_at = coalesce(invited_at, now()),
        invited_by = p_operator_user_id,
        updated_at = now()
    WHERE id = v_access_id
      AND access_status IS DISTINCT FROM 'active';
  END IF;

  RETURN json_build_object(
    'ok', true,
    'application_id', p_application_id,
    'email', v_email,
    'access_status', 'invited',
    'previous_access_status', v_prev_status,
    'platform_access_id', v_access_id,
    'founding_status', 'accepted',
    'founding_status_updated', v_founding_updated,
    'access_unchanged', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_pilot_applicant_invited(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_pilot_applicant_invited(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.mark_pilot_applicant_invited(uuid, uuid) IS
  'Operator/service-role helper: set founding_status=accepted and access_status=invited after Auth invite. Idempotent. Never downgrades active. Never changes declined.';

-- ---------------------------------------------------------------------------
-- create_hotel_workspace: promote access to active + accept linked application
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
  v_app_id uuid;
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

  /*
   * Consistency safety net: Active hotel must not leave founding_status pending.
   * Prefer linked early_access_application_id; fall back to applicant email.
   * Never change declined applications. Idempotent when already accepted.
   */
  SELECT pa.early_access_application_id
  INTO v_app_id
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR lower(pa.email) = v_email
  ORDER BY CASE
    WHEN pa.early_access_application_id IS NOT NULL THEN 0
    ELSE 1
  END,
  CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END,
  pa.updated_at DESC
  LIMIT 1;

  IF v_app_id IS NULL AND v_email IS NOT NULL THEN
    SELECT ea.id
    INTO v_app_id
    FROM public.early_access_applications ea
    WHERE lower(ea.email) = v_email
    ORDER BY ea.submitted_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_app_id IS NOT NULL THEN
    UPDATE public.early_access_applications
    SET founding_status = 'accepted'
    WHERE id = v_app_id
      AND founding_status IS DISTINCT FROM 'declined'
      AND founding_status IS DISTINCT FROM 'accepted';
  END IF;

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) IS
  'Create hotel + owner membership, set platform_access active, and idempotently accept the linked early_access application (never declined).';
