import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faChevronLeft,
  faChevronRight,
  faQuoteLeft,
  faCircleCheck,
  faShieldHalved,
  faCompass
} from '@fortawesome/free-solid-svg-icons';
import { getFeaturedHomeReviews } from '../services/reviewService';
import { ScrollReveal } from './ScrollReveal';

export function TravelerReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Charger les 8 à 10 meilleurs avis vérifiés pour la page d'accueil
  const loadFeaturedReviews = useCallback(async () => {
    try {
      const data = await getFeaturedHomeReviews(10);
      setReviews(data || []);
    } catch (err) {
      console.warn('Erreur chargement avis homepage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedReviews();

    // Écouter les mises à jour en direct (quand l'admin valide un avis depuis un autre onglet ou sur la page)
    const handleUpdate = () => {
      loadFeaturedReviews();
    };

    window.addEventListener('benin_beyond_reviews_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('benin_beyond_reviews_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadFeaturedReviews]);

  // Nombre de cartes visibles : 3 sur grand écran, 2 sur tablette, 1 sur mobile
  // Pour le calcul du défilement, le nombre de slides possibles est : Math.max(1, reviews.length - 2) sur desktop
  const totalItems = reviews.length;
  const maxDesktopSlides = Math.max(1, totalItems - 2);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1 >= maxDesktopSlides ? 0 : prev + 1));
  }, [maxDesktopSlides]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 < 0 ? maxDesktopSlides - 1 : prev - 1));
  }, [maxDesktopSlides]);

  // Défilement automatique toutes les 5.5 secondes si plus de 3 avis et non en pause
  useEffect(() => {
    if (totalItems <= 3 || isPaused) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      handleNext();
    }, 5500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalItems, isPaused, handleNext]);

  // Gestion du swipe sur écran tactile (mobile / tablette)
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const delta = touchStartXRef.current - touchEndXRef.current;
    if (delta > 50) {
      handleNext();
    } else if (delta < -50) {
      handlePrev();
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-8xl px-6 py-14 md:px-12 md:py-16">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-xl mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-muted/60 animate-pulse border border-foreground/10" />
          ))}
        </div>
      </section>
    );
  }

  if (totalItems === 0) return null;

  // Calcul de la note moyenne
  const avgRating = (
    reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / (totalItems || 1)
  ).toFixed(1);

  return (
    <section className="relative mx-auto max-w-8xl px-6 py-16 md:px-12 md:py-20 overflow-hidden">
      {/* Background glow décoratif subtil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* En-tête de section avec badge officiel et note moyenne */}
      <ScrollReveal delay={0} y={20}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider mb-3">
              <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
              <span>Expériences & Séjours Vérifiés</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
              Paroles de nos Voyageurs
            </h2>
            <p className="text-xs sm:text-sm text-foreground/60 max-w-2xl mt-2 leading-relaxed">
              Découvrez les retours authentiques laissés par nos clients après leur séjour dans nos villas privées ou leurs déplacements avec nos chauffeurs VIP au Bénin.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {/* Note moyenne certifiée */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card border border-foreground/10 shadow-sm">
              <div className="flex items-center text-amber-400 gap-1 text-sm">
                <FontAwesomeIcon icon={faStar} />
                <span className="font-heading font-black text-foreground text-base ml-1">{avgRating}</span>
                <span className="text-foreground/50 text-xs">/ 5</span>
              </div>
              <span className="text-foreground/30">•</span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" />
                <span>100% Vérifiés</span>
              </span>
            </div>

            {/* Boutons flèches de navigation carrousel (visibles si plus de 3 avis) */}
            {totalItems > 3 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="h-9 w-9 rounded-xl border border-foreground/15 bg-card flex items-center justify-center text-foreground hover:bg-muted hover:border-foreground/30 transition-all shadow-xs active:scale-95"
                  title="Avis précédents"
                  aria-label="Avis précédents"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-9 w-9 rounded-xl border border-foreground/15 bg-card flex items-center justify-center text-foreground hover:bg-muted hover:border-foreground/30 transition-all shadow-xs active:scale-95"
                  title="Avis suivants"
                  aria-label="Avis suivants"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Conteneur Carrousel Défilant ou Grille Centrée selon le nombre d'avis réels */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {totalItems === 1 ? (
          /* Exactement 1 avis réel validé : Centré avec largeur optimale */
          <div className="flex justify-center max-w-xl mx-auto w-full">
            <div className="w-full">
              <ReviewCard review={reviews[0]} delay={0} />
            </div>
          </div>
        ) : totalItems === 2 ? (
          /* Exactement 2 avis réels validés : Centrés côte à côte */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto justify-center">
            {reviews.map((rev, idx) => (
              <ReviewCard key={rev.id || idx} review={rev} delay={idx * 100} />
            ))}
          </div>
        ) : totalItems === 3 ? (
          /* Exactement 3 avis réels validés : Grille équilibrée sur une ligne */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev, idx) => (
              <ReviewCard key={rev.id || idx} review={rev} delay={idx * 100} />
            ))}
          </div>
        ) : (
          /* Plus de 3 avis (jusqu'à 10) : Carrousel animé avec défilement fluide */
          <div className="overflow-hidden py-1">
            <div
              className="flex transition-transform duration-700 ease-out gap-6"
              style={{
                // Sur desktop chaque carte occupe 1/3 (moins gap), sur tablette 1/2, sur mobile 100%
                transform: `translateX(-${currentIndex * (100 / (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : typeof window !== 'undefined' && window.innerWidth >= 640 ? 2 : 1))}%)`
              }}
            >
              {reviews.map((rev, idx) => (
                <div
                  key={rev.id || idx}
                  className="shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                >
                  <ReviewCard review={rev} delay={0} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicateurs / Puces de pagination carrousel */}
        {totalItems > 3 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: maxDesktopSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`transition-all rounded-full h-1.5 ${
                  currentIndex === i
                    ? 'w-7 bg-primary shadow-xs'
                    : 'w-2 bg-foreground/20 hover:bg-foreground/40'
                }`}
                title={`Afficher le groupe ${i + 1}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Carte de témoignage individuelle avec rendu haut de gamme
 */
function ReviewCard({ review, delay = 0 }) {
  const rating = Number(review.rating) || 5;

  return (
    <ScrollReveal delay={delay} y={15} className="h-full">
      <div className="h-full rounded-3xl border border-foreground/10 bg-card p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all flex flex-col justify-between relative group overflow-hidden">
        {/* Icône de citation en filigrane */}
        <div className="absolute top-4 right-4 text-foreground/5 group-hover:text-primary/10 transition-colors pointer-events-none">
          <FontAwesomeIcon icon={faQuoteLeft} className="text-4xl" />
        </div>

        <div>
          {/* Étoiles & Badge de certification */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center text-amber-400 gap-1 text-xs">
              {[1, 2, 3, 4, 5].map((s) => (
                <FontAwesomeIcon
                  key={s}
                  icon={faStar}
                  className={s <= rating ? 'text-amber-400' : 'text-foreground/15'}
                />
              ))}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              <FontAwesomeIcon icon={faCircleCheck} className="h-2 w-2" />
              <span>Séjour Vérifié</span>
            </span>
          </div>

          {/* Commentaire du client */}
          <p className="text-xs sm:text-[13px] text-foreground/80 leading-relaxed italic relative z-10 break-words mb-6">
            « {review.comment || 'Séjour remarquable et service hautement professionnel.'} »
          </p>
        </div>

        {/* Pied de carte : Auteur, Listing associé & Date */}
        <div className="pt-4 border-t border-foreground/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar ou initiale */}
            {review.author_avatar ? (
              <img
                src={review.author_avatar}
                alt={review.author_name}
                className="h-10 w-10 rounded-full object-cover border border-foreground/15 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              style={{ display: review.author_avatar ? 'none' : 'flex' }}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 text-foreground font-black text-xs items-center justify-center border border-foreground/15 shrink-0 uppercase"
            >
              {review.author_name?.[0] || 'V'}
            </div>

            <div className="min-w-0">
              <h4 className="font-heading text-xs font-bold text-foreground truncate">
                {review.author_name || 'Voyageur Bénin Beyond'}
              </h4>
              <p className="text-[10.5px] text-foreground/50 truncate flex items-center gap-1">
                <FontAwesomeIcon icon={faCompass} className="h-2.5 w-2.5 text-primary shrink-0" />
                <span className="truncate">{review.listing_title || 'Séjour & Expérience Bénin Beyond'}</span>
              </p>
            </div>
          </div>

          {/* Date de publication */}
          <span className="text-[10px] text-foreground/40 font-mono shrink-0">
            {review.created_at
              ? new Date(review.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
              : 'Récemment'}
          </span>
        </div>
      </div>
    </ScrollReveal>
  );
}
