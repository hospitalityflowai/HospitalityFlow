-- Hospitality Flow — Operator audit log for pilot application management
-- Safe to re-run.
--
-- Service-role only. No browser SELECT/INSERT/UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS public.operator_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  application_id uuid,
  applicant_email text,
  previous_founding_status text,
  new_founding_status text,
  previous_access_status text,
  new_access_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_audit_log_action_check CHECK (
    action IN (
      'approve_invite',
      'resend_invite',
      'decline',
      'restore',
      'delete_test_application'
    )
  )
);

CREATE INDEX IF NOT EXISTS operator_audit_log_created_at_idx
  ON public.operator_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS operator_audit_log_application_id_idx
  ON public.operator_audit_log (application_id);

CREATE INDEX IF NOT EXISTS operator_audit_log_operator_user_id_idx
  ON public.operator_audit_log (operator_user_id);

COMMENT ON TABLE public.operator_audit_log IS
  'Append-only operator actions for Founding Pilot application management. Service-role only.';

ALTER TABLE public.operator_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.operator_audit_log FROM PUBLIC;
REVOKE ALL ON public.operator_audit_log FROM anon, authenticated;

-- Helper used by Edge Functions and management RPCs (service_role only).
CREATE OR REPLACE FUNCTION public.write_operator_audit_event(
  p_operator_user_id uuid,
  p_action text,
  p_application_id uuid,
  p_applicant_email text,
  p_previous_founding_status text DEFAULT NULL,
  p_new_founding_status text DEFAULT NULL,
  p_previous_access_status text DEFAULT NULL,
  p_new_access_status text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_operator_user_id IS NULL THEN
    RAISE EXCEPTION 'operator_user_id is required';
  END IF;

  IF p_action IS NULL OR trim(p_action) = '' THEN
    RAISE EXCEPTION 'action is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_operators po WHERE po.user_id = p_operator_user_id
  ) THEN
    RAISE EXCEPTION 'Caller is not an authorised operator';
  END IF;

  INSERT INTO public.operator_audit_log (
    operator_user_id,
    action,
    application_id,
    applicant_email,
    previous_founding_status,
    new_founding_status,
    previous_access_status,
    new_access_status,
    metadata
  )
  VALUES (
    p_operator_user_id,
    p_action,
    p_application_id,
    CASE
      WHEN p_applicant_email IS NULL THEN NULL
      ELSE lower(trim(p_applicant_email))
    END,
    p_previous_founding_status,
    p_new_founding_status,
    p_previous_access_status,
    p_new_access_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_operator_audit_event(
  uuid, text, uuid, text, text, text, text, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_operator_audit_event(
  uuid, text, uuid, text, text, text, text, text, jsonb
) TO service_role;
