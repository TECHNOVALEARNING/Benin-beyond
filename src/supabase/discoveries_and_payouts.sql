-- ==============================================================================
-- BÉNIN BEYOND — TABLE DES DÉCOUVERTES + REVERSEMENTS PROPRIÉTAIRES
-- À coller tel quel dans Supabase : SQL Editor → New query → Run.
-- Le script peut être exécuté plusieurs fois sans risque (idempotent).
--
--  1. Table 'discoveries' (restaurants & prestataires de services à domicile)
--  2. Table 'payouts' alignée sur l'application (demandes de reversement)
--  3. Contrôle côté serveur du solde disponible avant toute demande de reversement
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Fonctions d'autorisation (identiques à security_hardening.sql)
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

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'subadmin' AND COALESCE(is_active, TRUE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

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

-- ==============================================================================
-- 1. DÉCOUVERTES
-- ==============================================================================
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

-- Colonnes ajoutées si la table existait déjà avec une version plus ancienne
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS tagline TEXT;
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
ALTER TABLE public.discoveries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_discoveries_category ON public.discoveries(category);
CREATE INDEX IF NOT EXISTS idx_discoveries_status ON public.discoveries(status);

-- Anciennes fiches de démonstration (restaurants et prestataires fictifs)
DELETE FROM public.discoveries
WHERE id IN (
  'disc-resto-jardin-canala', 'disc-resto-maman-bene', 'disc-resto-atelier-gourmand',
  'disc-resto-cabane-pecheur', 'disc-srv-coiffure-vip', 'disc-srv-onglerie-glamour',
  'disc-srv-massage-zenith', 'disc-srv-chef-danxome', 'disc-srv-pressing-express'
);

ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('discoveries');

-- Le public ne voit que les fiches validées ; l'équipe voit tout (y compris en attente)
CREATE POLICY "discoveries_select" ON public.discoveries
  FOR SELECT USING (status = 'active' OR public.is_staff());

-- Un restaurant ou un prestataire (même sans compte) peut déposer une fiche,
-- mais uniquement « en attente » : l'équipe la valide avant publication.
CREATE POLICY "discoveries_insert" ON public.discoveries
  FOR INSERT WITH CHECK (status = 'pending' OR public.is_staff());

CREATE POLICY "discoveries_update_staff" ON public.discoveries
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "discoveries_delete_staff" ON public.discoveries
  FOR DELETE USING (public.is_staff());

-- ==============================================================================
-- 2. REVERSEMENTS PROPRIÉTAIRES (PAYOUTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  recipient_phone_or_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS partner_email TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS method_label TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS transfer_reference TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Les anciennes contraintes n'acceptaient ni Celtiis Cash ni les libellés de l'application
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_method_check;
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_method_check
  CHECK (method IN ('mtn_momo', 'moov_money', 'celtiis_cash', 'bank_transfer', 'cash'));
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_payouts_partner ON public.payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);

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

-- Refuse côté serveur toute demande supérieure au solde disponible
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

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
SELECT public._bb_drop_policies('payouts');

-- Le propriétaire voit ses propres demandes, l'équipe voit tout
CREATE POLICY "payouts_select" ON public.payouts
  FOR SELECT USING (partner_id = auth.uid() OR public.is_staff());

-- Le propriétaire connecté crée ses propres demandes (toujours « en attente »)
CREATE POLICY "payouts_insert_own" ON public.payouts
  FOR INSERT WITH CHECK (partner_id = auth.uid() OR public.is_admin());

-- Seul l'administrateur traite (exécute ou refuse) un reversement
CREATE POLICY "payouts_update_admin" ON public.payouts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "payouts_delete_admin" ON public.payouts
  FOR DELETE USING (public.is_admin());
