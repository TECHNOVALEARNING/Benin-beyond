import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from './ScrollReveal';
import { BrandLogo } from './BrandLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-secondary text-secondary-foreground">
      {/* 1. Main Navigation & Info Grid (Balanced 4-column layout) */}
      <div className="relative z-10 mx-auto grid max-w-8xl gap-10 px-6 pt-16 pb-12 sm:grid-cols-2 md:grid-cols-12 md:px-12">
        {/* Brand Col */}
        <div className="sm:col-span-2 md:col-span-5 lg:col-span-4">
          <ScrollReveal delay={0} y={20}>
            <BrandLogo size="md" textColor="text-secondary-foreground" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary-foreground/70">
              L'écosystème d'hospitalité et de mobilité curaté à travers le Bénin. Là où l'héritage terrestre rencontre la précision digitale.
            </p>
          </ScrollReveal>
        </div>

        {/* Navigation Col */}
        <div className="md:col-span-2 lg:col-span-2">
          <ScrollReveal delay={60} y={20}>
            <p className="caption text-secondary-foreground/50">Navigation</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/explore?type=stay" className="hover:text-accent transition-colors">
                  Séjourner
                </Link>
              </li>
              <li>
                <Link to="/explore?type=drive" className="hover:text-accent transition-colors">
                  Véhicules
                </Link>
              </li>
              <li>
                <Link to="/decouvertes" className="hover:text-accent transition-colors">
                  Découvertes
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

        {/* Confidentialité & Légal Col */}
        <div className="md:col-span-2 lg:col-span-3">
          <ScrollReveal delay={120} y={20}>
            <p className="caption text-secondary-foreground/50">Confidentialité & Légal</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/confidentialite" className="hover:text-accent transition-colors">
                  Politique de Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/cgu" className="hover:text-accent transition-colors">
                  Conditions d'Utilisation (CGU)
                </Link>
              </li>
            </ul>
          </ScrollReveal>
        </div>

        {/* Contact Col */}
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-3">
          <ScrollReveal delay={180} y={20}>
            <p className="caption text-secondary-foreground/50">Conciergerie & Support</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-accent" />
                <span>+229 01 96 00 00 00</span>
              </li>
              <li className="flex items-center gap-2">
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-accent" />
                <span>contact@beninbeyond.com</span>
              </li>
              <li className="text-xs text-secondary-foreground/60 pt-2 leading-relaxed max-w-sm">
                Assistance voyageur & conciergerie disponible 7j/7 de 08h00 à 22h00 WAT.
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </div>

      {/* 2. Copyright & Legal Quick Links Bar */}
      <div className="relative z-10 border-t border-secondary-foreground/10">
        <div className="mx-auto flex max-w-8xl flex-col sm:flex-row items-center justify-between gap-3 px-6 py-5 text-xs text-secondary-foreground/50 md:px-12">
          <span>© {currentYear} Bénin Beyond. Tous droits réservés.</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-secondary-foreground/60">
            <Link to="/confidentialite" className="hover:text-accent transition-colors">
              Politique de Confidentialité
            </Link>
            <span className="text-secondary-foreground/30">•</span>
            <Link to="/cgu" className="hover:text-accent transition-colors">
              Conditions d'Utilisation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
