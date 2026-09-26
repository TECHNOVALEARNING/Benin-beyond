-- ==============================================================================
-- BÉNIN BEYOND — SCRIPT SQL DE CRÉATION AUTOMATIQUE DU SUPER-ADMINISTRATEUR
-- Utilisateur : Isidore Toudonou (isidoretoudonou@gmail.com)
-- 
-- MODE D'EMPLOI :
-- 1. Ouvrez votre projet Supabase (https://supabase.com/dashboard)
-- 2. Allez dans "SQL Editor" dans le menu à gauche
-- 3. Cliquez sur "New query", collez tout ce script et cliquez sur "Run" (Exécuter)
-- 4. Vous pouvez ensuite vous connecter avec l'email et le mot de passe indiqués ci-dessous !
-- ==============================================================================

DO $$
DECLARE
  new_admin_id UUID := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  admin_email TEXT := 'isidoretoudonou@gmail.com';
  admin_password TEXT := 'BeninBeyond2025!'; -- Vous pouvez changer ce mot de passe si vous le désirez
  admin_name TEXT := 'Isidore Toudonou';
BEGIN
  -- 1. Activation de l'extension pgcrypto pour le hachage sécurisé du mot de passe
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- 2. Vérification ou création de l'utilisateur dans auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(admin_email)) THEN
    SELECT id INTO new_admin_id FROM auth.users WHERE lower(email) = lower(admin_email);
    
    UPDATE auth.users
    SET 
      encrypted_password = crypt(admin_password, gen_salt('bf')),
      email_confirmed_at = NOW(),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = jsonb_build_object('name', admin_name, 'role', 'admin'),
      updated_at = NOW()
    WHERE id = new_admin_id;
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
      new_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', admin_name, 'role', 'admin'),
      NOW(),
      NOW()
    );
  END IF;

  -- 3. Liaison obligatoire dans auth.identities (requise par Supabase GoTrue Auth)
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = new_admin_id) THEN
    INSERT INTO auth.identities (
      id,
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_admin_id,
      new_admin_id::text,
      new_admin_id,
      jsonb_build_object('sub', new_admin_id::text, 'email', admin_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- 4. Nettoyage préventif des profils orphelins avec le même email si l'ID a changé
  DELETE FROM public.profiles 
  WHERE lower(email) = lower(admin_email) AND id <> new_admin_id;

  -- 5. Création ou élévation du profil dans public.profiles avec tous les privilèges
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_name,
    partner_type,
    kyc_status,
    verified,
    is_active,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    new_admin_id,
    admin_email,
    admin_name,
    'admin',
    'Bénin Beyond Direction',
    NULL,
    'verified',
    TRUE,
    TRUE,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'admin',
    company_name = 'Bénin Beyond Direction',
    kyc_status = 'verified',
    verified = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  RAISE NOTICE 'Succès : Le compte Super-Admin % a été créé/mis à jour avec le rôle admin !', admin_email;
END $$;
