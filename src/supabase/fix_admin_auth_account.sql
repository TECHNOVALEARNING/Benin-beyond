-- ==============================================================================
-- BÉNIN BEYOND — RÉPARATION DES COMPTES CRÉÉS PAR SCRIPT SQL (ADMIN / ASSISTANTS)
-- ==============================================================================
-- Symptôme : connexion impossible pour le compte admin, par mot de passe ET par Google.
-- Supabase Auth répond "Database error querying schema" (erreur 500).
--
-- Cause : les comptes insérés directement dans auth.users (create_super_admin.sql,
-- setup_subadmin_role.sql) ont des colonnes de jetons à NULL. Supabase Auth exige
-- une chaîne vide ('') et plante en lisant ces lignes.
--
-- À coller dans Supabase > SQL Editor puis "Run". Script idempotent.
-- ==============================================================================

UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change               = COALESCE(email_change, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- Le compte admin doit être confirmé et rattaché à l'instance par défaut
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  instance_id = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated')
WHERE lower(email) = 'isidoretoudonou@gmail.com';

-- Profil administrateur aligné sur l'identifiant Auth
UPDATE public.profiles p
SET role = 'admin', verified = TRUE, is_active = TRUE, updated_at = NOW()
FROM auth.users u
WHERE lower(u.email) = 'isidoretoudonou@gmail.com'
  AND p.id = u.id;

-- Vérification : doit renvoyer 0
SELECT count(*) AS comptes_encore_defectueux
FROM auth.users
WHERE confirmation_token IS NULL OR recovery_token IS NULL OR email_change IS NULL;
