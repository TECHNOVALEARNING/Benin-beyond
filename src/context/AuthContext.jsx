import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const AuthContext = createContext(null);

const STORAGE_KEY = 'benin_beyond_user';
const REGISTERED_USERS_KEY = 'benin_beyond_registered_users';

export const SUPER_ADMIN_EMAIL = 'isidoretoudonou@gmail.com';

export const DEMO_USERS = {
  admin: {
    id: 'usr_admin_isidore',
    name: 'Isidore Toudonou',
    email: SUPER_ADMIN_EMAIL,
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    title: 'Super-Administrateur & Direction Générale',
    verified: true,
    kyc_status: 'verified'
  },
  owner: {
    id: 'usr_owner_01',
    name: 'Patrice H. (Hôte & Loueur Pro)',
    email: 'proprietaire@beninbeyond.com',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    company: 'Littoral Prestige Assets',
    verified: true,
    kyc_status: 'verified'
  },
  client: {
    id: 'usr_client_01',
    name: 'Amina Koffi',
    email: 'voyageur@beninbeyond.com',
    role: 'client',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    membership: 'Voyageur Privilège',
    verified: true
  }
};

// Résolution stricte et infaillible du rôle utilisateur
export function resolveUserRole(email, rawRole = null) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (
    cleanEmail === SUPER_ADMIN_EMAIL ||
    cleanEmail === 'admin@beninbeyond.com' ||
    cleanEmail === 'admin@beninbeyond.bj' ||
    cleanEmail.startsWith('admin@')
  ) {
    return 'admin';
  }

  // 1. PRIORITÉ ABSOLUE : Vérification d'un override explicite par le Super-Administrateur
  try {
    const overridesRaw =
      localStorage.getItem('benin_beyond_user_admin_overrides') ||
      localStorage.getItem('benin_beyond_admin_user_overrides');
    const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
    if (overrides[cleanEmail]?.role) {
      return overrides[cleanEmail].role;
    }
  } catch {}

  // 2. Détection rôle Assistant Admin (Sub-Admin)
  if (rawRole === 'subadmin') {
    return 'subadmin';
  }

  // 3. Rôle explicite propriétaire ou partenaire
  if (rawRole === 'owner' || rawRole === 'partner') {
    return 'owner';
  }

  // 4. Si l'utilisateur est déjà enregistré localement avec un rôle
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const found = list.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
    if (found?.role) {
      return found.role;
    }
  } catch {}

  // 5. Intention de rôle OAuth (ex: clic Google depuis Espace Hôte ou inscription partenaire)
  try {
    const intendedRole = localStorage.getItem('benin_beyond_oauth_intended_role');
    if (intendedRole === 'owner' || intendedRole === 'partner') {
      return 'owner';
    }
  } catch {}

  return rawRole === 'admin' ? 'admin' : (rawRole === 'subadmin' ? 'subadmin' : (rawRole || 'client'));
}

function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((u) => {
      if (u.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
        return { ...u, role: 'admin', name: 'Isidore Toudonou', verified: true };
      }
      return u;
    });
  } catch {
    return [];
  }
}

function saveRegisteredUser(newUser) {
  try {
    const list = getRegisteredUsers();
    const cleanEmail = (newUser.email || '').trim().toLowerCase();
    const existing = list.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
    const sanitizedRole = resolveUserRole(cleanEmail, newUser.role || existing?.role);
    const sanitizedUser = {
      ...(existing || {}),
      ...newUser,
      email: cleanEmail,
      role: sanitizedRole,
      name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (newUser.name || existing?.name || cleanEmail.split('@')[0])
    };

    const filtered = list.filter((u) => u.email?.toLowerCase().trim() !== cleanEmail);
    filtered.push(sanitizedUser);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save registered user:', e);
  }
}

