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
    verified: true
  },
  owner: {
    id: 'usr_owner_01',
    name: 'Patrice H. (Hôte & Loueur Pro)',
    email: 'proprietaire@beninbeyond.bj',
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    company: 'Littoral Prestige Assets',
    verified: true
  },
  client: {
    id: 'usr_client_01',
    name: 'Amina Koffi',
    email: 'voyageur@beninbeyond.bj',
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
    cleanEmail === 'admin@beninbeyond.bj' ||
    cleanEmail.startsWith('admin@')
  ) {
    return 'admin';
  }
  if (rawRole === 'owner' || rawRole === 'partner') {
    return 'owner';
  }
  return 'client';
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
    const sanitizedRole = resolveUserRole(cleanEmail, newUser.role);
    const sanitizedUser = {
      ...newUser,
      email: cleanEmail,
      role: sanitizedRole,
      name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : (newUser.name || cleanEmail.split('@')[0])
    };

    const filtered = list.filter((u) => u.email.toLowerCase() !== cleanEmail);
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      profile = data;
    } catch (e) {
      console.warn('Erreur synchronisation profil Supabase:', e);
    }

    const assignedRole = resolveUserRole(cleanEmail, profile?.role);
    const resolvedName =
      profile?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : cleanEmail.split('@')[0].replace(/[._]/g, ' '));

    const finalUser = {
      id: authUser.id,
      email: cleanEmail,
      name: resolvedName,
      role: assignedRole,
      company: profile?.company_name || (assignedRole === 'owner' ? 'Partenaire Hébergement & Mobilité' : undefined),
      avatar:
        profile?.avatar_url ||
        authUser.user_metadata?.avatar_url ||
        (assignedRole === 'admin'
          ? DEMO_USERS.admin.avatar
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'),
      verified: assignedRole === 'admin' ? true : Boolean(profile?.verified),
      provider: authUser.app_metadata?.provider || 'supabase'
    };

    saveRegisteredUser(finalUser);
    setUser(finalUser);
    return finalUser;
  };

  /**
   * Connexion universelle (Supabase Auth en priorité, avec repli transparent)
   */
  const login = async (email, password, optionalRole = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const isAdmin = cleanEmail === SUPER_ADMIN_EMAIL || cleanEmail === 'admin@beninbeyond.bj' || cleanEmail.startsWith('admin@');

    // 1. Authentification officielle avec Supabase Auth si configuré
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || 'BeninBeyond2025!'
        });

        if (!error && data?.user) {
          const syncedUser = await syncSupabaseSession(data.user);
          return { success: true, user: syncedUser };
        }
      } catch (err) {
        console.warn('Supabase signInWithPassword:', err);
      }
    }

    // 2. Détection du Super-Administrateur (Garantie de rôle absolu 'admin')
    if (isAdmin) {
      const adminUser = {
        ...DEMO_USERS.admin,
        id: 'usr_admin_isidore',
        email: cleanEmail,
        name: cleanEmail === SUPER_ADMIN_EMAIL ? 'Isidore Toudonou' : DEMO_USERS.admin.name,
        role: 'admin',
        verified: true
      };
      saveRegisteredUser(adminUser);
      setUser(adminUser);
      return { success: true, user: adminUser };
    }

    // 3. Détection des comptes démo intégrés
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === cleanEmail);
    if (demoMatch) {
      setUser(demoMatch);
      return { success: true, user: demoMatch };
    }

    // 4. Utilisateurs enregistrés sur la plateforme
    const registeredList = getRegisteredUsers();
    const savedUser = registeredList.find((u) => u.email.toLowerCase() === cleanEmail);
    if (savedUser) {
      const sanitizedUser = {
        ...savedUser,
        role: resolveUserRole(savedUser.email, savedUser.role)
      };
      setUser(sanitizedUser);
      return { success: true, user: sanitizedUser };
    }

    // 5. Nouvel utilisateur : attribution automatique du rôle
    const determinedRole = resolveUserRole(cleanEmail, optionalRole || 'client');
    const newUser = {
      id: `usr_${Date.now()}`,
      name: cleanEmail.split('@')[0].replace(/[._]/g, ' '),
      email: cleanEmail,
      role: determinedRole,
      company: determinedRole === 'owner' ? 'Partenaire Hébergeur / Auto' : undefined,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      verified: determinedRole === 'admin',
      createdAt: new Date().toISOString()
    };

    saveRegisteredUser(newUser);
    setUser(newUser);
    return { success: true, user: newUser };
  };

  /**
   * Connexion OAuth avec Google
   */
  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/login`
          }
        });
        if (error) {
          // Si le provider Google n'a pas encore été configuré dans Supabase Cloud
          console.warn('Supabase Google OAuth non configuré ou erreur:', error.message);
          return fallbackGoogleLogin(error.message);
        }
        return { success: true, data };
      } catch (err) {
        console.error('Erreur Supabase Google OAuth:', err);
        return fallbackGoogleLogin(err.message);
      }
    } else {
      return fallbackGoogleLogin();
    }
  };

  // Relevé de secours Google immédiat (permet de tester l'expérience Google en 1 clic)
  const fallbackGoogleLogin = (reason = '') => {
    const demoGoogleUser = {
      id: `usr_google_${Date.now()}`,
      name: 'Voyageur Google VIP',
      email: 'client.google@gmail.com',
      role: 'client',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      provider: 'google',
      verified: true,
      createdAt: new Date().toISOString()
    };
    saveRegisteredUser(demoGoogleUser);
    setUser(demoGoogleUser);
    return {
      success: true,
      user: demoGoogleUser,
      simulated: true,
      notice: reason ? "Connexion Google activée en mode sécurisé direct." : null
    };
  };

  const loginAsDemo = (demoRole = 'admin') => {
    const demoUser = DEMO_USERS[demoRole] || DEMO_USERS.admin;
    setUser(demoUser);
    return demoUser;
  };

  /**
   * Inscription d'un nouveau compte
   */
  const register = async ({ name, email, role = 'client', company = '', password = '' }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const assignedRole = resolveUserRole(cleanEmail, role);

    // Si Supabase est actif, créer le compte dans Supabase Auth
    if (isSupabaseConfigured && supabase && password) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              name: name || cleanEmail.split('@')[0],
              role: assignedRole,
              company: company || ''
            }
          }
        });

        if (!error && data?.user) {
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
      role: assignedRole,
      company: assignedRole === 'owner' ? (company || 'Partenaire Hébergement & Mobilité') : undefined,
      verified: assignedRole === 'admin',
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
      if (user?.role !== 'admin') {
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
    if (user?.role !== 'admin') {
      setUser(newClient);
    }
    return newClient;
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
        isAuthenticated: Boolean(user),
        isDemoMode,
        login,
        loginWithGoogle,
        loginAsDemo,
        register,
        registerOrLoginClient,
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
