import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Geopricing : les prix sont stockés et encaissés en FCFA (XOF).
 * L'affichage public est converti dans la devise du pays du visiteur
 * (détection par adresse IP, repli sur la langue du navigateur),
 * avec un choix manuel possible (mémorisé sur l'appareil).
 */

export const BASE_CURRENCY = 'XOF';

const PREF_KEY = 'benin_beyond_currency_pref';
const DETECTED_KEY = 'benin_beyond_currency_detected';
const RATES_KEY = 'benin_beyond_currency_rates';
const RATES_TTL_MS = 12 * 60 * 60 * 1000;
const DETECTED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Devises proposées dans le sélecteur
export const SUPPORTED_CURRENCIES = [
  { code: 'XOF', label: 'Franc CFA (BCEAO)' },
  { code: 'XAF', label: 'Franc CFA (BEAC)' },
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'Dollar américain' },
  { code: 'GBP', label: 'Livre sterling' },
  { code: 'CAD', label: 'Dollar canadien' },
  { code: 'CHF', label: 'Franc suisse' },
  { code: 'NGN', label: 'Naira nigérian' },
  { code: 'GHS', label: 'Cedi ghanéen' },
  { code: 'MAD', label: 'Dirham marocain' },
  { code: 'ZAR', label: 'Rand sud-africain' },
  { code: 'CNY', label: 'Yuan chinois' },
  { code: 'JPY', label: 'Yen japonais' },
  { code: 'AED', label: 'Dirham des Émirats' },
  { code: 'BRL', label: 'Réal brésilien' }
];

// Taux de secours (1 XOF = x devise). Le franc CFA est arrimé à l'euro : 1 EUR = 655,957 XOF.
const FALLBACK_RATES = {
  XOF: 1,
  XAF: 1,
  EUR: 1 / 655.957,
  USD: 0.00175,
  GBP: 0.0013,
  CAD: 0.0024,
  CHF: 0.0014,
  NGN: 2.7,
  GHS: 0.026,
  MAD: 0.016,
  ZAR: 0.031,
  CNY: 0.0125,
  JPY: 0.26,
  AED: 0.0064,
  BRL: 0.0095
};

// Pays -> devise (utilisé quand le service de géolocalisation ne renvoie que le pays)
const COUNTRY_CURRENCY = {
  BJ: 'XOF', TG: 'XOF', CI: 'XOF', SN: 'XOF', BF: 'XOF', ML: 'XOF', NE: 'XOF', GW: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  FR: 'EUR', BE: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', LU: 'EUR',
  IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', MC: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
  US: 'USD', GB: 'GBP', CA: 'CAD', CH: 'CHF', NG: 'NGN', GH: 'GHS', MA: 'MAD', ZA: 'ZAR',
  CN: 'CNY', JP: 'JPY', AE: 'AED', BR: 'BRL'
};

const CURRENCY_DECIMALS = { XOF: 0, XAF: 0, JPY: 0, NGN: 0 };

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const fetchJson = async (url, ms = 4000) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const currencyFromLocale = () => {
  try {
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const loc of locales) {
      const region = new Intl.Locale(loc).maximize().region;
      if (region && COUNTRY_CURRENCY[region]) return COUNTRY_CURRENCY[region];
    }
  } catch {}
  return null;
};

async function detectVisitorCurrency() {
  // 1. Service de géolocalisation par IP (renvoie directement la devise)
  try {
    const geo = await fetchJson('https://ipapi.co/json/');
    if (geo?.currency) return String(geo.currency).toUpperCase();
    if (geo?.country_code && COUNTRY_CURRENCY[geo.country_code]) return COUNTRY_CURRENCY[geo.country_code];
  } catch {}

  // 2. Service de secours (pays seulement)
  try {
    const geo = await fetchJson('https://get.geojs.io/v1/ip/country.json');
    const country = String(geo?.country || '').toUpperCase();
    if (COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];
  } catch {}

  // 3. Langue / région du navigateur
  return currencyFromLocale() || BASE_CURRENCY;
}

async function loadRates() {
  const cached = readJson(RATES_KEY);
  if (cached?.rates && Date.now() - cached.at < RATES_TTL_MS) return cached.rates;

  try {
    const data = await fetchJson(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (data?.result === 'success' && data.rates) {
      writeJson(RATES_KEY, { at: Date.now(), rates: data.rates });
      return data.rates;
    }
  } catch {}

  return cached?.rates || FALLBACK_RATES;
}

export function formatXof(amount) {
  const n = Number(amount) || 0;
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const initialPref = readJson(PREF_KEY);
  const initialDetected = readJson(DETECTED_KEY);
  const initialRates = readJson(RATES_KEY);

  const [preferred, setPreferred] = useState(initialPref?.code || null);
  const [detected, setDetected] = useState(initialDetected?.code || null);
  const [rates, setRates] = useState(initialRates?.rates || FALLBACK_RATES);

  useEffect(() => {
    let active = true;

    loadRates().then((r) => {
      if (active && r) setRates(r);
    });

    const detectedFresh = initialDetected?.code && Date.now() - initialDetected.at < DETECTED_TTL_MS;
    if (!detectedFresh) {
      detectVisitorCurrency().then((code) => {
        if (!active) return;
        setDetected(code);
        writeJson(DETECTED_KEY, { code, at: Date.now() });
      });
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wanted = preferred || detected || BASE_CURRENCY;
  // Devise sans taux connu : affichage en FCFA
  const currency = wanted === BASE_CURRENCY || Number(rates?.[wanted]) > 0 ? wanted : BASE_CURRENCY;
  const rate = currency === BASE_CURRENCY ? 1 : Number(rates[currency]);

  const setCurrency = useCallback((code) => {
    const clean = code ? String(code).toUpperCase() : null;
    setPreferred(clean);
    if (clean) writeJson(PREF_KEY, { code: clean });
    else {
      try {
        localStorage.removeItem(PREF_KEY);
      } catch {}
    }
  }, []);

  const convert = useCallback((amountXof) => (Number(amountXof) || 0) * rate, [rate]);

  const formatPrice = useCallback(
    (amountXof) => {
      if (currency === BASE_CURRENCY || currency === 'XAF') return formatXof(amountXof);
      const value = convert(amountXof);
      const decimals = CURRENCY_DECIMALS[currency] ?? (value >= 1000 ? 0 : 2);
      try {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
      } catch {
        return `${value.toFixed(decimals)} ${currency}`;
      }
    },
    [currency, convert]
  );

  const value = useMemo(
    () => ({
      currency,
      detectedCurrency: detected,
      isLocalCurrency: currency !== BASE_CURRENCY && currency !== 'XAF',
      setCurrency,
      convert,
      formatPrice,
      formatXof
    }),
    [currency, detected, setCurrency, convert, formatPrice]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // Hors du fournisseur : affichage en FCFA
  return {
    currency: BASE_CURRENCY,
    detectedCurrency: null,
    isLocalCurrency: false,
    setCurrency: () => {},
    convert: (n) => Number(n) || 0,
    formatPrice: formatXof,
    formatXof
  };
}
