import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-secondary text-secondary-foreground">
      {/* 1. Main Navigation & Info Grid (Balanced 3-column layout) */}
      <div className="relative z-10 mx-auto grid max-w-8xl gap-10 px-6 pt-16 pb-8 md:grid-cols-12 md:px-12">
        {/* Brand Col */}
        <div className="md:col-span-6 lg:col-span-5">
          <ScrollReveal delay={0} y={20}>
            <h3 className="section-title text-2xl">Bénin Beyond</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary-foreground/70">
              L'écosystème d'hospitalité et de mobilité curaté à travers le Bénin. Là où l'héritage terrestre rencontre la précision digitale.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-secondary-foreground/70">
              <MapPin className="h-4 w-4 text-accent" strokeWidth={1.5} />
              <span>Cotonou, République du Bénin</span>
            </div>
          </ScrollReveal>
        </div>

        {/* Navigation Col (Cleaned: no parentheses) */}
        <div className="md:col-span-3 lg:col-span-3">
          <ScrollReveal delay={80} y={20}>
            <p className="caption text-secondary-foreground/50">Navigation</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/explore?type=stay" className="hover:text-accent transition-colors">
                  Séjourner
                </Link>
              </li>
              <li>
                <Link to="/explore?type=drive" className="hover:text-accent transition-colors">
                  Conduire
                </Link>
              </li>
              <li>
                <Link to="/tourisme" className="hover:text-accent transition-colors">
                  Tourisme
                </Link>
              </li>
              <li>
                <Link to="/packs" className="hover:text-accent transition-colors">
                  Formules & Packs
                </Link>
              </li>
              <li>
                <Link to="/panier" className="hover:text-accent transition-colors">
                  Mon panier
                </Link>
              </li>
            </ul>
          </ScrollReveal>
        </div>

        {/* Contact Col */}
        <div className="md:col-span-3 lg:col-span-4">
          <ScrollReveal delay={160} y={20}>
            <p className="caption text-secondary-foreground/50">Conciergerie & Support</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <span>+229 01 96 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" strokeWidth={1.5} />
                <span>contact@beninbeyond.bj</span>
              </li>
              <li className="text-xs text-secondary-foreground/60 pt-2 leading-relaxed max-w-sm">
                Assistance voyageur & conciergerie disponible 7j/7 de 08h00 à 22h00 WAT.
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </div>

      {/* 2. Filigrane Monumental "BÉNIN BEYOND" (Taille ajustée pour visibilité intégrale de toutes les lettres) */}
      <div className="relative w-full overflow-hidden select-none pointer-events-none py-6 sm:py-8 md:py-10">
        <div className="mx-auto flex max-w-8xl items-center justify-center px-6">
          <span
            className="font-heading text-[6.8vw] sm:text-[6vw] md:text-[5.2vw] lg:text-[4.6vw] font-black uppercase tracking-wider leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/[0.08] via-white/[0.035] to-transparent whitespace-nowrap text-center"
            aria-hidden="true"
          >
            Bénin Beyond
          </span>
        </div>
      </div>

      {/* 3. Copyright & Legal Bar */}
      <div className="relative z-10 border-t border-secondary-foreground/10">
        <div className="mx-auto flex max-w-8xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-secondary-foreground/50 md:flex-row md:px-12">
          <span>© {currentYear} Bénin Beyond. Tous droits réservés.</span>
          <span className="caption">Mobile Money (MTN, Celtiis, Moov) · Carte Bancaire Visa / Mastercard</span>
        </div>
      </div>
    </footer>
  );
}
