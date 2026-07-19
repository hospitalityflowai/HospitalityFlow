-- Hospitality Flow — Phase 5: Hotel workspace editing (owners)
-- Allows workspace owners to update their hotel record in public.hotels.
-- Safe to re-run.

DROP POLICY IF EXISTS "hotels_update_owner" ON public.hotels;

CREATE POLICY "hotels_update_owner"
  ON public.hotels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND hm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hotel_members hm
      WHERE hm.hotel_id = hotels.id
        AND hm.user_id = auth.uid()
        AND hm.role = 'owner'
    )
  );
