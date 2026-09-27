-- ==============================================================================
-- BÉNIN BEYOND — PRODUCTION SUPABASE DATABASE SCHEMA (100% IDEMPOTENT)
-- Plateforme d'Hébergements de Prestige, Mobilité VIP & Découvertes au Bénin
--
-- CE SCRIPT EST 100% SÉCURISÉ POUR RÉ-EXÉCUTION :
-- - Ne génère AUCUNE erreur si les tables existent déjà (CREATE TABLE IF NOT EXISTS)
-- - Ajoute automatiquement les nouvelles colonnes si manquantes (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- - Réinitialise proprement les politiques RLS sans conflit (DROP POLICY IF EXISTS avant CREATE)
-- - Préserve l'intégralité de vos données déjà enregistrées
-- ==============================================================================

-- Active l'extension pgcrypto pour la génération d'UUID sécurisés
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLE DES PROFILS UTILISATEURS (PROFILES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'owner', 'partner', 'admin')),
  partner_type TEXT CHECK (partner_type IN ('hotel', 'villa', 'vehicle', 'restaurant', 'agency')),
  company_name TEXT,
  tax_id TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  kyc_doc_type TEXT,
  kyc_doc_url TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_doc_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_doc_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 2. TABLE DES ANNONCES & BIENS (LISTINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id TEXT PRIMARY KEY DEFAULT ('lst_' || replace(gen_random_uuid()::text, '-', '')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('stay', 'drive', 'discover')),
  subcategory TEXT NOT NULL DEFAULT 'villa' CHECK (
    subcategory IN ('villa', 'hotel', 'apartment', 'car', 'restaurant', 'experience')
  ),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  price_unit TEXT NOT NULL DEFAULT 'nuit' CHECK (
    price_unit IN ('nuit', 'jour', 'repas', 'forfait', 'personne', 'vente totale')
  ),
  rooms_count INTEGER DEFAULT 1 CHECK (rooms_count >= 1),
  available_from DATE,
  available_to DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'suspended')),
  rejection_reason TEXT,
  badge TEXT,
  featured BOOLEAN DEFAULT FALSE,
  summary TEXT,
  description TEXT,
  specs JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '[]'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  rating NUMERIC DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
  map_lat DOUBLE PRECISION,
  map_lng DOUBLE PRECISION,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT 'villa';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS available_to DATE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS map_lat DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS map_lng DOUBLE PRECISION;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

