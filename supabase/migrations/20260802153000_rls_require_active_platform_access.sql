-- Hospitality Flow — RLS requires active (non-suspended) platform access
-- Audit 2 Remediation F-01 data-plane completion.
-- Safe to re-run: CREATE OR REPLACE helper + DROP/CREATE known policies.
--
-- Policy model:
--   private operational rows require BOTH
--     (1) hotel_members membership for the target workspace, AND
--     (2) public.has_active_platform_access() = true
--
-- has_active_platform_access mirrors get_my_platform_access allow rules:
--   suspended → false (global deny, including operators with membership)
--   else membership / operator / invited|active → true
--
-- Does NOT weaken membership checks. Does NOT change platform_access RLS.
-- SECURITY DEFINER RPCs that bypass RLS already reject suspended callers
-- (create_hotel_workspace / create_operator_pilot_lab); update_hotel_workspace
-- is tightened below.
--
-- Rollback considerations:
--   Re-apply prior policy definitions from phase3/4/5/7/8/15 migrations and
--   DROP FUNCTION public.has_active_platform_access(). Soft-suspend would
--   again allow PostgREST via membership alone.

-- ---------------------------------------------------------------------------
-- Helper: caller has non-suspended platform access (auth.uid() only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_active_platform_access()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_status text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email) INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  SELECT pa.access_status
  INTO v_status
  FROM public.platform_access pa
  WHERE pa.user_id = v_user_id
     OR (pa.user_id IS NULL AND lower(pa.email) = v_email)
  ORDER BY CASE WHEN pa.user_id = v_user_id THEN 0 ELSE 1 END, pa.updated_at DESC
  LIMIT 1;

  -- Explicit suspension is a global data-plane deny.
  IF v_status = 'suspended' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.hotel_members hm WHERE hm.user_id = v_user_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_operators po WHERE po.user_id = v_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN v_status IN ('active', 'invited');
END;
$$;

REVOKE ALL ON FUNCTION public.has_active_platform_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_platform_access() TO authenticated;

COMMENT ON FUNCTION public.has_active_platform_access() IS
  'True when auth.uid() has non-suspended platform access (membership, operator, or invited/active). Safe for RLS; never accepts client-supplied user ids.';

-- ---------------------------------------------------------------------------
-- hotel_members
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "hotel_members_select_own" ON public.hotel_members;
CREATE POLICY "hotel_members_select_own"
  ON public.hotel_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.has_active_platform_access()
  );

-- ---------------------------------------------------------------------------
-- hotels
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "hotels_select_member" ON public.hotels;
CREATE POLICY "hotels_select_member"
  ON public.hotels
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "hotels_update_owner" ON public.hotels;
CREATE POLICY "hotels_update_owner"
  ON public.hotels
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND lower(trim(hm.role)) = 'owner'
    )
  )
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND lower(trim(hm.role)) = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- hotel_brain_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "hotel_brain_select_member" ON public.hotel_brain_profiles;
DROP POLICY IF EXISTS "hotel_brain_insert_member" ON public.hotel_brain_profiles;
DROP POLICY IF EXISTS "hotel_brain_update_member" ON public.hotel_brain_profiles;

CREATE POLICY "hotel_brain_select_member"
  ON public.hotel_brain_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
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
    public.has_active_platform_access()
    AND EXISTS (
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
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotel_brain_profiles.hotel_id
        AND hm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- handover_reports
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "handover_reports_select_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_insert_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_update_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_delete_member" ON public.handover_reports;

CREATE POLICY "handover_reports_select_member"
  ON public.handover_reports
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "handover_reports_insert_member"
  ON public.handover_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "handover_reports_update_member"
  ON public.handover_reports
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "handover_reports_delete_member"
  ON public.handover_reports
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- maintenance_issues (no authenticated DELETE policy — intentional)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "maintenance_issues_select_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_insert_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_update_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_delete_member" ON public.maintenance_issues;

CREATE POLICY "maintenance_issues_select_member"
  ON public.maintenance_issues
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_issues_insert_member"
  ON public.maintenance_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_issues_update_member"
  ON public.maintenance_issues
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- maintenance_updates (SELECT + INSERT only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "maintenance_updates_select_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_insert_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_update_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_delete_member" ON public.maintenance_updates;

CREATE POLICY "maintenance_updates_select_member"
  ON public.maintenance_updates
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_updates.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "maintenance_updates_insert_member"
  ON public.maintenance_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_updates.workspace_id
        AND hm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.maintenance_issues mi
      WHERE mi.id = maintenance_updates.issue_id
        AND mi.workspace_id = maintenance_updates.workspace_id
    )
  );

-- ---------------------------------------------------------------------------
-- update_hotel_workspace: SECURITY DEFINER bypasses RLS — enforce suspend
-- ---------------------------------------------------------------------------
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

  IF NOT public.has_active_platform_access() THEN
    RAISE EXCEPTION 'Platform access is suspended';
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
