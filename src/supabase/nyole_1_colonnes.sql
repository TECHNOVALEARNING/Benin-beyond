-- ==============================================================================
-- BÉNIN BEYOND — PAIEMENTS NYOLE CÔTÉ SERVEUR — ÉTAPE 1 / 2 : COLONNES
-- ==============================================================================
-- À coller dans Supabase > SQL Editor AVANT de déployer les fonctions
-- « benin-beyond » (fichier supabase/functions/benin-beyond/index.ts).
-- Sans risque pour le site actuel : ajoute seulement des colonnes. Script relançable.
-- ==============================================================================

-- Rattachement de la réservation à la session de paiement Nyole
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS nyole_session_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS nyole_order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_nyole_session_id_key
  ON public.bookings (nyole_session_id)
  WHERE nyole_session_id IS NOT NULL;

-- Colonnes utilisées par le site (déjà présentes si les migrations ont été appliquées)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_type TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rooms_count INTEGER;
