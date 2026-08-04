-- Hospitality Flow — Pilot application management RPCs (decline / restore / deletable)
-- Safe to re-run (CREATE OR REPLACE).
--
-- Service-role only. Edge Functions call these after requirePlatformOperator.
-- Never trust client-supplied status; resolve current rows by application id.

-- ---------------------------------------------------------------------------
-- mark_pilot_applicant_declined
-- Allowed: pending (pending_application) or invited (accepted + invited)
-- Forbidden: active access; already-active hotels
-- Sets: founding_status = declined, access_status = suspended
-- Preserves Auth users (no Auth delete here)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_pilot_applicant_declined(
  p_application_id uuid,
  p_operator_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.early_access_applications%ROWTYPE;
  v_email text;
  v_access_id uuid;
  v_prev_access text;
  v_prev_founding text;
  v_audit_id uuid;
BEGIN
  IF p_application_id IS NULL OR p_operator_user_id IS NULL THEN
    RAISE EXCEPTION 'application_id and operator_user_id are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_operators po WHERE po.user_id = p_operator_user_id
  ) THEN
    RAISE EXCEPTION 'Caller is not an authorised operator';
  END IF;

  SELECT * INTO v_app
  FROM public.early_access_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  v_email := lower(trim(v_app.email));
  v_prev_founding := v_app.founding_status;

  SELECT pa.id, pa.access_status
  INTO v_access_id, v_prev_access
  FROM public.platform_access pa
  WHERE pa.early_access_application_id = p_application_id
     OR lower(pa.email) = v_email
  ORDER BY CASE
    WHEN pa.early_access_application_id = p_application_id THEN 0
    ELSE 1
  END, pa.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prev_access = 'active' THEN
    RAISE EXCEPTION 'ACTIVE_ACCESS: Active hotels cannot be declined';
  END IF;

  /* Idempotent: already declined + suspended */
  IF v_prev_founding = 'declined' AND coalesce(v_prev_access, '') = 'suspended' THEN
    RETURN json_build_object(
      'ok', true,
      'idempotent', true,
      'application_id', p_application_id,
      'email', v_email,
      'founding_status', 'declined',
      'access_status', 'suspended',
      'previous_founding_status', v_prev_founding,
      'previous_access_status', v_prev_access
    );
  END IF;

  /*
   * Decline only from pending or invited operational states.
   * pending → founding pending + access pending_application/approved
   * invited → access invited (founding typically accepted)
   */
  IF NOT (
    (
      v_prev_founding = 'pending'
      AND coalesce(v_prev_access, 'pending_application') IN ('pending_application', 'approved')
    )
    OR coalesce(v_prev_access, '') = 'invited'
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Decline is only allowed for pending or invited applications';
  END IF;

  UPDATE public.early_access_applications
  SET founding_status = 'declined'
  WHERE id = p_application_id;

  IF v_access_id IS NULL THEN
    INSERT INTO public.platform_access (
      email,
      access_status,
      early_access_application_id
    )
    VALUES (v_email, 'suspended', p_application_id)
    RETURNING id INTO v_access_id;
  ELSE
    UPDATE public.platform_access
    SET access_status = 'suspended',
        email = v_email,
        early_access_application_id = coalesce(early_access_application_id, p_application_id),
        updated_at = now()
    WHERE id = v_access_id
      AND access_status IS DISTINCT FROM 'active';
  END IF;

  v_audit_id := public.write_operator_audit_event(
    p_operator_user_id,
    'decline',
    p_application_id,
    v_email,
    v_prev_founding,
    'declined',
    v_prev_access,
    'suspended',
    jsonb_build_object('platform_access_id', v_access_id)
  );

  RETURN json_build_object(
    'ok', true,
    'idempotent', false,
    'application_id', p_application_id,
    'email', v_email,
    'founding_status', 'declined',
    'access_status', 'suspended',
    'previous_founding_status', v_prev_founding,
    'previous_access_status', v_prev_access,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_pilot_applicant_declined(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_pilot_applicant_declined(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.mark_pilot_applicant_declined(uuid, uuid) IS
  'Decline pending/invited pilot application. Sets founding declined + access suspended. Never touches active. Preserves Auth user.';

-- ---------------------------------------------------------------------------
-- restore_pilot_applicant
-- Allowed only: founding declined AND access suspended
-- Sets: founding pending, access pending_application
-- Does not send an invite
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_pilot_applicant(
  p_application_id uuid,
  p_operator_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.early_access_applications%ROWTYPE;
  v_email text;
  v_access_id uuid;
  v_prev_access text;
  v_prev_founding text;
  v_audit_id uuid;
BEGIN
  IF p_application_id IS NULL OR p_operator_user_id IS NULL THEN
    RAISE EXCEPTION 'application_id and operator_user_id are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.platform_operators po WHERE po.user_id = p_operator_user_id
  ) THEN
    RAISE EXCEPTION 'Caller is not an authorised operator';
  END IF;

  SELECT * INTO v_app
  FROM public.early_access_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  v_email := lower(trim(v_app.email));
  v_prev_founding := v_app.founding_status;

  SELECT pa.id, pa.access_status
  INTO v_access_id, v_prev_access
  FROM public.platform_access pa
  WHERE pa.early_access_application_id = p_application_id
     OR lower(pa.email) = v_email
  ORDER BY CASE
    WHEN pa.early_access_application_id = p_application_id THEN 0
    ELSE 1
  END, pa.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prev_access = 'active' THEN
    RAISE EXCEPTION 'ACTIVE_ACCESS: Active hotels cannot be restored through this path';
  END IF;

  /* Idempotent: already pending + pending_application */
  IF v_prev_founding = 'pending'
     AND coalesce(v_prev_access, '') = 'pending_application' THEN
    RETURN json_build_object(
      'ok', true,
      'idempotent', true,
      'application_id', p_application_id,
      'email', v_email,
      'founding_status', 'pending',
      'access_status', 'pending_application',
      'previous_founding_status', v_prev_founding,
      'previous_access_status', v_prev_access,
      'invite_sent', false
    );
  END IF;

  IF v_prev_founding IS DISTINCT FROM 'declined'
     OR coalesce(v_prev_access, '') IS DISTINCT FROM 'suspended' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Restore is only allowed when founding_status=declined and access_status=suspended';
  END IF;

  UPDATE public.early_access_applications
  SET founding_status = 'pending'
  WHERE id = p_application_id;

  IF v_access_id IS NULL THEN
    INSERT INTO public.platform_access (
      email,
      access_status,
      early_access_application_id
    )
    VALUES (v_email, 'pending_application', p_application_id)
    RETURNING id INTO v_access_id;
  ELSE
    UPDATE public.platform_access
    SET access_status = 'pending_application',
        email = v_email,
        early_access_application_id = coalesce(early_access_application_id, p_application_id),
        updated_at = now()
    WHERE id = v_access_id
      AND access_status IS DISTINCT FROM 'active';
  END IF;

  v_audit_id := public.write_operator_audit_event(
    p_operator_user_id,
    'restore',
    p_application_id,
    v_email,
    v_prev_founding,
    'pending',
    v_prev_access,
    'pending_application',
    jsonb_build_object('platform_access_id', v_access_id, 'invite_sent', false)
  );

  RETURN json_build_object(
    'ok', true,
    'idempotent', false,
    'application_id', p_application_id,
    'email', v_email,
    'founding_status', 'pending',
    'access_status', 'pending_application',
    'previous_founding_status', v_prev_founding,
    'previous_access_status', v_prev_access,
    'invite_sent', false,
    'audit_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_pilot_applicant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_pilot_applicant(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.restore_pilot_applicant(uuid, uuid) IS
  'Restore declined+suspended application to pending/pending_application. Does not send an invite. Never touches active.';

-- ---------------------------------------------------------------------------
-- assert_pilot_applicant_deletable
-- Blocks when active, membership, hotel ownership, or operational data exists.
-- Uses to_regclass so missing optional tables do not break the check.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_pilot_applicant_deletable(
  p_application_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.early_access_applications%ROWTYPE;
  v_email text;
  v_access_id uuid;
  v_access_status text;
  v_user_id uuid;
  v_blockers text[] := ARRAY[]::text[];
  v_hotel_ids uuid[] := ARRAY[]::uuid[];
  v_count integer;
BEGIN
  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'application_id is required';
  END IF;

  SELECT * INTO v_app
  FROM public.early_access_applications
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', false,
      'deletable', false,
      'blockers', jsonb_build_array('APPLICATION_NOT_FOUND')
    );
  END IF;

  v_email := lower(trim(v_app.email));

  SELECT pa.id, pa.access_status, pa.user_id
  INTO v_access_id, v_access_status, v_user_id
  FROM public.platform_access pa
  WHERE pa.early_access_application_id = p_application_id
     OR lower(pa.email) = v_email
  ORDER BY CASE
    WHEN pa.early_access_application_id = p_application_id THEN 0
    ELSE 1
  END, pa.updated_at DESC
  LIMIT 1;

  IF v_app.founding_status IS DISTINCT FROM 'declined' THEN
    v_blockers := array_append(v_blockers, 'FOUNDING_NOT_DECLINED');
  END IF;

  IF coalesce(v_access_status, '') = 'active' THEN
    v_blockers := array_append(v_blockers, 'ACCESS_IS_ACTIVE');
  END IF;

  /* Membership / hotel ownership */
  IF v_user_id IS NOT NULL AND to_regclass('public.hotel_members') IS NOT NULL THEN
    EXECUTE
      'SELECT count(*)::integer FROM public.hotel_members WHERE user_id = $1'
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'HOTEL_MEMBERSHIP_EXISTS');
    END IF;

    EXECUTE
      $q$
      SELECT coalesce(array_agg(hotel_id), ARRAY[]::uuid[])
      FROM public.hotel_members
      WHERE user_id = $1
      $q$
      INTO v_hotel_ids
      USING v_user_id;
  END IF;

  IF v_user_id IS NOT NULL
     AND to_regclass('public.hotels') IS NOT NULL
     AND to_regclass('public.hotel_members') IS NOT NULL THEN
    EXECUTE
      $q$
      SELECT count(*)::integer
      FROM public.hotel_members hm
      WHERE hm.user_id = $1
        AND lower(coalesce(hm.role, '')) = 'owner'
      $q$
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'HOTEL_OWNERSHIP_EXISTS');
    END IF;
  END IF;

  /* Operational data linked to user or their hotels — defensive table existence checks */
  IF v_user_id IS NOT NULL AND to_regclass('public.handover_reports') IS NOT NULL THEN
    EXECUTE
      'SELECT count(*)::integer FROM public.handover_reports WHERE user_id = $1'
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'HANDOVER_DATA_EXISTS');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND to_regclass('public.maintenance_issues') IS NOT NULL THEN
    EXECUTE
      $q$
      SELECT count(*)::integer FROM public.maintenance_issues
      WHERE created_by = $1 OR updated_by = $1 OR assigned_user_id = $1
      $q$
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'MAINTENANCE_DATA_EXISTS');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND to_regclass('public.maintenance_updates') IS NOT NULL THEN
    EXECUTE
      $q$
      SELECT count(*)::integer FROM public.maintenance_updates
      WHERE created_by = $1 OR updated_by = $1
      $q$
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'MAINTENANCE_UPDATES_EXIST');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND to_regclass('public.hotel_brain_profiles') IS NOT NULL THEN
    EXECUTE
      'SELECT count(*)::integer FROM public.hotel_brain_profiles WHERE updated_by = $1'
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'HOTEL_BRAIN_DATA_EXISTS');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND to_regclass('public.guest_knowledge') IS NOT NULL THEN
    EXECUTE
      $q$
      SELECT count(*)::integer FROM public.guest_knowledge
      WHERE created_by = $1 OR updated_by = $1 OR approved_by = $1 OR rejected_by = $1
      $q$
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'GUEST_KNOWLEDGE_DATA_EXISTS');
    END IF;
  END IF;

  IF v_user_id IS NOT NULL AND to_regclass('public.guest_knowledge_review_events') IS NOT NULL THEN
    EXECUTE
      'SELECT count(*)::integer FROM public.guest_knowledge_review_events WHERE actor_user_id = $1'
      INTO v_count
      USING v_user_id;
    IF coalesce(v_count, 0) > 0 THEN
      v_blockers := array_append(v_blockers, 'GUEST_KNOWLEDGE_EVENTS_EXIST');
    END IF;
  END IF;

  /* Workspace-scoped operational data for any hotels this user belongs to */
  IF coalesce(array_length(v_hotel_ids, 1), 0) > 0 THEN
    IF to_regclass('public.hotel_brain_profiles') IS NOT NULL THEN
      EXECUTE
        'SELECT count(*)::integer FROM public.hotel_brain_profiles WHERE hotel_id = ANY($1)'
        INTO v_count
        USING v_hotel_ids;
      IF coalesce(v_count, 0) > 0 THEN
        v_blockers := array_append(v_blockers, 'HOTEL_BRAIN_WORKSPACE_DATA_EXISTS');
      END IF;
    END IF;

    IF to_regclass('public.handover_reports') IS NOT NULL THEN
      EXECUTE
        'SELECT count(*)::integer FROM public.handover_reports WHERE workspace_id = ANY($1)'
        INTO v_count
        USING v_hotel_ids;
      IF coalesce(v_count, 0) > 0 THEN
        v_blockers := array_append(v_blockers, 'HANDOVER_WORKSPACE_DATA_EXISTS');
      END IF;
    END IF;

    IF to_regclass('public.maintenance_issues') IS NOT NULL THEN
      EXECUTE
        'SELECT count(*)::integer FROM public.maintenance_issues WHERE workspace_id = ANY($1)'
        INTO v_count
        USING v_hotel_ids;
      IF coalesce(v_count, 0) > 0 THEN
        v_blockers := array_append(v_blockers, 'MAINTENANCE_WORKSPACE_DATA_EXISTS');
      END IF;
    END IF;

    IF to_regclass('public.guest_knowledge') IS NOT NULL THEN
      EXECUTE
        'SELECT count(*)::integer FROM public.guest_knowledge WHERE workspace_id = ANY($1)'
        INTO v_count
        USING v_hotel_ids;
      IF coalesce(v_count, 0) > 0 THEN
        v_blockers := array_append(v_blockers, 'GUEST_KNOWLEDGE_WORKSPACE_DATA_EXISTS');
      END IF;
    END IF;
  END IF;

  /* Deduplicate blockers */
  SELECT coalesce(array_agg(DISTINCT b), ARRAY[]::text[])
  INTO v_blockers
  FROM unnest(v_blockers) AS b;

  RETURN json_build_object(
    'ok', true,
    'deletable', coalesce(array_length(v_blockers, 1), 0) = 0,
    'application_id', p_application_id,
    'email', v_email,
    'founding_status', v_app.founding_status,
    'access_status', v_access_status,
    'user_id', v_user_id,
    'platform_access_id', v_access_id,
    'hotel_ids', to_jsonb(v_hotel_ids),
    'blockers', to_jsonb(v_blockers)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assert_pilot_applicant_deletable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_pilot_applicant_deletable(uuid) TO service_role;

COMMENT ON FUNCTION public.assert_pilot_applicant_deletable(uuid) IS
  'Pre-delete safety check for declined test applications. Blocks active access, membership, ownership, and operational data. No deletes performed.';
