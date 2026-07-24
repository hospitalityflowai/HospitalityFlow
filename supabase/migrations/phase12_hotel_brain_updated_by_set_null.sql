-- Hospitality Flow — Phase 12: hotel_brain_profiles.updated_by ON DELETE SET NULL
-- Safe to re-run.
--
-- When an auth user is deleted, keep the Hotel Brain profile row and clear
-- updated_by instead of blocking or cascading the delete.
-- Does not change hotel_id, workspace ownership, RLS, or tenant isolation.

ALTER TABLE public.hotel_brain_profiles
  DROP CONSTRAINT IF EXISTS hotel_brain_profiles_updated_by_fkey;

ALTER TABLE public.hotel_brain_profiles
  ADD CONSTRAINT hotel_brain_profiles_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
