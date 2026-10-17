import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { BrandLogo } from './BrandLogo';
import { LanguageToggle } from './LanguageToggle';
import { useLanguage } from '../context/LanguageContext';

/**
 * Mise en page des pages de connexion et d'inscription :
 * panneau photo à gauche (grand écran), formulaire centré à droite.
 */
export function AuthLayout({ image, eyebrow, headline, points = [], children }) {
  const { t } = useLanguage();

  return (
    <div className="grid min-h-screen w-full bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Panneau visuel */}
      <aside className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-screen">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14 text-white">
          <Link to="/" className="w-fit transition-opacity hover:opacity-90">
            <BrandLogo size="lg" textColor="text-white" />
          </Link>

          <div className="max-w-md">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t(eyebrow)}</p>
            )}
            <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight xl:text-4xl">{t(headline)}</h2>
            {points.length > 0 && (
              <ul className="mt-8 space-y-4">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-white/85">
                    <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{t(point)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-white/50">© {new Date().getFullYear()} Bénin Beyond</p>
        </div>
      </aside>

      {/* Formulaire */}
      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="lg:hidden">
            <BrandLogo size="md" />
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-2 text-xs font-medium text-foreground/60 transition-colors hover:text-foreground lg:inline-flex"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" />
            <span>{t("Retour à l'accueil")}</span>
          </Link>
          <LanguageToggle />
        </div>

        {/* Bandeau photo sur téléphone (le panneau de gauche est masqué) */}
        <div className="relative mx-auto mt-6 h-40 w-full max-w-md overflow-hidden rounded-2xl lg:hidden">
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{t(eyebrow)}</p>}
            <p className="mt-1 font-heading text-base font-bold leading-snug">{t(headline)}</p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
