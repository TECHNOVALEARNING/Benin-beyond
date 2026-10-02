-- ==============================================================================
-- CONFIGURATION SÉCURISÉE DU BUCKET SUPABASE STORAGE 'listings' POUR BÉNIN BEYOND
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)
--
-- RÉSOUD L'ALERTE : "Clients can list all files in this bucket"
-- ==============================================================================

-- 1. Création / Mise à jour du Bucket Public 'listings' (50 Mo max par média)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true, -- Permet la lecture publique directe de chaque fichier via son URL https://...
  52428800, -- Limite de 50 Mo par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 52428800;

-- 2. SUPPRESSION DE LA POLITIQUE TROP LARGE (qui causait l'avertissement dans Supabase)
-- Note : Dans un bucket public, les fichiers sont lisibles directement par leur URL
-- sans avoir besoin d'une politique SELECT ouverte qui exposerait la liste de tous les fichiers.
DROP POLICY IF EXISTS "Public Access Listings Media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to list all" ON storage.objects;

-- 3. Politique de lecture ciblée :
-- Les utilisateurs connectés ne peuvent lister que les fichiers de leur propre dossier (ou dossiers publics partagés)
DROP POLICY IF EXISTS "Users can list their own files in listings bucket" ON storage.objects;
CREATE POLICY "Users can list their own files in listings bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listings' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = 'public'
    OR (storage.foldername(name))[1] = 'partner'
  )
);

-- 4. Politique de téléversement (Upload)
-- Permet aux utilisateurs, administrateurs et hôtes d'enregistrer leurs photos et vidéos
DROP POLICY IF EXISTS "Public Upload Listings Media" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to listings" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to listings" ON storage.objects;
CREATE POLICY "Allow uploads to listings"
ON storage.objects FOR INSERT
TO authenticated, anon, public
WITH CHECK (bucket_id = 'listings');

-- 5. Politique de mise à jour (Update)
DROP POLICY IF EXISTS "Public Update Listings Media" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to own listings files" ON storage.objects;
CREATE POLICY "Allow updates to own listings files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listings' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'
  )
);

-- 6. Politique de suppression (Delete)
-- Chaque hôte ne peut supprimer que les fichiers situés dans son propre dossier
DROP POLICY IF EXISTS "Public Delete Listings Media" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletion of own listings files" ON storage.objects;
CREATE POLICY "Allow deletion of own listings files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listings' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.role() = 'service_role'
  )
);
