-- Hospitality Flow — Phase 14: Operator-controlled pilot invitations
-- Safe to re-run.
--
-- Authorised operators (platform_operators) may invite pending applicants via the
-- invite-pilot-applicant Edge Function. Status becomes 'invited' only after the
-- Auth invitation is sent successfully (enforced in the Edge Function, not here).
-- Does not change workspace RLS or tenant isolation policies.

CREATE TABLE IF NOT EXISTS public.platform_operators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_operators_email_lower_chk CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_operators_email_lower_idx
  ON public.platform_operators (lower(email));

COMMENT ON TABLE public.platform_operators IS
  'Hospitality Flow staff authorised to approve and invite Founding Pilot applicants. No client access.';

ALTER TABLE public.platform_operators ENABLE ROW LEVEL SECURITY;

-- Deny all browser roles; Edge Functions use the service role (bypasses RLS).
REVOKE ALL ON public.platform_operators FROM anon, authenticated;

ALTER TABLE public.platform_access
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.platform_access.invited_at IS
  'Set when Auth invitation email was sent successfully by invite-pilot-applicant.';

COMMENT ON COLUMN public.platform_access.invited_by IS
  'platform_operators.user_id who sent the invitation (nullable if operator later deleted).';

-- Operators may sign in (for the invite JWT flow) without hotel membership or
-- platform_access invited/active. Workspace create remains gated to invited|active.
-- Hotel membership and operator privileges are separate capabilities: membership
-- still yields access_status 'active', while is_operator is reported independently.
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

  IF EXISTS (SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id) THEN
    RETURN json_build_object(
      'allowed', true,
      'access_status', 'active',
      'has_membership', true,
      'is_operator', v_is_operator
    );
  END IF;

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

-- Service-role helper used by the Edge Function after Auth invite succeeds.
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

  IF v_prev_status = 'active' THEN
    RAISE EXCEPTION 'Applicant is already an active workspace user';
  END IF;

  IF v_prev_status = 'suspended' THEN
    RAISE EXCEPTION 'Applicant access is suspended';
  END IF;

  UPDATE public.early_access_applications
  SET founding_status = 'accepted'
  WHERE id = p_application_id
    AND founding_status <> 'declined';

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
    WHERE id = v_access_id;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'application_id', p_application_id,
    'email', v_email,
    'access_status', 'invited',
    'previous_access_status', v_prev_status,
    'platform_access_id', v_access_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_pilot_applicant_invited(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_pilot_applicant_invited(uuid, uuid) TO service_role;
