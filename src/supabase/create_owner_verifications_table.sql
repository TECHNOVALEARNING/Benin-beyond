-- ==============================================================================
-- BÉNIN BEYOND — MIGRATION : TABLE D'ONBOARDING PROPRIÉTAIRE & STORAGE PDF
-- ==============================================================================
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)
-- 100% idempotent : crée les tables nécessaires, configure les accès RLS
-- et autorise les documents PDF/Images dans le bucket Supabase Storage 'listings'.
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

-- Lecture et écriture souples pour les candidatures d'onboarding
DROP POLICY IF EXISTS "owners_read_own_verif_policy" ON public.owner_verification_applications;
CREATE POLICY "owners_read_own_verif_policy"
  ON public.owner_verification_applications FOR SELECT
  TO authenticated, anon, public
  USING (true);

DROP POLICY IF EXISTS "owners_upsert_verif_policy" ON public.owner_verification_applications;
CREATE POLICY "owners_upsert_verif_policy"
  ON public.owner_verification_applications FOR ALL
  TO authenticated, anon, public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.verification_audit_logs;
CREATE POLICY "audit_logs_select_policy"
  ON public.verification_audit_logs FOR SELECT
  TO authenticated, anon, public
  USING (true);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.verification_audit_logs;
CREATE POLICY "audit_logs_insert_policy"
  ON public.verification_audit_logs FOR INSERT
  TO authenticated, anon, public
  WITH CHECK (true);

-- 4. CONFIGURATION DU BUCKET STORAGE 'listings' POUR LES DOCUMENTS PDF & IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/x-pdf', 'application/acrobat'
  ]
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf', 'application/x-pdf', 'application/acrobat'
  ];

-- Politiques de téléversement et accès aux objets storage
DROP POLICY IF EXISTS "Allow uploads to listings" ON storage.objects;
CREATE POLICY "Allow uploads to listings"
ON storage.objects FOR INSERT
TO authenticated, anon, public
WITH CHECK (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow select on listings" ON storage.objects;
CREATE POLICY "Allow select on listings"
ON storage.objects FOR SELECT
TO authenticated, anon, public
USING (bucket_id = 'listings');

DROP POLICY IF EXISTS "Allow update on listings" ON storage.objects;
CREATE POLICY "Allow update on listings"
ON storage.objects FOR UPDATE
TO authenticated, anon, public
USING (bucket_id = 'listings');

-- Message de confirmation dans les résultats de l'éditeur SQL
SELECT 'Migration terminée avec succès : Table owner_verification_applications créée et Bucket listings mis à jour avec support PDF !' AS status;
