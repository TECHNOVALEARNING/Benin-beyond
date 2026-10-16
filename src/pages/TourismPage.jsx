import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUtensils,
  faLocationDot,
  faBed,
  faCar,
  faArrowRight,
  faCircleInfo,
  faCompass,
  faScissors,
  faPhone,
  faPlus,
  faShieldHalved,
  faHouse,
  faTag,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { ScrollReveal } from '../components/ScrollReveal';
import { getDiscoveries, INITIAL_DISCOVERIES } from '../services/discoveryService';
import { ProviderRegistrationModal } from '../components/ProviderRegistrationModal';

const CATEGORIES = [
  { key: 'all', label: 'Toutes les Découvertes', icon: faCompass },
  { key: 'restaurants', label: 'Gastronomie & Restaurants', icon: faUtensils, badge: 'Gratuit' },
  { key: 'services', label: 'Autres Services & À Domicile', icon: faScissors, badge: '500 FCFA' }
];

const SERVICE_SUBCATEGORIES = [
  { key: 'all', label: 'Toutes prestations' },
  { key: 'coiffure', label: 'Coiffure & Tresses' },
  { key: 'onglerie', label: 'Onglerie & Pédicure' },
  { key: 'soins', label: 'Soins & Massages' },
  { key: 'chef', label: 'Chef Privé en Villa' },
  { key: 'pressing', label: 'Blanchisserie Express' }
];

