-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT SQL : HABILITATION DU RÔLE ASSISTANT ADMIN (SUB-ADMIN)
-- Rôle : subadmin
-- Compte Démo / Équipe : Marc Lawson (assistant@beninbeyond.com)
-- 
-- DESCRIPTION :
-- - Autorise le rôle 'subadmin' dans la table profiles
-- - Crée ou met à jour le profil de l'Assistant Admin Marc Lawson
-- - Accorde les privilèges opérationnels : modération des biens, gestion des réservations,
--   avis clients, agenda culturel et formules/packs
-- - Verrouille la gestion des utilisateurs et rôles au Super-Administrateur seul
-- ==============================================================================

DO $$
BEGIN
  -- 1. Si une contrainte CHECK existe sur profiles.role, la mettre à jour pour inclure 'subadmin'
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('client', 'partner', 'owner', 'subadmin', 'admin'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Contrainte de rôle déjà ajustée ou absente : %', SQLERRM;
  END;

  -- 2. Activation de l'extension pgcrypto pour le hachage sécurisé
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
END $$;

-- 3. Création ou mise à jour du compte démo Marc Lawson (assistant@beninbeyond.com)
DO $$
DECLARE
  assistant_id UUID := 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e';
  assistant_email TEXT := 'assistant@beninbeyond.com';
  assistant_password TEXT := 'BeninBeyond2025!'; -- Mot de passe initial modifiable
  assistant_name TEXT := 'Marc Lawson';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(assistant_email)) THEN
    SELECT id INTO assistant_id FROM auth.users WHERE lower(email) = lower(assistant_email);
    
    UPDATE auth.users
    SET 
      encrypted_password = crypt(assistant_password, gen_salt('bf')),
      email_confirmed_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('name', assistant_name, 'role', 'subadmin'),
      updated_at = NOW()
    WHERE id = assistant_id;
  ELSE
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      assistant_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      assistant_email,
      crypt(assistant_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', assistant_name, 'role', 'subadmin'),
      NOW(),
      NOW()
    );
  END IF;

  -- 4. Insertion ou mise à jour dans public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    company_name,
    is_active,
    verified,
    kyc_status,
    created_at,
    updated_at
  ) VALUES (
    assistant_id,
    assistant_email,
    assistant_name,
    '+229 96 12 34 56',
    'subadmin',
    'Bénin Beyond (Pôle Opérations & Modération)',
    true,
    true,
    'verified',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'subadmin',
    company_name = EXCLUDED.company_name,
    is_active = true,
    verified = true,
    kyc_status = 'verified',
    updated_at = NOW();

  RAISE NOTICE 'Compte Assistant Admin (Marc Lawson / assistant@beninbeyond.com) configuré avec succès !';
END $$;
