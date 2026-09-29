-- ==============================================================================
-- CRÉATION ET CONFIGURATION DU BUCKET SUPABASE STORAGE POUR BÉNIN BEYOND
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase (SQL Editor)
-- ==============================================================================

-- 1. Création du Bucket Public 'listings' pour les vidéos et images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  52428800, -- Limite de 50 Mo par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Politiques RLS pour autoriser la lecture publique de tous les médias
DROP POLICY IF EXISTS "Public Access Listings Media" ON storage.objects;
CREATE POLICY "Public Access Listings Media"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

-- 3. Politiques RLS pour autoriser le téléversement direct
DROP POLICY IF EXISTS "Public Upload Listings Media" ON storage.objects;
CREATE POLICY "Public Upload Listings Media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listings');

-- 4. Politiques RLS pour autoriser la mise à jour
DROP POLICY IF EXISTS "Public Update Listings Media" ON storage.objects;
CREATE POLICY "Public Update Listings Media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'listings');

-- 5. Politiques RLS pour autoriser la suppression
DROP POLICY IF EXISTS "Public Delete Listings Media" ON storage.objects;
CREATE POLICY "Public Delete Listings Media"
ON storage.objects FOR DELETE
USING (bucket_id = 'listings');
