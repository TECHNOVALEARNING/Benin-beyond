import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faUser,
  faGaugeHigh,
  faBagShopping,
  faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function PublicHeader() {
  const { user, role, logout } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-foreground/10 bg-background/85 backdrop-blur-xl transform-gpu">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 md:px-12 gap-3">
        {/* Brand Logo */}
        <Link to="/" className="hover:opacity-95 transition-opacity group flex items-center shrink-0">
          <BrandLogo size="md" textColor="text-foreground" />
        </Link>

        {/* Right CTA & Account */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {(!user || (user.role !== 'owner' && user.role !== 'partner' && user.role !== 'admin')) && (
            <Link
              to="/register"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-foreground/20 hover:border-accent/50 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:text-accent transition-all active:scale-95 group"
              title="Devenir Hôte Bénin Beyond"
              aria-label="Devenir Hôte"
            >
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-accent transition-transform group-hover:scale-110" />
              <span>Devenir Hôte</span>
            </Link>
          )}

          <Link
            to="/panier"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"
            title="Consulter mon panier"
            aria-label="Panier"
          >
            <FontAwesomeIcon icon={faBagShopping} className="h-3.5 w-3.5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to={
                  role === 'admin' || role === 'subadmin' || user?.role === 'admin' || user?.role === 'subadmin'
                    ? '/admin'
                    : role === 'partner' || user?.role === 'partner'
                    ? '/dashboard/partner'
                    : '/dashboard/client'
                }
                className="inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded-full bg-primary p-0 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95 group"
                title={
                  role === 'admin' || role === 'subadmin' || user?.role === 'admin' || user?.role === 'subadmin'
                    ? 'Cockpit Admin'
                    : role === 'partner' || user?.role === 'partner'
                    ? 'Dashboard Hôte'
                    : 'Mon Espace'
                }
                aria-label="Accéder à votre espace"
              >
                <FontAwesomeIcon icon={faGaugeHigh} className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">
                  {role === 'admin' || role === 'subadmin' || user?.role === 'admin' || user?.role === 'subadmin'
                    ? 'Cockpit Admin'
                    : role === 'partner' || user?.role === 'partner'
                    ? 'Dashboard Hôte'
                    : 'Mon Espace'}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/login"
                className="inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded-full border border-foreground/20 p-0 sm:px-3.5 sm:py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all active:scale-95 group"
                title="Se connecter à votre compte"
                aria-label="Connexion"
              >
                <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">Connexion</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
