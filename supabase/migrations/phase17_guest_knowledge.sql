-- Hospitality Flow — Phase 17 / GI-3: Guest knowledge staff review foundation
--
-- Tables:
--   guest_knowledge                 — tenant-scoped reviewable knowledge (not a profile)
--   guest_knowledge_review_events   — append-only audit trail
--
-- Lifecycle authority (blocking requirement):
--   Authenticated clients have SELECT only on guest_knowledge.
--   No direct INSERT / UPDATE / DELETE policies for authenticated.
--   Lifecycle mutations go through SECURITY DEFINER RPCs only:
--     - propose_guest_knowledge(...)
--     - review_guest_knowledge(...)
--   Each RPC updates knowledge + inserts audit event in one transaction.
--   Session GUC guest_knowledge.allow_lifecycle='on' gates trigger-allowed mutations.
--
-- Boundaries:
--   - Candidates (GI-2) remain runtime-only until propose/review RPCs.
--   - No automatic confirmation.
--   - No guest identity merge / no durable guest identity table.
--   - Demo must never call these RPCs (application layer).
--   - Privacy erasure is a later controlled path (no authenticated DELETE).
--
-- RLS: hotel_members + has_active_platform_access().
-- This migration is PROPOSED for review — do not assume it has been applied.
--
-- Safe to re-run: IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- 1) guest_knowledge
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.guest_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,

  -- Identity evidence (codes / tokens only — not a durable guest identity)
  identity_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  guest_match_strength text NOT NULL DEFAULT 'uncertain',
  knowledge_type text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Provenance (immutable after create)
  source_candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_observation_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_fact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_report_ids jsonb NOT NULL DEFAULT '[]'::jsonb,

  confidence numeric NOT NULL DEFAULT 0,
  sensitivity text NOT NULL DEFAULT 'normal',
  approval_requirement text NOT NULL DEFAULT 'none',

  -- Lifecycle: proposed is inactive; only confirmed (+ not expired) is active
  approval_status text NOT NULL DEFAULT 'proposed',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  superseded_by uuid,
  review_at timestamptz,
  expires_at timestamptz,
  retention_reason text,
  review_reason text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT guest_knowledge_approval_status_check CHECK (
    approval_status IN ('proposed', 'confirmed', 'rejected', 'superseded', 'expired')
  ),
  CONSTRAINT guest_knowledge_sensitivity_check CHECK (
    sensitivity IN ('normal', 'sensitive', 'prohibited')
  ),
  CONSTRAINT guest_knowledge_approval_requirement_check CHECK (
    approval_requirement IN ('none', 'staff_review', 'never_store')
  ),
  CONSTRAINT guest_knowledge_match_strength_check CHECK (
    guest_match_strength IN ('strong', 'probable', 'uncertain', 'none')
  ),
  CONSTRAINT guest_knowledge_confidence_range_check CHECK (
    confidence >= 0 AND confidence <= 1
  ),
  CONSTRAINT guest_knowledge_sensitivity_not_prohibited_row CHECK (
    sensitivity <> 'prohibited'
  ),
  CONSTRAINT guest_knowledge_never_store_not_confirmed CHECK (
    NOT (approval_status = 'confirmed' AND approval_requirement = 'never_store')
  ),
  CONSTRAINT guest_knowledge_source_facts_required CHECK (
    jsonb_typeof(source_fact_ids) = 'array'
    AND jsonb_array_length(source_fact_ids) >= 1
  ),
  CONSTRAINT guest_knowledge_source_obs_required CHECK (
    jsonb_typeof(source_observation_ids) = 'array'
    AND jsonb_array_length(source_observation_ids) >= 1
  ),
  CONSTRAINT guest_knowledge_source_candidates_array CHECK (
    jsonb_typeof(source_candidate_ids) = 'array'
  ),
  CONSTRAINT guest_knowledge_source_reports_array CHECK (
    jsonb_typeof(source_report_ids) = 'array'
  ),
  CONSTRAINT guest_knowledge_value_object CHECK (
    jsonb_typeof(value) = 'object'
  ),
  CONSTRAINT guest_knowledge_identity_object CHECK (
    jsonb_typeof(identity_evidence) = 'object'
  ),
  CONSTRAINT guest_knowledge_confirmed_requires_approver CHECK (
    approval_status <> 'confirmed'
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CONSTRAINT guest_knowledge_rejected_requires_rejector CHECK (
    approval_status <> 'rejected'
    OR (rejected_by IS NOT NULL AND rejected_at IS NOT NULL)
  ),
  CONSTRAINT guest_knowledge_superseded_requires_link CHECK (
    approval_status <> 'superseded'
    OR superseded_by IS NOT NULL
  ),
  CONSTRAINT guest_knowledge_no_self_supersede CHECK (
    superseded_by IS NULL OR superseded_by <> id
  ),
  CONSTRAINT guest_knowledge_expires_after_created CHECK (
    expires_at IS NULL OR expires_at >= created_at
  ),
  CONSTRAINT guest_knowledge_sensitive_confirmed_retention CHECK (
    NOT (
      approval_status = 'confirmed'
      AND sensitivity = 'sensitive'
      AND (retention_reason IS NULL OR length(trim(retention_reason)) = 0)
    )
  ),
  CONSTRAINT guest_knowledge_id_workspace_key UNIQUE (id, workspace_id),
  CONSTRAINT guest_knowledge_superseded_workspace_fk
    FOREIGN KEY (superseded_by, workspace_id)
    REFERENCES public.guest_knowledge (id, workspace_id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS guest_knowledge_workspace_id_idx
  ON public.guest_knowledge (workspace_id);

CREATE INDEX IF NOT EXISTS guest_knowledge_workspace_status_idx
  ON public.guest_knowledge (workspace_id, approval_status);

CREATE INDEX IF NOT EXISTS guest_knowledge_workspace_type_idx
  ON public.guest_knowledge (workspace_id, knowledge_type);

CREATE INDEX IF NOT EXISTS guest_knowledge_workspace_updated_at_idx
  ON public.guest_knowledge (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS guest_knowledge_workspace_active_idx
  ON public.guest_knowledge (workspace_id, knowledge_type)
  WHERE approval_status = 'confirmed';

ALTER TABLE public.guest_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_knowledge_select_member" ON public.guest_knowledge;
DROP POLICY IF EXISTS "guest_knowledge_insert_member" ON public.guest_knowledge;
DROP POLICY IF EXISTS "guest_knowledge_update_member" ON public.guest_knowledge;
DROP POLICY IF EXISTS "guest_knowledge_delete_member" ON public.guest_knowledge;

-- SELECT only for active workspace members. No direct INSERT/UPDATE/DELETE.
CREATE POLICY "guest_knowledge_select_member"
  ON public.guest_knowledge
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1 FROM public.hotel_members hm
      WHERE hm.hotel_id = guest_knowledge.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.guest_knowledge IS
  'GI-3: hotel-scoped guest knowledge. Lifecycle via propose_guest_knowledge / review_guest_knowledge RPCs only. Not a CRM/profile/identity store.';

-- ---------------------------------------------------------------------------
-- 2) guest_knowledge_review_events (append-only; RPC-written)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.guest_knowledge_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  knowledge_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  reason text,
  source_candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_observation_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_fact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_knowledge_review_events_action_check CHECK (
    action IN ('confirm', 'reject', 'supersede', 'expire', 'propose')
  ),
  CONSTRAINT guest_knowledge_review_events_status_check CHECK (
    new_status IN ('proposed', 'confirmed', 'rejected', 'superseded', 'expired')
  ),
  CONSTRAINT guest_knowledge_review_events_knowledge_workspace_fk
    FOREIGN KEY (knowledge_id, workspace_id)
    REFERENCES public.guest_knowledge (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS guest_knowledge_review_events_workspace_idx
  ON public.guest_knowledge_review_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS guest_knowledge_review_events_knowledge_idx
  ON public.guest_knowledge_review_events (knowledge_id, created_at DESC);

ALTER TABLE public.guest_knowledge_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_knowledge_review_events_select_member"
  ON public.guest_knowledge_review_events;
DROP POLICY IF EXISTS "guest_knowledge_review_events_insert_member"
  ON public.guest_knowledge_review_events;
DROP POLICY IF EXISTS "guest_knowledge_review_events_update_member"
  ON public.guest_knowledge_review_events;
DROP POLICY IF EXISTS "guest_knowledge_review_events_delete_member"
  ON public.guest_knowledge_review_events;

-- SELECT only. Inserts happen inside SECURITY DEFINER RPCs (bypass RLS).
CREATE POLICY "guest_knowledge_review_events_select_member"
  ON public.guest_knowledge_review_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_platform_access()
    AND EXISTS (
      SELECT 1 FROM public.hotel_members hm
      WHERE hm.hotel_id = guest_knowledge_review_events.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.guest_knowledge_review_events IS
  'GI-3: append-only audit of guest knowledge review actions. Written only by propose/review RPCs.';

-- ---------------------------------------------------------------------------
-- 3) Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guest_knowledge_caller_role(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR p_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT public.has_active_platform_access() THEN
    RETURN NULL;
  END IF;
  SELECT lower(trim(hm.role)) INTO v_role
  FROM public.hotel_members hm
  WHERE hm.hotel_id = p_workspace_id
    AND hm.user_id = auth.uid()
  LIMIT 1;
  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.guest_knowledge_caller_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_knowledge_caller_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_guest_knowledge_active(p_row public.guest_knowledge)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_row.approval_status = 'confirmed'
    AND (p_row.expires_at IS NULL OR p_row.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.is_guest_knowledge_active(public.guest_knowledge) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guest_knowledge_active(public.guest_knowledge) TO authenticated;

CREATE OR REPLACE FUNCTION public.guest_knowledge_is_owner_only_type(p_knowledge_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(p_knowledge_type, ''))) IN (
    'operational_restriction',
    'do_not_accommodate',
    'security_instruction'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4) Protect immutable / lifecycle fields (RPC GUC gate)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_guest_knowledge_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow text := coalesce(current_setting('guest_knowledge.allow_lifecycle', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_allow IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'guest_knowledge inserts require propose_guest_knowledge RPC';
    END IF;
    IF NEW.sensitivity = 'prohibited' OR NEW.approval_requirement = 'never_store' THEN
      RAISE EXCEPTION 'prohibited guest knowledge cannot be stored';
    END IF;
    IF NEW.approval_status IS DISTINCT FROM 'proposed' THEN
      RAISE EXCEPTION 'guest_knowledge inserts must begin as proposed';
    END IF;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejected_by := NULL;
    NEW.rejected_at := NULL;
    NEW.superseded_by := NULL;
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
      NEW.updated_by := auth.uid();
    END IF;
    NEW.created_at := coalesce(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_allow IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'guest_knowledge updates require review_guest_knowledge RPC';
    END IF;

    -- Immutable after create
    IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
      RAISE EXCEPTION 'workspace_id is immutable';
    END IF;
    IF NEW.knowledge_type IS DISTINCT FROM OLD.knowledge_type THEN
      RAISE EXCEPTION 'knowledge_type is immutable';
    END IF;
    IF NEW.source_candidate_ids IS DISTINCT FROM OLD.source_candidate_ids
      OR NEW.source_observation_ids IS DISTINCT FROM OLD.source_observation_ids
      OR NEW.source_fact_ids IS DISTINCT FROM OLD.source_fact_ids
      OR NEW.source_report_ids IS DISTINCT FROM OLD.source_report_ids THEN
      RAISE EXCEPTION 'source references are immutable';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'created_by/created_at are immutable';
    END IF;
    IF NEW.sensitivity IS DISTINCT FROM OLD.sensitivity THEN
      RAISE EXCEPTION 'sensitivity is immutable';
    END IF;
    IF NEW.identity_evidence IS DISTINCT FROM OLD.identity_evidence THEN
      RAISE EXCEPTION 'identity_evidence is immutable';
    END IF;
    IF NEW.guest_match_strength IS DISTINCT FROM OLD.guest_match_strength THEN
      RAISE EXCEPTION 'guest_match_strength is immutable';
    END IF;
    IF NEW.approval_requirement IS DISTINCT FROM OLD.approval_requirement THEN
      RAISE EXCEPTION 'approval_requirement is immutable';
    END IF;
    IF NEW.value IS DISTINCT FROM OLD.value THEN
      RAISE EXCEPTION 'value is immutable after create (supersede instead)';
    END IF;
    IF NEW.confidence IS DISTINCT FROM OLD.confidence THEN
      RAISE EXCEPTION 'confidence is immutable after create';
    END IF;

    IF NEW.sensitivity = 'prohibited' THEN
      RAISE EXCEPTION 'prohibited guest knowledge cannot be stored';
    END IF;

    IF auth.uid() IS NOT NULL THEN
      NEW.updated_by := auth.uid();
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guest_knowledge_guard ON public.guest_knowledge;
CREATE TRIGGER guest_knowledge_guard
  BEFORE INSERT OR UPDATE ON public.guest_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.set_guest_knowledge_guard();

-- ---------------------------------------------------------------------------
-- 5) propose_guest_knowledge — insert proposed + audit (atomic)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.propose_guest_knowledge(
  p_workspace_id uuid,
  p_knowledge_type text,
  p_value jsonb,
  p_identity_evidence jsonb,
  p_guest_match_strength text,
  p_source_candidate_ids jsonb,
  p_source_observation_ids jsonb,
  p_source_fact_ids jsonb,
  p_source_report_ids jsonb DEFAULT '[]'::jsonb,
  p_confidence numeric DEFAULT 0.5,
  p_sensitivity text DEFAULT 'normal',
  p_approval_requirement text DEFAULT 'none',
  p_retention_reason text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.guest_knowledge
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_row public.guest_knowledge;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_active_platform_access() THEN
    RAISE EXCEPTION 'Platform access suspended or inactive';
  END IF;

  v_role := public.guest_knowledge_caller_role(p_workspace_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF coalesce(p_sensitivity, 'normal') = 'prohibited'
     OR coalesce(p_approval_requirement, 'none') = 'never_store' THEN
    RAISE EXCEPTION 'Prohibited content cannot be proposed';
  END IF;

  IF public.guest_knowledge_is_owner_only_type(p_knowledge_type)
     AND v_role <> 'owner' THEN
    RAISE EXCEPTION 'Owner role required for this knowledge type';
  END IF;

  IF p_confidence IS NULL OR p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'confidence must be between 0 and 1';
  END IF;

  IF jsonb_typeof(coalesce(p_source_fact_ids, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_source_fact_ids, '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'source_fact_ids required';
  END IF;
  IF jsonb_typeof(coalesce(p_source_observation_ids, '[]'::jsonb)) <> 'array'
     OR jsonb_array_length(coalesce(p_source_observation_ids, '[]'::jsonb)) < 1 THEN
    RAISE EXCEPTION 'source_observation_ids required';
  END IF;

  -- Weak identity may be stored as proposed, but match strength must be preserved.
  IF coalesce(p_guest_match_strength, '') NOT IN ('strong', 'probable', 'uncertain', 'none') THEN
    RAISE EXCEPTION 'Invalid guest_match_strength';
  END IF;

  PERFORM set_config('guest_knowledge.allow_lifecycle', 'on', true);

  INSERT INTO public.guest_knowledge (
    workspace_id,
    identity_evidence,
    guest_match_strength,
    knowledge_type,
    value,
    source_candidate_ids,
    source_observation_ids,
    source_fact_ids,
    source_report_ids,
    confidence,
    sensitivity,
    approval_requirement,
    approval_status,
    retention_reason,
    review_reason
  ) VALUES (
    p_workspace_id,
    coalesce(p_identity_evidence, '{}'::jsonb),
    p_guest_match_strength,
    trim(p_knowledge_type),
    coalesce(p_value, '{}'::jsonb),
    coalesce(p_source_candidate_ids, '[]'::jsonb),
    p_source_observation_ids,
    p_source_fact_ids,
    coalesce(p_source_report_ids, '[]'::jsonb),
    p_confidence,
    coalesce(p_sensitivity, 'normal'),
    coalesce(p_approval_requirement, 'none'),
    'proposed',
    p_retention_reason,
    p_reason
  )
  RETURNING * INTO v_row;

  INSERT INTO public.guest_knowledge_review_events (
    workspace_id,
    knowledge_id,
    actor_user_id,
    action,
    previous_status,
    new_status,
    reason,
    source_candidate_ids,
    source_observation_ids,
    source_fact_ids
  ) VALUES (
    v_row.workspace_id,
    v_row.id,
    v_user_id,
    'propose',
    NULL,
    'proposed',
    p_reason,
    v_row.source_candidate_ids,
    v_row.source_observation_ids,
    v_row.source_fact_ids
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.propose_guest_knowledge(
  uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb, jsonb, numeric, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.propose_guest_knowledge(
  uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb, jsonb, numeric, text, text, text, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) review_guest_knowledge — confirm/reject/supersede/expire + audit (atomic)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_guest_knowledge(
  p_knowledge_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_superseded_by uuid DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS public.guest_knowledge
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_row public.guest_knowledge;
  v_prev text;
  v_new text;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_target public.guest_knowledge;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_active_platform_access() THEN
    RAISE EXCEPTION 'Platform access suspended or inactive';
  END IF;

  SELECT * INTO v_row
  FROM public.guest_knowledge
  WHERE id = p_knowledge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest knowledge not found';
  END IF;

  v_role := public.guest_knowledge_caller_role(v_row.workspace_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF v_row.sensitivity = 'prohibited'
     OR v_row.approval_requirement = 'never_store' THEN
    RAISE EXCEPTION 'Prohibited knowledge cannot be reviewed into active use';
  END IF;

  IF public.guest_knowledge_is_owner_only_type(v_row.knowledge_type)
     AND v_role <> 'owner'
     AND v_action IN ('confirm', 'supersede') THEN
    RAISE EXCEPTION 'Owner role required for this knowledge type';
  END IF;

  -- Sensitive: any active member may confirm/reject, but only via this explicit RPC.
  v_prev := v_row.approval_status;

  IF v_action = 'confirm' THEN
    IF v_prev NOT IN ('proposed', 'rejected', 'expired') THEN
      RAISE EXCEPTION 'Only proposed/rejected/expired knowledge can be confirmed';
    END IF;
    IF v_row.sensitivity = 'sensitive'
       AND (p_reason IS NULL OR length(trim(p_reason)) = 0) THEN
      RAISE EXCEPTION 'Sensitive confirmation requires an explicit review reason';
    END IF;
    v_new := 'confirmed';
    v_row.approval_status := 'confirmed';
    v_row.approved_by := v_user_id;
    v_row.approved_at := now();
    v_row.rejected_by := NULL;
    v_row.rejected_at := NULL;
    v_row.superseded_by := NULL;
    v_row.review_at := now();
    v_row.review_reason := p_reason;
    IF v_row.sensitivity = 'sensitive'
       AND (v_row.retention_reason IS NULL OR length(trim(v_row.retention_reason)) = 0) THEN
      v_row.retention_reason := 'sensitive_staff_confirmed';
    END IF;

  ELSIF v_action = 'reject' THEN
    IF v_prev NOT IN ('proposed', 'confirmed') THEN
      RAISE EXCEPTION 'Only proposed/confirmed knowledge can be rejected';
    END IF;
    v_new := 'rejected';
    v_row.approval_status := 'rejected';
    v_row.rejected_by := v_user_id;
    v_row.rejected_at := now();
    v_row.review_at := now();
    v_row.review_reason := p_reason;

  ELSIF v_action = 'supersede' THEN
    IF v_prev <> 'confirmed' THEN
      RAISE EXCEPTION 'Only confirmed knowledge can be superseded';
    END IF;
    IF p_superseded_by IS NULL THEN
      RAISE EXCEPTION 'superseded_by is required';
    END IF;
    IF p_superseded_by = v_row.id THEN
      RAISE EXCEPTION 'Knowledge cannot supersede itself';
    END IF;

    SELECT * INTO v_target
    FROM public.guest_knowledge
    WHERE id = p_superseded_by
    FOR UPDATE;

    IF NOT FOUND OR v_target.workspace_id <> v_row.workspace_id THEN
      RAISE EXCEPTION 'superseded_by must reference knowledge in the same workspace';
    END IF;
    IF v_target.superseded_by = v_row.id THEN
      RAISE EXCEPTION 'Circular supersession is not allowed';
    END IF;

    v_new := 'superseded';
    v_row.approval_status := 'superseded';
    v_row.superseded_by := p_superseded_by;
    v_row.review_at := now();
    v_row.review_reason := p_reason;

  ELSIF v_action = 'expire' THEN
    IF v_prev <> 'confirmed' THEN
      RAISE EXCEPTION 'Only confirmed knowledge can be expired';
    END IF;
    v_new := 'expired';
    v_row.approval_status := 'expired';
    v_row.expires_at := coalesce(p_expires_at, now());
    IF v_row.expires_at < v_row.created_at THEN
      RAISE EXCEPTION 'expires_at cannot be before created_at';
    END IF;
    v_row.review_at := now();
    v_row.review_reason := p_reason;

  ELSE
    RAISE EXCEPTION 'Invalid review action';
  END IF;

  PERFORM set_config('guest_knowledge.allow_lifecycle', 'on', true);

  UPDATE public.guest_knowledge gk
  SET
    approval_status = v_row.approval_status,
    approved_by = v_row.approved_by,
    approved_at = v_row.approved_at,
    rejected_by = v_row.rejected_by,
    rejected_at = v_row.rejected_at,
    superseded_by = v_row.superseded_by,
    review_at = v_row.review_at,
    expires_at = v_row.expires_at,
    retention_reason = v_row.retention_reason,
    review_reason = v_row.review_reason,
    updated_by = v_user_id,
    updated_at = now()
  WHERE gk.id = v_row.id
  RETURNING * INTO v_row;

  INSERT INTO public.guest_knowledge_review_events (
    workspace_id,
    knowledge_id,
    actor_user_id,
    action,
    previous_status,
    new_status,
    reason,
    source_candidate_ids,
    source_observation_ids,
    source_fact_ids
  ) VALUES (
    v_row.workspace_id,
    v_row.id,
    v_user_id,
    v_action,
    v_prev,
    v_new,
    p_reason,
    v_row.source_candidate_ids,
    v_row.source_observation_ids,
    v_row.source_fact_ids
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.review_guest_knowledge(
  uuid, text, text, uuid, timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_guest_knowledge(
  uuid, text, text, uuid, timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.propose_guest_knowledge IS
  'GI-3: create proposed guest_knowledge + audit event atomically. No confirmed inserts.';
COMMENT ON FUNCTION public.review_guest_knowledge IS
  'GI-3: confirm/reject/supersede/expire guest_knowledge + audit event atomically. Validates membership, active access, sensitivity, and owner-only types.';
