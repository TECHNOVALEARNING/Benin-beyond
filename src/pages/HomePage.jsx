import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroPinterestCarousel } from '../components/HeroPinterestCarousel';
import { BeninLiveSection } from '../components/BeninLiveSection';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { getListings } from '../services/listingService';
import { getPacks } from '../services/packService';
import { PackCard } from '../components/PackCard';
import { ScrollReveal } from '../components/ScrollReveal';

const SECTIONS = [
  {
    type: 'stay',
    title: 'Villas & appartements curatés',
    link: '/explore?type=stay'
  },
  {
    type: 'drive',
    title: 'Véhicules pour la route et la côte',
    link: '/explore?type=drive'
  }
];

export function HomePage() {
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

      {/* 2. Benin Live Hub: Weather, GMT+1 Time & Cultural Events */}
      <BeninLiveSection />

      {/* 3. Curated Category Sections */}
      {SECTIONS.map((sec) => (
        <section
          key={sec.type}
          className="mx-auto max-w-8xl px-6 py-14 md:px-12 md:py-16"
        >
          <ScrollReveal delay={0} y={20}>
            <SectionHeader
              title={sec.title}
              action={
                <Link
                  to={sec.link}
                  className="group flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  <span>Tout voir</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
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
                  {sec.type === 'stay' ? 'Villas, hôtels et appartements en cours d’intégration' : 'Véhicules et SUV en cours de référencement'}
                </p>
                <p className="text-xs text-foreground/50 mt-1 max-w-md mx-auto">
                  Vous êtes hôtelier, propriétaire ou loueur au Bénin ? Rejoignez le réseau officiel Bénin Beyond pour publier vos disponibilités.
                </p>
                <div className="mt-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 text-xs font-semibold transition-all"
                  >
                    <span>Devenir partenaire certifié</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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

      {/* 4. Combined Packs Showcase */}
      <section className="mx-auto max-w-8xl px-6 py-14 md:px-12 md:py-16">
        <ScrollReveal delay={0} y={20}>
          <SectionHeader
            title="Formules tout-en-un & Packs combinés"
            action={
              <Link
                to="/packs"
                className="group flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
              >
                <span>Découvrir tous les packs</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            }
          />
        </ScrollReveal>

        {packs.length === 0 ? (
          <ScrollReveal delay={100} y={15} className="mt-8">
            <div className="rounded-3xl border border-dashed border-foreground/15 bg-card/60 p-8 sm:p-10 text-center">
              <p className="text-xs uppercase tracking-widest text-accent font-bold">Exclusivité Bénin Beyond</p>
              <h3 className="font-heading text-lg font-bold text-foreground mt-1">
                Packs Signature en cours d'élaboration
              </h3>
              <p className="text-xs sm:text-sm text-foreground/60 max-w-xl mx-auto mt-2 leading-relaxed">
                Notre administration prépare de nouvelles offres d'exception réunissant nos plus belles villas et véhicules tout-terrain VIP.
              </p>
              <div className="mt-5">
                <Link
                  to="/packs"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition-all"
                >
                  <span>Consulter l'espace Formules</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        ) : (
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
        )}
      </section>

      {/* Note: Section 'L'héritage comme expérience' has been completely removed as requested */}
    </div>
  );
}
