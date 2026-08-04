-- Hospitality Flow — read-only schema inspection for pilot permanent-delete safety
-- Run in Supabase SQL Editor before relying on delete-pilot-applicant in a given project.
-- Does not modify data.

-- 1) hotel_members.user_id FK delete rule (unknown in-repo; confirm live)
SELECT
  tc.constraint_name,
  rc.delete_rule AS on_delete,
  c.is_nullable
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.table_schema = c.table_schema
 AND kcu.table_name = c.table_name
 AND kcu.column_name = c.column_name
LEFT JOIN information_schema.table_constraints tc
  ON tc.constraint_schema = kcu.constraint_schema
 AND tc.constraint_name = kcu.constraint_name
 AND tc.constraint_type = 'FOREIGN KEY'
LEFT JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema = tc.constraint_schema
 AND rc.constraint_name = tc.constraint_name
WHERE c.table_schema = 'public'
  AND c.table_name = 'hotel_members'
  AND c.column_name = 'user_id';

-- 2) Optional operational tables present?
SELECT to_regclass('public.hotel_brain_profiles') AS hotel_brain_profiles,
       to_regclass('public.handover_reports') AS handover_reports,
       to_regclass('public.maintenance_issues') AS maintenance_issues,
       to_regclass('public.maintenance_updates') AS maintenance_updates,
       to_regclass('public.guest_knowledge') AS guest_knowledge,
       to_regclass('public.guest_knowledge_review_events') AS guest_knowledge_review_events,
       to_regclass('public.operator_audit_log') AS operator_audit_log;

-- 3) invite_resent_at present?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'platform_access'
  AND column_name IN ('invited_at', 'invite_resent_at', 'early_access_application_id', 'access_status');
