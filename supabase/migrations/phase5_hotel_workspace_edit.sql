-- Hospitality Flow — Phase 5: Hotel workspace editing (owners)
-- Allows workspace owners to update their hotel record in public.hotels.
-- Safe to re-run.

GRANT UPDATE ON public.hotels TO authenticated;

DROP POLICY IF EXISTS "hotels_update_owner" ON public.hotels;

CREATE POLICY "hotels_update_owner"
  ON public.hotels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND lower(trim(hm.role)) = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND lower(trim(hm.role)) = 'owner'
    )
  );

-- Owner-only update via SECURITY DEFINER (same pattern as create_hotel_workspace).
CREATE OR REPLACE FUNCTION public.update_hotel_workspace(
  p_hotel_id uuid,
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
  v_hotel public.hotels%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.hotel_members hm
    WHERE hm.hotel_id = p_hotel_id
      AND hm.user_id = v_user_id
      AND lower(trim(hm.role)) = 'owner'
  ) THEN
    RAISE EXCEPTION 'Only workspace owners can edit hotel details';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Hotel name is required';
  END IF;

  UPDATE public.hotels
  SET
    name = trim(p_name),
    property_type = p_property_type,
    number_of_rooms = p_number_of_rooms,
    city = trim(p_city),
    country = trim(p_country)
  WHERE id = p_hotel_id
  RETURNING * INTO v_hotel;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hotel details could not be updated';
  END IF;

  RETURN json_build_object(
    'id', v_hotel.id,
    'name', v_hotel.name,
    'property_type', v_hotel.property_type,
    'number_of_rooms', v_hotel.number_of_rooms,
    'city', v_hotel.city,
    'country', v_hotel.country,
    'created_at', v_hotel.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_hotel_workspace(uuid, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_hotel_workspace(uuid, text, text, integer, text, text) TO authenticated;
