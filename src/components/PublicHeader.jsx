import React from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const currentType = searchParams.get('type');

  const navLinks = [
    { to: '/explore?type=stay', label: 'Séjourner', active: location.pathname === '/explore' && currentType === 'stay' },
    { to: '/explore?type=drive', label: 'Véhicules', active: location.pathname === '/explore' && currentType === 'drive' },
    { to: '/decouvertes', label: 'Découvertes', active: location.pathname === '/decouvertes' || location.pathname === '/tourisme' },
    { to: '/packs', label: 'Packs', active: location.pathname === '/packs' || location.pathname.startsWith('/pack/') }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-foreground/10 bg-background/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-3.5 md:px-12">
        {/* Brand Logo */}
        <Link to="/" className="hover:opacity-95 transition-opacity group flex items-center">
          <BrandLogo size="md" textColor="text-foreground" subtext="Hospitalité & Mobilité" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full border border-foreground/10 bg-muted/40 p-1 text-xs font-semibold">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-full px-4 py-1.5 transition-colors ${
                link.active
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-foreground/75 hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right CTA & Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {(!user || (user.role !== 'owner' && user.role !== 'partner' && user.role !== 'admin')) && (
            <Link
              to="/register?type=owner"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-accent" />
              <span>Espace Propriétaire</span>
            </Link>
          )}

          <Link
            to="/panier"
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-all"
            title="Consulter mon panier"
          >
            <FontAwesomeIcon icon={faBagShopping} className="h-3.5 w-3.5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white shadow-sm">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                to={
                  role === 'admin' || user?.role === 'admin'
                    ? '/admin'
                    : role === 'partner' || user?.role === 'partner'
                    ? '/dashboard/partner'
                    : '/dashboard/client'
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95"
              >
                <FontAwesomeIcon icon={faGaugeHigh} className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {role === 'admin' || user?.role === 'admin'
                    ? 'Cockpit Admin'
                    : role === 'partner' || user?.role === 'partner'
                    ? 'Dashboard Partenaire'
                    : 'Mon Espace'}
                </span>
                <span className="sm:hidden">Espace</span>
              </Link>

              <button
                type="button"
                onClick={() => logout()}
                title="Déconnexion"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faUser} className="h-3 w-3" />
              <span>Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
