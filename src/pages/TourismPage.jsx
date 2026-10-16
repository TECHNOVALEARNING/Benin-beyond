import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faPhone, faPlus } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { ScrollReveal } from '../components/ScrollReveal';
import { SectionHeader } from '../components/SectionHeader';
import { getDiscoveries, INITIAL_DISCOVERIES } from '../services/discoveryService';
import { ProviderRegistrationModal } from '../components/ProviderRegistrationModal';

const CATEGORIES = [
  { key: 'all', label: 'Tout' },
  { key: 'restaurants', label: 'Gastronomie' },
  { key: 'services', label: 'Services à domicile' }
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
    // Seules les fiches validées par l'équipe sont publiques
    if (site.status && site.status !== 'active') {
      return false;
    }
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
      <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
        <ScrollReveal delay={0} y={20}>
          <SectionHeader
            label="Découvertes"
            title="Gastronomie et services à domicile"
            action={
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground/75 transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                <span>Référencer mon activité</span>
              </button>
            }
          />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/60">
            Les meilleures tables du Bénin et des prestataires qui se déplacent dans votre villa : coiffure, onglerie, soins, chefs privés, pressing.
          </p>
        </ScrollReveal>

        {/* Filtres */}
        <ScrollReveal delay={60} y={20} className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setSelectedCategory(cat.key);
                  setSelectedSubcategory('all');
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-foreground/15 text-foreground/70 hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </ScrollReveal>

        {selectedCategory === 'services' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SERVICE_SUBCATEGORIES.map((sub) => {
              const isSubActive = selectedSubcategory === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setSelectedSubcategory(sub.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSubActive
                      ? 'bg-muted text-foreground'
                      : 'text-foreground/55 hover:text-foreground'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}

        <ScrollReveal delay={100} y={15} className="mt-4 text-sm text-foreground/50">
          {filteredSites.length} résultat(s)
        </ScrollReveal>

        {/* Fiches */}
        <div className="mt-6">
          {filteredSites.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-xl border border-dashed border-foreground/15 p-10 text-center">
              <p className="text-sm text-foreground/60">Aucun résultat dans cette sélection.</p>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                Inscrire mon activité
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site, index) => {
                const hasPhone = Boolean(site.phone);
                const hasWhatsapp = Boolean(site.whatsapp);

                return (
                  <ScrollReveal
                    key={site.id}
                    id={site.id}
                    delay={(index % 3) * 80}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-card"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      <img
                        src={site.image}
                        alt={site.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {site.badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-foreground">
                          {site.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs text-foreground/50">
                        {[site.location, site.inHomeService ? 'Se déplace en villa' : null, site.pricing].filter(Boolean).join(' · ')}
                      </p>
                      <h2 className="mt-1.5 font-heading text-base font-semibold leading-tight text-foreground">
                        {site.title}
                      </h2>
                      {site.tagline && (
                        <p className="mt-1 text-xs text-foreground/55">{site.tagline}</p>
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                        {site.description}
                      </p>

                      {site.highlights && site.highlights.length > 0 && (
                        <ul className="mt-4 space-y-1 border-t border-foreground/10 pt-4 text-sm text-foreground/70">
                          {site.highlights.map((hl, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-foreground/30">–</span>
                              <span>{hl}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {site.tips && (
                        <p className="mt-4 text-xs leading-relaxed text-foreground/55">
                          <span className="font-medium text-foreground/70">
                            {site.category === 'services' ? 'Déplacement : ' : 'Conseil : '}
                          </span>
                          {site.tips}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                        {hasWhatsapp && (
                          <a
                            href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
                              `Bonjour, je séjourne actuellement dans un hébergement Bénin Beyond et je souhaiterais solliciter vos services pour "${site.title}". Pourriez-vous me donner vos disponibilités ?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                            title="Contacter directement sur WhatsApp"
                          >
                            <FontAwesomeIcon icon={faWhatsapp} className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {hasPhone && (
                          <a
                            href={`tel:${site.phone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-xs font-medium text-foreground/75 hover:border-foreground/30 hover:text-foreground"
                            title="Appeler directement"
                          >
                            <FontAwesomeIcon icon={faPhone} className="h-3 w-3" />
                            <span>{site.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>

        {/* Professionnels */}
        <ScrollReveal delay={0} y={20} className="mt-16">
          <SectionHeader
            label="Professionnels"
            title="Restaurateurs et prestataires"
            action={
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Référencer mon activité
              </button>
            }
          />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/60">
            Rejoignez le répertoire recommandé aux voyageurs hébergés par Bénin Beyond. Inscription gratuite pour les restaurants, 500 FCFA pour les services. Contact direct, sans commission.
          </p>
        </ScrollReveal>

        {/* Séjour */}
        <ScrollReveal delay={0} y={20} className="mt-16">
          <SectionHeader label="Votre séjour" title="Où dormir, comment se déplacer" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/explore?type=stay"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <span>Explorer les logements</span>
              <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            </Link>
            <Link
              to="/explore?type=drive"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <span>Voir les véhicules</span>
              <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            </Link>
          </div>
        </ScrollReveal>
      </div>

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
