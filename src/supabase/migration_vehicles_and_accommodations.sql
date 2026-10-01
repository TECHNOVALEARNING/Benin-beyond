-- ==============================================================================
-- MIGRATION : SÉPARATION STRICTE DES VÉHICULES ET DES HÉBERGEMENTS
-- Résout le problème du room_count erroné sur les véhicules et cloisonne les données
-- ==============================================================================

-- 1. Modification de la contrainte rooms_count sur public.listings
-- Permet à rooms_count d'être à 0 pour tous les véhicules et expériences
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_rooms_count_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_rooms_count_check CHECK (rooms_count >= 0);
ALTER TABLE public.listings ALTER COLUMN rooms_count SET DEFAULT 0;

-- 2. Ajout des colonnes spécifiques aux véhicules sur public.listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_seats INTEGER DEFAULT 0 CHECK (vehicle_seats >= 0);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'automatique';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'essence';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS with_driver BOOLEAN DEFAULT FALSE;

-- 3. Mise à jour des biens existants :
-- - Les véhicules ont STRICTEMENT rooms_count = 0 (aucun véhicule n'a de chambre)
-- - Initialisation des places assises si non renseignées
UPDATE public.listings 
SET rooms_count = 0,
    vehicle_seats = CASE 
      WHEN vehicle_seats > 0 THEN vehicle_seats
      WHEN rooms_count > 0 THEN rooms_count -- Si l'ancien formulaire avait mis les places dans rooms_count
      ELSE 5 
    END,
    price_unit = 'jour'
WHERE type = 'drive';

-- - Les hébergements conservent rooms_count >= 1 et price_unit = 'nuit'
UPDATE public.listings 
SET rooms_count = CASE WHEN rooms_count <= 0 THEN 1 ELSE rooms_count END,
    price_unit = CASE WHEN price_unit = 'jour' THEN 'nuit' ELSE price_unit END
WHERE type = 'stay';

-- 4. Ajout de colonnes de typage sur la table des réservations (public.bookings)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT 'stay';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 0;

-- 5. Vues SQL dédiées pour cloisonner totalement Véhicules et Hébergements
-- Vue dédiée exclusivement aux Hébergements (Villas, Hôtels, Appartements)
CREATE OR REPLACE VIEW public.v_accommodations AS
SELECT 
  id,
  owner_id,
  type,
  subcategory,
  title,
  location,
  price,
  price_unit,
  rooms_count,
  available_from,
  available_to,
  status,
  badge,
  featured,
  summary,
  description,
  specs,
  amenities,
  gallery,
  video_url,
  rating,
  reviews_count,
  created_date,
  updated_date
FROM public.listings
WHERE type = 'stay';

-- Vue dédiée exclusivement aux Véhicules de Prestige
CREATE OR REPLACE VIEW public.v_vehicles AS
SELECT 
  id,
  owner_id,
  type,
  subcategory,
  title,
  location,
  price,
  price_unit,
  vehicle_seats,
  transmission,
  fuel_type,
  with_driver,
  available_from,
  available_to,
  status,
  badge,
  featured,
  summary,
  description,
  specs,
  gallery,
  video_url,
  rating,
  reviews_count,
  created_date,
  updated_date
FROM public.listings
WHERE type = 'drive';
