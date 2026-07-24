-- Hospitality Flow — Phase 13 verification (read-only)
-- Run in Supabase → SQL Editor after applying phase13_handover_reports_user_id_set_null.sql.
-- Does not modify data or policies.

-- 1) handover_reports.user_id nullability + FK delete action
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.is_nullable,
  tc.constraint_name,
  rc.delete_rule AS on_delete,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
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
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_schema = tc.constraint_schema
 AND ccu.constraint_name = tc.constraint_name
WHERE c.table_schema = 'public'
  AND c.table_name = 'handover_reports'
  AND c.column_name = 'user_id';

-- Expect: is_nullable = 'YES', on_delete = 'SET NULL', references auth.users(id)

-- 2) Live audit: hotel_members.user_id FK delete behaviour (report only; no changes)
SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.is_nullable,
  tc.constraint_name,
  rc.delete_rule AS on_delete,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
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
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_schema = tc.constraint_schema
 AND ccu.constraint_name = tc.constraint_name
WHERE c.table_schema = 'public'
  AND c.table_name = 'hotel_members'
  AND c.column_name = 'user_id';

-- delete_rule meanings:
--   NO ACTION / RESTRICT — Auth user delete blocked while membership rows exist
--   CASCADE              — membership rows deleted with the Auth user
--   SET NULL             — membership kept; user_id cleared (requires nullable column)
-- If constraint_name is NULL, there is no FK on hotel_members.user_id in this database.

-- 3) Handover history still present (count only)
SELECT
  COUNT(*)::integer AS handover_report_count,
  COUNT(*) FILTER (WHERE user_id IS NULL)::integer AS null_user_id_count,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL)::integer AS attributed_user_id_count
FROM public.handover_reports;

-- 4) Confirm membership RLS policies were not altered by phase 13 (names only)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hotel_members', 'handover_reports', 'hotels')
ORDER BY tablename, policyname;
