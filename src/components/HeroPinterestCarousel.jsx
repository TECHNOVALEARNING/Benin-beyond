import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Bookmark, MapPin, User } from 'lucide-react';

const DESTINATIONS = [
  {
    id: 'cotonou',
    name: 'Cotonou',
    tagline: 'LITTORAL & VILLAS DE STANDING',
    description: 'Une retraite d’exception le long de la lagune et de la côte océane. Hébergements contemporains avec piscine privée, art de vivre béninois et conciergerie dédiée.',
    bgImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/f7eb9d7b5_generated_bd25ef85.png',
    cardImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/8d23f1177_generated_fc0ecad1.png',
    cardTitle: 'Villa Cotonou Riviera',
    location: 'Cotonou, Lagune',
    price: 85000,
    priceUnit: 'nuit',
    rating: 4.9,
    exploreLink: '/explore?type=stay'
  },
  {
    id: 'ganvie',
    name: 'Ganvié',
    tagline: 'LA VENISE DU LAC NOKOUÉ',
    description: 'Navigation matinale au fil de la plus grande cité lacustre d’Afrique. Maisons sur pilotis séculaires, marché flottant et hospitalité ancestrale du peuple Tofinu.',
    bgImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/06b54fa79_generated_43e6e90f.png',
    cardImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/06b54fa79_generated_43e6e90f.png',
    cardTitle: 'Ganvié — Cité lacustre',
    location: 'Lac Nokoué',
    rating: 4.9,
    exploreLink: '/tourisme'
  },
  {
    id: 'ouidah',
    name: 'Ouidah',
    tagline: 'MÉMOIRE HISTORIQUE & COCOTIERS',
    description: 'De la célèbre Route des Esclaves à la Porte du Non-Retour, explorez le berceau de la culture mémorielle et reposez-vous dans des lofts intimistes à 200m de l’océan.',
    bgImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/998c78e0f_generated_826b4e25.png',
    cardImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/998c78e0f_generated_826b4e25.png',
    cardTitle: 'Porte du Non-Retour',
    location: 'Ouidah Plage',
    rating: 4.8,
    exploreLink: '/tourisme'
  },
  {
    id: 'pendjari',
    name: 'Pendjari',
    tagline: 'LE SANCTUAIRE SAUVAGE DE L’ATACORA',
    description: 'Immersion au cœur de la plus riche réserve faunique d’Afrique de l’Ouest. Safaris 4x4 matinaux, observation des éléphants, antilopes et bivouacs confortables.',
    bgImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/53eb159f6_generated_5c492777.png',
    cardImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/53eb159f6_generated_5c492777.png',
    cardTitle: 'Pendjari Safari 4x4',
    location: 'Parc National Pendjari',
    rating: 5.0,
    exploreLink: '/tourisme'
  },
  {
    id: 'drive',
    name: 'Littoral Drive',
    tagline: 'MOBILITÉ HAUT DE GAMME & LIBERTÉ',
    description: 'Reliez la côte atlantique et les pistes panoramiques dans un confort absolu avec notre flotte de SUV 7 places et berlines entretenues par nos équipes locales.',
    bgImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/786f87a7e_generated_f72ae80f.png',
    cardImage: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/84aa52bc0_generated_f9756aa3.png',
    cardTitle: 'SUV Toyota Fortuner',
    location: 'Cotonou & Littoral',
    price: 45000,
    priceUnit: 'jour',
    rating: 4.8,
    exploreLink: '/explore?type=drive'
  }
];

