-- ==============================================================================
-- BÉNIN BEYOND — CACHE DES TRADUCTIONS AUTOMATIQUES (version anglaise)
-- ==============================================================================
-- À coller dans Supabase > SQL Editor. Script relançable.
-- Garde chaque traduction faite par la fonction « benin-beyond » (route translate) pour ne payer
-- (et n'attendre) qu'une seule fois par texte.
-- Aucune politique d'accès : seule la fonction serveur (clé service_role) lit et écrit.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.translations (
  id TEXT PRIMARY KEY,          -- empreinte SHA-256 du texte français
  source TEXT NOT NULL,
  en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
