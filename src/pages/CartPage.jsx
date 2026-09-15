import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';

export function CartPage() {
  const { items, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <ScrollReveal delay={0} y={20} className="mx-auto flex max-w-8xl flex-col items-center px-6 py-32 text-center md:px-12">
        <ShoppingBag className="h-14 w-14 text-foreground/30" strokeWidth={1} />
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
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
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
            const duration = item.nights || item.days || item.qty || 1;
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
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted border border-foreground/10">
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
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-lg font-semibold leading-snug">
                          {item.title}
                        </h3>
                        {item.location && (
                          <p className="text-sm text-foreground/60 mt-0.5">
                            {item.location}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-foreground/40 hover:text-destructive transition-colors p-1"
                        title="Supprimer du panier"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-foreground/50">
                      {item.price_unit === 'nuit'
                        ? `${duration} nuit(s)`
                        : item.price_unit === 'jour'
                        ? `${duration} jour(s)`
                        : 'Prestation unique'}
                      {item.guests ? ` · ${item.guests} voyageur(s)` : ''}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-sm text-foreground/60">
                        {formatPrice(item.price)} / {item.price_unit}
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
