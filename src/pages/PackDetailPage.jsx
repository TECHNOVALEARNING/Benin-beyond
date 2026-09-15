import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users,
  BedDouble,
  Car,
  Compass,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { COMBINED_PACKS } from '../data/packsData';
import { formatPrice } from '../data/initialListings';
import { useCart } from '../context/CartContext';
import { ScrollReveal } from '../components/ScrollReveal';

export function PackDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const pack = COMBINED_PACKS.find((p) => p.id === id);

  const [selectedImage, setSelectedImage] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState(2);
  const [addedNotice, setAddedNotice] = useState(false);

  if (!pack) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="font-heading text-2xl font-bold">Pack introuvable</h1>
        <p className="mt-2 text-foreground/60">La formule sélectionnée n'est plus disponible.</p>
        <Link to="/packs" className="mt-6 inline-block text-primary font-semibold hover:underline">
          ← Découvrir tous nos packs
        </Link>
      </div>
    );
  }

  // Calculate duration in days/nights
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const duration = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isForfait = pack.priceUnit === 'forfait';
  const effectiveDays = isForfait ? 1 : duration;
  const totalPrice = pack.price * effectiveDays;
  const totalRegular = pack.regularPrice * effectiveDays;
  const totalSavings = pack.savings * effectiveDays;

  const handleAddToCart = () => {
    addItem({
      id: pack.id,
      type: 'pack',
      title: pack.title,
      price: pack.price,
      price_unit: pack.priceUnit,
      image: pack.included[0].image,
      image_url: pack.included[0].image,
      location: pack.location,
      days: effectiveDays,
      nights: effectiveDays,
      startDate,
      endDate,
      guests
    });

    setAddedNotice(true);
    setTimeout(() => {
      navigate('/panier');
    }, 600);
  };

  return (
    <div className="mx-auto max-w-8xl px-6 py-10 md:px-12 md:py-16">
      {/* Breadcrumb */}
      <ScrollReveal delay={0} y={10} className="flex items-center gap-2 text-xs text-foreground/60 mb-6">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/packs" className="hover:text-foreground">Packs Combinés</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate">{pack.title}</span>
      </ScrollReveal>

      {/* Main Grid: Gallery & Details (Left) / Sticky Booking Box (Right) */}
      <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
        {/* Left Column */}
        <div>
          {/* Gallery */}
          <ScrollReveal delay={30} y={15} scale={0.98} className="overflow-hidden rounded-2xl border border-foreground/10 bg-muted">
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <img
                src={pack.gallery[selectedImage] || pack.gallery[0]}
                alt={pack.title}
                className="h-full w-full object-cover transition-all duration-500"
              />
              <div className="absolute left-4 top-4">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-black shadow-md">
                  {pack.badge}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {pack.gallery.length > 1 && (
              <div className="flex gap-2 p-3 bg-card border-t border-foreground/10 overflow-x-auto no-scrollbar">
                {pack.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      selectedImage === idx
                        ? 'border-primary ring-2 ring-primary/20 scale-105'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </ScrollReveal>

          {/* Heading Info */}
          <ScrollReveal delay={80} y={20} className="mt-8 border-b border-foreground/10 pb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{pack.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-foreground font-bold">{pack.rating}</span>
                <span className="text-foreground/50 text-xs">({pack.reviewsCount} avis vérifiés)</span>
              </div>
            </div>

            <h1 className="font-heading mt-3 text-2xl sm:text-3xl font-bold text-foreground">
              {pack.title}
            </h1>
            <p className="mt-1 text-sm text-foreground/70 font-medium">
              {pack.tagline}
            </p>

            <p className="mt-4 text-sm leading-relaxed text-foreground/80">
              {pack.description}
            </p>
          </ScrollReveal>

          {/* Included Services Section */}
          <div className="mt-8 border-b border-foreground/10 pb-8">
            <ScrollReveal delay={120} y={15}>
              <h2 className="font-heading text-lg font-bold text-foreground mb-5">
                Prestations incluses dans cette formule
              </h2>
            </ScrollReveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {pack.included.map((item, idx) => (
                <ScrollReveal
                  key={idx}
                  delay={140 + idx * 80}
                  className="h-full"
                >
                  <div className="overflow-hidden rounded-xl border border-foreground/10 bg-card p-4 shadow-sm flex flex-col gap-3 h-full">
                    <div className="relative h-36 w-full overflow-hidden rounded-lg bg-muted">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-2.5 top-2.5">
                        <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-foreground">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Exclusive Perks */}
          <ScrollReveal delay={200} y={20} className="mt-8">
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">
              Avantages exclusifs & conciergerie
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pack.advantages.map((adv, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-xl border border-foreground/10 bg-muted/25 p-3.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-foreground/85 leading-snug">
                    {adv}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column: Sticky Booking Widget */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <ScrollReveal delay={100} y={24} scale={0.97} className="overflow-hidden rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl shadow-foreground/5">
            {/* Price Row */}
            <div className="flex items-baseline justify-between border-b border-foreground/10 pb-5">
              <div>
                <span className="text-xs text-foreground/50 line-through mr-2">
                  {formatPrice(pack.regularPrice)}
                </span>
                <span className="font-heading text-2xl font-bold text-primary">
                  {formatPrice(pack.price)}
                </span>
                <span className="text-xs text-foreground/60 font-medium">
                  {' '}/ {pack.priceUnit}
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-800">
                Économie -{formatPrice(pack.savings)}
              </span>
            </div>

            {/* Date Picker Form */}
            <div className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="caption text-foreground/60 block mb-1 text-[11px]">
                    Début du séjour
                  </label>
                  <div className="flex items-center rounded-lg border border-foreground/15 bg-background px-3 py-2.5">
                    <Calendar className="h-4 w-4 text-primary/70 mr-2 shrink-0" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-transparent text-xs text-foreground outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="caption text-foreground/60 block mb-1 text-[11px]">
                    Fin du séjour
                  </label>
                  <div className="flex items-center rounded-lg border border-foreground/15 bg-background px-3 py-2.5">
                    <Calendar className="h-4 w-4 text-primary/70 mr-2 shrink-0" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-transparent text-xs text-foreground outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="caption text-foreground/60 block mb-1 text-[11px]">
                  Nombre de voyageurs
                </label>
                <div className="flex items-center justify-between rounded-lg border border-foreground/15 bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary/70" />
                    <span className="text-xs text-foreground">{guests} voyageur(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/15 bg-card text-xs font-bold hover:bg-muted"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setGuests((g) => Math.min(8, g + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/15 bg-card text-xs font-bold hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-5 space-y-2.5 rounded-xl bg-muted/40 p-4 text-xs border border-foreground/10">
              <div className="flex justify-between text-foreground/80">
                <span>
                  {formatPrice(pack.price)} × {effectiveDays} {isForfait ? 'forfait' : 'jour(s)'}
                </span>
                <span className="font-semibold">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Économie Pack appliquée</span>
                <span>-{formatPrice(totalSavings)}</span>
              </div>
              <div className="flex justify-between text-foreground/60">
                <span>Assistance conciergerie 24/7</span>
                <span className="text-emerald-700 font-medium">Offerte</span>
              </div>

              <div className="border-t border-foreground/10 pt-2.5 flex justify-between items-baseline font-bold text-foreground text-sm">
                <span>Total séjour</span>
                <span className="font-heading text-lg text-primary">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleAddToCart}
              disabled={addedNotice}
              className="mt-6 w-full rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{addedNotice ? 'Ajouté au panier !' : 'Réserver ce Pack'}</span>
            </button>

            <p className="mt-3 text-center text-[11px] text-foreground/55">
              Aucun débit immédiat. Confirmation en ligne instantanée.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
