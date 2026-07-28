-- Hospitality Flow — Phase 15: Maintenance v1 database and security (M1 / M1.1)
-- Tables: maintenance_issues, maintenance_updates
-- Workspace boundary: hotels.id via workspace_id + hotel_members RLS
-- Safe to re-run: uses IF NOT EXISTS and drops known policies/triggers before recreate.
--
-- Delete behaviour:
--   Authenticated clients have NO DELETE policy on maintenance_issues (operational records).
--   Soft-delete / archive status is deferred; service-role / DB admin paths unchanged.
--   hotels delete → CASCADE issues (and updates) — same as handover_reports / hotel_brain_profiles
--   issue delete (admin/cascade only) → CASCADE timeline updates
--   auth user delete → SET NULL on created_by / updated_by / assigned_user_id (keep history)
--
-- Cross-workspace protection for updates:
--   1) UNIQUE (id, workspace_id) on issues + composite FK (issue_id, workspace_id)
--   2) BEFORE INSERT/UPDATE trigger forces workspace_id from the parent issue
--   Client-supplied workspace_id cannot attach an update to another hotel's issue.
--
-- Audit fields: triggers assign created_by / updated_by from auth.uid() only.
-- When auth.uid() is null (service role / migration / no JWT), leave NULL — never invent a user id.

