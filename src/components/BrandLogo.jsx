import React from 'react';

/**
 * Emblème officiel "Bénin Beyond" (B doré + étoile sur écrin émeraude).
 * Fichier vectoriel unique : /favicon.svg
 */
export function BrandIcon({ size = 'md', className = '' }) {
  const isNumeric = typeof size === 'number';
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7',
    md: 'h-8 w-8 sm:h-9 sm:w-9',
    lg: 'h-10 w-10 sm:h-12 sm:w-12',
    xl: 'h-14 w-14 sm:h-16 sm:w-16'
  };
  const dim = isNumeric ? '' : (sizeMap[size] || sizeMap.md);

  return (
    <span
      style={isNumeric ? { width: `${size}px`, height: `${size}px` } : undefined}
      className={`relative inline-flex shrink-0 select-none ${dim} ${className}`}
    >
      <img
        src="/favicon.svg"
        alt="Bénin Beyond"
        width="120"
        height="120"
        draggable="false"
        className="h-full w-full object-contain select-none"
      />
    </span>
  );
}

/**
 * Logo officiel "Bénin Beyond" : emblème + logotype, sans slogan.
 * - Fond clair : "Bénin" vert émeraude, "Beyond" or
 * - Fond sombre : "Bénin" blanc, "Beyond" or
 */
export function BrandLogo({
  size = 'md',
  showText = true,
  textColor = 'text-foreground',
  className = '',
  iconClassName = '',
  textClassName = ''
}) {
  const isDarkBg =
    textColor.includes('white') ||
    textColor.includes('secondary-foreground') ||
    textColor.includes('text-slate-100') ||
    textColor.includes('text-gray-100');

  const iconSizes = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7',
    md: 'h-8 w-8 sm:h-9 sm:w-9',
    lg: 'h-10 w-10 sm:h-11 sm:w-11',
    xl: 'h-12 w-12 sm:h-14 sm:w-14'
  };

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg sm:text-[1.35rem]',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl'
  };

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}
      aria-label="Bénin Beyond"
    >
      <BrandIcon size={size} className={`${iconSizes[size] || iconSizes.md} ${iconClassName}`} />

      {showText && (
        <span
          className={`font-heading font-extrabold leading-none tracking-[-0.02em] whitespace-nowrap ${
            textSizes[size] || textSizes.md
          } ${textClassName}`}
        >
          <span className={isDarkBg ? 'text-white' : 'text-primary'}>Bénin</span>{' '}
          <span className="text-accent">Beyond</span>
        </span>
      )}
    </span>
  );
}

export default BrandLogo;
