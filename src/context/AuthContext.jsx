import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'benin_beyond_user';

export const DEMO_USERS = {
  admin: {
    id: 'usr_admin_01',
    name: 'Gilles A. (Super Admin)',
    email: 'admin@beninbeyond.bj',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    title: 'Directeur Plateforme & Modération'
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
    membership: 'Voyageur Privilège'
  }
};

const REGISTERED_USERS_KEY = 'benin_beyond_registered_users';

function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUser(newUser) {
  try {
    const list = getRegisteredUsers();
    const filtered = list.filter((u) => u.email.toLowerCase() !== newUser.email.toLowerCase());
    filtered.push(newUser);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save registered user:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDemoMode, setIsDemoMode] = useState(() => {
    return Boolean(user && user.email?.includes('beninbeyond.bj'));
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setIsDemoMode(Boolean(user.email?.includes('beninbeyond.bj')));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsDemoMode(false);
    }
  }, [user]);

  const login = (email, password, optionalRole = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Détection automatique et exclusive de l'Administrateur par son email unique
    const isAdminEmail =
      cleanEmail === 'admin@beninbeyond.bj' ||
      cleanEmail === 'admin@beninbeyond.com' ||
      cleanEmail === 'direction@beninbeyond.bj' ||
      cleanEmail.startsWith('admin@');

    if (isAdminEmail) {
      const adminUser = {
        ...DEMO_USERS.admin,
        email: cleanEmail,
        name: cleanEmail === 'admin@beninbeyond.bj' ? DEMO_USERS.admin.name : `Admin (${cleanEmail.split('@')[0]})`
      };
      setUser(adminUser);
      return { success: true, user: adminUser };
    }

    // 2. Vérification des comptes de démonstration prédéfinis
    const demoMatch = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (demoMatch) {
      setUser(demoMatch);
      return { success: true, user: demoMatch };
    }

    // 3. Recherche dans les comptes enregistrés sur la plateforme
    const registeredList = getRegisteredUsers();
    const savedUser = registeredList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (savedUser) {
      setUser(savedUser);
      return { success: true, user: savedUser };
    }

    // 4. Nouvel utilisateur se connectant directement : rôle automatique (propriétaire si spécifié, sinon voyageur/client)
    const determinedRole = optionalRole || 'client';
    const newUser = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0].replace(/[._]/g, ' '),
      email: cleanEmail,
      role: determinedRole,
      company: determinedRole === 'owner' ? 'Partenaire Hébergeur / Auto' : undefined,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };

    saveRegisteredUser(newUser);
    setUser(newUser);
    return { success: true, user: newUser };
  };

  const loginAsDemo = (demoRole = 'admin') => {
    const demoUser = DEMO_USERS[demoRole] || DEMO_USERS.admin;
    setUser(demoUser);
    return demoUser;
  };

  const register = ({ name, email, role = 'client', company = '' }) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Protection : si l'utilisateur s'inscrit avec l'email admin
    const isAdminEmail =
      cleanEmail === 'admin@beninbeyond.bj' ||
      cleanEmail === 'admin@beninbeyond.com' ||
      cleanEmail.startsWith('admin@');

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name || email.split('@')[0].replace(/[._]/g, ' '),
      email: cleanEmail,
      role: isAdminEmail ? 'admin' : (role || 'client'),
      company: role === 'owner' ? (company || 'Partenaire Hébergement & Mobilité') : undefined,
      verified: role === 'owner' ? false : true,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };

    saveRegisteredUser(newUser);
    setUser(newUser);
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: Boolean(user),
        isDemoMode,
        login,
        loginAsDemo,
        register,
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
