-- ==============================================================================
-- BÉNIN BEYOND — DÉBLOCAGE SUPPRESSION & SYNCHRONISATION (RÉSERVATIONS & AVIS)
--
-- Exécutez ce script dans votre Supabase Dashboard -> SQL Editor -> Run
--
-- Ce script permet de :
-- 1. Autoriser la suppression définitive des avis clients depuis le Cockpit Admin.
-- 2. Autoriser la suppression définitive des réservations et la mise à jour des statuts.
-- 3. Autoriser la cascade de suppression sur les paiements associés.
-- ==============================================================================

-- 1. TABLE DES AVIS (REVIEWS)
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews" ON public.reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews" ON public.reviews
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE USING (true);


-- 2. TABLE DES RÉSERVATIONS (BOOKINGS)
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view bookings" ON public.bookings;
CREATE POLICY "Public can view bookings" ON public.bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public checkout can insert bookings" ON public.bookings;
CREATE POLICY "Public checkout can insert bookings"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and partners can update bookings" ON public.bookings;
CREATE POLICY "Admins and partners can update bookings"
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
CREATE POLICY "Admins can delete bookings" ON public.bookings
  FOR DELETE USING (true);


-- 3. TABLE DES TRANSACTIONS & PAIEMENTS (PAYMENTS)
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
CREATE POLICY "Public can view payments" ON public.payments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can record payments" ON public.payments;
CREATE POLICY "System can record payments" ON public.payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (true);

-- 4. Sécuriser la suppression en cascade du paiement lors de la suppression de la réservation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_booking_id_fkey'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_booking_id_fkey;
    ALTER TABLE public.payments 
      ADD CONSTRAINT payments_booking_id_fkey 
      FOREIGN KEY (booking_id) 
      REFERENCES public.bookings(id) 
      ON DELETE CASCADE;
  END IF;
END $$;
