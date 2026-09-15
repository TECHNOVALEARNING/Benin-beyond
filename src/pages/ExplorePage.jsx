import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { ScrollReveal } from '../components/ScrollReveal';
import { getListings } from '../services/listingService';

const FILTER_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'stay', label: 'Séjourner' },
  { key: 'drive', label: 'Conduire' }
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
    } else if (sortOption === 'rating') {
      result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              strokeWidth={1.5}
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
            <SlidersHorizontal
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
              strokeWidth={1.5}
            />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full appearance-none rounded-full border border-foreground/15 bg-card py-2 pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary sm:w-52 cursor-pointer"
            >
              <option value="featured">Mis en avant</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="rating">Mieux notés</option>
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
          <div className="py-24 text-center text-foreground/50">
            Aucun résultat. Affinez votre recherche.
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
