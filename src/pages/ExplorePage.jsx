import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faSliders, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { ScrollReveal } from '../components/ScrollReveal';
import { getListings } from '../services/listingService';
import { getBookedRangesByListing } from '../services/bookingService';
import { useLanguage } from '../context/LanguageContext';

const todayIso = () => new Date().toISOString().slice(0, 10);

// Ville = première partie de la localisation (« Cotonou, Haie Vive » -> « Cotonou »)
const cityOf = (location) => String(location || '').split(/[,–]/)[0].trim();

const overlaps = (start, end, range) => start < range.end && end > range.start;

const FILTER_TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'stay', label: 'Séjourner' },
  { key: 'drive', label: 'Véhicules' }
];

export function ExplorePage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const rawTab = searchParams.get('type') ||
    (location.pathname === '/residences' || location.pathname === '/hebergements' ? 'stay' :
     location.pathname === '/vehicules' ? 'drive' : null);
  const currentTab = rawTab === 'stay' || rawTab === 'drive' ? rawTab : 'all';

  const visibleTabs = useMemo(() => {
    if (currentTab === 'stay') {
      return [{ key: 'stay', label: 'Séjourner' }];
    }
    if (currentTab === 'drive') {
      return [{ key: 'drive', label: 'Véhicules' }];
    }
    return FILTER_TABS;
  }, [currentTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('featured');
  const [listings, setListings] = useState([]);
  const [bookedRanges, setBookedRanges] = useState(new Map());
  const [loading, setLoading] = useState(true);

  // Filtres de recherche (gardés dans l'adresse pour pouvoir partager une recherche)
  const city = searchParams.get('city') || '';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const minCapacity = Number(searchParams.get('min')) || 0;
  const maxPrice = Number(searchParams.get('max')) || 0;
  const hasDates = Boolean(startDate && endDate && endDate > startDate);
  const hasFilters = Boolean(city || startDate || endDate || minCapacity || maxPrice);

  const setFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === '' || value === null || value === undefined || value === 0) params.delete(key);
    else params.set(key, String(value));
    // La date de fin ne peut pas précéder la date de début
    if (key === 'start' && value && params.get('end') && params.get('end') <= value) params.delete('end');
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    ['city', 'start', 'end', 'min', 'max'].forEach((k) => params.delete(k));
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getBookedRangesByListing()
      .then((map) => {
        if (mounted) setBookedRanges(map);
      })
      .catch(() => {});
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

    // Strict separation: Stays vs Vehicles (Zero cross-contamination)
    if (currentTab === 'stay') {
      result = result.filter(
        (item) =>
          (item.type === 'stay' || item.subcategory === 'villa' || item.subcategory === 'hotel') &&
          item.type !== 'drive' &&
          item.subcategory !== 'car'
      );
    } else if (currentTab === 'drive') {
      result = result.filter((item) => item.type === 'drive' || item.subcategory === 'car');
    }

    // Ville
    if (city) {
      result = result.filter((item) => cityOf(item.location).toLowerCase() === city.toLowerCase());
    }

    // Dates : période d'ouverture du bien et réservations existantes
    if (hasDates) {
      result = result.filter((item) => {
        const from = item.availability?.available_from;
        const to = item.availability?.available_to;
        if (from && startDate < String(from).slice(0, 10)) return false;
        if (to && endDate > String(to).slice(0, 10)) return false;
        const ranges = bookedRanges.get(String(item.id)) || [];
        return !ranges.some((range) => overlaps(startDate, endDate, range));
      });
    }

    // Chambres (logements) ou places (véhicules) minimum
    if (minCapacity) {
      result = result.filter((item) => {
        const isVehicle = item.type === 'drive' || item.subcategory === 'car';
        const capacity = isVehicle ? Number(item.vehicle_seats) || 0 : Number(item.rooms_count) || 0;
        return capacity >= minCapacity;
      });
    }

    // Budget maximum (par nuit ou par jour)
    if (maxPrice) {
      result = result.filter((item) => Number(item.price) <= maxPrice);
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
  }, [listings, currentTab, searchQuery, sortOption, city, hasDates, startDate, endDate, minCapacity, maxPrice, bookedRanges]);

  const cities = useMemo(
    () => [...new Set(listings.map((item) => cityOf(item.location)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [listings]
  );

  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      <ScrollReveal delay={0} y={20}>
        <SectionHeader
          label={currentTab === 'stay' ? t("Hébergements") : currentTab === 'drive' ? t("Mobilité") : t("Catalogue")}
          title={currentTab === 'stay' ? t("Séjourner au Bénin") : currentTab === 'drive' ? t("Véhicules & Déplacements") : t("Explorer le Bénin")}
        />
      </ScrollReveal>

      {/* Barre de filtres et recherche */}
      <ScrollReveal delay={60} y={20} className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Onglets d'univers */}
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => {
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
                {t(tab.label)}
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
              placeholder={t("Rechercher un lieu, un titre…")}
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
              <option value="featured">{t("Mis en avant")}</option>
              <option value="recent">{t("Plus récents")}</option>
              <option value="price-asc">{t("Prix croissant")}</option>
              <option value="price-desc">{t("Prix décroissant")}</option>
            </select>
          </div>
        </div>
      </ScrollReveal>

      {/* Filtres : ville, dates, capacité, budget */}
      <ScrollReveal delay={80} y={15} className="mt-4">
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-foreground/10 bg-card p-4 sm:grid-cols-3 lg:grid-cols-5">
          <label className="col-span-2 block sm:col-span-1">
            <span className="text-[11px] font-medium text-foreground/50">{t('Ville')}</span>
            <select
              value={city}
              onChange={(e) => setFilter('city', e.target.value)}
              className="mt-1 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">{t('Toutes les villes')}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/50">
              {currentTab === 'drive' ? t('Prise en charge') : t('Arrivée')}
            </span>
            <input
              type="date"
              value={startDate}
              min={todayIso()}
              onChange={(e) => setFilter('start', e.target.value)}
              className="mt-1 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/50">
              {currentTab === 'drive' ? t('Restitution') : t('Départ')}
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || todayIso()}
              onChange={(e) => setFilter('end', e.target.value)}
              className="mt-1 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/50">
              {currentTab === 'drive' ? t('Places (min.)') : currentTab === 'stay' ? t('Chambres (min.)') : t('Chambres / places (min.)')}
            </span>
            <select
              value={minCapacity || ''}
              onChange={(e) => setFilter('min', Number(e.target.value) || '')}
              className="mt-1 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">{t('Indifférent')}</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/50">{t('Budget max. (FCFA)')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="5000"
              value={maxPrice || ''}
              onChange={(e) => setFilter('max', Number(e.target.value) || '')}
              placeholder={t('Sans limite')}
              className="mt-1 w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
      </ScrollReveal>

      {/* Compteur de résultats */}
      <ScrollReveal delay={100} y={15} className="mt-4 flex items-center gap-3 text-sm text-foreground/50">
        <span>{t('{n} résultat(s)', { n: filteredListings.length })}</span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-foreground/15 px-2.5 py-0.5 text-xs text-foreground/70 hover:bg-muted"
          >
            <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
            <span>{t('Effacer les filtres')}</span>
          </button>
        )}
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
            <h3 className="font-heading text-lg font-bold text-foreground">{t("Catalogue prêt pour de nouvelles annonces")}</h3>
            <p className="mt-2 text-xs text-foreground/60 leading-relaxed">
              {t("Aucun bien ou véhicule ne correspond à vos filtres actuels. Vous êtes hôtelier, propriétaire ou loueur au Bénin ? Publiez directement vos disponibilités sur Bénin Beyond.")}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
              >
                <span>{t("Devenir hôte certifié")}</span>
              </Link>
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
