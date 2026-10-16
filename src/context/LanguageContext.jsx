import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EN_TRANSLATIONS } from '../i18n/en';

/**
 * Langue du site public (français par défaut, anglais pour les voyageurs étrangers).
 * Les textes restent écrits en français dans le code : t('Texte') renvoie la traduction
 * anglaise de src/i18n/en.js, ou le texte français s'il n'est pas encore traduit.
 */

const STORAGE_KEY = 'benin_beyond_lang';
const SUPPORTED = ['fr', 'en'];

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {}
  const browser = (typeof navigator !== 'undefined' && navigator.language) || 'fr';
  return browser.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const LanguageContext = createContext({
  lang: 'fr',
  setLang: () => {},
  t: (text) => text,
  locale: 'fr-FR'
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (text, vars) => {
      let out = lang === 'en' ? EN_TRANSLATIONS[text] ?? text : text;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          out = out.split(`{${k}}`).join(String(v));
        });
      }
      return out;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, locale: lang === 'en' ? 'en-GB' : 'fr-FR' }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Les tableaux de bord (voyageur, propriétaire, admin) restent toujours en français
const FRENCH_ONLY = {
  lang: 'fr',
  setLang: () => {},
  t: (text, vars) => {
    let out = text;
    if (vars) Object.entries(vars).forEach(([k, v]) => { out = out.split(`{${k}}`).join(String(v)); });
    return out;
  },
  locale: 'fr-FR'
};

export function FrenchOnly({ children }) {
  return <LanguageContext.Provider value={FRENCH_ONLY}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
