-- Hospitality Flow — Phase 16: Operator Pilot Lab workspace provisioning
-- Safe to re-run.
--
-- Gives platform operators a secure way to create exactly one private
-- "Hospitality Flow Pilot Lab" workspace for product testing.
-- Does not introduce multi-workspace membership or a workspace switcher.
-- Does not grant operators access to any other hotel via this RPC.
-- Ordinary create_hotel_workspace remains gated to invited|active only.

CREATE OR REPLACE FUNCTION public.create_operator_pilot_lab_workspace()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_operator boolean := false;
  v_existing_hotel_id uuid;
  v_existing_name text;
  v_existing_role text;
  v_hotel_id uuid;
  v_lab_name text := 'Hospitality Flow Pilot Lab';
  v_lab_property_type text := 'Internal testing workspace';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_operator := EXISTS (
    SELECT 1
    FROM public.platform_operators po
    WHERE po.user_id = v_user_id
  );

  IF NOT v_is_operator THEN
    RAISE EXCEPTION 'Only platform operators may provision the Pilot Lab workspace';
  END IF;

  SELECT hm.hotel_id, h.name, hm.role
  INTO v_existing_hotel_id, v_existing_name, v_existing_role
  FROM public.hotel_members hm
  INNER JOIN public.hotels h ON h.id = hm.hotel_id
  WHERE hm.user_id = v_user_id
  ORDER BY hm.created_at ASC
  LIMIT 1;

  IF v_existing_hotel_id IS NOT NULL THEN
    IF v_existing_name = v_lab_name THEN
      RETURN json_build_object(
        'hotel_id', v_existing_hotel_id,
        'role', v_existing_role,
        'created', false,
        'name', v_lab_name
      );
    END IF;

    RAISE EXCEPTION 'User already belongs to a hotel workspace';
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
    v_lab_name,
    v_lab_property_type,
    1,
    'Internal',
    'United Kingdom',
    'active'
  )
  RETURNING id INTO v_hotel_id;

  INSERT INTO public.hotel_members (hotel_id, user_id, role)
  VALUES (v_hotel_id, v_user_id, 'owner');

  RETURN json_build_object(
    'hotel_id', v_hotel_id,
    'role', 'owner',
    'created', true,
    'name', v_lab_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator_pilot_lab_workspace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_operator_pilot_lab_workspace() TO authenticated;

COMMENT ON FUNCTION public.create_operator_pilot_lab_workspace() IS
  'Platform operators only. Provisions one private Hospitality Flow Pilot Lab workspace for the caller, or returns the existing Pilot Lab membership. Rejects non-operators and operators who already belong to a different hotel workspace.';
