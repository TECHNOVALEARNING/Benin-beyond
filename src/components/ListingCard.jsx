import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, ArrowUpRight } from 'lucide-react';
import { formatPrice } from '../data/initialListings';

export function ListingCard({ listing, featured = false, className = '' }) {
  if (!listing) return null;

  const image = (listing.gallery && listing.gallery[0]) || '';

  return (
    <Link
      to={`/listing/${listing.id}`}
      className={`group relative flex flex-col h-full overflow-hidden rounded-xl border border-foreground/10 bg-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-foreground/15 hover:border-foreground/25 ${className}`}
    >
      {/* Image Container */}
      <div
        className={`relative w-full overflow-hidden bg-muted ${
          featured ? 'aspect-[16/10]' : 'aspect-[4/5]'
        }`}
      >
        <img
          src={image}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
        />

        {/* Gradient shadow for text/buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent opacity-60" />

        {/* Badge par défaut (Pillule Dorée) - Masquée au Hover */}
        {listing.badge && (
          <div className="absolute left-3 top-3 z-10 transition-opacity duration-300 group-hover:opacity-0">
            <span className="inline-flex items-center rounded-full bg-[#d99f2b] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#221804] shadow-sm">
              {listing.badge}
            </span>
          </div>
        )}

        {/* Specs tags au Hover avec slide up fluide */}
        {listing.specs && listing.specs.length > 0 && (
          <div className="absolute left-3 top-3 right-3 z-20 flex flex-wrap gap-1.5 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none">
            {listing.specs.slice(0, 4).map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-md shadow-sm"
              >
                {spec}
              </span>
            ))}
          </div>
        )}

        {/* Badge Prix Terracotta en bas à droite de l'image */}
        <div className="absolute bottom-3 right-3 z-10 transition-transform duration-300 group-hover:scale-105">
          <div className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md backdrop-blur-sm">
            <span>{formatPrice(listing.price)}</span>
            <span className="ml-1 text-[10px] font-normal opacity-80">
              / {listing.price_unit}
            </span>
          </div>
        </div>
      </div>

      {/* Contenu Texte Inférieur */}
      <div className="flex flex-col justify-between p-4 bg-card flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-base font-semibold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-1">
            {listing.title}
          </h3>
          <ArrowUpRight
            className="mt-0.5 h-4 w-4 shrink-0 text-foreground/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            strokeWidth={1.5}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-foreground/60">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            <span>{listing.location}</span>
          </span>

          {listing.rating > 0 && (
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3 w-3 fill-accent text-accent" strokeWidth={1.5} />
              <span>{listing.rating.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
