import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BedDouble, Car, Compass, ArrowRight, ShieldCheck, Star, Sparkles } from 'lucide-react';
import { formatPrice } from '../data/initialListings';

export function PackCard({ pack }) {
  const primaryItem = pack.included[0];
  const secondaryItem = pack.included[1];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-foreground/25 hover:shadow-2xl">
      {/* 1. Split Visual Header (Accommodation + Vehicle / Experience) */}
      <div className="relative grid h-60 w-full grid-cols-2 gap-0.5 overflow-hidden bg-muted">
        {/* Left Side: Accommodation */}
        <div className="relative h-full overflow-hidden">
          <img
            src={primaryItem.image}
            alt={primaryItem.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute bottom-2.5 left-2.5 right-2 text-white">
            <span className="inline-flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
              <BedDouble className="h-3 w-3 text-accent" />
              <span>Hébergement</span>
            </span>
          </div>
        </div>

        {/* Right Side: Vehicle / Experience */}
        <div className="relative h-full overflow-hidden">
          <img
            src={secondaryItem.image}
            alt={secondaryItem.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
          <div className="absolute bottom-2.5 left-2.5 right-2 text-white">
            <span className="inline-flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
              <Car className="h-3 w-3 text-accent" />
              <span>{secondaryItem.type}</span>
            </span>
          </div>
        </div>

        {/* Top Floating Badge */}
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black shadow-md">
            {pack.badge}
          </span>
        </div>

        {/* Top Right Savings Pill with Subtle Shimmer */}
        <div className="absolute right-3 top-3 z-10 overflow-hidden rounded-full shadow-md">
          <div className="relative bg-primary/95 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            <div className="absolute inset-0 animate-shimmer" />
            <span className="relative z-10">-{formatPrice(pack.savings)} / {pack.priceUnit}</span>
          </div>
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Rating & Location */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-foreground/60">
            <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
            <span className="font-medium">{pack.location}</span>
          </div>
          <div className="flex items-center gap-1 text-accent font-semibold">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-foreground font-bold">{pack.rating}</span>
            <span className="text-foreground/50 text-[11px]">({pack.reviewsCount})</span>
          </div>
        </div>

        {/* Title & Tagline */}
        <h3 className="font-heading mt-3 text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
          {pack.title}
        </h3>
        <p className="mt-1 text-xs text-foreground/70 leading-relaxed">
          {pack.tagline}
        </p>

        {/* Included Items Details List */}
        <div className="mt-4 space-y-2 rounded-xl border border-foreground/10 bg-muted/30 p-3 text-xs">
          {pack.included.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-foreground/80">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground text-[10px] font-bold">
                ✓
              </span>
              <span className="line-clamp-1 font-medium">{item.title}</span>
            </div>
          ))}
        </div>

        {/* VIP Perks */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {pack.advantages.slice(0, 2).map((adv, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] text-foreground/75"
            >
              <ShieldCheck className="h-3 w-3 text-primary/70" />
              <span>{adv}</span>
            </span>
          ))}
        </div>

        {/* Price & Action Row */}
        <div className="mt-6 flex items-end justify-between border-t border-foreground/10 pt-4">
          <div>
            <div className="text-xs text-foreground/50 line-through">
              {formatPrice(pack.regularPrice)}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-primary">
                {formatPrice(pack.price)}
              </span>
              <span className="text-xs text-foreground/60 font-medium">
                / {pack.priceUnit}
              </span>
            </div>
          </div>

          <Link to={`/pack/${pack.id}`}>
            <button className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary transition-all">
              <span>Voir le pack</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
