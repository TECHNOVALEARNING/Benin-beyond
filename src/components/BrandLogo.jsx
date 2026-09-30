import React from 'react';

/**
 * Emblème Officiel & Logo de Marque "Bénin Beyond"
 * Symbolise l'hospitalité de standing, la mobilité d'exception et l'horizon béninois.
 */
export function BrandIcon({ size = 'md', className = '' }) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-12 h-12 md:w-14 md:h-14',
    xl: 'w-16 h-16 md:w-20 md:h-20'
  };

  const dim = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dim} ${className}`}>
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm select-none"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#08221B" />
            <stop offset="50%" stop-color="#0D3B2E" />
            <stop offset="100%" stop-color="#041510" />
          </linearGradient>

          <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF0C8" />
            <stop offset="35%" stop-color="#F2BA58" />
            <stop offset="70%" stop-color="#D78E27" />
            <stop offset="100%" stop-color="#9E6111" />
          </linearGradient>

          <linearGradient id="logo-gold-soft" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#D78E27" />
            <stop offset="100%" stop-color="#FCE1A2" />
          </linearGradient>

          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#E09F3E" flood-opacity="0.4" />
          </filter>
        </defs>

        {/* Cadre de Prestige arrondi */}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="28"
          fill="url(#logo-bg)"
          stroke="url(#logo-gold)"
          stroke-width="2.5"
          stroke-opacity="0.75"
        />

        {/* Liseré architectural intérieur */}
        <rect
          x="10"
          y="10"
          width="100"
          height="100"
          rx="22"
          fill="none"
          stroke="#FFFFFF"
          stroke-opacity="0.08"
          stroke-width="1"
        />

        {/* Emblème Signature Bénin Beyond */}
        <g filter="url(#logo-glow)">
          {/* Pilier vertical de standing */}
          <path
            d="M34 26 C34 24.34 35.34 23 37 23 L44 23 C45.66 23 47 24.34 47 26 L47 94 C47 95.66 45.66 97 44 97 L37 97 C35.34 97 34 95.66 34 94 Z"
            fill="url(#logo-gold)"
          />

          {/* Arche supérieure (Hospitalité & Résidences de Standing) */}
          <path
            d="M47 25 C58 25 74 27 74 41 C74 53 60 56 47 56"
            fill="none"
            stroke="url(#logo-gold)"
            stroke-width="7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          {/* Arche inférieure déployée vers l'horizon "Beyond" (Voyage & Mobilité) */}
          <path
            d="M47 56 C62 56 84 58 84 75 C84 92 63 95 47 95"
            fill="none"
            stroke="url(#logo-gold)"
            stroke-width="7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          {/* Faisceau dynamique d'envol vers l'horizon */}
          <path
            d="M40 56 L88 38"
            stroke="url(#logo-gold-soft)"
            stroke-width="3.5"
            stroke-linecap="round"
            opacity="0.9"
          />

          {/* Étoile d'Excellence du Bénin au sommet */}
          <path
            d="M85 22 L87.5 28 L93.5 30.5 L87.5 33 L85 39 L82.5 33 L76.5 30.5 L82.5 28 Z"
            fill="url(#logo-gold)"
          />
        </g>
      </svg>
    </div>
  );
}

export function BrandLogo({
  size = 'md',
  showText = true,
  textColor = 'text-foreground',
  subtext = null,
  className = '',
  iconClassName = '',
  textClassName = ''
}) {
  return (
    <div className={`inline-flex items-center gap-2 sm:gap-3 select-none shrink-0 ${className}`}>
      <BrandIcon size={size} className={iconClassName} />
      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`font-heading font-bold tracking-tight whitespace-nowrap ${size === 'lg' ? 'text-2xl md:text-3xl' : size === 'sm' ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'} ${textColor} ${textClassName}`}>
            Bénin Beyond
          </span>
          {subtext && (
            <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-accent font-semibold -mt-0.5 whitespace-nowrap">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
