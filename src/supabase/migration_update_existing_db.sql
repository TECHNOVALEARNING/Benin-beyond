-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT DE MIGRATION & MISE À NIVEAU (BASE EXISTANTE)
-- À exécuter dans le "SQL Editor" de Supabase si vos tables sont DÉJÀ créées.
-- 
-- CE SCRIPT :
-- 1. Ne touche pas à vos données existantes (aucune suppression de données).
-- 2. Ajoute les colonnes manquantes (dont 'is_active' pour la gestion des utilisateurs).
-- 3. Crée la table 'events' si elle n'existait pas encore.
-- 4. Réinitialise proprement toutes les règles RLS (Row Level Security) sans aucun conflit.
-- 5. Met à jour le déclencheur d'inscription et sanctuarise le compte Super-Admin.
-- ==============================================================================

-- 1. Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Colonnes manquantes dans 'profiles'
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

-- 3. Colonnes manquantes dans 'listings'
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

-- 4. Colonnes manquantes dans 'packs'
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

-- 5. Colonnes manquantes dans 'bookings'
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
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS listing_title TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS listing_image TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dates TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guests TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gross_amount NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS net_amount NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Mobile Money / Carte';

-- 6. Table des Événements Culturels (si pas encore présente)
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

-- 7. Index optimisés (idempotents)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory ON public.listings(subcategory);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- 8. Activation de Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 9. Fonction Helper Admin optimisée
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) = 'isidoretoudonou@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR lower(email) = 'isidoretoudonou@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 10. Réinitialisation sans conflit de toutes les politiques RLS
DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings" ON public.listings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Partners and admins can insert listings" ON public.listings;
CREATE POLICY "Partners and admins can insert listings" ON public.listings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Partners and admins can update own listings" ON public.listings;
CREATE POLICY "Partners and admins can update own listings" ON public.listings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete listings" ON public.listings;
CREATE POLICY "Admins can delete listings" ON public.listings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public can view active packs" ON public.packs;
CREATE POLICY "Public can view active packs" ON public.packs FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage packs" ON public.packs;
CREATE POLICY "Admins can manage packs" ON public.packs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
CREATE POLICY "Clients can view own bookings" ON public.bookings FOR SELECT USING (customer_email = auth.jwt() ->> 'email' OR client_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Public checkout can insert bookings" ON public.bookings;
CREATE POLICY "Public checkout can insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings" ON public.bookings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Clients can view own payments" ON public.payments;
CREATE POLICY "Clients can view own payments" ON public.payments FOR SELECT USING (customer_email = auth.jwt() ->> 'email' OR public.is_admin());

DROP POLICY IF EXISTS "System can record payments" ON public.payments;
CREATE POLICY "System can record payments" ON public.payments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can view own payouts" ON public.payouts;
CREATE POLICY "Partners can view own payouts" ON public.payouts FOR SELECT USING (partner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Les événements sont consultables par tous" ON public.events;
CREATE POLICY "Les événements sont consultables par tous" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Les administrateurs peuvent gérer les événements" ON public.events;
CREATE POLICY "Les administrateurs peuvent gérer les événements" ON public.events FOR ALL USING (public.is_admin());

-- 11. Fonction & Déclencheur d'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  assigned_company TEXT;
  assigned_type TEXT;
  assigned_name TEXT;
  existing_profile RECORD;
BEGIN
  IF lower(new.email) = 'isidoretoudonou@gmail.com' THEN
    assigned_role := 'admin';
    assigned_name := 'Isidore Toudonou';
  ELSE
    SELECT * INTO existing_profile
    FROM public.profiles
    WHERE lower(email) = lower(new.email)
    LIMIT 1;

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

  IF assigned_role = 'owner' THEN
    assigned_role := 'partner';
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, company_name, partner_type, verified, is_active, created_at, updated_at
  )
  VALUES (
    new.id, new.email, assigned_name, assigned_role, assigned_company, assigned_type, (assigned_role = 'admin'), TRUE, NOW(), NOW()
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

-- 12. Sanctuarisation Super-Admin
UPDATE public.profiles 
SET 
  role = 'admin', 
  verified = TRUE,
  is_active = TRUE,
  full_name = 'Isidore Toudonou'
WHERE lower(email) = 'isidoretoudonou@gmail.com';
