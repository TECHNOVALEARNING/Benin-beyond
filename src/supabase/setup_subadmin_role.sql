-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT SQL : HABILITATION DU RÔLE ASSISTANT ADMIN (SUB-ADMIN)
-- Rôle technique : subadmin
-- 
-- DESCRIPTION :
-- - Autorise le rôle 'subadmin' dans la contrainte de la table public.profiles
-- - Ne crée AUCUN compte de démonstration ou utilisateur factice en base
-- - Fournit les commandes pour attribuer ce rôle à vos vrais collaborateurs
-- ==============================================================================

DO $$
BEGIN
  -- 1. Mise à jour de la contrainte CHECK sur profiles.role pour inclure 'subadmin'
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('client', 'partner', 'owner', 'subadmin', 'admin'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Contrainte de rôle déjà ajustée ou absente : %', SQLERRM;
  END;

  -- 2. Activation de l'extension pgcrypto pour le hachage sécurisé des mots de passe
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
END $$;

-- ==============================================================================
-- 3. NETTOYAGE : Suppression de l'ancien compte démo (s'il avait été créé)
-- ==============================================================================
DELETE FROM public.profiles WHERE lower(email) = 'assistant@beninbeyond.com';
DELETE FROM auth.users WHERE lower(email) = 'assistant@beninbeyond.com';

-- ==============================================================================
-- GUIDE : COMMENT AJOUTER VOTRE PROPRE ASSISTANT ADMIN (SUB-ADMIN)
-- ==============================================================================
-- 
-- VOUS AVEZ 3 POSSIBILITÉS SIMPLES AU CHOIX :
--
-- ------------------------------------------------------------------------------
-- OPTION 1 (RECOMMANDÉE — DIRECTEMENT DEPUIS VOTRE SITE SANS CODE) :
-- ------------------------------------------------------------------------------
-- 1. Connectez-vous avec votre compte Super-Administrateur (isidoretoudonou@gmail.com).
-- 2. Rendez-vous sur votre Tour de Contrôle : http://localhost:5173/admin (ou sur votre domaine en production).
-- 3. Dans l'onglet "Utilisateurs & Équipe", cliquez sur le bouton "Créer un Assistant Admin".
-- 4. Renseignez son nom, son adresse email et son téléphone.
-- 5. Votre collaborateur pourra immédiatement se connecter via cet email ou via son compte Google !
--
-- ------------------------------------------------------------------------------
-- OPTION 2 (PROMOUVOIR UN UTILISATEUR QUI S'EST DÉJÀ INSCRIT SUR LE SITE) :
-- ------------------------------------------------------------------------------
-- Demandez à votre collaborateur de créer son compte normalement sur le site (/register ou Google).
-- Ensuite, exécutez simplement cette ligne SQL ci-dessous en remplaçant par son email :
--
-- UPDATE public.profiles
-- SET 
--   role = 'subadmin',
--   company_name = 'Bénin Beyond (Pôle Opérations & Modération)',
--   is_active = true,
--   verified = true,
--   updated_at = NOW()
-- WHERE lower(email) = lower('EMAIL_DE_VOTRE_COLLABORATEUR@DOMAINE.COM');
--
-- ------------------------------------------------------------------------------
-- OPTION 3 (CRÉATION MANUELLE COMPLÈTE EN SQL AVEC MOT DE PASSE INITIAL) :
-- ------------------------------------------------------------------------------
-- Si vous souhaitez créer le compte directement en SQL, décommentez le bloc 
-- ci-dessous et personnalisez les 3 variables (email, mot de passe, nom) :
--
/*
DO $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_email TEXT := 'collaborateur@beninbeyond.bj';    -- <-- METTEZ LE VRAI EMAIL ICI
  v_password TEXT := 'MotDePasseSecret2025!';        -- <-- METTEZ LE MOT DE PASSE ICI
  v_name TEXT := 'Nom de votre Collaborateur';       -- <-- METTEZ LE VRAI NOM ICI
  v_phone TEXT := '+229 97 00 00 00';                -- <-- NUMÉRO DE TÉLÉPHONE
BEGIN
  -- Création dans auth.users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    lower(v_email), crypt(v_password, gen_salt('bf')),
    NOW(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', v_name, 'role', 'subadmin'),
    NOW(), NOW()
  );

  -- Création du profil correspondant
  INSERT INTO public.profiles (
    id, email, full_name, phone, role, company_name,
    is_active, verified, kyc_status, created_at, updated_at
  ) VALUES (
    v_id, lower(v_email), v_name, v_phone, 'subadmin',
    'Bénin Beyond (Pôle Opérations & Modération)',
    true, true, 'verified', NOW(), NOW()
  );

  RAISE NOTICE 'Assistant Admin (%) créé avec succès !', v_email;
END $$;
*/
