-- Hospitality Flow — Phase 7: AI Shift Handover cloud sync
-- Saved handovers and workspace drafts in Supabase.
-- Safe to re-run: uses IF NOT EXISTS and drops known policies before recreate.

CREATE TABLE IF NOT EXISTS public.handover_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  hotel_name text,
  department text,
  shift text,
  handover_date date,
  prepared_by text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_notes text,
  generated_handover jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'saved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handover_reports_status_check CHECK (status IN ('saved', 'draft'))
);

CREATE INDEX IF NOT EXISTS handover_reports_workspace_id_idx
  ON public.handover_reports (workspace_id);

CREATE INDEX IF NOT EXISTS handover_reports_handover_date_idx
  ON public.handover_reports (handover_date DESC);

CREATE INDEX IF NOT EXISTS handover_reports_created_at_idx
  ON public.handover_reports (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS handover_reports_workspace_draft_idx
  ON public.handover_reports (workspace_id)
  WHERE status = 'draft';

ALTER TABLE public.handover_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handover_reports_select_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_insert_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_update_member" ON public.handover_reports;
DROP POLICY IF EXISTS "handover_reports_delete_member" ON public.handover_reports;

CREATE POLICY "handover_reports_select_member"
  ON public.handover_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
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
    EXISTS (
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
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
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
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = handover_reports.workspace_id
        AND hm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_handover_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handover_reports_updated_at ON public.handover_reports;
CREATE TRIGGER handover_reports_updated_at
  BEFORE INSERT OR UPDATE ON public.handover_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_handover_reports_updated_at();