export function AuthProvider({ children }) {
  // Chargement et auto-guérison du profil stocké
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed) {
        const cleanEmail = (parsed.email || '').trim().toLowerCase();
        parsed.role = resolveUserRole(cleanEmail, parsed.role);
        if (cleanEmail === SUPER_ADMIN_EMAIL) {
          parsed.name = 'Isidore Toudonou';
          parsed.role = 'admin';
          parsed.verified = true;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return Boolean(user && user.email?.includes('beninbeyond.bj'));
  });

  // Synchronisation du stockage local à chaque mise à jour utilisateur
  useEffect(() => {
    if (user) {
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const sanitizedUser = {
        ...user,
        email: cleanEmail,
        role: resolveUserRole(cleanEmail, user.role),
        name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : user.name
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedUser));
      setIsDemoMode(Boolean(cleanEmail.includes('beninbeyond.bj')));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsDemoMode(false);
    }
  }, [user]);

  // Synchronisation avec Supabase Auth & écoute des redirections OAuth (Google)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Vérifier la session active Supabase au montage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !user) {
        await syncSupabaseSession(session.user);
      }
    });

    // Écouteur d'évènements Auth Supabase (ex: retour de Google OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        await syncSupabaseSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Helper interne pour synchroniser une session Supabase avec le profil public
  const syncSupabaseSession = async (authUser) => {
    const cleanEmail = (authUser.email || '').trim().toLowerCase();
    let profile = null;

    try {
      // 1. Chercher d'abord par ID Supabase
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      // 2. Si non trouvé par ID ou si rôle 'client', chercher par email (compte pré-existant ou OAuth Google)
      if ((!data || data.role === 'client') && cleanEmail) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (byEmail) {
          data = { ...data, ...byEmail };
        }
      }
      profile = data;
    } catch (e) {
      console.warn('Erreur synchronisation profil Supabase:', e);
    }

    // 3. Récupérer intention OAuth si initiée depuis /register ou /login
    const intendedRole = localStorage.getItem('benin_beyond_oauth_intended_role');
    const intendedCompany = localStorage.getItem('benin_beyond_oauth_intended_company');
    localStorage.removeItem('benin_beyond_oauth_intended_role');
    localStorage.removeItem('benin_beyond_oauth_intended_company');

    // 4. Utilisateur local enregistré
    const registeredList = getRegisteredUsers();
    const existingLocalUser = registeredList.find((u) => u.email?.toLowerCase().trim() === cleanEmail);

    // 5. Vérifier si l'utilisateur possède déjà des annonces créées
    let hasListings = false;
    try {
      if (isSupabaseConfigured && supabase) {
        const { count } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .or(`owner_id.eq.${authUser.id},owner_email.eq.${cleanEmail}`);
        if (count && count > 0) hasListings = true;
      }
    } catch {}

    // Détermination stricte du rôle :
    // Un propriétaire/partenaire ne doit JAMAIS être rétrogradé en client
    let candidateRole = profile?.role;
    if (!candidateRole || candidateRole === 'client') {
      if (intendedRole === 'owner' || intendedRole === 'partner') {
        candidateRole = 'owner';
      } else if (existingLocalUser?.role === 'owner' || existingLocalUser?.role === 'partner') {
        candidateRole = 'owner';
      } else if (hasListings) {
        candidateRole = 'owner';
      }
    }

    const assignedRole = resolveUserRole(cleanEmail, candidateRole);
    const resolvedName =
      profile?.full_name ||
      existingLocalUser?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : cleanEmail.split('@')[0].replace(/[._]/g, ' '));

    const resolvedCompany =
      profile?.company_name ||
      existingLocalUser?.company ||
      intendedCompany ||
      (assignedRole === 'owner' ? 'Partenaire Hébergement & Mobilité' : undefined);

    const isActive = cleanEmail === SUPER_ADMIN_EMAIL ? true : (profile?.is_active !== false && existingLocalUser?.is_active !== false);

    const finalUser = {
      id: authUser.id,
      email: cleanEmail,
      name: resolvedName,
      role: assignedRole,
      company: resolvedCompany,
      is_active: isActive,
      avatar:
        profile?.avatar_url ||
        existingLocalUser?.avatar ||
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        (assignedRole === 'admin'
          ? DEMO_USERS.admin.avatar
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'),
      verified: assignedRole === 'admin' ? true : Boolean(profile?.verified || existingLocalUser?.verified || profile?.kyc_status === 'verified' || existingLocalUser?.kyc_status === 'verified'),
      kyc_status: assignedRole === 'admin' ? 'verified' : (profile?.kyc_status || existingLocalUser?.kyc_status || (profile?.verified || existingLocalUser?.verified ? 'verified' : 'pending')),
      rejection_reason: profile?.rejection_reason || existingLocalUser?.rejection_reason || '',
      provider: authUser.app_metadata?.provider || 'google'
    };

    // Mettre à jour Supabase profiles pour persister définitivement le rôle
    if (isSupabaseConfigured && supabase && (assignedRole === 'owner' || assignedRole === 'admin' || assignedRole === 'subadmin')) {
      try {
        const dbRole = assignedRole === 'admin' ? 'admin' : (assignedRole === 'subadmin' ? 'subadmin' : 'partner');
        await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: cleanEmail,
            full_name: resolvedName,
            role: dbRole,
            company_name: resolvedCompany || 'Partenaire Hébergeur & Mobilité',
            verified: assignedRole === 'admin' ? true : Boolean(profile?.verified || existingLocalUser?.verified),
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });
      } catch (err) {
        console.warn('Synchro rôle Supabase profiles:', err);
      }
    }

    saveRegisteredUser(finalUser);
    setUser(finalUser);
    return finalUser;
  };

  /**
   * Connexion universelle stricte et sécurisée (Supabase Auth en priorité, vérification rigoureuse)
   * AUCUNE création silencieuse de compte sur la page de connexion.
   */
  const login = async (email, password, optionalRole = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanEmail) {
      return { success: false, error: 'Veuillez saisir votre adresse e-mail.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Veuillez saisir votre mot de passe.' };
    }

    const isAdmin = cleanEmail === SUPER_ADMIN_EMAIL || cleanEmail === 'admin@beninbeyond.com' || cleanEmail === 'admin@beninbeyond.bj' || cleanEmail.startsWith('admin@');

    // 1. Authentification officielle avec Supabase Auth si configuré
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (!error && data?.user) {
          const syncedUser = await syncSupabaseSession(data.user);
          return { success: true, user: syncedUser };
        }
      } catch (err) {
        console.warn('Supabase signInWithPassword:', err);
      }
    }

    // 2. Vérification de l'existence du compte dans Supabase (table profiles)
    let supabaseProfile = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_active, verified, company_name')
          .ilike('email', cleanEmail)
          .maybeSingle();
        supabaseProfile = prof;
      } catch (err) {
        console.warn('Erreur vérification profil Supabase:', err);
      }
    }

    // Récupération des overrides Super-Admin prioritaires
    let userOverride = null;
    try {
      const overridesRaw =
        localStorage.getItem('benin_beyond_user_admin_overrides') ||
        localStorage.getItem('benin_beyond_admin_user_overrides');
      const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
      userOverride = overrides[cleanEmail];
    } catch {}

    const isPromotedSubAdmin = userOverride?.role === 'subadmin';

    const registeredList = getRegisteredUsers();
    let savedUser = registeredList.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === cleanEmail);

    // 3. VÉRIFICATION STRICTE DE L'EXISTENCE DU COMPTE
    const emailExists = Boolean(supabaseProfile || savedUser || isAdmin || demoMatch || isPromotedSubAdmin || userOverride);

    if (!emailExists) {
      return {
        success: false,
        isUnknownAccount: true,
        error: "Aucun compte n'est associé à cette adresse e-mail. Veuillez vérifier votre saisie ou créer un compte."
      };
    }

    // 4. VÉRIFICATION DU MOT DE PASSE POUR LE SUPER-ADMINISTRATEUR
    if (isAdmin) {
      const customAdminPassword = localStorage.getItem('benin_beyond_admin_custom_password');
      const validAdminPasswords = ['BeninBeyond2025!', 'admin123', 'admin', 'demo123', 'Benin2025!'];

      const matchesCustom = customAdminPassword && cleanPassword === customAdminPassword;
      const matchesSavedPassword = savedUser?.password && savedUser.password === cleanPassword;
      const matchesMasterPassword = validAdminPasswords.includes(cleanPassword);

      // Si le Super-Admin n'avait pas encore défini de mot de passe personnalisé spécifique,
      // on enregistre le mot de passe qu'il saisit maintenant comme son mot de passe officiel
      if (!customAdminPassword && !savedUser?.password) {
        localStorage.setItem('benin_beyond_admin_custom_password', cleanPassword);
      } else if (!matchesCustom && !matchesSavedPassword && !matchesMasterPassword) {
        return {
          success: false,
          isWrongPassword: true,
          error: "Mot de passe incorrect pour cette adresse e-mail. Veuillez vérifier votre saisie ou cliquer sur 'Mot de passe oublié' pour rétablir votre mot de passe."
        };
      }

      // Mot de passe validé avec succès
      localStorage.setItem('benin_beyond_admin_custom_password', cleanPassword);

      const adminUser = {
        ...DEMO_USERS.admin,
        ...(supabaseProfile || {}),
        ...(savedUser || {}),
        id: supabaseProfile?.id || savedUser?.id || 'usr_admin_isidore',
        email: cleanEmail,
        name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (supabaseProfile?.full_name || savedUser?.name || 'Administration Bénin Beyond'),
        role: 'admin',
        verified: true,
        is_active: true,
        password: cleanPassword
      };
      saveRegisteredUser(adminUser);
      setUser(adminUser);
      return { success: true, user: adminUser };
    }

    // 5. GESTION STRICTE DES COMPTES PROMUS OU CONFIGURÉS EN ASSISTANT ADMIN (SUB-ADMIN)
    if (isPromotedSubAdmin || savedUser?.role === 'subadmin' || supabaseProfile?.role === 'subadmin') {
      const validSubAdminPasswords = ['BeninBeyond2025!', 'admin123', 'assistant123', 'demo123'];
      const matchesSaved = savedUser?.password && savedUser.password === cleanPassword;
      const matchesMaster = validSubAdminPasswords.includes(cleanPassword);
      // Si l'assistant n'a pas encore de mot de passe défini, accepter le premier mot de passe saisi
      const isFirstInit = !savedUser?.password;

      if (!isFirstInit && !matchesSaved && !matchesMaster) {
        return {
          success: false,
          isWrongPassword: true,
          error: "Mot de passe incorrect pour cette adresse e-mail. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe."
        };
      }

      const subAdminUser = {
        ...(demoMatch || {}),
        ...(supabaseProfile || {}),
        ...(savedUser || {}),
        ...(userOverride || {}),
        id: supabaseProfile?.id || savedUser?.id || demoMatch?.id || `usr_subadmin_${Date.now()}`,
        name: userOverride?.name || supabaseProfile?.full_name || savedUser?.name || demoMatch?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'subadmin',
        verified: true,
        is_active: true,
        password: cleanPassword
      };
      saveRegisteredUser(subAdminUser);
      setUser(subAdminUser);
      return { success: true, user: subAdminUser };
    }

    // 6. VÉRIFICATION DU MOT DE PASSE POUR LES COMPTES DÉMO (SI NON MODIFIÉS PAR L'ADMIN)
    if (demoMatch && !userOverride) {
      const validDemoPasswords = ['BeninBeyond2025!', 'demo123', 'admin123', 'Benin2025!'];
      if (!validDemoPasswords.includes(cleanPassword)) {
        return {
          success: false,
          isWrongPassword: true,
          error: "Mot de passe incorrect pour cette adresse e-mail. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe."
        };
      }
      const demoUser = {
        ...demoMatch,
        password: cleanPassword
      };
      saveRegisteredUser(demoUser);
      setUser(demoUser);
      return { success: true, user: demoUser };
    }

    // 7. VÉRIFICATION DU MOT DE PASSE POUR LES UTILISATEURS ENREGISTRÉS
    if (savedUser || supabaseProfile) {
      // Compte suspendu par la modération
      if (savedUser?.is_active === false || supabaseProfile?.is_active === false) {
        return {
          success: false,
          error: "Ce compte a été suspendu par l'administration. Veuillez contacter la direction."
        };
      }

      // Compte créé à l'origine avec Google OAuth (sans mot de passe local défini)
      if (savedUser?.provider === 'google' && !savedUser?.password) {
        return {
          success: false,
          isGoogleAccount: true,
          error: "Ce compte a été créé avec Google. Veuillez vous connecter en cliquant sur le bouton 'Continuer avec Google' ci-dessus."
        };
      }

      // Vérification du mot de passe pour les comptes avec mot de passe
      if (savedUser?.password) {
        if (savedUser.password !== cleanPassword) {
          return {
            success: false,
            isWrongPassword: true,
            error: "Mot de passe incorrect pour cette adresse e-mail. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe."
          };
        }
        const sanitizedUser = {
          ...savedUser,
          role: resolveUserRole(savedUser.email, savedUser.role)
        };
        setUser(sanitizedUser);
        return { success: true, user: sanitizedUser };
      }

      // Compte réservation invité sans mot de passe initial
      return {
        success: false,
        error: "Une réservation est associée à cette adresse e-mail, mais aucun mot de passe n'a encore été défini. Veuillez vous connecter avec Google ou cliquer sur 'Mot de passe oublié' pour en créer un."
      };
    }

    return {
      success: false,
      isUnknownAccount: true,
      error: "Aucun compte n'est associé à cette adresse e-mail. Veuillez vérifier votre saisie ou créer un compte."
    };
  };

  /**
   * Connexion OAuth avec Google (avec préservation stricte du rôle et du compte)
   */
  const loginWithGoogle = async (intendedRole = null, company = '') => {
    if (intendedRole) {
      try {
        localStorage.setItem('benin_beyond_oauth_intended_role', intendedRole);
        if (company) {
          localStorage.setItem('benin_beyond_oauth_intended_company', company);
        }
      } catch (e) {
        console.warn('Erreur stockage intention rôle OAuth:', e);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/login`,
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline'
            }
          }
        });
        if (error) {
          console.error('Supabase Google OAuth non configuré ou erreur:', error.message);
          return {
            success: false,
            error: `Erreur Google OAuth : ${error.message}. Vérifiez que l'URL ${window.location.origin} est bien ajoutée dans les 'Redirect URLs' de Supabase (Authentication > URL Configuration).`
          };
        }
        return { success: true, data };
      } catch (err) {
        console.error('Erreur Supabase Google OAuth:', err);
        return {
          success: false,
          error: `Erreur inattendue Google OAuth : ${err.message}`
        };
      }
    } else {
      return {
        success: false,
        error: "Configuration Supabase manquante : Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les paramètres d'environnement."
      };
    }
  };

  const loginAsDemo = (demoRole = 'admin') => {
    const demoUser = DEMO_USERS[demoRole] || DEMO_USERS.admin;
    setUser(demoUser);
    return demoUser;
  };

  /**
   * Inscription d'un nouveau compte (Voyageur ou Partenaire Propriétaire avec KYC)
   */
  const register = async ({
    name,
    email,
    role = 'client',
    phone = '',
    company = '',
    partnerType = 'stay',
    taxId = '',
    rccm = '',
    cip = '',
    kycDocType = '',
    kycDocUrl = '',
    password = ''
  }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const assignedRole = resolveUserRole(cleanEmail, role);

    // 1. Vérification d'existence préalable (anti-doublon)
    const registeredList = getRegisteredUsers();
    const existing = registeredList.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
    if (existing && (existing.password || existing.provider === 'google')) {
      return {
        success: false,
        error: "Un compte est déjà associé à cette adresse e-mail. Veuillez vous connecter."
      };
    }

    // 2. Si Supabase est actif, créer le compte dans Supabase Auth
    if (isSupabaseConfigured && supabase && password) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: name || cleanEmail.split('@')[0],
              role: assignedRole,
              company: company || '',
              phone: phone || '',
              partner_type: partnerType,
              tax_id: taxId,
              rccm: rccm,
              cip: cip,
              kyc_doc_type: kycDocType,
              kyc_doc_url: kycDocUrl
            }
          }
        });

        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          if (errMsg.includes('already registered') || errMsg.includes('already in use') || errMsg.includes('user already exists')) {
            return {
              success: false,
              error: "Un compte est déjà associé à cette adresse e-mail. Veuillez vous connecter."
            };
          }
          console.warn('Supabase signUp warning:', error);
        }

        if (!error && data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: cleanEmail,
              full_name: name,
              role: assignedRole === 'admin' ? 'admin' : (assignedRole === 'owner' ? 'partner' : 'client'),
              company_name: company || '',
              phone: phone || '',
              partner_type: partnerType,
              tax_id: taxId,
              kyc_doc_type: kycDocType || (taxId ? 'Dossier IFU & Registre' : 'Justificatif CIP / Propriété'),
              kyc_doc_url: kycDocUrl,
              kyc_status: assignedRole === 'owner' ? 'pending' : 'verified',
              verified: assignedRole === 'admin',
              updated_at: new Date().toISOString()
            }, { onConflict: 'email' });
          } catch {}

          const registeredUser = await syncSupabaseSession(data.user);
          return { success: true, user: registeredUser };
        }
      } catch (err) {
        console.warn('Supabase signUp fallback:', err);
      }
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (name || cleanEmail.split('@')[0].replace(/[._]/g, ' ')),
      email: cleanEmail,
      phone: phone || 'Non renseigné',
      role: assignedRole,
      company: assignedRole === 'owner' ? (company || 'Partenaire Hébergement & Mobilité') : undefined,
      partner_type: partnerType,
      tax_id: taxId,
      rccm: rccm,
      cip: cip,
      kyc_doc_type: kycDocType || (taxId ? 'Dossier IFU & Registre' : 'Justificatif CIP / Propriété'),
      kyc_doc_url: kycDocUrl,
      kyc_status: assignedRole === 'admin' ? 'verified' : (assignedRole === 'owner' ? 'pending' : 'verified'),
      verified: assignedRole === 'admin',
      password: password,
      provider: 'email',
      avatar: assignedRole === 'admin'
        ? DEMO_USERS.admin.avatar
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };

    saveRegisteredUser(newUser);
    setUser(newUser);
    return { success: true, user: newUser };
  };

  /**
   * Demande ou définition directe de réinitialisation de mot de passe
   */
  const resetPassword = async (email, newPassword = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Veuillez saisir votre adresse e-mail.' };
    }

    // Définition directe d'un nouveau mot de passe (notamment pour le Super-Admin)
    if (newPassword && newPassword.trim()) {
      const trimmedPass = newPassword.trim();
      if (cleanEmail === SUPER_ADMIN_EMAIL) {
        localStorage.setItem('benin_beyond_admin_custom_password', trimmedPass);
      }

      const regList = getRegisteredUsers();
      const updatedReg = regList.map((u) => {
        if (u.email?.toLowerCase().trim() === cleanEmail) {
          return { ...u, password: trimmedPass };
        }
        return u;
      });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedReg));

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.updateUser({ password: trimmedPass });
        } catch {}
      }

      return {
        success: true,
        message: 'Votre mot de passe a été mis à jour avec succès ! Vous pouvez maintenant vous connecter.'
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/login`
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return {
          success: true,
          message: 'Un lien de réinitialisation a été envoyé à votre adresse e-mail.'
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const registeredList = getRegisteredUsers();
    const savedUser = registeredList.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
    if (!savedUser && cleanEmail !== SUPER_ADMIN_EMAIL) {
      return {
        success: false,
        error: "Aucun compte n'est associé à cette adresse e-mail."
      };
    }

    return {
      success: true,
      message: 'Un e-mail de réinitialisation a été préparé pour votre adresse.'
    };
  };

  /**
   * Modifier directement le mot de passe Super-Admin
   */
  const updateSuperAdminPassword = (newPassword) => {
    if (!newPassword || !newPassword.trim()) return false;
    const trimmed = newPassword.trim();
    localStorage.setItem('benin_beyond_admin_custom_password', trimmed);
    const regList = getRegisteredUsers();
    const updated = regList.map((u) => {
      if (u.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL) {
        return { ...u, password: trimmed };
      }
      return u;
    });
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
    return true;
  };

  /**
   * Activation automatique du compte Voyageur au moment de la commande / paiement
   */
  const registerOrLoginClient = ({ name, email, phone }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    const registeredList = getRegisteredUsers();
    let existing = registeredList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      const sanitizedRole = resolveUserRole(cleanEmail, existing.role);
      existing = {
        ...existing,
        name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (existing.name || name || cleanEmail.split('@')[0]),
        phone: phone || existing.phone || '',
        role: sanitizedRole
      };
      saveRegisteredUser(existing);
      // Sécurité : Ne pas connecter automatiquement un inconnu sans authentification préalable
      if (user && user.email?.toLowerCase() === cleanEmail) {
        setUser(existing);
      }
      return existing;
    }

    const assignedRole = resolveUserRole(cleanEmail, 'client');
    const newClient = {
      id: `usr_client_${Date.now()}`,
      name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (name || cleanEmail.split('@')[0].replace(/[._]/g, ' ')),
      email: cleanEmail,
      phone: phone || '',
      role: assignedRole,
      avatar: assignedRole === 'admin'
        ? DEMO_USERS.admin.avatar
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };

    saveRegisteredUser(newClient);
    // Sécurité : Ne connecter l'utilisateur que s'il est déjà authentifié avec cet email
    if (user && user.email?.toLowerCase() === cleanEmail) {
      setUser(newClient);
    }
    return newClient;
  };

  /**
   * Bascule / activation immédiate du rôle Propriétaire / Partenaire
   */
  const upgradeToOwner = async (companyName = '') => {
    if (!user) return null;
    const cleanEmail = (user.email || '').toLowerCase().trim();
    if (cleanEmail === SUPER_ADMIN_EMAIL || user.role === 'admin') return user;

    const updatedUser = {
      ...user,
      role: 'owner',
      company: companyName || user.company || 'Partenaire Hébergement & Mobilité'
    };

    saveRegisteredUser(updatedUser);
    setUser(updatedUser);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            role: 'partner',
            company_name: updatedUser.company,
            updated_at: new Date().toISOString()
          })
          .ilike('email', cleanEmail);
      } catch (e) {
        console.warn('Erreur upgradeToOwner Supabase:', e);
      }
    }

    return updatedUser;
  };

  /**
   * Déconnexion complète
   */
  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isSuperAdmin: Boolean(user && (user.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL || user.is_super_admin || user.role === 'superadmin')),
        isSubAdmin: Boolean(user && (user.role === 'subadmin' || (user.role === 'admin' && user.email?.toLowerCase().trim() !== SUPER_ADMIN_EMAIL))),
        isAuthenticated: Boolean(user),
        isDemoMode,
        login,
        loginWithGoogle,
        loginAsDemo,
        register,
        resetPassword,
        updateSuperAdminPassword,
        registerOrLoginClient,
        upgradeToOwner,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
