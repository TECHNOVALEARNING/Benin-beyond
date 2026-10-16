-- ==============================================================================
-- BÉNIN BEYOND — SIGNALEMENTS D'ANNONCES
-- ==============================================================================
-- À coller dans Supabase > SQL Editor (après security_hardening.sql). Script relançable.
-- Tout visiteur peut signaler une annonce ; seule l'équipe peut lire et traiter.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  listing_title TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('fake', 'photos', 'price', 'scam', 'other')),
  message TEXT CHECK (char_length(message) <= 1000),
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS listing_reports_open_idx
  ON public.listing_reports (created_at DESC) WHERE status = 'open';

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_reports_insert" ON public.listing_reports;
CREATE POLICY "listing_reports_insert" ON public.listing_reports
  FOR INSERT WITH CHECK (status = 'open' AND resolved_at IS NULL);

DROP POLICY IF EXISTS "listing_reports_select_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_select_staff" ON public.listing_reports
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "listing_reports_update_staff" ON public.listing_reports;
CREATE POLICY "listing_reports_update_staff" ON public.listing_reports
  FOR UPDATE USING (public.is_staff());

DROP POLICY IF EXISTS "listing_reports_delete_admin" ON public.listing_reports;
CREATE POLICY "listing_reports_delete_admin" ON public.listing_reports
  FOR DELETE USING (public.is_admin());
