import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HeroPinterestCarousel } from '../components/HeroPinterestCarousel';
import { BeninLiveSection } from '../components/BeninLiveSection';
import { SectionHeader } from '../components/SectionHeader';
import { ListingCard } from '../components/ListingCard';
import { getListings } from '../services/listingService';

import { COMBINED_PACKS } from '../data/packsData';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
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

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {COMBINED_PACKS.slice(0, 2).map((pack, idx) => (
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

      {/* Note: Section 'L'héritage comme expérience' has been completely removed as requested */}
    </div>
  );
}
