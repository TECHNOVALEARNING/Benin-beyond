-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT UNIQUE ET COMPLET DE LA BASE SUPABASE
-- ==============================================================================
-- Ce fichier remplace TOUS les autres scripts du dossier src/supabase
-- (schema, migrations, fix_*, security_hardening, discoveries_and_payouts, etc.).
--
-- Mode d'emploi : Supabase > SQL Editor > New query > coller TOUT le fichier > Run.
--
-- Il fonctionne dans les deux cas :
--   - base vide : il crée toutes les tables ;
--   - base existante : il garde les tables et les données, ajoute seulement
--     ce qui manque (colonnes, index, fonctions) et remplace les règles de sécurité.
-- Il peut être relancé autant de fois que nécessaire.
--
-- Contenu :
--   1. Tables (créées seulement si elles n'existent pas) et colonnes manquantes
--   2. Contraintes et index
--   3. Fonctions utilitaires (administrateur, équipe…)
--   4. Déclencheurs automatiques (inscription, protection des rôles, réservations, reversements)
--   5. Règles de sécurité (RLS) de chaque table
--   6. Fonctions publiques minimales (connexion, disponibilités)
--   7. Stockage des fichiers (photos, vidéos, justificatifs)
--   8. Vérification finale
--
-- Réglage à vérifier dans Supabase > Authentication > Providers > Email :
-- laisser « Confirm email » ACTIVÉ (l'accès des voyageurs repose sur leur e-mail).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ##############################################################################
-- 1. TABLES ET COLONNES
-- ##############################################################################

-- ------------------------------------------------------------------------------
-- 1.1 PROFILES (comptes : voyageurs, propriétaires, équipe)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  partner_type TEXT,
  company_name TEXT,
  tax_id TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  kyc_doc_type TEXT,
  kyc_doc_url TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.2 LISTINGS (hébergements et véhicules)
-- ------------------------------------------------------------------------------
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
  rooms_count INTEGER DEFAULT 0,
  vehicle_seats INTEGER DEFAULT 0 CHECK (vehicle_seats >= 0),
  transmission TEXT DEFAULT 'automatique',
  fuel_type TEXT DEFAULT 'essence',
  with_driver BOOLEAN DEFAULT FALSE,
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

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT 'villa';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vehicle_seats INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'automatique';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS fuel_type TEXT DEFAULT 'essence';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS with_driver BOOLEAN DEFAULT FALSE;
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
ALTER TABLE public.listings ALTER COLUMN rooms_count SET DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 1.3 PACKS (offres combinées)
-- ------------------------------------------------------------------------------
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
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.4 BOOKINGS (réservations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  protection_options JSONB DEFAULT '{}'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  options_total NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  commission_rate NUMERIC DEFAULT 0.10,
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

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_options JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS options_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.10;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS partner_payout_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guests_count INTEGER DEFAULT 1;
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
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_type TEXT DEFAULT 'stay';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 1;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Paiement Nyole (préparation du paiement côté serveur)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS nyole_session_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS nyole_order_id TEXT;
ALTER TABLE public.bookings ALTER COLUMN subtotal SET DEFAULT 0;
ALTER TABLE public.bookings ALTER COLUMN total_amount SET DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 1.5 PAYMENTS (encaissements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_ref TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('nyole', 'mtn_momo', 'moov_money', 'celtiis', 'card', 'cash')
  ),
  payment_provider TEXT DEFAULT 'nyole',
  provider_tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  ),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'nyole';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_tx_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.6 PAYOUTS (demandes de reversement des propriétaires)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'mtn_momo',
  recipient_phone_or_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'mtn_momo';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS recipient_phone_or_account TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS partner_email TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS method_label TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS transfer_reference TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.7 EVENTS (agenda culturel)
-- ------------------------------------------------------------------------------
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Événement Culturel';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'Culture';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.8 REVIEWS (avis clients, avec modération)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT,
  listing_id TEXT,
  pack_id TEXT,
  author_name TEXT NOT NULL DEFAULT 'Voyageur Bénin Beyond',
  author_email TEXT,
  author_avatar TEXT,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  listing_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS booking_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS listing_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS pack_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Voyageur Bénin Beyond';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS listing_title TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.9 DISCOVERIES (restaurants et prestataires de services)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discoveries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'services',
  subcategory TEXT,
  title TEXT NOT NULL,
  badge TEXT,
  location TEXT,
  tagline TEXT,
  description TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  tips TEXT,
  pricing TEXT,
  phone TEXT,
  whatsapp TEXT,
  image TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  "inHomeService" BOOLEAN DEFAULT FALSE,
  creator_role TEXT,
  payment_status TEXT,
  payment_reference TEXT,
  activation_fee NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'services';
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS tips TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS pricing TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS "inHomeService" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS creator_role TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS activation_fee NUMERIC DEFAULT 0;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Toute nouvelle fiche attend la validation de l'équipe
ALTER TABLE public.discoveries ALTER COLUMN status SET DEFAULT 'pending';

-- Anciennes fiches de démonstration (restaurants et prestataires fictifs)
DELETE FROM public.discoveries
WHERE id IN (
  'disc-resto-jardin-canala', 'disc-resto-maman-bene', 'disc-resto-atelier-gourmand',
  'disc-resto-cabane-pecheur', 'disc-srv-coiffure-vip', 'disc-srv-onglerie-glamour',
  'disc-srv-massage-zenith', 'disc-srv-chef-danxome', 'disc-srv-pressing-express'
);

-- ------------------------------------------------------------------------------
-- 1.10 OWNER_VERIFICATION_APPLICATIONS (dossiers KYC des propriétaires)
-- ------------------------------------------------------------------------------
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

ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS asset_categories JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS profile_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS declarations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS admin_feedback TEXT;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.owner_verification_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 1.11 VERIFICATION_AUDIT_LOGS (historique des décisions KYC)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 1.12 Vues de lecture : hébergements d'un côté, véhicules de l'autre
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_accommodations;
CREATE VIEW public.v_accommodations WITH (security_invoker = true) AS
SELECT id, owner_id, type, subcategory, title, location, price, price_unit, rooms_count,
       available_from, available_to, status, badge, featured, summary, description, specs,
       amenities, gallery, video_url, rating, reviews_count, created_date, updated_date
FROM public.listings
WHERE type = 'stay';

DROP VIEW IF EXISTS public.v_vehicles;
CREATE VIEW public.v_vehicles WITH (security_invoker = true) AS
SELECT id, owner_id, type, subcategory, title, location, price, price_unit, vehicle_seats,
       transmission, fuel_type, with_driver, available_from, available_to, status, badge,
       featured, summary, description, specs, gallery, video_url, rating, reviews_count,
       created_date, updated_date
FROM public.listings
WHERE type = 'drive';


-- ##############################################################################
-- 2. CONTRAINTES ET INDEX
-- ##############################################################################
-- Les contraintes sont recréées « NOT VALID » : elles s'appliquent aux nouvelles
-- lignes sans bloquer le script si d'anciennes lignes ne les respectent pas.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'owner', 'partner', 'subadmin', 'admin')) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IN ('pending', 'verified', 'rejected')) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_partner_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_partner_type_check
  CHECK (partner_type IS NULL OR partner_type IN ('hotel', 'villa', 'vehicle', 'restaurant', 'agency')) NOT VALID;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_rooms_count_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_rooms_count_check
  CHECK (rooms_count >= 0) NOT VALID;

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_method_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_method_check
  CHECK (method IN ('mtn_momo', 'moov_money', 'celtiis_cash', 'bank_transfer', 'cash')) NOT VALID;

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) NOT VALID;

-- Supprimer une réservation supprime aussi ses paiements
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE NOT VALID;

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
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON public.bookings(listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_nyole_session_id_key
  ON public.bookings (nyole_session_id) WHERE nyole_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tx_ref ON public.payments(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payouts_partner ON public.payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_listing ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discoveries_category ON public.discoveries(category);
CREATE INDEX IF NOT EXISTS idx_discoveries_status ON public.discoveries(status);
CREATE INDEX IF NOT EXISTS idx_owner_verif_user_id ON public.owner_verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_verif_email ON public.owner_verification_applications(owner_email);
CREATE INDEX IF NOT EXISTS idx_owner_verif_status ON public.owner_verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_owner_verif_updated_at ON public.owner_verification_applications(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_verif_audit_app_id ON public.verification_audit_logs(application_id);


-- ##############################################################################
-- 3. FONCTIONS UTILITAIRES
-- ##############################################################################

-- Administrateur principal (ou compte au rôle 'admin' actif)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) = 'isidoretoudonou@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND COALESCE(is_active, TRUE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Administrateur OU assistant (sub-admin) actif
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'subadmin' AND COALESCE(is_active, TRUE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- E-mail (en minuscules) de la personne connectée, '' si personne n'est connecté
CREATE OR REPLACE FUNCTION public.jwt_email()
RETURNS TEXT AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', ''));
$$ LANGUAGE sql STABLE;

-- Conversion tolérante texte -> date (NULL si la valeur n'est pas une date valide)
CREATE OR REPLACE FUNCTION public._bb_try_date(p_value TEXT)
RETURNS DATE AS $$
BEGIN
  IF p_value IS NULL OR left(p_value, 10) !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN NULL;
  END IF;
  RETURN left(p_value, 10)::DATE;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Outil interne : supprime toutes les règles de sécurité d'une table
-- (les anciens scripts en avaient créé sous des noms différents). Supprimé en fin de script.
CREATE OR REPLACE FUNCTION public._bb_drop_policies(p_table TEXT)
RETURNS VOID AS $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Solde réellement disponible d'un propriétaire :
-- gains nets des réservations payées, moins les reversements déjà demandés ou effectués.
CREATE OR REPLACE FUNCTION public.partner_available_balance(p_partner UUID)
RETURNS NUMERIC AS $$
DECLARE
  partner_email TEXT;
  earned NUMERIC;
  requested NUMERIC;
BEGIN
  SELECT lower(email) INTO partner_email FROM public.profiles WHERE id = p_partner;

  SELECT COALESCE(SUM(
           CASE
             WHEN COALESCE(b.partner_payout_amount, 0) > 0 THEN b.partner_payout_amount
             ELSE b.total_amount - COALESCE(b.commission_amount, 0)
           END), 0)
    INTO earned
    FROM public.bookings b
   WHERE (b.owner_id = p_partner OR (partner_email IS NOT NULL AND lower(b.owner_email) = partner_email))
     AND b.payment_status = 'paid'
     AND b.status IN ('confirmed', 'completed');

  SELECT COALESCE(SUM(amount), 0)
    INTO requested
    FROM public.payouts
   WHERE partner_id = p_partner
     AND status <> 'rejected';

  RETURN GREATEST(earned - requested, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ##############################################################################
-- 4. DÉCLENCHEURS AUTOMATIQUES
-- ##############################################################################

-- ------------------------------------------------------------------------------
-- 4.1 Inscription : création du profil (jamais de rôle admin / assistant demandé par l'utilisateur)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  existing_profile RECORD;
BEGIN
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE lower(email) = lower(new.email)
  LIMIT 1;

  IF lower(new.email) = 'isidoretoudonou@gmail.com' THEN
    assigned_role := 'admin';
  ELSIF existing_profile.id IS NOT NULL AND existing_profile.role IN ('owner', 'partner', 'admin', 'subadmin') THEN
    assigned_role := existing_profile.role;
  ELSE
    assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
    IF assigned_role NOT IN ('client', 'partner', 'owner') THEN
      assigned_role := 'client';
    END IF;
  END IF;

  IF assigned_role = 'owner' THEN
    assigned_role := 'partner';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, company_name, partner_type, verified, is_active, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(existing_profile.full_name, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    assigned_role,
    COALESCE(existing_profile.company_name, new.raw_user_meta_data->>'company'),
    COALESCE(existing_profile.partner_type, new.raw_user_meta_data->>'partner_type'),
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
      WHEN public.profiles.role IN ('partner', 'owner', 'admin', 'subadmin') THEN public.profiles.role
      ELSE EXCLUDED.role
    END,
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4.2 Profils : un utilisateur ne peut ni se promouvoir, ni se certifier lui-même
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
  -- Le compte service (scripts SQL, triggers d'inscription) et les admins gardent la main
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role NOT IN ('client', 'partner', 'owner') THEN
      NEW.role := 'client';
    END IF;
    NEW.verified := FALSE;
    IF NEW.role IN ('partner', 'owner') THEN
      NEW.kyc_status := 'pending';
    END IF;
    NEW.is_active := TRUE;
  ELSE
    -- Passage client -> partenaire autorisé, toute autre élévation est ignorée
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT (OLD.role = 'client' AND NEW.role IN ('partner', 'owner')) THEN
      NEW.role := OLD.role;
    END IF;
    -- L'assistant (sub-admin) peut valider le KYC, pas l'utilisateur lui-même
    IF NOT public.is_staff() THEN
      NEW.verified := OLD.verified;
      NEW.is_active := OLD.is_active;
      IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status AND NEW.kyc_status <> 'pending' THEN
        NEW.kyc_status := OLD.kyc_status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- ------------------------------------------------------------------------------
-- 4.3 Réservations : rattachement automatique au propriétaire du bien et au voyageur connecté
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bookings_fill_parties()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_id TEXT;
  v_owner_id UUID;
  v_owner_email TEXT;
BEGIN
  v_listing_id := COALESCE(
    NULLIF(NEW.listing_id, ''),
    CASE WHEN jsonb_typeof(NEW.items) = 'array' THEN
      COALESCE(NEW.items -> 0 ->> 'listing_id', NEW.items -> 0 ->> 'listingId', NEW.items -> 0 ->> 'id')
    END
  );

  IF v_listing_id IS NOT NULL THEN
    SELECT l.owner_id, to_jsonb(l) ->> 'owner_email'
      INTO v_owner_id, v_owner_email
      FROM public.listings l
     WHERE l.id::TEXT = v_listing_id
     LIMIT 1;

    -- Le propriétaire enregistré sur l'annonce fait foi
    IF v_owner_id IS NOT NULL THEN
      NEW.owner_id := v_owner_id;
      IF COALESCE(v_owner_email, '') = '' THEN
        SELECT p.email INTO v_owner_email FROM public.profiles p WHERE p.id = v_owner_id;
      END IF;
      NEW.owner_email := lower(v_owner_email);
    END IF;
  END IF;

  IF NEW.owner_email IS NULL AND NEW.owner_id IS NOT NULL THEN
    SELECT p.email INTO v_owner_email FROM public.profiles p WHERE p.id = NEW.owner_id;
    NEW.owner_email := lower(v_owner_email);
  END IF;

  -- Voyageur connecté qui réserve avec son propre e-mail
  IF NEW.client_id IS NULL AND auth.uid() IS NOT NULL
     AND lower(COALESCE(NEW.customer_email, '')) = public.jwt_email()
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()) THEN
    NEW.client_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_bookings_fill_parties ON public.bookings;
CREATE TRIGGER trg_bookings_fill_parties
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_parties();

-- Rattrapage des réservations existantes sans propriétaire renseigné
UPDATE public.bookings b
   SET owner_id = l.owner_id
  FROM public.listings l
 WHERE b.owner_id IS NULL
   AND l.owner_id IS NOT NULL
   AND l.id::TEXT = COALESCE(
         NULLIF(b.listing_id, ''),
         CASE WHEN jsonb_typeof(b.items) = 'array' THEN
           COALESCE(b.items -> 0 ->> 'listing_id', b.items -> 0 ->> 'listingId', b.items -> 0 ->> 'id')
         END
       );

UPDATE public.bookings b
   SET owner_email = lower(p.email)
  FROM public.profiles p
 WHERE b.owner_email IS NULL
   AND b.owner_id = p.id
   AND p.email IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4.4 Reversements : refus côté serveur de toute demande supérieure au solde disponible
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_payout_request()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.processed_by := NULL;
  NEW.processed_at := NULL;
  NEW.transfer_reference := NULL;

  IF NEW.amount > public.partner_available_balance(NEW.partner_id) THEN
    RAISE EXCEPTION 'Montant supérieur au solde disponible'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_payout_request ON public.payouts;
CREATE TRIGGER trg_check_payout_request
  BEFORE INSERT ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.check_payout_request();


-- ##############################################################################
-- 5. RÈGLES DE SÉCURITÉ (RLS)
-- ##############################################################################
-- Pour chaque table : sécurité activée, anciennes règles supprimées, règles définitives créées.

-- ------------------------------------------------------------------------------
-- 5.1 PROFILES : chacun voit et gère son profil, l'équipe voit et gère tout
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('profiles');

-- Le rapprochement par e-mail permet de retrouver un profil créé avant la connexion Google
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    public.is_staff()
    OR id = auth.uid()
    OR (public.jwt_email() <> '' AND lower(email) = public.jwt_email())
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_staff());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_staff())
  WITH CHECK (auth.uid() = id OR public.is_staff());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5.2 LISTINGS : lecture publique, écriture par le propriétaire ou l'équipe
-- ------------------------------------------------------------------------------
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('listings');

CREATE POLICY "listings_select" ON public.listings
  FOR SELECT USING (true);

CREATE POLICY "listings_insert" ON public.listings
  FOR INSERT WITH CHECK (
    public.is_staff()
    OR (auth.uid() IS NOT NULL AND (owner_id IS NULL OR owner_id = auth.uid()))
  );

CREATE POLICY "listings_update" ON public.listings
  FOR UPDATE USING (public.is_staff() OR owner_id = auth.uid())
  WITH CHECK (public.is_staff() OR owner_id = auth.uid());

CREATE POLICY "listings_delete" ON public.listings
  FOR DELETE USING (public.is_staff() OR owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5.3 BOOKINGS : lecture par l'équipe, le propriétaire du bien et le voyageur concerné
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('bookings');

CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    public.is_staff()
    OR (auth.uid() IS NOT NULL AND (owner_id = auth.uid() OR client_id = auth.uid()))
    OR (
      public.jwt_email() <> ''
      AND (lower(owner_email) = public.jwt_email() OR lower(customer_email) = public.jwt_email())
    )
  );

-- Le paiement invité (sans compte) doit pouvoir créer sa réservation
CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (public.is_staff() OR owner_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE USING (public.is_staff() OR owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5.4 PAYMENTS : lecture par l'équipe, le payeur et le propriétaire ; modification par l'admin
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('payments');

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    public.is_staff()
    OR lower(customer_email) = public.jwt_email()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "payments_delete_admin" ON public.payments
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5.5 PAYOUTS : le propriétaire voit et crée ses demandes, l'admin les traite
-- ------------------------------------------------------------------------------
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('payouts');

CREATE POLICY "payouts_select" ON public.payouts
  FOR SELECT USING (partner_id = auth.uid() OR public.is_staff());

CREATE POLICY "payouts_insert_own" ON public.payouts
  FOR INSERT WITH CHECK (partner_id = auth.uid() OR public.is_admin());

CREATE POLICY "payouts_update_admin" ON public.payouts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "payouts_delete_admin" ON public.payouts
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5.6 REVIEWS : dépôt « en attente », publication après modération par l'équipe
-- ------------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('reviews');

CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (status = 'approved' OR public.is_staff() OR lower(author_email) = public.jwt_email());

CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (status = 'pending' OR public.is_staff());

CREATE POLICY "reviews_update_staff" ON public.reviews
  FOR UPDATE USING (public.is_staff());

CREATE POLICY "reviews_delete_staff" ON public.reviews
  FOR DELETE USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 5.7 PACKS et EVENTS : lecture publique des contenus actifs, gestion par l'équipe
-- ------------------------------------------------------------------------------
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('packs');
CREATE POLICY "packs_select" ON public.packs FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "packs_write_staff" ON public.packs FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('events');
CREATE POLICY "events_select" ON public.events FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "events_write_staff" ON public.events FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 5.8 DISCOVERIES : le public voit les fiches validées ; dépôt « en attente » ouvert à tous
-- ------------------------------------------------------------------------------
ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('discoveries');

CREATE POLICY "discoveries_select" ON public.discoveries
  FOR SELECT USING (status = 'active' OR public.is_staff());

CREATE POLICY "discoveries_insert" ON public.discoveries
  FOR INSERT WITH CHECK (status = 'pending' OR public.is_staff());

CREATE POLICY "discoveries_update_staff" ON public.discoveries
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "discoveries_delete_staff" ON public.discoveries
  FOR DELETE USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 5.9 DOSSIERS KYC : visibles uniquement par leur propriétaire et l'équipe
-- ------------------------------------------------------------------------------
ALTER TABLE public.owner_verification_applications ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('owner_verification_applications');

CREATE POLICY "verif_select" ON public.owner_verification_applications
  FOR SELECT USING (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = public.jwt_email());

CREATE POLICY "verif_insert" ON public.owner_verification_applications
  FOR INSERT WITH CHECK (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = public.jwt_email());

CREATE POLICY "verif_update" ON public.owner_verification_applications
  FOR UPDATE USING (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = public.jwt_email());

CREATE POLICY "verif_delete_admin" ON public.owner_verification_applications
  FOR DELETE USING (public.is_admin());

ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('verification_audit_logs');

CREATE POLICY "audit_logs_select_staff" ON public.verification_audit_logs
  FOR SELECT USING (public.is_staff());

CREATE POLICY "audit_logs_insert" ON public.verification_audit_logs
  FOR INSERT WITH CHECK (public.is_staff() OR auth.uid() IS NOT NULL);


-- ##############################################################################
-- 6. FONCTIONS PUBLIQUES MINIMALES (aucune donnée personnelle renvoyée)
-- ##############################################################################

-- Écran de connexion : « ce compte existe-t-il ? » (renvoie seulement vrai / faux)
CREATE OR REPLACE FUNCTION public.account_exists(p_email TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(trim(p_email), '') <> '' AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email)))
    OR EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email)))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.account_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_exists(TEXT) TO anon, authenticated;

-- Anti double réservation : plages de dates occupées d'un bien
-- (même logique que extractBookingDates() dans src/services/bookingService.js)
CREATE OR REPLACE FUNCTION public.get_listing_booked_periods(p_listing_id TEXT)
RETURNS TABLE (start_date DATE, end_date DATE) AS $$
  WITH bk AS (
    SELECT
      j,
      CASE WHEN jsonb_typeof(j -> 'items') = 'array' THEN j -> 'items' ELSE '[]'::jsonb END AS items
    FROM public.bookings b, LATERAL (SELECT to_jsonb(b) AS j) x
    WHERE COALESCE(b.status, '') NOT IN ('cancelled', 'refunded')
  ),
  matched AS (
    SELECT
      COALESCE(
        public._bb_try_date(j ->> 'start_date'),
        public._bb_try_date(j ->> 'check_in'),
        public._bb_try_date(items -> 0 ->> 'startDate'),
        public._bb_try_date(substring(j ->> 'dates' FROM '(\d{4}-\d{2}-\d{2})\s+au\s+\d{4}-\d{2}-\d{2}')),
        public._bb_try_date(j ->> 'created_at')
      ) AS s,
      COALESCE(
        public._bb_try_date(j ->> 'end_date'),
        public._bb_try_date(j ->> 'check_out'),
        public._bb_try_date(items -> 0 ->> 'endDate'),
        public._bb_try_date(substring(j ->> 'dates' FROM '\d{4}-\d{2}-\d{2}\s+au\s+(\d{4}-\d{2}-\d{2})'))
      ) AS e,
      GREATEST(COALESCE(NULLIF(j ->> 'duration_days', '')::NUMERIC::INT, 1), 1) AS days
    FROM bk
    WHERE COALESCE(p_listing_id, '') <> ''
      AND (
        j ->> 'listing_id' = p_listing_id
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(items) it
          WHERE jsonb_typeof(it) = 'object'
            AND COALESCE(it ->> 'listing_id', it ->> 'listingId', it ->> 'id') = p_listing_id
        )
      )
  )
  SELECT s, COALESCE(e, s + days)
  FROM matched
  WHERE s IS NOT NULL
  ORDER BY s;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_listing_booked_periods(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_booked_periods(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.partner_available_balance(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_available_balance(UUID) TO authenticated;


-- ##############################################################################
-- 7. STOCKAGE DES FICHIERS (bucket 'listings' : photos, vidéos, justificatifs PDF)
-- ##############################################################################
-- Le bucket reste « public » : chaque fichier est lisible par son lien direct.
-- En revanche, plus personne ne peut LISTER tous les fichiers, ni modifier ou
-- supprimer ceux des autres.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'Schéma storage absent : partie stockage ignorée.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'listings', 'listings', true, 52428800,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/x-pdf', 'application/acrobat'
    ]
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- Anciennes règles (tous les noms utilisés par les anciens scripts)
  DROP POLICY IF EXISTS "Public Access Listings Media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to list all" ON storage.objects;
  DROP POLICY IF EXISTS "Users can list their own files in listings bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload Listings Media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public uploads to listings" ON storage.objects;
  DROP POLICY IF EXISTS "Allow uploads to listings" ON storage.objects;
  DROP POLICY IF EXISTS "Allow select on listings" ON storage.objects;
  DROP POLICY IF EXISTS "Allow update on listings" ON storage.objects;
  DROP POLICY IF EXISTS "Public Update Listings Media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow updates to own listings files" ON storage.objects;
  DROP POLICY IF EXISTS "Public Delete Listings Media" ON storage.objects;
  DROP POLICY IF EXISTS "Allow deletion of own listings files" ON storage.objects;
  DROP POLICY IF EXISTS "listings_files_insert" ON storage.objects;
  DROP POLICY IF EXISTS "listings_files_select" ON storage.objects;
  DROP POLICY IF EXISTS "listings_files_update" ON storage.objects;
  DROP POLICY IF EXISTS "listings_files_delete" ON storage.objects;

  -- Envoi de fichiers : ouvert (photos d'annonces, justificatifs d'inscription)
  CREATE POLICY "listings_files_insert" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'listings');

  -- Liste des fichiers : son propre dossier (« <id>/… » ou « verifications/<id>/… ») ou l'équipe
  CREATE POLICY "listings_files_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'listings' AND (
        public.is_staff()
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR ((storage.foldername(name))[1] = 'verifications' AND (storage.foldername(name))[2] = auth.uid()::text)
      )
    );

  CREATE POLICY "listings_files_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'listings' AND (
        public.is_staff()
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    );

  CREATE POLICY "listings_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'listings' AND (
        public.is_staff()
        OR (storage.foldername(name))[1] = auth.uid()::text
      )
    );
END $$;


-- ##############################################################################
-- 8. COMPTES ET VÉRIFICATION FINALE
-- ##############################################################################

-- Compte administrateur principal
UPDATE public.profiles
SET role = 'admin', verified = TRUE, is_active = TRUE, kyc_status = 'verified'
WHERE lower(email) = 'isidoretoudonou@gmail.com';

-- Ancien compte assistant de démonstration : désactivé (sans suppression)
UPDATE public.profiles
SET role = 'client', is_active = FALSE
WHERE lower(email) = 'assistant@beninbeyond.com';

-- Nettoyage de l'outil interne
DROP FUNCTION IF EXISTS public._bb_drop_policies(TEXT);

-- Résultat affiché : une ligne par table, avec son nombre de lignes et de règles de sécurité
SELECT t.table_name AS "table",
       (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', t.table_name), false, true, '')))[1]::text::int AS "lignes",
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS "règles",
       (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = format('public.%I', t.table_name)::regclass) AS "sécurité_active"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN ('profiles', 'listings', 'packs', 'bookings', 'payments', 'payouts', 'events',
                       'reviews', 'discoveries', 'owner_verification_applications', 'verification_audit_logs')
ORDER BY 1;
