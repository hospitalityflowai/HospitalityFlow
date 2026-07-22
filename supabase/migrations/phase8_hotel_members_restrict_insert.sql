-- Hospitality Flow — Phase 8: Restrict hotel_members INSERT to trusted RPC only
-- Safe to re-run.
--
-- Removes the permissive client INSERT policy from phase3. Membership rows may only
-- be created by create_hotel_workspace (SECURITY DEFINER), which is unchanged.

DROP POLICY IF EXISTS "hotel_members_insert_own" ON public.hotel_members;

REVOKE INSERT ON public.hotel_members FROM authenticated;
REVOKE INSERT ON public.hotel_members FROM anon;
