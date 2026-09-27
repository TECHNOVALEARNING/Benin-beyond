import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBuilding } from '@fortawesome/free-solid-svg-icons';

const DESTINATIONS = [
  {
    id: 'cotonou',
    name: 'Cotonou',
    tagline: 'LITTORAL & VILLAS DE STANDING',
    description: 'Une retraite d’exception le long de la lagune et de la côte océane. Hébergements contemporains avec piscine privée, art de vivre béninois et conciergerie dédiée.',
    bgImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=85',
    exploreLink: '/explore?type=stay'
  },
  {
    id: 'ganvie',
    name: 'Ganvié',
    tagline: 'LA VENISE DU LAC NOKOUÉ',
    description: 'Navigation matinale au fil de la plus grande cité lacustre d’Afrique. Maisons sur pilotis séculaires, marché flottant et hospitalité ancestrale du peuple Tofinu.',
    bgImage: 'https://i.pinimg.com/736x/11/81/6f/11816f45310c99def36ae45cabc61479.jpg',
    exploreLink: '/tourisme'
  },
  {
    id: 'ouidah',
    name: 'Ouidah',
    tagline: 'MÉMOIRE HISTORIQUE & COCOTIERS',
    description: 'De la célèbre Route des Esclaves à la Porte du Non-Retour, explorez le berceau de la culture mémorielle et reposez-vous dans des lofts intimistes à 200m de l’océan.',
    bgImage: 'https://i.pinimg.com/736x/1b/5e/07/1b5e07312492ae6116e3a150377e1d6b.jpg',
    exploreLink: '/tourisme'
  },
  {
    id: 'pendjari',
    name: 'Pendjari',
    tagline: 'LE SANCTUAIRE SAUVAGE DE L’ATACORA',
    description: 'Immersion au cœur de la plus riche réserve faunique d’Afrique de l’Ouest. Safaris 4x4 matinaux, observation des éléphants, antilopes et bivouacs confortables.',
    bgImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=85',
    exploreLink: '/tourisme'
  },
  {
    id: 'drive',
    name: 'Littoral Drive',
    tagline: 'MOBILITÉ HAUT DE GAMME & LIBERTÉ',
    description: 'Reliez la côte atlantique et les pistes panoramiques dans un confort absolu avec notre flotte de SUV 7 places et berlines entretenues par nos équipes locales.',
    bgImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85',
    exploreLink: '/explore?type=drive'
  }
];

export function HeroPinterestCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeDirection, setWipeDirection] = useState('next');
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);
  const wipeTimerRef = useRef(null);

  const activeDest = DESTINATIONS[currentIndex];
  const prevDest = DESTINATIONS[prevIndex];

  const changeSlide = (nextIndex, direction = 'next') => {
    if (isWiping || nextIndex === currentIndex) return;

    setPrevIndex(currentIndex);
    setCurrentIndex(nextIndex);
    setWipeDirection(direction);
    setIsWiping(true);

    if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);
    wipeTimerRef.current = setTimeout(() => {
      setIsWiping(false);
    }, 1100);
  };

  const nextSlide = () => {
    const nextIdx = (currentIndex + 1) % DESTINATIONS.length;
    changeSlide(nextIdx, 'next');
  };

  const prevSlide = () => {
    const prevIdx = (currentIndex - 1 + DESTINATIONS.length) % DESTINATIONS.length;
    changeSlide(prevIdx, 'prev');
  };

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(nextSlide, 7000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, isWiping]);

  useEffect(() => {
    return () => {
      if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);
    };
  }, []);

  return (
    <section
      className="relative h-screen min-h-[640px] md:min-h-[720px] w-full overflow-hidden bg-secondary select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 1. Background Layers with Smooth Wipe Carousel */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Base Layer: Outgoing slide during wipe, or current active slide when idle */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-out scale-105"
            style={{
              backgroundImage: `url(${isWiping ? prevDest.bgImage : activeDest.bgImage})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
        </div>

        {/* Wiping Layer: Incoming destination reveals with smooth clip-path wipe & luminous sweep line */}
        {isWiping && (
          <div
            className={`absolute inset-0 z-10 overflow-hidden will-change-[clip-path] ${
              wipeDirection === 'next' ? 'animate-wipe-next' : 'animate-wipe-prev'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-out scale-105"
              style={{ backgroundImage: `url(${activeDest.bgImage})` }}
            />
            {/* Multi-angle cinematic dark vignettes */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

            {/* Glowing golden sweep line along the advancing wipe edge */}
            <div
              className={`absolute top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-accent to-transparent shadow-[0_0_20px_rgba(224,159,62,0.95)] pointer-events-none z-20 ${
                wipeDirection === 'next' ? 'animate-wipe-line-next' : 'animate-wipe-line-prev'
              }`}
            />
          </div>
        )}
      </div>

      {/* 2. Top Header (Brand Logo & Navigation buttons) */}
      <div className="absolute inset-x-0 top-0 z-30 px-6 pt-7 md:px-12">
        <div className="mx-auto flex max-w-8xl items-center justify-between">
          <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
            Bénin Beyond
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/register?type=owner"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm"
              title="Devenir propriétaire ou gestionnaire partenaire sur Bénin Beyond"
            >
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-accent" />
              <span>Espace Propriétaire</span>
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-black shadow-md hover:bg-accent hover:text-black transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faUser} className="h-3 w-3" />
              <span>Connexion</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main Hero Content (Clean, cinematic, without floating cards) */}
      <div className="relative z-20 mx-auto flex h-full max-w-8xl flex-col justify-end px-6 pb-16 pt-24 md:px-12 lg:pb-20">
        
        <div className="w-full max-w-2xl text-white">
          <div className="overflow-visible">
            <h1
              key={`title-${currentIndex}`}
              className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold uppercase tracking-normal text-white animate-slideUp leading-tight drop-shadow-lg"
            >
              {activeDest.name}
            </h1>
          </div>

          <p
            key={`desc-${currentIndex}`}
            className="mt-4 text-sm sm:text-base md:text-lg leading-relaxed text-white/90 max-w-xl animate-fadeIn drop-shadow"
          >
            {activeDest.description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to={activeDest.exploreLink}>
              <button className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-2xl hover:bg-primary/90 transition-all active:scale-95 border border-white/10">
                <span>Explorer {activeDest.name}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </button>
            </Link>

            {/* Slide Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-90 shadow-lg"
                title="Précédent"
                aria-label="Destination précédente"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                onClick={nextSlide}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-90 shadow-lg"
                title="Suivant"
                aria-label="Destination suivante"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Progress Timeline, Index Indicator & Destination Quick Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-white/75">
            <div className="flex items-center gap-3 font-mono">
              <span className="font-bold text-accent text-sm">0{currentIndex + 1}</span>
              <div className="relative h-1 w-28 rounded-full bg-white/25 overflow-hidden">
                <div
                  key={`progress-${currentIndex}`}
                  className="h-full bg-accent rounded-full animate-progress"
                  style={{ animationDuration: isPaused ? '0s' : '7000ms' }}
                />
              </div>
              <span className="text-white/60">0{DESTINATIONS.length}</span>
            </div>

            {/* Subtle destination pills for direct switching without bulky cards */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/20">
              {DESTINATIONS.map((dest, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={dest.id}
                    onClick={() => changeSlide(idx, idx > currentIndex ? 'next' : 'prev')}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white text-black font-semibold shadow'
                        : 'bg-black/30 text-white/80 hover:bg-white/20 hover:text-white backdrop-blur-sm'
                    }`}
                  >
                    {dest.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
