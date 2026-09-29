import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse,
  faBed,
  faCar,
  faCompass,
  faLayerGroup,
  faBagShopping,
  faGaugeHigh,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Accueil', faIcon: faHouse },
  { to: '/explore?type=stay', label: 'Séjourner', faIcon: faBed, match: 'stay' },
  { to: '/explore?type=drive', label: 'Véhicules', faIcon: faCar, match: 'drive' },
  { to: '/decouvertes', label: 'Découvertes', faIcon: faCompass, isDecouvertes: true },
  { to: '/packs', label: 'Packs', faIcon: faLayerGroup, isPack: true },
  { to: '/panier', label: 'Panier', faIcon: faBagShopping, cart: true }
];

export function Navbar() {
  const { count } = useCart();
  const { user, role } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentType = searchParams.get('type');

  const authTarget = user
    ? (role === 'admin' || user.role === 'admin' ? '/admin' : role === 'partner' || user.role === 'partner' ? '/dashboard/partner' : '/dashboard/client')
    : '/login';

  const authLabel = user
    ? (role === 'admin' || user.role === 'admin' ? 'Cockpit' : role === 'partner' || user.role === 'partner' ? 'Dashboard' : 'Espace')
    : 'Connexion';

  const authIcon = user ? faGaugeHigh : faUser;

  const navItems = [
    ...BASE_NAV_ITEMS,
    { to: authTarget, label: authLabel, faIcon: authIcon, isAuth: true }
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-2 w-[calc(100%-1rem)] max-w-xl">
      <div className="glass-bar flex items-center justify-between rounded-full border border-foreground/10 px-2 py-2 shadow-2xl shadow-foreground/10">
        {navItems.map((item) => {
          const isActive = item.isAuth
            ? (user ? (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin')) : location.pathname === '/login')
            : item.isPack
            ? location.pathname === '/packs' || location.pathname.startsWith('/pack/')
            : item.isDecouvertes
            ? location.pathname === '/decouvertes' || location.pathname === '/tourisme' || location.pathname === '/decouvrir'
            : item.match
            ? location.pathname === '/explore' && currentType === item.match
            : location.pathname === item.to && !currentType;

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1.5 py-1.5 text-[10px] font-medium transition-colors sm:text-xs ${
                isActive
                  ? 'text-primary'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={item.faIcon} className="h-4 w-4 mb-0.5" />
              <span className="hidden sm:block truncate">{item.label}</span>
              {item.cart && count > 0 && (
                <span
                  key={count}
                  className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground font-bold shadow-md animate-bounceBadge"
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
