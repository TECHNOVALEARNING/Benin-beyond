import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Composant de protection des routes sensibles.
 * Vérifie que l'utilisateur est authentifié et possède le rôle requis.
 * 
 * @param {React.ReactNode} children - Le contenu de la route protégée
 * @param {string[]} allowedRoles - Rôles autorisés (ex: ['admin', 'subadmin'])
 * @param {string} redirectTo - URL de redirection si non autorisé (défaut: '/login')
 */
export function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/login' }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // 1. Pas connecté → redirection vers login avec retour prévu
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 2. Rôle insuffisant → redirection vers le dashboard approprié
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Si la route est destinée aux propriétaires/partenaires, vérifier si l'utilisateur a soumis son KYC propriétaire
    const isOwnerTargetRoute = allowedRoles.some((r) => r === 'owner' || r === 'partner');
    if (isOwnerTargetRoute && user.role === 'client') {
      try {
        const rawApps = localStorage.getItem('benin_beyond_owner_applications');
        if (rawApps) {
          const apps = JSON.parse(rawApps);
          const hasOwnerApp = apps.some(
            (a) =>
              (String(a.user_id) === String(user.id) ||
                (a.owner_email && a.owner_email.toLowerCase() === user.email?.toLowerCase())) &&
              ['submitted', 'under_review', 'approved', 'additional_info_required'].includes(a.status)
          );
          if (hasOwnerApp) {
            return children;
          }
        }
      } catch {}
    }

    const fallback =
      user.role === 'admin' || user.role === 'subadmin' || user.role === 'superadmin'
        ? '/admin'
        : user.role === 'owner' || user.role === 'partner'
        ? '/dashboard/partner'
        : '/dashboard/client';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
