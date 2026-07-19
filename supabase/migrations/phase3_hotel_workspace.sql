-- Hospitality Flow — Phase 3: Hotel workspace foundation
-- Safe to re-run: uses IF NOT EXISTS, drops existing policies before recreate,
-- and CREATE OR REPLACE for the RPC function.
-- Reuses existing public.hotels and public.hotel_members tables.

-- Location fields required by the workspace creation form
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;

-- Row Level Security
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_members ENABLE ROW LEVEL SECURITY;

-- Drop legacy / previously applied policy names (explicit)
DROP POLICY IF EXISTS "Members can view their hotel" ON public.hotels;
DROP POLICY IF EXISTS "Members can read their hotels" ON public.hotels;
DROP POLICY IF EXISTS "Authenticated users can create hotels" ON public.hotels;
DROP POLICY IF EXISTS "Users can create hotels" ON public.hotels;
DROP POLICY IF EXISTS "hotels_select_member" ON public.hotels;
DROP POLICY IF EXISTS "hotels_insert_authenticated" ON public.hotels;

DROP POLICY IF EXISTS "Users can view own membership" ON public.hotel_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.hotel_members;
DROP POLICY IF EXISTS "hotel_members_select_own" ON public.hotel_members;
DROP POLICY IF EXISTS "hotel_members_insert_own" ON public.hotel_members;

-- Drop any remaining policies on workspace tables (covers unknown names from prior runs)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('hotels', 'hotel_members')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;
END $$;

-- hotel_members: users can read their own membership rows
CREATE POLICY "hotel_members_select_own"
  ON public.hotel_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- hotel_members: users can create their own membership (first workspace owner)
CREATE POLICY "hotel_members_insert_own"
  ON public.hotel_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- hotels: members can read hotels they belong to
CREATE POLICY "hotels_select_member"
  ON public.hotels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
    )
  );

-- hotels: authenticated users can create a hotel record
CREATE POLICY "hotels_insert_authenticated"
  ON public.hotels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atomic workspace creation (recommended)
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hotel_members WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to a hotel workspace';
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

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hotel_workspace(text, text, integer, text, text) TO authenticated;
