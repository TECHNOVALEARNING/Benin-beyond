import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBagShopping, faArrowRight, faTrash, faCar, faShieldHalved, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';

export function CartPage() {
  const { items, removeItem, updateItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <ScrollReveal delay={0} y={20} className="mx-auto flex max-w-8xl flex-col items-center px-6 py-32 text-center md:px-12">
        <FontAwesomeIcon icon={faBagShopping} className="h-14 w-14 text-foreground/30" />
        <h1 className="section-title mt-6 text-3xl md:text-4xl">
          Votre panier est vide
        </h1>
        <p className="mt-3 text-foreground/60 max-w-md">
          Découvrez nos villas d'exception, véhicules de voyage et expériences patrimoniales au Bénin.
        </p>
        <Link
          to="/explore"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 shadow-md"
        >
          <span>Explorer le catalogue</span>
          <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
        </Link>
      </ScrollReveal>
    );
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      <ScrollReveal delay={0} y={20}>
        <h1 className="section-title border-t border-foreground/15 pt-6 text-3xl md:text-4xl">
          Mon panier
        </h1>
      </ScrollReveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Items List */}
        <div className="divide-y divide-foreground/10 border-t border-foreground/10">
          {items.map((item, index) => {
            const isVehicle = item.type === 'drive' || item.rental_type === 'drive' || item.price_unit === 'jour';
            const duration = isVehicle
              ? (item.days || item.qty || 1)
              : (item.nights || item.days || item.qty || 1);
            const itemTotal = (item.price || 0) * duration;

            return (
              <ScrollReveal
                key={index}
                delay={index * 90}
                y={18}
                className="py-6"
              >
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted border border-foreground/10 relative">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-foreground/40">
                        Photo
                      </div>
                    )}
                    {isVehicle && (
                      <div className="absolute top-1.5 left-1.5 rounded-full bg-primary/90 text-white p-1 shadow">
                        <FontAwesomeIcon icon={faCar} className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-lg font-semibold leading-snug">
                            {item.title}
                          </h3>
                          {isVehicle ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                              <FontAwesomeIcon icon={faCar} className="h-2.5 w-2.5" /> Véhicule (24h/j)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                              Hébergement
                            </span>
                          )}
                        </div>
                        {item.location && (
                          <p className="text-sm text-foreground/60 mt-0.5">
                            {item.location}
                          </p>
                        )}
                        {/* Vehicle Specs summary if available */}
                        {isVehicle && (item.vehicle_seats > 0 || item.transmission || item.with_driver) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-foreground/70">
                            {item.vehicle_seats > 0 && (
                              <span className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faUsers} className="h-2.5 w-2.5 text-primary" />
                                {item.vehicle_seats} places
                              </span>
                            )}
                            {item.transmission && (
                              <span className="capitalize">· Boîte {item.transmission}</span>
                            )}
                            {item.with_driver && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">· Avec chauffeur</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-foreground/40 hover:text-destructive transition-colors p-1"
                        title="Supprimer du panier"
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Duration / Quantity Adjuster */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {(item.price_unit === 'nuit' || item.price_unit === 'jour' || isVehicle) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground/60 font-medium">
                            {isVehicle ? 'Durée de location :' : 'Durée du séjour :'}
                          </span>
                          <div className="inline-flex items-center rounded-lg border border-foreground/15 bg-background overflow-hidden shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                const newDuration = Math.max(1, duration - 1);
                                updateItem(index, {
                                  nights: isVehicle ? 0 : newDuration,
                                  days: isVehicle ? newDuration : 0,
                                  qty: newDuration
                                });
                              }}
                              disabled={duration <= 1}
                              className="px-2.5 py-1 text-xs font-bold text-foreground/70 hover:bg-muted disabled:opacity-30 transition-colors"
                              title="Diminuer"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-foreground min-w-[3.5rem] text-center font-mono bg-muted/30">
                              {duration} {isVehicle ? (duration > 1 ? 'jours' : 'jour') : (duration > 1 ? 'nuits' : 'nuit')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newDuration = duration + 1;
                                updateItem(index, {
                                  nights: isVehicle ? 0 : newDuration,
                                  days: isVehicle ? newDuration : 0,
                                  qty: newDuration
                                });
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-foreground/70 hover:bg-muted transition-colors"
                              title="Augmenter"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-foreground/50">Prestation unique</span>
                      )}

                      {item.guests && (
                        <span className="text-xs text-foreground/50">
                          · {item.guests} voyageur(s)
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-foreground/5">
                      <span className="text-xs text-foreground/60">
                        {formatPrice(item.price)} × {duration} {isVehicle ? (duration > 1 ? 'jours' : 'jour') : (duration > 1 ? 'nuits' : 'nuit')}
                      </span>
                      <span className="font-heading text-lg font-bold text-primary">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Sticky Summary Card */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <ScrollReveal delay={120} y={24} scale={0.97} className="rounded-xl border border-foreground/10 bg-card p-6 shadow-xl shadow-foreground/5">
            <h2 className="caption text-foreground/50">Récapitulatif</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-foreground/80">
                <span>Sous-total</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-foreground/80">
                <span>Frais de service</span>
                <span className="text-emerald-700 font-medium">0 FCFA</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-baseline border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Link to="/checkout" className="block mt-6">
              <button className="w-full rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98]">
                Passer au paiement
              </button>
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