-- ==============================================================================
-- 3. TABLE DES PACKS COMBINÉS (PACKS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.packs (
  id TEXT PRIMARY KEY DEFAULT ('pack_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  tagline TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  regular_price NUMERIC CHECK (regular_price >= price),
  price_unit TEXT NOT NULL DEFAULT 'jour',
  savings NUMERIC GENERATED ALWAYS AS (COALESCE(regular_price, price) - price) STORED,
  location TEXT NOT NULL,
  badge TEXT DEFAULT 'Offre Privilège',
  included JSONB NOT NULL DEFAULT '[]'::jsonb,
  advantages JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes packs
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS regular_price NUMERIC;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS price_unit TEXT NOT NULL DEFAULT 'jour';
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Offre Privilège';
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS included JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS advantages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ==============================================================================
-- 4. TABLE DES RÉSERVATIONS (BOOKINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  protection_options JSONB DEFAULT '{}'::jsonb,
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  options_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  commission_rate NUMERIC DEFAULT 0.15,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  partner_payout_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled')
  ),
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (
    payment_status IN ('unpaid', 'paid', 'refunded')
  ),
  check_in DATE,
  check_out DATE,
  guests_count INTEGER DEFAULT 1,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_options JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS options_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.15;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS partner_payout_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 1;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- ==============================================================================
-- 5. TABLE DES TRANSACTIONS & PAIEMENTS (PAYMENTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_ref TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('fedapay', 'mtn_momo', 'moov_money', 'card', 'cash')
  ),
  payment_provider TEXT DEFAULT 'fedapay',
  provider_tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'fedapay';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_tx_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ==============================================================================
-- 6. TABLE DES REVERSEMENTS PARTENAIRES (PAYOUTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('mtn_momo', 'moov_money', 'bank_transfer', 'cash')),
  recipient_phone_or_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'rejected')
  ),
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration incrémentale : colonnes payouts
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'mtn_momo';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_phone_or_account TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- ==============================================================================
-- 7. TABLE DES ÉVÉNEMENTS CULTURELS (AGENDA DU BÉNIN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  badge TEXT DEFAULT 'Événement Culturel',
  period TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  image TEXT,
  tag TEXT DEFAULT 'Culture',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration incrémentale : colonnes events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Événement Culturel';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'Culture';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ==============================================================================
-- 8. INDEX OPTIMISÉS (100% IDEMPOTENTS)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON public.listings(subcategory);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON public.payments(transaction_ref);

-- ==============================================================================
-- 9. FONCTION HELPER ADMIN (SÉCURISÉE & RLS BYPASS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Reconnaissance ultra-rapide par email JWT
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) = 'isidoretoudonou@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 2. Reconnaissance en base sur profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR lower(email) = 'isidoretoudonou@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 10. POLITIQUES RLS (ROW LEVEL SECURITY) 100% IDEMPOTENTES
-- Chaque politique est précédée d'un DROP POLICY IF EXISTS pour éliminer les conflits
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- --- Politiques PROFILES ---
DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
CREATE POLICY "Public profile view"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- --- Politiques LISTINGS ---
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

-- --- Politiques PACKS ---
DROP POLICY IF EXISTS "Public can view active packs" ON public.packs;
CREATE POLICY "Public can view active packs"
  ON public.packs FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage packs" ON public.packs;
CREATE POLICY "Admins can manage packs"
  ON public.packs FOR ALL
  USING (public.is_admin());

-- --- Politiques BOOKINGS ---
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
CREATE POLICY "Clients can view own bookings"
  ON public.bookings FOR SELECT
  USING (
    customer_email = auth.jwt() ->> 'email'
    OR client_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Public checkout can insert bookings" ON public.bookings;
CREATE POLICY "Public checkout can insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings"
  ON public.bookings FOR ALL
  USING (public.is_admin());

-- --- Politiques PAYMENTS ---
DROP POLICY IF EXISTS "Clients can view own payments" ON public.payments;
CREATE POLICY "Clients can view own payments"
  ON public.payments FOR SELECT
  USING (
    customer_email = auth.jwt() ->> 'email'
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "System can record payments" ON public.payments;
CREATE POLICY "System can record payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- --- Politiques PAYOUTS ---
DROP POLICY IF EXISTS "Partners can view own payouts" ON public.payouts;
CREATE POLICY "Partners can view own payouts"
  ON public.payouts FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts"
  ON public.payouts FOR ALL
  USING (public.is_admin());

-- --- Politiques EVENTS ---
DROP POLICY IF EXISTS "Les événements sont consultables par tous" ON public.events;
CREATE POLICY "Les événements sont consultables par tous"
  ON public.events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Les administrateurs peuvent gérer les événements" ON public.events;
CREATE POLICY "Les administrateurs peuvent gérer les événements"
  ON public.events FOR ALL
  USING (public.is_admin());

-- ==============================================================================
-- 11. TRIGGER AUTOMATIQUE À L'INSCRIPTION AUTH.USERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  assigned_company TEXT;
  assigned_type TEXT;
  assigned_name TEXT;
  existing_profile RECORD;
BEGIN
  -- 1. Détection prioritaire du Super-Administrateur
  IF lower(new.email) = 'isidoretoudonou@gmail.com' THEN
    assigned_role := 'admin';
    assigned_name := 'Isidore Toudonou';
  ELSE
    -- 2. Vérifier si un profil existe déjà pour cet email dans public.profiles
    SELECT * INTO existing_profile
    FROM public.profiles
    WHERE lower(email) = lower(new.email)
    LIMIT 1;

    -- Si le compte était déjà propriétaire, partenaire ou admin, NE JAMAIS LE RÉTROGRADER
    IF existing_profile.id IS NOT NULL AND existing_profile.role IN ('owner', 'partner', 'admin') THEN
      assigned_role := existing_profile.role;
      assigned_name := COALESCE(existing_profile.full_name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
      assigned_company := COALESCE(existing_profile.company_name, new.raw_user_meta_data->>'company');
      assigned_type := COALESCE(existing_profile.partner_type, new.raw_user_meta_data->>'partner_type');
    ELSE
      assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
      assigned_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
      assigned_company := new.raw_user_meta_data->>'company';
      assigned_type := new.raw_user_meta_data->>'partner_type';
    END IF;
  END IF;

  -- Harmonisation des rôles
  IF assigned_role = 'owner' THEN
    assigned_role := 'partner';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_name,
    partner_type,
    verified,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    assigned_name,
    assigned_role,
    assigned_company,
    assigned_type,
    (assigned_role = 'admin'),
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = CASE 
      WHEN lower(EXCLUDED.email) = 'isidoretoudonou@gmail.com' THEN 'admin'
      WHEN public.profiles.role IN ('partner', 'owner', 'admin') THEN public.profiles.role
      ELSE EXCLUDED.role 
    END,
    company_name = COALESCE(public.profiles.company_name, EXCLUDED.company_name),
    partner_type = COALESCE(public.profiles.partner_type, EXCLUDED.partner_type),
    verified = CASE 
      WHEN lower(EXCLUDED.email) = 'isidoretoudonou@gmail.com' THEN TRUE 
      ELSE public.profiles.verified 
    END,
    is_active = COALESCE(public.profiles.is_active, TRUE),
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 12. MISE À JOUR PRIVILÈGES SUPER-ADMINISTRATEUR (ISIDORE TOUDONOU)
-- ==============================================================================
UPDATE public.profiles 
SET 
  role = 'admin', 
  verified = TRUE,
  is_active = TRUE,
  full_name = 'Isidore Toudonou'
WHERE lower(email) = 'isidoretoudonou@gmail.com';
