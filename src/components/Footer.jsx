import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from './ScrollReveal';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-secondary text-secondary-foreground">
      {/* Filigrane Monumental "BÉNIN BEYOND" (Directement derrière les écrits du footer, 100% des lettres visibles) */}
      <div 
        className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 flex items-center justify-center overflow-hidden px-6 md:px-12"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1600 210"
          className="w-full max-w-8xl h-auto select-none pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="footerWatermarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.14" />
              <stop offset="50%" stopColor="white" stopOpacity="0.08" />
              <stop offset="100%" stopColor="white" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="url(#footerWatermarkGrad)"
            className="font-heading font-black uppercase"
            fontSize="120"
            textLength="1360"
            lengthAdjust="spacing"
            style={{ fontFamily: 'var(--font-heading, "Outfit", sans-serif)', fontWeight: 900 }}
          >
            BÉNIN BEYOND
          </text>
        </svg>
      </div>

      {/* 1. Main Navigation & Info Grid (Balanced 3-column layout) */}
      <div className="relative z-10 mx-auto grid max-w-8xl gap-10 px-6 pt-16 pb-12 md:grid-cols-12 md:px-12">
        {/* Brand Col */}
        <div className="md:col-span-6 lg:col-span-5">
          <ScrollReveal delay={0} y={20}>
            <h3 className="section-title text-2xl">Bénin Beyond</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary-foreground/70">
              L'écosystème d'hospitalité et de mobilité curaté à travers le Bénin. Là où l'héritage terrestre rencontre la précision digitale.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-secondary-foreground/70">
              <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-accent" />
              <span>Cotonou, République du Bénin</span>
            </div>
          </ScrollReveal>
        </div>

        {/* Navigation Col */}
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
                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-accent" />
                <span>+229 01 96 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-accent" />
                <span>contact@beninbeyond.bj</span>
              </li>
              <li className="text-xs text-secondary-foreground/60 pt-2 leading-relaxed max-w-sm">
                Assistance voyageur & conciergerie disponible 7j/7 de 08h00 à 22h00 WAT.
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </div>

      {/* 2. Copyright Bar (Nettoyée, sans mention Mobile Money) */}
      <div className="relative z-10 border-t border-secondary-foreground/10">
        <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-5 text-xs text-secondary-foreground/50 md:px-12">
          <span>© {currentYear} Bénin Beyond. Tous droits réservés.</span>
          <span className="text-secondary-foreground/40 hidden sm:inline">Plateforme Curatée d'Hospitalité & Mobilité</span>
        </div>
      </div>
    </footer>
  );
}