export function TourismPage() {
  const [discoveries, setDiscoveries] = useState(INITIAL_DISCOVERIES);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Charger les découvertes (Supabase + fallback local)
  useEffect(() => {
    let isMounted = true;
    getDiscoveries().then((data) => {
      if (isMounted && data && data.length > 0) {
        setDiscoveries(data);
      }
    });

    const handleUpdate = (e) => {
      if (e.detail) {
        setDiscoveries(e.detail);
      } else {
        getDiscoveries().then((data) => {
          if (isMounted && data) setDiscoveries(data);
        });
      }
    };

    window.addEventListener('benin_beyond_discoveries_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('benin_beyond_discoveries_updated', handleUpdate);
    };
  }, []);

  // Filtrage selon catégorie principale et sous-catégorie
  const filteredSites = discoveries.filter((site) => {
    if (selectedCategory !== 'all' && site.category !== selectedCategory) {
      return false;
    }
    if (selectedCategory === 'services' && selectedSubcategory !== 'all') {
      return site.subcategory === selectedSubcategory;
    }
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* 1. Hero Section Découvertes */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 mx-auto max-w-8xl px-6 md:px-12">
          <ScrollReveal delay={0} y={20}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <span className="caption text-accent font-semibold tracking-widest text-xs uppercase inline-block">
                Gastronomie & Prestations de Prestige en Villa
              </span>

              {/* Bouton Pro / Prestataire */}
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/25 transition-all shadow-sm active:scale-95"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                <span>Référencer mon Activité (Resto Gratuit / Service 500F)</span>
              </button>
            </div>
            
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight">
              Gastronomie & Services à Domicile
            </h1>

            <p className="mt-6 max-w-3xl text-base sm:text-lg text-secondary-foreground/80 leading-relaxed">
              Explorez les meilleures adresses culinaires du Bénin (inscription 100% gratuite pour les restaurateurs) ainsi que notre catalogue exclusif de <strong>prestataires à domicile</strong> (coiffure, onglerie, soins & massages, chefs privés, pressing) intervenant directement dans votre villa ou appartement privé.
            </p>

            {/* Note informative & Conciergerie */}
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-secondary-foreground/90">
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-accent" />
                <span>
                  Établissements gastronomiques et prestataires certifiés par Bénin Beyond.
                </span>
              </div>

              <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-primary" />
                <span>
                  Intervention possible directement dans votre hébergement de vacances.
                </span>
              </div>
            </div>
          </ScrollReveal>

          {/* Filtres par Catégorie Principale */}
          <ScrollReveal delay={100} y={20} className="mt-12 flex flex-wrap gap-2.5">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setSelectedSubcategory('all');
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/20 font-bold scale-[1.02]'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  <FontAwesomeIcon icon={cat.icon} className="h-4 w-4" />
                  <span>{cat.label}</span>
                  {cat.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      cat.key === 'restaurants'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-amber-400 text-slate-950 shadow-xs'
                    }`}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </ScrollReveal>

          {/* Sous-filtres pour la section "Autres Services & À Domicile" */}
          {selectedCategory === 'services' && (
            <ScrollReveal delay={150} y={15} className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <span className="text-xs text-secondary-foreground/60 flex items-center gap-1.5 mr-2">
                <FontAwesomeIcon icon={faFilter} className="h-3 w-3 text-accent" />
                <span>Spécialités :</span>
              </span>
              {SERVICE_SUBCATEGORIES.map((sub) => {
                const isSubActive = selectedSubcategory === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => setSelectedSubcategory(sub.key)}
                    className={`rounded-full px-3.5 py-1 text-xs transition-all ${
                      isSubActive
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* 2. Bannière d'appel à destination des Restaurateurs et Prestataires de Services */}
      <section className="bg-gradient-to-r from-primary/10 via-card to-accent/10 border-b border-foreground/10 py-6 px-6 md:px-12">
        <div className="mx-auto max-w-8xl flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20 shrink-0">
              <FontAwesomeIcon icon={faScissors} className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-sm font-extrabold text-foreground">
                  Restaurateurs & Professionnels de Services au Bénin
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black text-[10px]">
                  <FontAwesomeIcon icon={faUtensils} className="h-2.5 w-2.5" />
                  Restaurants : 0 FCFA (Gratuit)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-black text-[10px]">
                  <FontAwesomeIcon icon={faTag} className="h-2.5 w-2.5" />
                  Services VIP : 500 FCFA
                </span>
              </div>
              <p className="text-xs text-foreground/75 leading-relaxed">
                Rejoignez le répertoire exclusif recommandé aux résidents et voyageurs hébergés dans les villas de standing Bénin Beyond. Contact direct sans commission.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-accent hover:brightness-110 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-all shrink-0 active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            <span>Référencer mon Établissement / Service</span>
          </button>
        </div>
      </section>

      {/* 3. Sites & Merveilles Grid */}
      <section className="mx-auto max-w-8xl px-6 py-16 md:px-12 md:py-24">
        {filteredSites.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-foreground/20 p-12 text-center bg-card/40">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground/40">
              <FontAwesomeIcon icon={faCompass} className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Aucun résultat dans cette sélection
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/60">
              Soyez le premier restaurateur ou prestataire à proposer vos services dans cette catégorie !
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
              <span>Inscrire mon activité</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            {filteredSites.map((site, index) => {
              const hasPhone = Boolean(site.phone);
              const hasWhatsapp = Boolean(site.whatsapp);

              return (
                <ScrollReveal
                  key={site.id}
                  id={site.id}
                  delay={index * 60}
                  y={30}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-card shadow-sm hover:shadow-xl transition-all duration-500"
                >
                  {/* Image & Badges */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <img
                      src={site.image}
                      alt={site.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                    {/* Badge UNESCO / Merveille / Prestation en Villa */}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-black/60 px-3.5 py-1 text-[11px] font-bold tracking-wide uppercase text-accent backdrop-blur-md border border-white/15">
                        {site.badge}
                      </span>

                      {site.inHomeService && (
                        <span className="rounded-full bg-primary/90 px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-sm">
                          <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
                          <span>Déplacement en Villa</span>
                        </span>
                      )}
                    </div>

                    {/* Localisation */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5 text-xs font-semibold drop-shadow-md">
                        <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-accent" />
                        <span>{site.location}</span>
                      </div>

                      {site.pricing && (
                        <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-white border border-white/20">
                          {site.pricing}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenu Curaté */}
                  <div className="flex flex-1 flex-col justify-between p-6 sm:p-8">
                    <div>
                      <p className="caption text-accent font-semibold tracking-wider text-xs">
                        {site.tagline}
                      </p>
                      <h2 className="font-heading mt-2 text-2xl font-bold tracking-tight text-foreground">
                        {site.title}
                      </h2>
                      <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                        {site.description}
                      </p>

                      {/* Points Clés / Prestations */}
                      {site.highlights && site.highlights.length > 0 && (
                        <div className="mt-5 space-y-2 border-t border-foreground/10 pt-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                            {site.category === 'services'
                              ? 'Prestations & Avantages :'
                              : 'À ne pas manquer sur place :'}
                          </p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/80">
                            {site.highlights.map((hl, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                                <span>{hl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Conseil Pratique Voyageur / Modalités d'intervention */}
                      {site.tips && (
                        <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-xs text-foreground/80 border border-foreground/5">
                          <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5" />
                            <span>
                              {site.category === 'services'
                                ? "Modalités de déplacement en résidence"
                                : "Conseil au voyageur"}
                            </span>
                          </p>
                          <p className="leading-relaxed text-foreground/70">{site.tips}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions de Contact Direct (Téléphone & WhatsApp) pour Services et Restaurants */}
                    {(hasPhone || hasWhatsapp) && (
                      <div className="mt-6 pt-5 border-t border-foreground/10">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-foreground/60 font-semibold">
                            Commander / Réserver sans intermédiaire :
                          </span>

                          <div className="flex items-center gap-2">
                            {hasWhatsapp && (
                              <a
                                href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                                  `Bonjour, je séjourne actuellement dans un hébergement Bénin Beyond et je souhaiterais solliciter vos services pour "${site.title}". Pourriez-vous me donner vos disponibilités ?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
                                title="Contacter directement sur WhatsApp"
                              >
                                <FontAwesomeIcon icon={faWhatsapp} className="h-3.5 w-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}

                            {hasPhone && (
                              <a
                                href={`tel:${site.phone.replace(/\s+/g, '')}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-foreground/20 bg-background hover:bg-muted text-foreground px-4 py-2 text-xs font-bold transition-all active:scale-95"
                                title="Appeler directement"
                              >
                                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-primary" />
                                <span>{site.phone}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Passerelles Logement & Véhicules Bénin Beyond */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4 text-xs">
                      <span className="text-foreground/50 font-medium">
                        Préparez votre séjour à proximité :
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/explore?type=stay"
                          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3 py-1 font-semibold text-foreground/80 hover:bg-muted hover:text-primary transition-colors text-[11px]"
                        >
                          <FontAwesomeIcon icon={faBed} className="h-3 w-3 text-primary" />
                          <span>Logement</span>
                        </Link>
                        <Link
                          to="/explore?type=drive"
                          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3 py-1 font-semibold text-foreground/80 hover:bg-muted hover:text-primary transition-colors text-[11px]"
                        >
                          <FontAwesomeIcon icon={faCar} className="h-3 w-3 text-accent" />
                          <span>Véhicule</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Call to Action Hébergement & Mobilité */}
      <section className="border-t border-foreground/10 bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center md:px-12">
          <ScrollReveal delay={0} y={20}>
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Séjournez et déplacez-vous en toute sérénité à travers le Bénin
            </h3>
            <p className="mt-4 text-sm text-foreground/75 leading-relaxed">
              Pour profiter pleinement de ces adresses gastronomiques et recevoir vos prestataires de bien-être et de services à domicile dans un confort absolu, Bénin Beyond met à votre disposition des villas et appartements de standing ainsi qu’une flotte complète de berlines et SUV 4x4.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/explore?type=stay"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-95"
              >
                <span>Explorer les logements</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/explore?type=drive"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background px-7 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
              >
                <span>Découvrir la flotte de véhicules</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Modal d'inscription Prestataire (500 FCFA) */}
      <ProviderRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          getDiscoveries().then((data) => {
            if (data) setDiscoveries(data);
          });
        }}
      />
    </div>
  );
}
export default TourismPage;
