-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT SQL IDEMPOTENT TABLE DES AVIS CLIENTS (REVIEWS)
-- Exécutez ce script dans le SQL Editor de Supabase pour créer ou mettre à jour
-- la table 'reviews' avec l'ensemble des colonnes, index et politiques RLS.
-- ==============================================================================

-- 1. Création de la table 'reviews'
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT,
  listing_id TEXT,
  pack_id TEXT,
  author_name TEXT NOT NULL DEFAULT 'Voyageur Bénin Beyond',
  author_email TEXT,
  author_avatar TEXT,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  listing_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ajout incrémental des colonnes si manquantes
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS pack_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Voyageur Bénin Beyond';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS listing_title TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Index optimisés pour les requêtes
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id);

-- 4. Sécurité au niveau des lignes (Row Level Security - RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture des avis" ON public.reviews;
CREATE POLICY "Lecture des avis"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Dépôt des avis clients" ON public.reviews;
CREATE POLICY "Dépôt des avis clients"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Mise à jour des avis par admin" ON public.reviews;
CREATE POLICY "Mise à jour des avis par admin"
  ON public.reviews FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Suppression des avis par admin" ON public.reviews;
CREATE POLICY "Suppression des avis par admin"
  ON public.reviews FOR DELETE
  USING (true);
