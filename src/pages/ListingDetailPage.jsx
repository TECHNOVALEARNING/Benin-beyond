import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCertificate,
  faLocationDot,
  faCircleCheck,
  faCalendarDays,
  faUsers,
  faShieldHalved,
  faVideo,
  faImages,
  faExpand,
  faXmark,
  faCar,
  faClock,
  faSliders
} from '@fortawesome/free-solid-svg-icons';
import { getListingById } from '../services/listingService';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';

export function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Gallery & Media states
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageFitMode, setImageFitMode] = useState('contain'); // 'contain' (vue entière nette) | 'cover' (plein cadre)

  // Booking widget form state
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [guests, setGuests] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getListingById(id)
      .then((data) => {
        if (mounted) setListing(data);
      })
      .catch(() => {
        if (mounted) setListing(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const gallery = Array.isArray(listing?.gallery) && listing.gallery.length > 0
    ? listing.gallery
    : ['https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'];

  const handlePrevPhoto = (e) => {
    e?.stopPropagation?.();
    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  };

  const handleNextPhoto = (e) => {
    e?.stopPropagation?.();
    setActivePhotoIdx((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation for photo gallery
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIdx((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gallery.length]);

  // Strict separation: Vehicle vs Accommodation
  const isVehicle = listing?.type === 'drive' || listing?.subcategory === 'car' || listing?.category === 'transport';

  // Duration calculation (Stays: nights, Vehicles: 24h rental days with 1-day minimum)
  const duration = (() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  })();

  const isDaily = listing?.price_unit === 'nuit' || listing?.price_unit === 'jour' || isVehicle;
  const effectiveMultiplier = isDaily ? duration : 1;
  const totalPrice = (listing?.price || 0) * effectiveMultiplier;

  const handleAddToCart = () => {
    if (!listing) return;
    setIsAdding(true);

    addItem({
      listingId: listing.id,
      listing_id: listing.id,
      id: listing.id,
      type: listing.type,
      rental_type: isVehicle ? 'drive' : (listing.type || 'stay'),
      title: listing.title,
      price: listing.price,
      price_unit: isVehicle ? 'jour' : (listing.price_unit || 'nuit'),
      image: listing.gallery?.[0] || '',
      nights: isVehicle ? 0 : effectiveMultiplier,
      days: isVehicle ? effectiveMultiplier : 0,
      rooms_count: isVehicle ? 0 : (listing.rooms_count || 1),
      vehicle_seats: isVehicle ? (listing.vehicle_seats || listing.seats || 5) : 0,
      transmission: listing.transmission || null,
      fuel_type: listing.fuel_type || null,
      with_driver: listing.with_driver || false,
      guests: guests,
      startDate: startDate,
      endDate: endDate,
      qty: 1,
      location: listing.location,
      owner_id: listing.owner_id || null,
      owner_name: listing.owner_name || listing.host?.name || null,
      owner_email: listing.owner_email || null
    });

    setTimeout(() => {
      navigate('/panier');
    }, 350);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-8xl px-6 py-24 md:px-12">
        <div className="h-[70vh] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-32 text-center">
        <h1 className="section-title text-3xl">Annonce non trouvée</h1>
        <p className="mt-3 text-foreground/60">
          Cette prestation n'est pas disponible ou a été déplacée.
        </p>
        <Link
          to="/explore"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-8 md:px-12 md:py-12">
      {/* Back button */}
      <Link
        to="/explore"
        className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
        <span>Catalogue</span>
      </Link>

      {/* MASTER GALLERY & VIDEO HERO (PLEINE LARGEUR AVEC FLÈCHES) */}
      <ScrollReveal delay={0} y={15} scale={0.98}>
        <div className="space-y-3">
          {/* Main Photo Viewer Card */}
          <div className="relative h-[48vh] sm:h-[62vh] max-h-[620px] min-h-[360px] w-full overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-950 border border-foreground/10 shadow-2xl">
            <div
              className="relative h-full w-full cursor-zoom-in group select-none flex items-center justify-center overflow-hidden bg-neutral-950"
              onClick={() => setIsLightboxOpen(true)}
            >
              {/* Halo d'ambiance flou en arrière-plan (remplit élégamment les bordures sans déformation) */}
              <img
                src={gallery[activePhotoIdx]}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover blur-3xl opacity-35 scale-110 pointer-events-none select-none transition-all duration-700"
              />

              {/* Photo Principale Nette & Non Tronquée */}
              <img
                src={gallery[activePhotoIdx]}
                alt={`${listing.title} — Photo ${activePhotoIdx + 1}`}
                className={`relative z-10 h-full w-full select-none transition-all duration-500 drop-shadow-2xl ${
                  imageFitMode === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />

              {/* Subtle vignette shadow */}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

              {/* Flèche Précédent */}
              {gallery.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  aria-label="Photo précédente"
                  className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 z-20"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-base" />
                </button>
              )}

              {/* Flèche Suivant */}
              {gallery.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  aria-label="Photo suivante"
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all hover:scale-110 active:scale-95 z-20"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-base" />
                </button>
              )}

              {/* Indicateur Compteur Photo */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                <span className="rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/15 shadow">
                  Photo {activePhotoIdx + 1} / {gallery.length}
                </span>
              </div>

              {/* Commandes Bas Droite (Mode Cadrage + Agrandir) */}
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/15 shadow hover:bg-black/90 transition-all"
                  title={imageFitMode === 'contain' ? 'Remplir tout le cadre' : 'Afficher l’image entière (sans découpe)'}
                >
                  <span>{imageFitMode === 'contain' ? 'Plein cadre' : 'Vue entière'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLightboxOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white border border-white/15 shadow hover:bg-black/90 transition-all"
                >
                  <FontAwesomeIcon icon={faExpand} className="text-xs" />
                  <span>Agrandir</span>
                </button>
              </div>
            </div>

            {/* Badge Photos Haut Gauche */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none">
              <span className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-md backdrop-blur-md border bg-black/65 text-white border-white/20">
                <FontAwesomeIcon icon={faImages} className="text-xs text-primary" />
                <span>{gallery.length} photos</span>
              </span>
            </div>
          </div>

          {/* Bandeau de Miniatures Photos Cliquables */}
          {gallery.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {gallery.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative h-18 sm:h-20 w-28 sm:w-32 shrink-0 rounded-xl overflow-hidden transition-all duration-300 border ${
                    activePhotoIdx === idx
                      ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-102 shadow-md'
                      : 'border-foreground/15 opacity-65 hover:opacity-100 hover:border-foreground/40'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Miniature ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {idx + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Lightbox Plein Écran */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8 animate-fadeIn"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50"
            aria-label="Fermer"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>

          {gallery.length > 1 && (
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50"
              aria-label="Précédent"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-xl sm:text-2xl" />
            </button>
          )}

          {gallery.length > 1 && (
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all z-50"
              aria-label="Suivant"
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-xl sm:text-2xl" />
            </button>
          )}

          <div
            className="relative max-h-[85vh] max-w-[90vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={gallery[activePhotoIdx]}
              alt={`${listing.title} ${activePhotoIdx + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/75 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-white border border-white/15">
              {activePhotoIdx + 1} / {gallery.length}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Details + Booking Widget */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Details */}
        <div>
          {/* Badge & Unit */}
          <ScrollReveal delay={50} y={20}>
            <div className="flex flex-wrap items-center gap-3">
              {listing.badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <FontAwesomeIcon icon={faCertificate} className="h-3.5 w-3.5" />
                  {listing.badge}
                </span>
              )}
              <span className="caption text-foreground/50">{listing.price_unit}</span>
            </div>

            {/* Title */}
            <h1 className="section-title mt-3 text-3xl md:text-5xl">
              {listing.title}
            </h1>

            {/* Location */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground/60">
              <span className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-primary" />
                <span>{listing.location}</span>
              </span>
            </div>
          </ScrollReveal>

          {/* Summary */}
          {listing.summary && (
            <ScrollReveal delay={100} y={20}>
              <p className="mt-6 text-lg leading-relaxed text-foreground/80 font-light">
                {listing.summary}
              </p>
            </ScrollReveal>
          )}

          {/* Specs */}
          {listing.specs && listing.specs.length > 0 && (
            <ScrollReveal delay={150} y={20} className="mt-8 border-t border-foreground/10 pt-8">
              <h3 className="caption text-foreground/50">Caractéristiques</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.specs.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm bg-card"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          )}

          {/* Description */}
          {listing.description && (
            <ScrollReveal delay={200} y={20} className="mt-8 border-t border-foreground/10 pt-8">
              <h3 className="caption text-foreground/50">À propos</h3>
              <p className="mt-3 leading-relaxed text-foreground/75 whitespace-pre-line text-base">
                {listing.description}
              </p>
            </ScrollReveal>
          )}

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <ScrollReveal delay={250} y={20} className="mt-8 border-t border-foreground/10 pt-8">
              <h3 className="caption text-foreground/50">Équipements & Prestations</h3>
              <ul className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {listing.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-foreground/80">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}

          {/* Section Vidéo Immersive Exclusive */}
          {listing.video_url && (
            <ScrollReveal delay={280} y={20} className="mt-8 border-t border-foreground/10 pt-8">
              <ListingVideoPlayer
                videoUrl={listing.video_url}
                poster={gallery[0]}
                title={listing.title}
              />
            </ScrollReveal>
          )}

          {/* Host / Guide card */}
          {listing.host && (
            <ScrollReveal delay={300} y={20} className="mt-8 border-t border-foreground/10 pt-8">
              <h3 className="caption text-foreground/50">Hôte / Partenaire référent</h3>
              <div className="mt-3 flex items-center gap-4 rounded-lg border border-foreground/10 p-5 bg-card shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-heading font-bold text-lg">
                  {listing.host.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-heading font-semibold text-foreground">
                      {listing.host.name}
                    </h4>
                    {listing.host.verified && (
                      <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-foreground/60">{listing.host.role}</p>
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div>
          <ScrollReveal delay={120} y={24} scale={0.97} className="sticky top-8 rounded-xl border border-foreground/10 bg-card p-6 shadow-2xl shadow-foreground/5">
            {/* Price banner */}
            <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4">
              <div>
                <span className="font-heading text-2xl font-bold text-primary">
                  {formatPrice(listing.price)}
                </span>
                <span className="text-xs text-foreground/60 ml-1">
                  / {listing.price_unit}
                </span>
              </div>
              <div className="text-xs text-foreground/50 flex items-center gap-1">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-accent" />
                Garantie Vérifiée
              </div>
            </div>

            {/* Disponibilité Véhicule ou Disponibilité Chambre d'Hôtel */}
            {isVehicle ? (
              <div className="mt-4 rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-xs text-foreground space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCar} className="h-3.5 w-3.5" />
                    <span>Véhicule certifié disponible</span>
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    Tarif / 24h
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faUsers} className="text-primary/70 h-3 w-3 shrink-0" />
                    <span>{listing.vehicle_seats || listing.seats || (listing.type === 'drive' && listing.rooms_count > 0 ? listing.rooms_count : 5)} places</span>
                  </div>
                  <div className="flex items-center gap-1.5 capitalize">
                    <FontAwesomeIcon icon={faSliders} className="text-primary/70 h-3 w-3 shrink-0" />
                    <span>Boîte {listing.transmission || 'Automatique'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 capitalize">
                    <FontAwesomeIcon icon={faClock} className="text-primary/70 h-3 w-3 shrink-0" />
                    <span>{listing.fuel_type || 'Essence'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-primary/70 h-3 w-3 shrink-0" />
                    <span>{listing.with_driver ? 'Avec chauffeur' : 'Sans chauffeur'}</span>
                  </div>
                </div>
              </div>
            ) : (
              listing.availability?.available_from && (
                <div className="mt-4 rounded-xl bg-accent/15 border border-accent/30 p-3 text-xs text-foreground">
                  <p className="font-bold text-accent uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5" />
                    <span>Période de disponibilité hôtelière</span>
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    Du {new Date(listing.availability.available_from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au {new Date(listing.availability.available_to || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {listing.availability.rooms_count > 0 && (
                    <p className="text-[11px] text-foreground/70 mt-0.5">
                      {listing.availability.rooms_count} chambre(s) restante(s) pour cette période
                    </p>
                  )}
                </div>
              )
            )}

            {/* Date Pickers */}
            <div className="mt-5 space-y-3">
              {isDaily && (
                <>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-foreground/15 p-2 bg-background">
                    <div>
                      <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                        <FontAwesomeIcon icon={isVehicle ? faCar : faCalendarDays} className="h-3 w-3" />
                        {isVehicle ? 'Prise en charge' : 'Arrivée'}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        min={today}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setStartDate(newStart);
                          if (new Date(endDate) < new Date(newStart)) {
                            setEndDate(newStart);
                          }
                        }}
                        className="mt-1 w-full bg-transparent text-xs font-medium outline-none text-foreground cursor-pointer"
                      />
                    </div>
                    <div className="border-l border-foreground/15 pl-2">
                      <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                        <FontAwesomeIcon icon={isVehicle ? faClock : faCalendarDays} className="h-3 w-3" />
                        {isVehicle ? 'Restitution' : 'Départ'}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 w-full bg-transparent text-xs font-medium outline-none text-foreground cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[11px] text-foreground/60 font-medium">
                      Durée : <strong className="text-primary font-mono">{duration} {isVehicle ? (duration > 1 ? 'jours' : 'jour') : (duration > 1 ? 'nuits' : 'nuit')}</strong>
                      {isVehicle && <span className="text-[10px] text-foreground/50 ml-1">(24h/j)</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 7].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            const start = new Date(startDate || today);
                            const end = new Date(start.getTime() + num * 86400000);
                            setEndDate(end.toISOString().split('T')[0]);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                            duration === num
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-muted/40 text-foreground/70 border-foreground/10 hover:border-foreground/30'
                          }`}
                        >
                          {num} {isVehicle ? 'j' : 'n'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Guests */}
              <div className="rounded-lg border border-foreground/15 p-2 bg-background">
                <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                  <FontAwesomeIcon icon={faUsers} className="h-3 w-3" /> Voyageurs / Participants
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="mt-1 w-full bg-transparent text-xs font-medium outline-none text-foreground cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'personne' : 'personnes'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing details */}
            <div className="mt-5 space-y-2 text-sm border-t border-foreground/10 pt-4">
              <div className="flex justify-between text-foreground/70">
                <span>
                  {formatPrice(listing.price)} × {effectiveMultiplier}{' '}
                  {listing.price_unit === 'nuit'
                    ? 'nuit(s)'
                    : listing.price_unit === 'jour'
                    ? 'jour(s)'
                    : 'prestation'}
                </span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-foreground/70">
                <span>Frais de conciergerie</span>
                <span className="text-emerald-700 font-medium">Inclus (0 FCFA)</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-foreground/10 pt-3 text-foreground">
                <span>Total estimé</span>
                <span className="font-heading text-xl font-bold text-primary">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              {isAdding ? 'Ajout en cours…' : 'Réserver maintenant'}
            </button>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
