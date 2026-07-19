-- Hospitality Flow — Phase 6: Early Access applications & founding hotel availability
-- Safe to re-run: uses IF NOT EXISTS, drops existing policies before recreate,
-- and CREATE OR REPLACE for the RPC function.

-- ── Applications table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.early_access_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  email text NOT NULL,
  property_name text NOT NULL,
  property_type text NOT NULL,
  room_count integer,
  role text NOT NULL,
  source text NOT NULL DEFAULT 'early-access-programme',
  founding_status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT early_access_founding_status_check
    CHECK (founding_status IN ('pending', 'accepted', 'declined'))
);

CREATE INDEX IF NOT EXISTS early_access_founding_status_idx
  ON public.early_access_applications (founding_status);

COMMENT ON TABLE public.early_access_applications IS
  'Early Access Programme applications. founding_status is updated manually in Supabase after review.';

COMMENT ON COLUMN public.early_access_applications.founding_status IS
  'pending (default on apply), accepted (counts toward founding cap), declined';

-- ── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.early_access_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "early_access_insert_public" ON public.early_access_applications;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'early_access_applications'
      AND policyname <> 'early_access_insert_public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END $$;

-- Public may submit applications only; status must remain pending on insert.
CREATE POLICY "early_access_insert_public"
  ON public.early_access_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (founding_status = 'pending');

-- No SELECT / UPDATE / DELETE policies for anon or authenticated.
-- Admin review and status changes use the Supabase dashboard (service role).

REVOKE ALL ON public.early_access_applications FROM anon, authenticated;
GRANT INSERT ON public.early_access_applications TO anon, authenticated;

-- ── Public availability RPC (count only, no private data) ─────────────────────

CREATE OR REPLACE FUNCTION public.get_founding_hotel_availability()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH accepted AS (
    SELECT COUNT(*)::integer AS accepted_count
    FROM public.early_access_applications
    WHERE founding_status = 'accepted'
  )
  SELECT json_build_object(
    'total_places', 10,
    'accepted_count', (SELECT accepted_count FROM accepted),
    'remaining_places', GREATEST(10 - (SELECT accepted_count FROM accepted), 0)
  );
$$;

REVOKE ALL ON FUNCTION public.get_founding_hotel_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_founding_hotel_availability() TO anon, authenticated;
