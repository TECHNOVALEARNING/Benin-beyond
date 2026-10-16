import React from 'react';

/**
 * Logo officiel "Bénin Beyond" : logotype texte seul (pas d'emblème).
 * - Fond clair : "Bénin" vert émeraude, "Beyond" or
 * - Fond sombre : "Bénin" blanc, "Beyond" or
 */
export function BrandLogo({
  size = 'md',
  textColor = 'text-foreground',
  className = '',
  textClassName = ''
}) {
  const isDarkBg =
    textColor.includes('white') ||
    textColor.includes('secondary-foreground') ||
    textColor.includes('text-slate-100') ||
    textColor.includes('text-gray-100');

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg sm:text-[1.35rem]',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl'
  };

  return (
    <span
      className={`inline-flex items-center select-none shrink-0 ${className}`}
      aria-label="Bénin Beyond"
    >
      <span
        className={`font-heading font-extrabold leading-none tracking-[-0.02em] whitespace-nowrap ${
          textSizes[size] || textSizes.md
        } ${textClassName}`}
      >
        <span className={isDarkBg ? 'text-white' : 'text-primary'}>Bénin</span>{' '}
        <span className="text-accent">Beyond</span>
      </span>
    </span>
  );
}

export default BrandLogo;
