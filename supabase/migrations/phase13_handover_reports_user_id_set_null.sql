-- Hospitality Flow — Phase 13: handover_reports.user_id ON DELETE SET NULL
-- Safe to re-run.
--
-- When an auth user is deleted, keep saved handover history and clear user_id
-- instead of blocking the delete or cascading report removal.
-- Does not change workspace_id, hotel ownership, membership, or RLS policies.

ALTER TABLE public.handover_reports
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.handover_reports
  DROP CONSTRAINT IF EXISTS handover_reports_user_id_fkey;

ALTER TABLE public.handover_reports
  ADD CONSTRAINT handover_reports_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
