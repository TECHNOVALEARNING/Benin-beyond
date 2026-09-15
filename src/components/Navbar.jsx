import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, BedDouble, Car, Compass, Layers, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: House },
  { to: '/explore?type=stay', label: 'Séjourner', icon: BedDouble, match: 'stay' },
  { to: '/explore?type=drive', label: 'Conduire', icon: Car, match: 'drive' },
  { to: '/tourisme', label: 'Tourisme', icon: Compass, isTourisme: true },
  { to: '/packs', label: 'Packs', icon: Layers, isPack: true },
  { to: '/panier', label: 'Panier', icon: ShoppingBag, cart: true }
];

export function Navbar() {
  const { count } = useCart();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentType = searchParams.get('type');

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-2 w-[calc(100%-1rem)] max-w-xl">
      <div className="glass-bar flex items-center justify-between rounded-full border border-foreground/10 px-2 py-2 shadow-2xl shadow-foreground/10">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isPack
            ? location.pathname === '/packs' || location.pathname.startsWith('/pack/')
            : item.isTourisme
            ? location.pathname === '/tourisme' || location.pathname === '/decouvrir'
            : item.match
            ? location.pathname === '/explore' && currentType === item.match
            : location.pathname === item.to && !currentType;

          return (
            <Link
              key={item.label}
              to={item.to}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-[11px] font-medium transition-colors md:text-xs ${
                isActive
                  ? 'text-primary'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="hidden sm:block">{item.label}</span>
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
