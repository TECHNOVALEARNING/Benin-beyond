import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { HeroPinterestCarousel } from '../components/HeroPinterestCarousel';
import { BeninLiveSection } from '../components/BeninLiveSection';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { getListings } from '../services/listingService';
import { getPacks } from '../services/packService';
import { PackCard } from '../components/PackCard';
import { ScrollReveal } from '../components/ScrollReveal';
import { TravelerReviewsSection } from '../components/TravelerReviewsSection';
import { useLanguage } from '../context/LanguageContext';

const SECTIONS = [
  {
    type: 'stay',
    title: 'Villas & appartements',
    link: '/explore?type=stay'
  },
  {
    type: 'drive',
    title: 'Véhicules',
    link: '/explore?type=drive'
  }
];

export function HomePage() {
  const { t } = useLanguage();
  const [listings, setListings] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [data, packsData] = await Promise.all([
          getListings(),
          getPacks()
        ]);
        setListings(data || []);
        setPacks(packsData || []);
      } catch (err) {
        console.error('Erreur chargement listings/packs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getByType = (type) => listings.filter((item) => item.type === type);

  return (
    <div>
      {/* 1. Hero Pinterest Destination Carousel */}
      <HeroPinterestCarousel />

      {/* 2. Barre météo & heure du Bénin (les événements culturels sont plus bas, sur tous les écrans) */}
      <BeninLiveSection showWeather={true} showEvents={false} />

      {/* 3. Curated Category Sections */}
      {SECTIONS.map((sec) => (
        <section
          key={sec.type}
          className="mx-auto max-w-8xl px-6 py-14 md:px-12 md:py-16"
        >
          <ScrollReveal delay={0} y={20}>
            <SectionHeader
              title={t(sec.title)}
              action={
                <Link
                  to={sec.link}
                  className="group flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  <span>{t("Tout voir")}</span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                </Link>
              }
            />
          </ScrollReveal>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="aspect-[4/5] animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : getByType(sec.type).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 bg-card/60 p-8 text-center backdrop-blur-sm">
                <p className="text-sm font-semibold text-foreground/80">
                  {sec.type === 'stay' ? t("Villas, hôtels et appartements en cours d’intégration") : t("Véhicules et SUV en cours de référencement")}
                </p>
                <p className="text-xs text-foreground/50 mt-1 max-w-md mx-auto">
                  {t("Vous êtes hôtelier, propriétaire ou loueur au Bénin ? Rejoignez le réseau officiel Bénin Beyond pour publier vos disponibilités.")}
                </p>
                <div className="mt-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 text-xs font-semibold transition-all"
                  >
                    <span>{t("Devenir hôte certifié")}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {getByType(sec.type)
                  .slice(0, 3)
                  .map((item, idx) => (
                    <ScrollReveal
                      key={item.id}
                      delay={idx * 120}
                      className="h-full"
                    >
                      <ListingCard listing={item} />
                    </ScrollReveal>
                  ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {/* 4. Combined Packs Showcase (masquée tant qu'aucun pack n'est publié) */}
      {packs.length > 0 && (
      <section className="mx-auto max-w-8xl px-6 py-14 md:px-12 md:py-16">
        <ScrollReveal delay={0} y={20}>
          <SectionHeader
            title={t("Formules tout-en-un & Packs combinés")}
            action={
              <Link
                to="/packs"
                className="group flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
              >
                <span>{t("Découvrir tous les packs")}</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
              </Link>
            }
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {packs.slice(0, 2).map((pack, idx) => (
            <ScrollReveal
              key={pack.id}
              delay={idx * 150}
              className="h-full"
            >
              <PackCard pack={pack} />
            </ScrollReveal>
          ))}
        </div>
      </section>
      )}

      {/* 4.b Événements culturels & Histoires, après les annonces (ordinateur et téléphone) */}
      <BeninLiveSection showWeather={false} showEvents={true} />

      {/* 5. Section Stratégique : Avis & Témoignages des Voyageurs Vérifiés */}
      <TravelerReviewsSection />
    </div>
  );
}
