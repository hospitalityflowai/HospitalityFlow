-- =============================================================================
-- Audit 2 / Launch Gate #3 — F-A03
-- Make submit_early_access_application Edge / service_role only.
--
-- Decision: NOT a public RPC.
-- Browser callers must use the submit-early-access-application Edge Function
-- (validation + rate limit + email dispatch). Direct PostgREST RPC and direct
-- table INSERT from anon/authenticated are revoked.
--
-- Apply on non-production first. Do not treat this file as auto-applied.
-- =============================================================================

-- ── 1. Harden RPC validation (parity with Edge shared validator) ─────────────

CREATE OR REPLACE FUNCTION public.submit_early_access_application(
  p_first_name text,
  p_email text,
  p_property_name text,
  p_property_type text,
  p_room_count integer,
  p_role text,
  p_source text DEFAULT 'early-access-programme'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_first_name text;
  v_property_name text;
  v_property_type text;
  v_role text;
  v_source text;
BEGIN
  v_first_name := trim(coalesce(p_first_name, ''));
  v_email := lower(trim(coalesce(p_email, '')));
  v_property_name := trim(coalesce(p_property_name, ''));
  v_property_type := trim(coalesce(p_property_type, ''));
  v_role := trim(coalesce(p_role, ''));
  v_source := coalesce(nullif(trim(coalesce(p_source, '')), ''), 'early-access-programme');

  IF v_first_name = ''
    OR v_email = ''
    OR v_property_name = ''
    OR v_property_type = ''
    OR v_role = '' THEN
    RAISE EXCEPTION 'Missing required application fields'
      USING ERRCODE = 'check_violation';
  END IF;

  IF char_length(v_first_name) > 200
    OR char_length(v_property_name) > 200
    OR char_length(v_property_type) > 200
    OR char_length(v_role) > 200
    OR char_length(v_source) > 200
    OR char_length(v_email) > 320 THEN
    RAISE EXCEPTION 'One or more fields exceed the maximum allowed length'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid email address is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_room_count IS NOT NULL AND (p_room_count < 0 OR p_room_count > 10000) THEN
    RAISE EXCEPTION 'Room count must be a whole number between 0 and 10000'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Idempotent pending replay: return existing pending application for email.
  SELECT id INTO v_id
  FROM public.early_access_applications
  WHERE email = v_email
    AND founding_status = 'pending'
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.early_access_applications (
      first_name,
      email,
      property_name,
      property_type,
      room_count,
      role,
      source,
      founding_status
    )
    VALUES (
      v_first_name,
      v_email,
      v_property_name,
      v_property_type,
      p_room_count,
      v_role,
      v_source,
      'pending'
    )
    RETURNING id INTO v_id;
  END IF;

  -- Never downgrade active / invited / approved platform access.
  INSERT INTO public.platform_access (email, access_status, early_access_application_id)
  VALUES (v_email, 'pending_application', v_id)
  ON CONFLICT (email_lower) DO UPDATE
  SET access_status = CASE
        WHEN public.platform_access.access_status IN ('active', 'invited', 'approved')
          THEN public.platform_access.access_status
        ELSE 'pending_application'
      END,
      early_access_application_id = coalesce(
        public.platform_access.early_access_application_id,
        EXCLUDED.early_access_application_id
      ),
      updated_at = now();

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.submit_early_access_application(
  text, text, text, text, integer, text, text
) IS
  'SECURITY DEFINER early-access submit used only by the submit-early-access-application Edge Function (service_role). Not executable by anon/authenticated.';

-- ── 2. Revoke public RPC execute ─────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.submit_early_access_application(
  text, text, text, text, integer, text, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.submit_early_access_application(
  text, text, text, text, integer, text, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_early_access_application(
  text, text, text, text, integer, text, text
) TO service_role;

-- ── 3. Close direct table INSERT bypass ──────────────────────────────────────
-- Previously anon/authenticated could INSERT pending rows via PostgREST and skip
-- the Edge Function (validation, rate limit, email orchestration).

DROP POLICY IF EXISTS "early_access_insert_public" ON public.early_access_applications;

REVOKE INSERT ON public.early_access_applications FROM anon, authenticated;
REVOKE ALL ON public.early_access_applications FROM anon, authenticated;
