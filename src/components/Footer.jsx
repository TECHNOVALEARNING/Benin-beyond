import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { ScrollReveal } from './ScrollReveal';
import { BrandLogo } from './BrandLogo';
import { useHasPacks } from '../services/packService';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const hasPacks = useHasPacks();

  const navLinks = [
    { to: '/explore?type=stay', label: 'Séjourner' },
    { to: '/explore?type=drive', label: 'Véhicules' },
    { to: '/decouvertes', label: 'Découvertes' },
    ...(hasPacks ? [{ to: '/packs', label: 'Formules & Packs' }] : []),
    { to: '/panier', label: 'Mon panier' }
  ];

  const legalLinks = [
    { to: '/confidentialite', label: 'Politique de Confidentialité' },
    { to: '/cgu', label: "Conditions d'Utilisation (CGU)" }
  ];

  return (
    <footer className="relative overflow-hidden border-t border-foreground/10 bg-secondary text-secondary-foreground">
      {/* 1. Colonnes d'information */}
      <div className="mx-auto grid max-w-8xl gap-10 px-6 pt-14 pb-10 sm:grid-cols-2 md:px-12 md:pt-16 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-5">
          <ScrollReveal delay={0} y={20}>
            <BrandLogo size="md" textColor="text-secondary-foreground" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary-foreground/70">
              {t("L'écosystème d'hospitalité et de mobilité curaté à travers le Bénin. Là où l'héritage terrestre rencontre la précision digitale.")}
            </p>
          </ScrollReveal>
        </div>

        <div className="lg:col-span-2">
          <ScrollReveal delay={60} y={20}>
            <p className="caption text-secondary-foreground/50">{t('Navigation')}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-secondary-foreground/85 transition-colors hover:text-accent">
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>

        <div className="lg:col-span-2">
          <ScrollReveal delay={120} y={20}>
            <p className="caption text-secondary-foreground/50">{t('Confidentialité & Légal')}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-secondary-foreground/85 transition-colors hover:text-accent">
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <ScrollReveal delay={180} y={20}>
            <p className="caption text-secondary-foreground/50">{t('Conciergerie & Support')}</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-accent" />
                <span>+229 01 96 00 00 00</span>
              </li>
              <li className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-accent" />
                <a href="mailto:contact@beninbeyond.com" className="transition-colors hover:text-accent">
                  contact@beninbeyond.com
                </a>
              </li>
              <li className="max-w-xs pt-1 text-xs leading-relaxed text-secondary-foreground/60">
                {t('Assistance voyageur & conciergerie disponible 7j/7 de 08h00 à 22h00 WAT.')}
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </div>

      {/* 2. Copyright */}
      <div className="border-t border-secondary-foreground/10">
        <p className="mx-auto max-w-8xl px-6 py-5 text-center text-xs text-secondary-foreground/50 sm:text-left md:px-12">
          © {currentYear} Bénin Beyond. {t('Tous droits réservés.')}
        </p>
      </div>

      {/* 3. Signature monumentale : bandeau dédié, pleine largeur, lettres coupées en bas (aucun texte par-dessus) */}
      <div className="pointer-events-none select-none px-4 pb-24 md:px-12" aria-hidden="true">
        <svg viewBox="0 0 1000 150" preserveAspectRatio="xMidYMax meet" className="mx-auto block h-auto w-full max-w-8xl">
          <defs>
            <linearGradient id="footerWordmarkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.16" />
              <stop offset="100%" stopColor="white" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <text
            x="500"
            y="168"
            textAnchor="middle"
            textLength="990"
            lengthAdjust="spacingAndGlyphs"
            fontSize="200"
            fill="url(#footerWordmarkGrad)"
            style={{ fontFamily: 'var(--font-heading, "Outfit", sans-serif)', fontWeight: 900, letterSpacing: '-0.02em' }}
          >
            BÉNIN BEYOND
          </text>
        </svg>
      </div>
    </footer>
  );
}
