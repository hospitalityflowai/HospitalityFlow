-- =============================================================================
-- F-A03 follow-up: durable submit rate-limit attempts (service_role only).
-- Used by submit-early-access-application Edge Function so limits survive
-- isolate cold-starts (in-memory Map alone is not sufficient on Edge).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.early_access_submit_attempts (
  id bigserial PRIMARY KEY,
  rate_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS early_access_submit_attempts_key_created_idx
  ON public.early_access_submit_attempts (rate_key, created_at DESC);

ALTER TABLE public.early_access_submit_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.early_access_submit_attempts FROM PUBLIC;
REVOKE ALL ON public.early_access_submit_attempts FROM anon, authenticated;
GRANT ALL ON public.early_access_submit_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.early_access_submit_attempts_id_seq TO service_role;

COMMENT ON TABLE public.early_access_submit_attempts IS
  'Service-role-only attempt log for early-access submit rate limiting. No browser access.';

CREATE OR REPLACE FUNCTION public.check_early_access_submit_rate_limit(
  p_rate_key text,
  p_window_seconds integer DEFAULT 600,
  p_max_hits integer DEFAULT 8
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := lower(trim(coalesce(p_rate_key, '')));
  v_window integer := greatest(coalesce(p_window_seconds, 600), 1);
  v_max integer := greatest(coalesce(p_max_hits, 8), 1);
  v_count integer;
BEGIN
  IF v_key = '' THEN
    RETURN false;
  END IF;

  DELETE FROM public.early_access_submit_attempts
  WHERE created_at < now() - make_interval(secs => v_window * 2);

  SELECT count(*)::integer INTO v_count
  FROM public.early_access_submit_attempts
  WHERE rate_key = v_key
    AND created_at >= now() - make_interval(secs => v_window);

  IF v_count >= v_max THEN
    RETURN false;
  END IF;

  INSERT INTO public.early_access_submit_attempts (rate_key) VALUES (v_key);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_early_access_submit_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_early_access_submit_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_early_access_submit_rate_limit(text, integer, integer) TO service_role;