export function HeroPinterestCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeDirection, setWipeDirection] = useState('next');
  const [isPaused, setIsPaused] = useState(false);
  const [favorited, setFavorited] = useState({});
  const timerRef = useRef(null);
  const wipeTimerRef = useRef(null);

  const activeDest = DESTINATIONS[currentIndex];
  const prevDest = DESTINATIONS[prevIndex];

  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleCards = viewportWidth >= 1024 ? 3 : viewportWidth >= 640 ? 2 : 1;
  const maxSlideIndex = Math.max(0, DESTINATIONS.length - visibleCards);
  const slideOffsetIndex = Math.min(Math.max(0, currentIndex), maxSlideIndex);
  const cardStep = 176 + 14; // 190px (card width 176px + 14px gap)
  const slideOffsetPx = slideOffsetIndex * cardStep;

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

  const handleCardClick = (idx) => {
    if (idx === currentIndex || isWiping) return;
    const dir = idx > currentIndex ? 'next' : 'prev';
    changeSlide(idx, dir);
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorited((prev) => ({ ...prev, [id]: !prev[id] }));
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
    >
      {/* 1. Background Layers with Smooth Wipe Carousel */}
      <div className="absolute inset-0 z-0">
        {/* Base Layer: Outgoing slide during wipe, or current active slide when idle */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-out scale-105"
            style={{
              backgroundImage: `url(${isWiping ? prevDest.bgImage : activeDest.bgImage})`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

            {/* Glowing golden sweep line along the advancing wipe edge */}
            <div
              className={`absolute top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-accent to-transparent shadow-[0_0_20px_rgba(224,159,62,0.95)] pointer-events-none z-20 ${
                wipeDirection === 'next' ? 'animate-wipe-line-next' : 'animate-wipe-line-prev'
              }`}
            />
          </div>
        )}
      </div>

      {/* 2. Top Header (Brand Logo - Bouton Connexion masqué temporairement) */}
      <div className="absolute inset-x-0 top-0 z-30 px-6 pt-7 md:px-12">
        <div className="mx-auto flex max-w-8xl items-center justify-between">
          <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity">
            Bénin Beyond
          </Link>

          {/* Bouton de connexion masqué temporairement à la demande de l'utilisateur
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-black shadow-md hover:bg-accent hover:text-black transition-all active:scale-95"
            >
              <User className="h-3.5 w-3.5" />
              <span>Connexion</span>
            </Link>
          </div>
          */}
        </div>
      </div>

      {/* 3. Main Split Content (Left: Destination Info / Right: Pro Bounded Carousel) */}
      <div className="relative z-20 mx-auto flex h-full max-w-8xl flex-col justify-end px-6 pb-16 pt-24 md:px-12 lg:flex-row lg:items-end lg:justify-between lg:pb-20">
        
        {/* Left Side: Destination Info */}
        <div className="w-full max-w-lg text-white">
          <div>
            <p
              key={`tagline-${currentIndex}`}
              className="caption text-accent font-semibold tracking-wider text-xs animate-fadeIn"
            >
              {activeDest.tagline}
            </p>
          </div>

          <div className="mt-1 overflow-visible">
            <h1
              key={`title-${currentIndex}`}
              className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-normal text-white animate-slideUp leading-tight pr-4"
            >
              {activeDest.name}
            </h1>
          </div>

          <p
            key={`desc-${currentIndex}`}
            className="mt-3 text-sm md:text-base leading-relaxed text-white/85 max-w-md animate-fadeIn"
          >
            {activeDest.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link to={activeDest.exploreLink}>
              <button className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white shadow-xl hover:bg-primary/90 transition-all active:scale-95">
                <span>Explorer {activeDest.name}</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </Link>

            {/* Slide Navigation Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-90"
                title="Précédent"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                onClick={nextSlide}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-90"
                title="Suivant"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Progress Timeline & Index Indicator */}
          <div className="mt-5 flex items-center gap-3 text-xs font-mono text-white/70">
            <span className="font-bold text-white">0{currentIndex + 1}</span>
            <div className="relative h-1 w-28 rounded-full bg-white/25 overflow-hidden">
              <div
                key={`progress-${currentIndex}`}
                className="h-full bg-accent rounded-full animate-progress"
                style={{ animationDuration: isPaused ? '0s' : '7000ms' }}
              />
            </div>
            <span>0{DESTINATIONS.length}</span>
          </div>
        </div>

        {/* Right Side: Pro & Épuré Floating Destination Cards (Zero Cut-Off) */}
        <div
          className="mt-8 lg:mt-0 flex flex-col items-end"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Mini Header above cards */}
          <div className="mb-2 flex w-full items-center justify-between px-1 text-xs text-white/75">
            <span className="caption tracking-widest text-[11px] text-accent font-semibold">
              DESTINATIONS DU BÉNIN
            </span>
            <span className="font-mono text-[11px] text-white/60">
              0{currentIndex + 1} / 0{DESTINATIONS.length}
            </span>
          </div>

          {/* Calibrated viewport container: exactly 1, 2, or 3 cards displayed */}
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              width: `${visibleCards * 176 + (visibleCards - 1) * 14}px`
            }}
          >
            {/* Sliding Track */}
            <div
              className="flex items-center gap-[14px] transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                transform: `translateX(-${slideOffsetPx}px)`
              }}
            >
              {DESTINATIONS.map((dest, idx) => {
                const isSelected = idx === currentIndex;
                const isFav = Boolean(favorited[dest.id]);

                return (
                  <div
                    key={dest.id}
                    onClick={() => handleCardClick(idx)}
                    className={`group relative h-60 w-[176px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border transition-all duration-500 ${
                      isSelected
                        ? 'border-accent shadow-2xl shadow-accent/25 scale-[1.02] ring-2 ring-accent z-10'
                        : 'border-white/15 opacity-75 hover:opacity-100 hover:border-white/40 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Card Image */}
                    <img
                      src={dest.cardImage}
                      alt={dest.cardTitle}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => toggleFavorite(e, dest.id)}
                      className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-transform active:scale-125"
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${isFav ? 'fill-accent text-accent' : 'text-white'}`}
                        strokeWidth={1.5}
                      />
                    </button>

                    {/* Card Bottom Details */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 z-10 text-white">
                      <h4 className="font-heading text-xs font-bold leading-snug line-clamp-1 group-hover:text-accent transition-colors">
                        {dest.cardTitle}
                      </h4>

                      <p className="text-[11px] text-white/75 mt-1 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-accent shrink-0" />
                        <span>{dest.location}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
