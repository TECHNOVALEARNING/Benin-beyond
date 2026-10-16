import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Bascule FR / EN du site public.
 * variant "light" pour un fond sombre (en-tête de l'accueil sur photo).
 */
export function LanguageToggle({ variant = 'default' }) {
  const { lang, setLang } = useLanguage();
  const isLight = variant === 'light';

  return (
    <div
      role="group"
      aria-label="Langue / Language"
      className={`inline-flex shrink-0 items-center rounded-full border p-0.5 text-[11px] font-semibold ${
        isLight ? 'border-white/25 bg-white/10 backdrop-blur-md' : 'border-foreground/15'
      }`}
    >
      {['fr', 'en'].map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={`rounded-full px-2 py-1 uppercase transition-colors ${
              active
                ? isLight
                  ? 'bg-white text-black'
                  : 'bg-foreground text-background'
                : isLight
                ? 'text-white/75 hover:text-white'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
