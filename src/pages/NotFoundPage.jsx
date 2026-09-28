import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-32 text-center md:px-12">
      <FontAwesomeIcon icon={faCompass} className="h-16 w-16 text-primary animate-pulse" />
      <h1 className="section-title mt-6 text-4xl">Page non trouvée</h1>
      <p className="mt-3 text-foreground/60 max-w-md">
        La destination ou la page que vous recherchez semble introuvable.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
        <span>Retour à l'accueil</span>
      </Link>
    </div>
  );
}
