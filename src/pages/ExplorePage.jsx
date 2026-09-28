import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSliders } from '@fortawesome/free-solid-svg-icons';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { ScrollReveal } from '../components/ScrollReveal';
import { getListings } from '../services/listingService';

const FILTER_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'stay', label: 'Séjourner' },
  { key: 'drive', label: 'Véhicules' }
];

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('type');
  const currentTab = rawTab === 'stay' || rawTab === 'drive' ? rawTab : 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('featured');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getListings()
      .then((data) => {
        if (mounted) setListings(data);
      })
      .catch(() => {
        if (mounted) setListings([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleTabChange = (key) => {
    const params = new URLSearchParams(searchParams);
    if (key === 'all') {
      params.delete('type');
    } else {
      params.set('type', key);
    }
    setSearchParams(params);
  };

  const filteredListings = useMemo(() => {
    let result = listings;

    // Filter by category
    if (currentTab !== 'all') {
      result = result.filter((item) => item.type === currentTab);
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.summary?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortOption === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortOption === 'recent') {
      result = [...result].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    } else if (sortOption === 'featured') {
      result = [...result].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [listings, currentTab, searchQuery, sortOption]);

  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      <ScrollReveal delay={0} y={20}>
        <SectionHeader label="Catalogue" title="Explorer le Bénin" />
      </ScrollReveal>

      {/* Barre de filtres et recherche */}
      <ScrollReveal delay={60} y={20} className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Onglets d'univers */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-foreground/15 text-foreground/70 hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Recherche et Tri */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Recherche */}
          <div className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un lieu, un titre…"
              className="w-full rounded-full border border-foreground/15 bg-card py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary sm:w-64"
            />
          </div>

          {/* Sélecteur de tri */}
          <div className="relative">
            <FontAwesomeIcon
              icon={faSliders}
              className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40"
            />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full appearance-none rounded-full border border-foreground/15 bg-card py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary sm:w-52 cursor-pointer"
            >
              <option value="featured">Mis en avant</option>
              <option value="recent">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>
        </div>
      </ScrollReveal>

      {/* Compteur de résultats */}
      <ScrollReveal delay={100} y={15} className="mt-4 text-sm text-foreground/50">
        {filteredListings.length} résultat(s)
      </ScrollReveal>

      {/* Grille Mosaïque Exacte */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="aspect-[4/3] animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-foreground/15 bg-card/50 p-8 max-w-xl mx-auto backdrop-blur-sm">
            <h3 className="font-heading text-lg font-bold text-foreground">Catalogue prêt pour de nouvelles annonces</h3>
            <p className="mt-2 text-xs text-foreground/60 leading-relaxed">
              Aucun bien ou véhicule ne correspond à vos filtres actuels. Vous êtes hôtelier, propriétaire ou loueur au Bénin ? Publiez directement vos disponibilités sur Bénin Beyond.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
              >
                <span>Publier une annonce</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {filteredListings.map((item, idx) => {
              const isFeatured = Boolean(item.featured);
              const staggerDelay = (idx % 4) * 80;
              return (
                <ScrollReveal
                  key={item.id}
                  delay={staggerDelay}
                  className={isFeatured ? 'col-span-1 md:col-span-2 h-full' : 'col-span-1 h-full'}
                >
                  <ListingCard listing={item} featured={isFeatured} />
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
