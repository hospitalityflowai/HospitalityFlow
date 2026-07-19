-- Hospitality Flow — Phase 4: Hotel Brain cloud sync
-- One Hotel Brain profile per hotel workspace (JSON document in Supabase).
-- Safe to re-run: uses IF NOT EXISTS and drops known policies before recreate.

CREATE TABLE IF NOT EXISTS public.hotel_brain_profiles (
  hotel_id uuid PRIMARY KEY REFERENCES public.hotels(id) ON DELETE CASCADE,
  profile_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_version integer NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS hotel_brain_profiles_updated_at_idx
  ON public.hotel_brain_profiles (updated_at DESC);

ALTER TABLE public.hotel_brain_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_brain_select_member" ON public.hotel_brain_profiles;
DROP POLICY IF EXISTS "hotel_brain_insert_member" ON public.hotel_brain_profiles;
DROP POLICY IF EXISTS "hotel_brain_update_member" ON public.hotel_brain_profiles;

CREATE POLICY "hotel_brain_select_member"
  ON public.hotel_brain_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "hotel_brain_insert_member"
  ON public.hotel_brain_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "hotel_brain_update_member"
  ON public.hotel_brain_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_hotel_brain_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hotel_brain_profiles_updated_at ON public.hotel_brain_profiles;
CREATE TRIGGER hotel_brain_profiles_updated_at
  BEFORE INSERT OR UPDATE ON public.hotel_brain_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hotel_brain_updated_at();
