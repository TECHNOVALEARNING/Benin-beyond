/**
 * Allègement des photos côté navigateur, avant leur envoi.
 * - redimensionne au plus 1920 px sur le plus grand côté (net sur ordinateur et téléphone) ;
 * - réencode en WebP qualité 0,82 (JPEG 0,85 si le navigateur ne sait pas produire du WebP),
 *   un réglage visuellement identique à l'original pour une photo, mais bien plus léger ;
 * - respecte l'orientation des photos de téléphone ;
 * - garde le fichier d'origine si la version allégée n'est pas plus petite.
 *
 * Les deux fonctions acceptent (file, { maxWidth, maxHeight, quality })
 * ou l'ancienne forme (file, maxWidth, maxHeight, quality).
 */

const DEFAULTS = { maxWidth: 1920, maxHeight: 1920, quality: 0.82 };
const JPEG_QUALITY = 0.85;

function readOptions(maxWidthOrOptions, maxHeight, quality) {
  if (maxWidthOrOptions && typeof maxWidthOrOptions === 'object') {
    return { ...DEFAULTS, ...maxWidthOrOptions };
  }
  return {
    maxWidth: Number(maxWidthOrOptions) || DEFAULTS.maxWidth,
    maxHeight: Number(maxHeight) || DEFAULTS.maxHeight,
    quality: Math.min(Number(quality) || DEFAULTS.quality, DEFAULTS.quality)
  };
}

function isImage(file) {
  return Boolean(file && file.type && file.type.startsWith('image/'));
}

// Les GIF animés et SVG perdraient leur animation ou leur netteté vectorielle : on les laisse tels quels
function shouldKeepAsIs(file) {
  return file.type === 'image/gif' || file.type === 'image/svg+xml';
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // repli sur <img> ci-dessous
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/**
 * Produit la version allégée (Blob) d'une photo, ou null si c'est impossible.
 */
async function optimize(file, { maxWidth, maxHeight, quality }) {
  const source = await decode(file);
  const srcWidth = source.width;
  const srcHeight = source.height;
  const ratio = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight);
  const width = Math.max(1, Math.round(srcWidth * ratio));
  const height = Math.max(1, Math.round(srcHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  if (typeof source.close === 'function') source.close();

  let blob = await toBlob(canvas, 'image/webp', quality);
  // Certains navigateurs renvoient du PNG quand ils ne savent pas encoder le WebP
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  }
  return blob;
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

/**
 * Renvoie un fichier (File) allégé, prêt à être téléversé dans Supabase Storage.
 */
export async function compressImageToBlob(file, maxWidthOrOptions, maxHeight, quality) {
  if (!isImage(file) || shouldKeepAsIs(file)) return file;
  try {
    const blob = await optimize(file, readOptions(maxWidthOrOptions, maxHeight, quality));
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const dot = file.name ? file.name.lastIndexOf('.') : -1;
    const baseName = file.name ? (dot > 0 ? file.name.slice(0, dot) : file.name) : 'photo';
    return new File([blob], `${baseName}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Renvoie une image allégée sous forme de data URL (utilisée quand l'envoi au stockage échoue).
 */
export async function compressImage(file, maxWidthOrOptions, maxHeight, quality) {
  if (!isImage(file)) {
    throw new Error('Le fichier sélectionné n’est pas une image valide.');
  }
  const optimized = await compressImageToBlob(file, maxWidthOrOptions, maxHeight, quality);
  return blobToDataUrl(optimized);
}
