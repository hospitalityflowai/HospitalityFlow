-- Hospitality Flow — Phase 11: Restrict hotels INSERT to trusted RPC only
-- Safe to re-run.
--
-- Removes the permissive client INSERT policy from phase3. Hotel rows may only
-- be created by create_hotel_workspace (SECURITY DEFINER), which is unchanged.

DROP POLICY IF EXISTS "hotels_insert_authenticated" ON public.hotels;

REVOKE INSERT ON public.hotels FROM authenticated;
REVOKE INSERT ON public.hotels FROM anon;
