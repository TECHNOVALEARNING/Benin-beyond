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

  const login = (email, password, role = 'client') => {
    // Normal login or demo lookup
    const demoMatch = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (demoMatch) {
      setUser(demoMatch);
      return { success: true, user: demoMatch };
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: role || 'client',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
    };

    setUser(newUser);
    return { success: true, user: newUser };
  };

  const loginAsDemo = (demoRole = 'admin') => {
    const demoUser = DEMO_USERS[demoRole] || DEMO_USERS.admin;
    setUser(demoUser);
    return demoUser;
  };

  const register = ({ name, email, role = 'client', company = '' }) => {
    const newUser = {
      id: `usr_${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      role,
      company: role === 'owner' ? company || 'Partenaire Immobilier / Auto' : undefined,
      verified: role === 'owner' ? false : true,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date().toISOString()
    };
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
