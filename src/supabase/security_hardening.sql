-- ==============================================================================
-- BÉNIN BEYOND — DURCISSEMENT SÉCURITÉ DE LA BASE (À EXÉCUTER EN DERNIER)
-- ==============================================================================
-- À coller dans Supabase > SQL Editor, APRÈS tous les autres scripts.
-- Script idempotent : il peut être relancé sans risque.
--
-- Ce qu'il corrige :
--  1. Les politiques "... OR true" qui permettaient à n'importe qui (même non connecté)
--     de modifier / supprimer tous les profils, annonces, réservations, avis, packs, événements.
--  2. L'auto-promotion : un utilisateur pouvait se donner le rôle 'admin' (via son profil
--     ou via les métadonnées d'inscription) et obtenir tous les droits.
--  3. La table 'discoveries' (restaurants & services) utilisée par l'application mais absente.
--  4. Le bucket de stockage refusait les PDF (pièces justificatives KYC).
--
-- IMPORTANT : après ce script, les actions d'administration exigent une vraie session
-- Supabase (connexion Google ou e-mail + mot de passe Supabase) avec le compte administrateur.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Fonctions utilitaires
-- ------------------------------------------------------------------------------
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

-- Supprime toutes les politiques existantes d'une table (noms hérités des anciens scripts)
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

-- ------------------------------------------------------------------------------
-- 1. Table DISCOVERIES (restaurants & prestataires de services)
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
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_discoveries_category ON public.discoveries(category);
ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. PROFILES : chacun gère son profil, seul le staff gère les autres
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('profiles');

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_staff());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_staff())
  WITH CHECK (auth.uid() = id OR public.is_staff());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- Un non-administrateur ne peut ni se promouvoir, ni se certifier lui-même
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

-- Inscription : le rôle demandé dans les métadonnées ne peut pas être 'admin' / 'subadmin'
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

-- ------------------------------------------------------------------------------
-- 3. LISTINGS : lecture publique, écriture par le propriétaire ou le staff
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
-- 4. BOOKINGS & PAYMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('bookings');

-- Lecture conservée ouverte : l'application filtre encore côté navigateur (voir note en fin de fichier)
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (true);

-- Le paiement invité (sans compte) doit pouvoir créer sa réservation
CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (public.is_staff() OR owner_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "bookings_delete" ON public.bookings
  FOR DELETE USING (public.is_staff() OR owner_id = auth.uid());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('payments');

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    public.is_staff()
    OR lower(customer_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "payments_delete_admin" ON public.payments
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. REVIEWS : dépôt libre, modération par le staff
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY';
    PERFORM public._bb_drop_policies('reviews');
    EXECUTE 'CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (status = ''approved'' OR public.is_staff() OR lower(author_email) = lower(COALESCE(auth.jwt() ->> ''email'', '''')))';
    EXECUTE 'CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (status = ''pending'' OR public.is_staff())';
    EXECUTE 'CREATE POLICY "reviews_update_staff" ON public.reviews FOR UPDATE USING (public.is_staff())';
    EXECUTE 'CREATE POLICY "reviews_delete_staff" ON public.reviews FOR DELETE USING (public.is_staff())';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. CONTENU ÉDITORIAL : packs, événements, découvertes
-- ------------------------------------------------------------------------------
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('packs');
CREATE POLICY "packs_select" ON public.packs FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "packs_write_staff" ON public.packs FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('events');
CREATE POLICY "events_select" ON public.events FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "events_write_staff" ON public.events FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

SELECT public._bb_drop_policies('discoveries');
CREATE POLICY "discoveries_select" ON public.discoveries FOR SELECT USING (status = 'active' OR public.is_staff());
-- Les prestataires (connectés) peuvent inscrire leur établissement ; le staff modère
CREATE POLICY "discoveries_insert" ON public.discoveries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "discoveries_update_staff" ON public.discoveries FOR UPDATE USING (public.is_staff());
CREATE POLICY "discoveries_delete_staff" ON public.discoveries FOR DELETE USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 7. DOSSIERS DE VÉRIFICATION PROPRIÉTAIRES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.owner_verification_applications') IS NOT NULL THEN
    PERFORM public._bb_drop_policies('owner_verification_applications');
    EXECUTE 'CREATE POLICY "verif_select" ON public.owner_verification_applications FOR SELECT USING (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = lower(COALESCE(auth.jwt() ->> ''email'', '''')))';
    EXECUTE 'CREATE POLICY "verif_insert" ON public.owner_verification_applications FOR INSERT WITH CHECK (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = lower(COALESCE(auth.jwt() ->> ''email'', '''')))';
    EXECUTE 'CREATE POLICY "verif_update" ON public.owner_verification_applications FOR UPDATE USING (public.is_staff() OR user_id = auth.uid()::text OR lower(owner_email) = lower(COALESCE(auth.jwt() ->> ''email'', '''')))';
    EXECUTE 'CREATE POLICY "verif_delete_admin" ON public.owner_verification_applications FOR DELETE USING (public.is_admin())';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. STOCKAGE : accepter les PDF (justificatifs KYC)
-- ------------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf'
]
WHERE id = 'listings';

DROP FUNCTION IF EXISTS public._bb_drop_policies(TEXT);

-- ------------------------------------------------------------------------------
-- NOTE : la lecture des réservations (bookings) reste publique, car les tableaux de bord
-- filtrent encore les données dans le navigateur. Les noms / e-mails / téléphones clients
-- sont donc lisibles avec la clé publique. À restreindre une fois que tous les comptes
-- (voyageurs, partenaires) se connectent via Supabase Auth.
-- ------------------------------------------------------------------------------