-- ---------------------------------------------------------------------------
-- 1) maintenance_issues
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  room_number text,
  area text,
  location_type text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  reported_by_name text,
  assigned_department text,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  resolution_notes text,
  -- M4: handover inclusion is opt-in via this flag (and future product logic).
  -- Unresolved issues are NOT imported into handovers solely because they exist.
  include_in_handover boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_issues_location_type_check CHECK (
    location_type IN ('guest_room', 'public_area', 'back_of_house')
  ),
  CONSTRAINT maintenance_issues_category_check CHECK (
    category IN (
      'plumbing',
      'electrical',
      'hvac',
      'bathroom',
      'furniture',
      'fixtures',
      'appliances',
      'it_technology',
      'safety',
      'public_area',
      'kitchen',
      'other'
    )
  ),
  CONSTRAINT maintenance_issues_priority_check CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT maintenance_issues_status_check CHECK (
    status IN (
      'open',
      'in_progress',
      'waiting_parts',
      'waiting_contractor',
      'completed'
    )
  ),
  CONSTRAINT maintenance_issues_completed_consistency CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  ),
  -- Supports composite FK from maintenance_updates (issue_id, workspace_id)
  CONSTRAINT maintenance_issues_id_workspace_key UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_id_idx
  ON public.maintenance_issues (workspace_id);

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_status_idx
  ON public.maintenance_issues (workspace_id, status);

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_priority_idx
  ON public.maintenance_issues (workspace_id, priority);

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_created_at_idx
  ON public.maintenance_issues (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_room_number_idx
  ON public.maintenance_issues (workspace_id, room_number)
  WHERE room_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS maintenance_issues_workspace_open_idx
  ON public.maintenance_issues (workspace_id, priority, updated_at DESC)
  WHERE status <> 'completed';

ALTER TABLE public.maintenance_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_issues_select_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_insert_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_update_member" ON public.maintenance_issues;
DROP POLICY IF EXISTS "maintenance_issues_delete_member" ON public.maintenance_issues;

CREATE POLICY "maintenance_issues_select_member"
  ON public.maintenance_issues
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
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
    EXISTS (
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
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_issues.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

-- No authenticated DELETE policy: operational records must not be permanently
-- removed by hotel members via the client. DROP above clears any prior M1 policy.
-- Service-role / database administration behaviour is unchanged.

-- Audit timestamps + auth.uid() ownership; completed_at integrity; lock workspace_id
CREATE OR REPLACE FUNCTION public.set_maintenance_issues_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    -- auth.uid() may be null under service role; leave NULL (do not invent a user id)
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    NEW.workspace_id := OLD.workspace_id;
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  END IF;

  -- Completion integrity (runs before CHECK):
  -- completed => completed_at always set; any non-completed status clears it.
  -- Clients cannot keep a stale completed_at after reopen, nor invent a stamp
  -- when first entering completed (INSERT or transition from non-completed).
  IF NEW.status = 'completed' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := now();
    ELSE
      NEW.completed_at := OLD.completed_at;
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_issues_audit ON public.maintenance_issues;
CREATE TRIGGER maintenance_issues_audit
  BEFORE INSERT OR UPDATE ON public.maintenance_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_maintenance_issues_audit();

-- ---------------------------------------------------------------------------
-- 2) maintenance_updates (immutable timeline; SELECT + INSERT only via RLS)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.maintenance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  update_type text NOT NULL,
  note text,
  previous_status text,
  new_status text,
  previous_priority text,
  new_priority text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_updates_update_type_check CHECK (
    update_type IN (
      'created',
      'note',
      'status_changed',
      'priority_changed',
      'assignment_changed',
      'resolution',
      'reopened',
      'hidden_from_handover',
      'included_in_handover'
    )
  ),
  CONSTRAINT maintenance_updates_previous_status_check CHECK (
    previous_status IS NULL
    OR previous_status IN (
      'open',
      'in_progress',
      'waiting_parts',
      'waiting_contractor',
      'completed'
    )
  ),
  CONSTRAINT maintenance_updates_new_status_check CHECK (
    new_status IS NULL
    OR new_status IN (
      'open',
      'in_progress',
      'waiting_parts',
      'waiting_contractor',
      'completed'
    )
  ),
  CONSTRAINT maintenance_updates_previous_priority_check CHECK (
    previous_priority IS NULL
    OR previous_priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT maintenance_updates_new_priority_check CHECK (
    new_priority IS NULL
    OR new_priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT maintenance_updates_issue_workspace_fkey
    FOREIGN KEY (issue_id, workspace_id)
    REFERENCES public.maintenance_issues (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS maintenance_updates_issue_id_idx
  ON public.maintenance_updates (issue_id, created_at ASC);

CREATE INDEX IF NOT EXISTS maintenance_updates_workspace_id_idx
  ON public.maintenance_updates (workspace_id);

CREATE INDEX IF NOT EXISTS maintenance_updates_workspace_created_at_idx
  ON public.maintenance_updates (workspace_id, created_at DESC);

ALTER TABLE public.maintenance_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_updates_select_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_insert_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_update_member" ON public.maintenance_updates;
DROP POLICY IF EXISTS "maintenance_updates_delete_member" ON public.maintenance_updates;

CREATE POLICY "maintenance_updates_select_member"
  ON public.maintenance_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = maintenance_updates.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

-- INSERT only when the caller is a member of the row's workspace AND the parent
-- issue exists in that same workspace (defence in depth beyond composite FK).
CREATE POLICY "maintenance_updates_insert_member"
  ON public.maintenance_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
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

-- No UPDATE/DELETE policies: timeline rows are append-only for authenticated clients.
-- CASCADE from parent issue / hotel delete remains for admin and referential cleanup.

-- Force workspace_id from parent issue; lock issue_id/workspace_id after insert
CREATE OR REPLACE FUNCTION public.set_maintenance_updates_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_workspace_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.issue_id := OLD.issue_id;
    NEW.workspace_id := OLD.workspace_id;
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
  END IF;

  SELECT mi.workspace_id
    INTO parent_workspace_id
  FROM public.maintenance_issues mi
  WHERE mi.id = NEW.issue_id;

  IF parent_workspace_id IS NULL THEN
    RAISE EXCEPTION 'maintenance_updates.issue_id % does not exist', NEW.issue_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Do not trust client-supplied workspace_id
  NEW.workspace_id := parent_workspace_id;
  -- auth.uid() may be null under service role; leave NULL (do not invent a user id)
  NEW.created_by := auth.uid();
  NEW.created_at := COALESCE(NEW.created_at, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_updates_workspace ON public.maintenance_updates;
CREATE TRIGGER maintenance_updates_workspace
  BEFORE INSERT OR UPDATE ON public.maintenance_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_maintenance_updates_workspace();
