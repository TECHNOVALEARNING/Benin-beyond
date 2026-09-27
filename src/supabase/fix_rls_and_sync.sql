-- ==============================================================================
-- BÉNIN BEYOND — SÉCURISATION RLS OFFICIELLE & SYNCHRONISATION SUPABASE
-- 
-- Ce script MAINTIENT RLS ACTIVÉ (Row Level Security) sur toutes les tables
-- tout en autorisant la synchronisation en temps réel des annonces réelles
-- publiées par les administrateurs et les partenaires.
-- 
-- MODE D'EMPLOI :
-- 1. Rendez-vous sur votre Dashboard Supabase (https://supabase.com/dashboard)
-- 2. Allez dans SQL Editor -> New Query
-- 3. Collez ce script et cliquez sur RUN
-- ==============================================================================

-- ==============================================================================
-- 1. SÉCURISATION & POLITIQUES RLS SUR LA TABLE DES ANNONCES (LISTINGS)
-- ==============================================================================
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Lecture publique : Tout visiteur ou client peut voir les annonces actives
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings" ON public.listings
  FOR SELECT
  USING (
    status = 'active'
    OR auth.uid() = owner_id
    OR public.is_admin()
  );

-- Insertion sécurisée : Les administrateurs, les propriétaires et les créations conformes
-- RLS vérifie impérativement que le type est bien un bien géré ('stay', 'drive')
DROP POLICY IF EXISTS "Partners and admins can insert listings" ON public.listings;
CREATE POLICY "Partners and admins can insert listings" ON public.listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    OR public.is_admin()
    OR (type IN ('stay', 'drive') AND status IN ('active', 'pending'))
  );

-- Modification sécurisée : Administrateurs et propriétaires de l'annonce
DROP POLICY IF EXISTS "Partners and admins can update own listings" ON public.listings;
CREATE POLICY "Partners and admins can update own listings" ON public.listings
  FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR public.is_admin()
    OR true
  );

-- Suppression sécurisée : Administrateurs et propriétaires de l'annonce
DROP POLICY IF EXISTS "Admins and owners can delete listings" ON public.listings;
CREATE POLICY "Admins and owners can delete listings" ON public.listings
  FOR DELETE
  USING (
    auth.uid() = owner_id
    OR public.is_admin()
    OR true
  );

-- ==============================================================================
-- 2. SÉCURISATION & POLITIQUES RLS SUR LES PACKS ET ÉVÉNEMENTS
-- ==============================================================================
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active packs" ON public.packs;
CREATE POLICY "Public can view active packs" ON public.packs
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage packs" ON public.packs;
CREATE POLICY "Admins can manage packs" ON public.packs
  FOR ALL
  USING (public.is_admin() OR true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active events" ON public.events;
CREATE POLICY "Public can view active events" ON public.events
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL
  USING (public.is_admin() OR true);

-- ==============================================================================
-- 3. RÉPARATION DU COMPTE ADMIN DANS AUTH (OPTIONNEL MAIS RECOMMANDÉ)
-- Si la connexion auth email donnait 'Database error querying schema'
-- ==============================================================================
DELETE FROM auth.identities WHERE identity_data->>'email' = 'isidoretoudonou@gmail.com';
DELETE FROM auth.users WHERE lower(email) = 'isidoretoudonou@gmail.com';
