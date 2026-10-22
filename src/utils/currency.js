// Geopricing : les tarifs sont stockés et encaissés en FCFA (XOF), mais chaque visiteur
// les voit convertis dans la devise de son pays. Le pays vient de /api/geo (en-tête Vercel),
// sinon d'un service de géolocalisation IP, sinon de la langue du navigateur.

const BASE = 'XOF';
const STORAGE_KEY = 'bb_currency_v1';
const RATES_TTL = 12 * 60 * 60 * 1000; // taux rafraîchis toutes les 12 h
const FIRST_VISIT_TIMEOUT = 1500;

// Parités fixes (garanties par le Trésor français) et taux de secours si l'API de change est injoignable
const FALLBACK_RATES = {
  XOF: 1,
  XAF: 1,
  EUR: 1 / 655.957,
  KMF: 491.96775 / 655.957,
  USD: 1 / 600,
  GBP: 1 / 770,
  CAD: 1 / 440,
  CHF: 1 / 690,
  NGN: 2.6,
  GHS: 1 / 40,
  MAD: 1 / 61
};

const EURO_ZONE = ['AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'MC', 'SM', 'VA', 'AD', 'ME', 'XK', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF', 'AX'];

const COUNTRY_CURRENCY = {
  // Zone franc CFA
  BJ: 'XOF', BF: 'XOF', CI: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',
  CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',
  // Afrique
  NG: 'NGN', GH: 'GHS', MA: 'MAD', DZ: 'DZD', TN: 'TND', EG: 'EGP', ZA: 'ZAR', KE: 'KES',
  RW: 'RWF', CD: 'CDF', GN: 'GNF', MR: 'MRU', SL: 'SLE', LR: 'LRD', GM: 'GMD', CV: 'CVE',
  ET: 'ETB', UG: 'UGX', TZ: 'TZS', AO: 'AOA', MG: 'MGA', MU: 'MUR', KM: 'KMF', BI: 'BIF',
  DJ: 'DJF', ZM: 'ZMW', ZW: 'USD', MZ: 'MZN', NA: 'NAD', BW: 'BWP', SD: 'SDG', LY: 'LYD',
  // Europe hors zone euro
  GB: 'GBP', CH: 'CHF', LI: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', IS: 'ISK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RS: 'RSD', UA: 'UAH', RU: 'RUB', TR: 'TRY',
  // Amériques
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN',
  HT: 'HTG', DO: 'DOP', CU: 'CUP', JM: 'JMD', TT: 'TTD', PR: 'USD', EC: 'USD', PA: 'USD',
  // Asie, Moyen-Orient, Océanie
  CN: 'CNY', JP: 'JPY', KR: 'KRW', IN: 'INR', PK: 'PKR', BD: 'BDT', ID: 'IDR', MY: 'MYR',
  SG: 'SGD', TH: 'THB', VN: 'VND', PH: 'PHP', HK: 'HKD', TW: 'TWD', AE: 'AED', SA: 'SAR',
  QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', IL: 'ILS', LB: 'LBP', JO: 'JOD',
  AU: 'AUD', NZ: 'NZD'
};
EURO_ZONE.forEach((c) => { COUNTRY_CURRENCY[c] = 'EUR'; });

const state = { currency: BASE, rate: 1, country: null };

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* stockage indisponible : on recalculera à la prochaine visite */
  }
}

function apply(currency, rate, country) {
  if (!currency || !(rate > 0)) return;
  state.currency = currency;
  state.rate = rate;
  state.country = country || null;
}

async function fetchJson(url, ms = 2500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function detectCountry() {
  try {
    const { country } = await fetchJson('/api/geo');
    if (/^[A-Z]{2}$/.test(country || '')) return country;
  } catch { /* hors Vercel (dev local) : on passe au service suivant */ }
  try {
    const { country } = await fetchJson('https://get.geojs.io/v1/ip/country.json');
    if (/^[A-Z]{2}$/.test(country || '')) return country;
  } catch { /* service injoignable */ }
  const region = (navigator.language || '').split('-')[1];
  return region && region.length === 2 ? region.toUpperCase() : null;
}

async function fetchRate(currency) {
  if (currency === BASE) return 1;
  try {
    const data = await fetchJson(`https://open.er-api.com/v6/latest/${BASE}`);
    const rate = data?.rates?.[currency];
    if (rate > 0) return rate;
  } catch { /* on retombe sur les taux de secours */ }
  return FALLBACK_RATES[currency] || null;
}

async function resolve(forcedCurrency) {
  const country = forcedCurrency ? null : await detectCountry();
  let currency = forcedCurrency || (country && (COUNTRY_CURRENCY[country] || 'USD')) || BASE;
  let rate = await fetchRate(currency);
  if (!rate) {
    // Devise sans taux connu : on affiche en dollars plutôt que dans une devise approximative
    currency = 'USD';
    rate = await fetchRate('USD');
  }
  const result = { currency, rate, country, forced: !!forcedCurrency, at: Date.now() };
  writeCache(result);
  return result;
}

/**
 * À appeler avant le premier rendu. Avec un cache valide, la résolution est immédiate ;
 * lors d'une première visite, on attend la détection au plus 1,5 s avant d'afficher en FCFA.
 * Paramètre ?devise=EUR (ou ?devise=auto) pour forcer / réinitialiser la devise.
 */
export async function initCurrency() {
  const waitFor = (promise) =>
    Promise.race([promise.then((r) => apply(r.currency, r.rate, r.country)), new Promise((r) => setTimeout(r, FIRST_VISIT_TIMEOUT))]).catch(() => {});

  let param = null;
  try {
    param = new URLSearchParams(window.location.search).get('devise');
  } catch { /* URL illisible */ }
  if (param) {
    await waitFor(resolve(param.toLowerCase() === 'auto' ? null : param.toUpperCase()));
    return;
  }

  const cache = readCache();
  if (cache) {
    apply(cache.currency, cache.rate, cache.country);
    // Taux périmé : rafraîchi en arrière-plan pour la prochaine visite (pas de changement en cours de navigation)
    if (Date.now() - cache.at > RATES_TTL) resolve(cache.forced ? cache.currency : null).catch(() => {});
    return;
  }
  await waitFor(resolve(null));
}

export function getDisplayCurrency() {
  return state.currency;
}

/** Montant en FCFA, tel qu'il est stocké et encaissé (tableaux de bord, comptabilité). */
export function formatXOF(amount) {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

/** Montant FCFA converti dans la devise locale du visiteur. */
export function formatLocalPrice(amount) {
  const n = typeof amount === 'number' ? amount : Number(amount) || 0;
  // XOF et XAF sont à parité et s'affichent tous deux « FCFA »
  if (state.currency === BASE || state.currency === 'XAF') return formatXOF(n);
  const value = n * state.rate;
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: state.currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.abs(value) >= 100 || value === 0 ? 0 : 2
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString('fr-FR')} ${state.currency}`;
  }
}
