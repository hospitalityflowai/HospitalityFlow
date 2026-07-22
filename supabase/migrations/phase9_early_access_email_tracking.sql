-- Hospitality Flow — Phase 9: Early Access transactional email tracking
-- Tracks Resend delivery for idempotent Edge Function retries.
-- Safe to re-run.

ALTER TABLE public.early_access_applications
  ADD COLUMN IF NOT EXISTS applicant_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS owner_email_sent_at timestamptz;

COMMENT ON COLUMN public.early_access_applications.applicant_email_sent_at IS
  'Set when the applicant confirmation email was sent successfully via Edge Function.';

COMMENT ON COLUMN public.early_access_applications.owner_email_sent_at IS
  'Set when the internal owner notification email was sent successfully via Edge Function.';

-- Insert via RPC so anon can receive the new row ID without SELECT on the table.
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
BEGIN
  v_email := lower(trim(p_email));

  IF coalesce(trim(p_first_name), '') = ''
    OR coalesce(v_email, '') = ''
    OR coalesce(trim(p_property_name), '') = ''
    OR coalesce(trim(p_property_type), '') = ''
    OR coalesce(trim(p_role), '') = '' THEN
    RAISE EXCEPTION 'Missing required application fields';
  END IF;

  SELECT id INTO v_id
  FROM public.early_access_applications
  WHERE email = v_email
    AND founding_status = 'pending'
  ORDER BY submitted_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

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
    trim(p_first_name),
    v_email,
    trim(p_property_name),
    trim(p_property_type),
    p_room_count,
    trim(p_role),
    coalesce(nullif(trim(p_source), ''), 'early-access-programme'),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_early_access_application(text, text, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_early_access_application(text, text, text, text, integer, text, text) TO anon, authenticated;
