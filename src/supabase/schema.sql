-- ==============================================================================
-- BENIN BEYOND — SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. Table des annonces (Listings)
CREATE TABLE IF NOT EXISTS public.listings (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('stay', 'drive', 'discover')),
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  price_unit TEXT NOT NULL, -- 'nuit', 'jour', 'personne', 'forfait'
  badge TEXT,
  featured BOOLEAN DEFAULT FALSE,
  location TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  specs JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  host JSONB DEFAULT '{}'::jsonb,
  rating NUMERIC DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  map_lat DOUBLE PRECISION,
  map_lng DOUBLE PRECISION,
  gallery JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des réservations (Bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref TEXT UNIQUE NOT NULL, -- e.g. BB-849201
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  protection_options JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT NOT NULL, -- 'momo', 'card', 'wallet'
  subtotal NUMERIC NOT NULL,
  options_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche et le tri rapide
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings(featured);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings(booking_ref);

-- RLS (Row Level Security)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique pour les annonces
CREATE POLICY "Public read listings"
  ON public.listings FOR SELECT
  USING (true);

-- Politiques d'insertion et lecture pour les réservations
CREATE POLICY "Public insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read own booking"
  ON public.bookings FOR SELECT
  USING (true);
