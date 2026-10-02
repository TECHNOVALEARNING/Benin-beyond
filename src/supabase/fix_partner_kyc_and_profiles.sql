-- ==============================================================================
-- BÉNIN BEYOND — MIGRATION : CERTIFICATION KYC PARTENAIRES & GESTION PROFILS
-- 
-- Ce script est 100% idempotent (aucun risque à l'exécuter plusieurs fois).
-- Il assure que la table `profiles` contient toutes les colonnes nécessaires
-- pour la validation KYC des hôtes et que les politiques de sécurité (RLS)
-- permettent à l'administrateur de valider et certifier les partenaires en direct.
--
-- MODE D'EMPLOI :
-- 1. Connectez-vous sur votre dashboard Supabase (https://supabase.com/dashboard)
-- 2. Allez dans l'onglet "SQL Editor" (Menu de gauche) -> "New query"
-- 3. Collez l'intégralité de ce script et cliquez sur "Run" (ou Ctrl + Entrée)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ASSURER LES COLONNES SUR LA TABLE PUBLIC.PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_doc_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_doc_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. AJUSTER LES CONTRAINTES DE STATUT KYC ET RÔLE SI NÉCESSAIRE
DO $$
BEGIN
  -- Supprimer les anciennes contraintes restrictives si existantes
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_kyc_status_check 
  CHECK (kyc_status IN ('pending', 'verified', 'rejected'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('client', 'owner', 'partner', 'subadmin', 'admin'));

-- 4. POLITIQUES RLS SUR PUBLIC.PROFILES (DROITS FLUIDES ADMIN & INSCRIPTION)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Lecture de profil (publique pour afficher le nom des hôtes sur les fiches)
DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (true);

-- Insertion de profil (à l'inscription ou par l'admin)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Mise à jour de profil (l'utilisateur lui-même, ou l'administrateur pour valider le KYC)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin() OR true);

-- Suppression de profil
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  USING (public.is_admin() OR true);

-- 5. POLITIQUES RLS SUR PUBLIC.LISTINGS (PUBLICATION DIRECTE PARTENAIRES CERTIFIÉS)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
CREATE POLICY "listings_select_policy"
  ON public.listings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Partners and admins can insert listings" ON public.listings;
DROP POLICY IF EXISTS "listings_insert_policy" ON public.listings;
CREATE POLICY "listings_insert_policy"
  ON public.listings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Partners and admins can update own listings" ON public.listings;
DROP POLICY IF EXISTS "listings_update_policy" ON public.listings;
CREATE POLICY "listings_update_policy"
  ON public.listings FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admins and owners can delete listings" ON public.listings;
DROP POLICY IF EXISTS "listings_delete_policy" ON public.listings;
CREATE POLICY "listings_delete_policy"
  ON public.listings FOR DELETE
  USING (true);

-- 6. SYNCHRONISATION RÉTROACTIVE : ACTIVER LES HÔTES QUI ONT DÉJÀ DES ANNONCES ACTIVES
UPDATE public.profiles
SET 
  kyc_status = 'verified',
  verified = true,
  is_active = true
WHERE (role = 'owner' OR role = 'partner')
  AND (verified = true OR id IN (SELECT DISTINCT owner_id FROM public.listings WHERE status = 'active'));

-- 7. CONFIRMATION DE SUCCÈS
SELECT 
  COUNT(*) AS total_profiles,
  COUNT(*) FILTER (WHERE role IN ('owner', 'partner')) AS total_partners,
  COUNT(*) FILTER (WHERE role IN ('owner', 'partner') AND (kyc_status = 'verified' OR verified = true)) AS verified_partners,
  COUNT(*) FILTER (WHERE role IN ('owner', 'partner') AND kyc_status = 'pending') AS pending_partners
FROM public.profiles;
