-- ==============================================================================
-- BÉNIN BEYOND — PAIEMENTS NYOLE CÔTÉ SERVEUR — ÉTAPE 2 / 2 : VERROUILLAGE
-- ==============================================================================
-- À coller dans Supabase > SQL Editor APRÈS :
--   1. nyole_1_colonnes.sql,
--   2. le déploiement de la fonction benin-beyond (+ clé secrète),
--   3. la mise en ligne de la nouvelle version du site.
-- Script relançable. Si security_hardening.sql est relancé plus tard, relancer
-- ce script ensuite.
--
-- Effet :
--  - le navigateur (visiteur ou compte connecté) ne peut plus créer une réservation
--    « payée » ni enregistrer un paiement ;
--  - personne d'autre que l'administrateur ne peut passer une réservation à « payé »
--    ni modifier ses montants ou sa session Nyole ;
--  - seules les fonctions serveur (clé service_role) et l'administrateur le peuvent.
-- ==============================================================================

-- Une nouvelle réservation est « non payée » par défaut
ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- ------------------------------------------------------------------------------
-- 1. Création de réservation depuis le navigateur : uniquement non payée
--    (les blocages de dates des propriétaires restent possibles)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR payment_status = 'unpaid'
  );

-- ------------------------------------------------------------------------------
-- 2. Paiements : enregistrés uniquement par le serveur (ou l'administrateur)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Champs financiers protégés en modification
--    (un propriétaire ou un voyageur peut toujours changer le statut de séjour,
--     mais pas le statut de paiement ni les montants)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bookings_protect_payment_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Fonctions serveur (service_role) et SQL Editor : pas de restriction
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS DISTINCT FROM 'unpaid' THEN
      RAISE EXCEPTION 'Le statut de paiement est géré uniquement par le serveur de paiement.'
        USING ERRCODE = '42501';
    END IF;
    NEW.nyole_session_id := NULL;
    NEW.nyole_order_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
     OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
     OR NEW.net_amount IS DISTINCT FROM OLD.net_amount
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.partner_payout_amount IS DISTINCT FROM OLD.partner_payout_amount
     OR NEW.nyole_session_id IS DISTINCT FROM OLD.nyole_session_id
     OR NEW.nyole_order_id IS DISTINCT FROM OLD.nyole_order_id
  THEN
    RAISE EXCEPTION 'Le paiement et les montants d''une réservation ne peuvent pas être modifiés depuis le site.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

DROP TRIGGER IF EXISTS bookings_protect_payment_fields ON public.bookings;
CREATE TRIGGER bookings_protect_payment_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_protect_payment_fields();

-- ------------------------------------------------------------------------------
-- Vérification (facultatif) : doit afficher les 2 politiques et le déclencheur
-- ------------------------------------------------------------------------------
SELECT policyname, cmd, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('bookings', 'payments') AND cmd = 'INSERT';
