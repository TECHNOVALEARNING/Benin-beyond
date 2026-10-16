/**
 * Contrôles qualité automatiques d'une annonce avant publication.
 * Une annonce qui passe tous les contrôles est mise en ligne immédiatement,
 * sans validation manuelle ; sinon la liste des corrections à faire est renvoyée.
 */

export const LISTING_RULES = {
  minPhotos: { stay: 5, drive: 3 },
  minPhotoSide: 1000, // px, côté le plus long de chaque photo
  titleLength: [10, 80],
  minDescriptionLength: 80,
  priceMin: 1000,
  priceMax: { stay: 2000000, drive: 1000000 } // FCFA par nuit / par jour (hors vente)
};

// Coordonnées dans le texte : les échanges passent par la plateforme
const CONTACT_PATTERNS = [
  /(?:\+?229|00229)?[\s.-]?\d{2}(?:[\s.-]?\d{2}){3,4}/, // numéro de téléphone
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // e-mail
  /\b(?:https?:\/\/|www\.)\S+/i, // lien
  /\bwhats?app\b/i
];

function loadImageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 10000);
    img.onload = () => {
      clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * @param {Object} listing
 * @param {'stay'|'drive'} listing.type
 * @param {string} listing.title
 * @param {string} listing.description
 * @param {string} listing.location
 * @param {number} listing.price
 * @param {boolean} [listing.isSale] - bien à vendre (pas de plafond de prix)
 * @param {string[]} listing.photos - URLs ou data URLs
 * @returns {Promise<string[]>} corrections à faire (vide = publiable)
 */
export async function checkListingQuality({ type, title, description, location, price, isSale = false, photos = [] }) {
  const errors = [];
  const kind = type === 'drive' ? 'drive' : 'stay';
  const cleanTitle = (title || '').trim();
  const cleanDescription = (description || '').trim();

  const [minTitle, maxTitle] = LISTING_RULES.titleLength;
  if (cleanTitle.length < minTitle || cleanTitle.length > maxTitle) {
    errors.push(`Le titre doit faire entre ${minTitle} et ${maxTitle} caractères.`);
  }
  if (cleanDescription.length < LISTING_RULES.minDescriptionLength) {
    errors.push(`La description doit faire au moins ${LISTING_RULES.minDescriptionLength} caractères (actuellement ${cleanDescription.length}).`);
  }
  if (!(location || '').trim()) {
    errors.push('Indiquez la ville ou le quartier.');
  }
  if (CONTACT_PATTERNS.some((re) => re.test(`${cleanTitle} ${cleanDescription}`))) {
    errors.push('Retirez les numéros de téléphone, e-mails et liens du titre et de la description : les échanges passent par Bénin Beyond.');
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum < LISTING_RULES.priceMin) {
    errors.push(`Le tarif minimum est de ${LISTING_RULES.priceMin.toLocaleString('fr-FR')} FCFA.`);
  } else if (!isSale && priceNum > LISTING_RULES.priceMax[kind]) {
    errors.push(`Le tarif semble trop élevé (maximum ${LISTING_RULES.priceMax[kind].toLocaleString('fr-FR')} FCFA par ${kind === 'drive' ? 'jour' : 'nuit'}).`);
  }

  const uniquePhotos = [...new Set(photos.filter(Boolean))];
  const minPhotos = LISTING_RULES.minPhotos[kind];
  if (uniquePhotos.length < minPhotos) {
    errors.push(`Ajoutez au moins ${minPhotos} photos différentes (actuellement ${uniquePhotos.length}).`);
  }

  const sizes = await Promise.all(uniquePhotos.map(loadImageSize));
  const unreadable = sizes.filter((s) => !s).length;
  const tooSmall = sizes.filter((s) => s && Math.max(s.width, s.height) < LISTING_RULES.minPhotoSide).length;
  if (unreadable > 0) {
    errors.push(`${unreadable} photo(s) ne peuvent pas être affichées : remplacez-les.`);
  }
  if (tooSmall > 0) {
    errors.push(`${tooSmall} photo(s) sont de trop faible qualité (minimum ${LISTING_RULES.minPhotoSide} pixels de large).`);
  }

  return errors;
}
