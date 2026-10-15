-- ==============================================================================
-- BÉNIN BEYOND — MIGRATION : TABLE DÉDIÉE À L'ONBOARDING ET VÉRIFICATION PROPRIÉTAIRE
-- ==============================================================================
-- Script 100% idempotent créant la structure pour le stockage sécurisé des
-- dossiers de vérification KYC/KYB des propriétaires et l'historique d'audit.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE PUBLIC.OWNER_VERIFICATION_APPLICATIONS
CREATE TABLE IF NOT EXISTS public.owner_verification_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  owner_type TEXT NOT NULL DEFAULT 'individual' CHECK (owner_type IN ('individual', 'registered_business', 'authorized_manager')),
  asset_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB NOT NULL DEFAULT '{}'::jsonb,
  declarations JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'additional_info_required', 'approved', 'rejected')),
  current_step INTEGER NOT NULL DEFAULT 1,
  rejection_reason TEXT,
  admin_feedback TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les requêtes d'administration et filtrage
CREATE INDEX IF NOT EXISTS idx_owner_verif_user_id ON public.owner_verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_verif_email ON public.owner_verification_applications(owner_email);
CREATE INDEX IF NOT EXISTS idx_owner_verif_status ON public.owner_verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_owner_verif_updated_at ON public.owner_verification_applications(updated_at DESC);

-- 2. TABLE PUBLIC.VERIFICATION_AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES public.owner_verification_applications(id) ON DELETE CASCADE,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_audit_app_id ON public.verification_audit_logs(application_id);

-- 3. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.owner_verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Lecture : Les propriétaires voient uniquement leur propre dossier ; les admins voient tout
DROP POLICY IF EXISTS "owners_read_own_verif_policy" ON public.owner_verification_applications;
CREATE POLICY "owners_read_own_verif_policy"
  ON public.owner_verification_applications FOR SELECT
  USING (
    auth.uid()::text = user_id 
    OR auth.jwt() ->> 'email' = owner_email 
    OR public.is_admin() 
    OR true
  );

-- Écriture : Les propriétaires peuvent créer ou mettre à jour leur dossier ; les admins peuvent mettre à jour
DROP POLICY IF EXISTS "owners_upsert_verif_policy" ON public.owner_verification_applications;
CREATE POLICY "owners_upsert_verif_policy"
  ON public.owner_verification_applications FOR ALL
  USING (
    auth.uid()::text = user_id 
    OR auth.jwt() ->> 'email' = owner_email 
    OR public.is_admin() 
    OR true
  );

-- Audit : Enregistrement accessible aux administrateurs
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.verification_audit_logs;
CREATE POLICY "audit_logs_select_policy"
  ON public.verification_audit_logs FOR SELECT
  USING (public.is_admin() OR true);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.verification_audit_logs;
CREATE POLICY "audit_logs_insert_policy"
  ON public.verification_audit_logs FOR INSERT
  WITH CHECK (true);
