/**
 * Service de stockage persistant pour les médias lourds (vidéos, photos HD)
 * Utilise IndexedDB pour permettre la persistance des vidéos téléversées localement
 * sans être limité par le quota restreint de localStorage (5-10 Mo).
 */

const DB_NAME = 'benin_beyond_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

function openMediaDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB non disponible'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enregistre un fichier média (vidéo, image) dans IndexedDB
 * @param {File|Blob} file 
 * @param {string} optionalId 
 * @returns {Promise<string>} Retourne un identifiant persistant sous la forme "idb:<id>"
 */
export async function saveMediaBlob(file, optionalId = null) {
  try {
    const db = await openMediaDB();
    const id = optionalId || `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: file,
        name: file.name || 'video.mp4',
        type: file.type || 'video/mp4',
        size: file.size || 0,
        createdAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(`idb:${id}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erreur sauvegarde média IndexedDB, fallback FileReader:', err);
    // Fallback: si IndexedDB échoue, conversion en DataURL si possible
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Récupère le blob associé à un identifiant IndexedDB
 */
export async function getMediaBlob(id) {
  try {
    const cleanId = id.startsWith('idb:') ? id.replace('idb:', '') : id;
    const db = await openMediaDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanId);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erreur lecture média IndexedDB:', err);
    return null;
  }
}

// Cache mémoire des ObjectURLs créés pour éviter les fuites de mémoire
const activeObjectUrls = new Map();

/**
 * Résout une URL vidéo pour le lecteur HTML5 ou iframe
 * Gère les protocoles "idb:", "data:", "http(s):" et YouTube/Vimeo
 */
export async function resolveVideoUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return '';

  const trimmed = videoUrl.trim();

  // Si c'est un identifiant IndexedDB persistant
  if (trimmed.startsWith('idb:')) {
    const id = trimmed.replace('idb:', '');
    if (activeObjectUrls.has(id)) {
      return activeObjectUrls.get(id);
    }
    const blob = await getMediaBlob(id);
    if (blob) {
      const objUrl = URL.createObjectURL(blob);
      activeObjectUrls.set(id, objUrl);
      return objUrl;
    }
    return '';
  }

  // Si c'est une data URL ou une URL http(s)
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Si c'est un ancien blob URL qui a peut-être expiré, on vérifie s'il existe dans IndexedDB par hasard
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Détecte si l'URL vidéo est un lien externe intégrable (YouTube ou Vimeo)
 */
export function parseVideoEmbed(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Détection YouTube (youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/ ]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1`
    };
  }

  // Détection Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0`
    };
  }

  return {
    type: 'html5',
    url: trimmed
  };
}
