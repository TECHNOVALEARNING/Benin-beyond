import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  BadgeCheck,
  MapPin,
  Star,
  CheckCircle2,
  Calendar,
  Users,
  ShieldCheck
} from 'lucide-react';
import { getListingById } from '../services/listingService';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';

export function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Duration calculation
  const duration = (() => {
    if (!startDate || !endDate) return 1;
    const diff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  })();

  const isDaily = listing?.price_unit === 'nuit' || listing?.price_unit === 'jour';
  const effectiveMultiplier = isDaily ? duration : 1;
  const totalPrice = (listing?.price || 0) * effectiveMultiplier;

  const handleAddToCart = () => {
    if (!listing) return;
    setIsAdding(true);

    addItem({
      listingId: listing.id,
      type: listing.type,
      title: listing.title,
      price: listing.price,
      price_unit: listing.price_unit,
      image: listing.gallery?.[0] || '',
      nights: effectiveMultiplier,
      days: effectiveMultiplier,
      guests: guests,
      startDate: startDate,
      endDate: endDate,
      qty: 1,
      location: listing.location
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
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        <span>Catalogue</span>
      </Link>

      {/* Horizontal photo gallery slider */}
      <ScrollReveal delay={0} y={15} scale={0.98}>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
          {(listing.gallery && listing.gallery.length > 0 ? listing.gallery : ['']).map(
            (imgUrl, idx) => (
              <div
                key={idx}
                className="relative h-[56vh] min-h-[360px] w-full shrink-0 overflow-hidden rounded-lg md:w-[78%]"
              >
                <img
                  src={imgUrl}
                  alt={`${listing.title} ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            )
          )}
        </div>
      </ScrollReveal>

      {/* Main Grid: Details + Booking Widget */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Details */}
        <div>
          {/* Badge & Unit */}
          <ScrollReveal delay={50} y={20}>
            <div className="flex flex-wrap items-center gap-3">
              {listing.badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {listing.badge}
                </span>
              )}
              <span className="caption text-foreground/50">{listing.price_unit}</span>
            </div>

            {/* Title */}
            <h1 className="section-title mt-3 text-3xl md:text-5xl">
              {listing.title}
            </h1>

            {/* Location & Rating */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground/60">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
                {listing.location}
              </span>
              {listing.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" strokeWidth={1.5} />
                  <span className="font-semibold text-foreground">
                    {listing.rating.toFixed(1)}
                  </span>
                  <span>· {listing.reviews_count} avis</span>
                </span>
              )}
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
                      <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2} />
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
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Garantie Vérifiée
              </div>
            </div>

            {/* Date Pickers */}
            <div className="mt-5 space-y-4">
              {isDaily && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-foreground/15 p-2 bg-background">
                  <div>
                    <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Arrivée
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={today}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 w-full bg-transparent text-xs font-medium outline-none text-foreground cursor-pointer"
                    />
                  </div>
                  <div className="border-l border-foreground/15 pl-2">
                    <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Départ
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
              )}

              {/* Guests */}
              <div className="rounded-lg border border-foreground/15 p-2 bg-background">
                <label className="caption text-[10px] text-foreground/50 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Voyageurs / Participants
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
