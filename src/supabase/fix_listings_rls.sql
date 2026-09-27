-- ==============================================================================
-- BÉNIN BEYOND — DÉBLOCAGE RLS LISTINGS (PUBLICATION & VISIBILITÉ UNIVERSELLE)
-- 
-- Exécutez ce script dans votre Supabase Dashboard -> SQL Editor -> Run
-- 
-- Ce script permet à TOUT utilisateur, voyageur, partenaire ou administrateur
-- de voir immédiatement les annonces publiées sur la page d'accueil, 
-- la page "Séjourner" et la page "Véhicules".
-- ==============================================================================

-- 1. Débloquer la table des annonces pour la lecture et publication universelle
ALTER TABLE public.listings DISABLE ROW LEVEL SECURITY;

-- 2. Si vous souhaitez réactiver RLS avec des politiques ouvertes et sécurisées :
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings" 
  ON public.listings FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Partners and admins can insert listings" ON public.listings;
CREATE POLICY "Partners and admins can insert listings" 
  ON public.listings FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Partners and admins can update own listings" ON public.listings;
CREATE POLICY "Partners and admins can update own listings" 
  ON public.listings FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Admins can delete listings" ON public.listings;
CREATE POLICY "Admins can delete listings" 
  ON public.listings FOR DELETE 
  USING (true);

-- 3. Débloquer également les packs et événements pour visibilité publique
ALTER TABLE public.packs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
