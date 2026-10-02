import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

/**
 * Service de stockage persistant pour les médias (vidéos, photos HD)
 * 1. Téléversement ordonné dans Supabase Storage (Bucket 'listings') :
 *    Structure : <userId>/<listingId>/<category>/<filename>
 * 2. Repli automatique persistant sur IndexedDB hors-ligne.
 * 3. Détecteur universel de flux vidéo (YouTube, Vimeo, Google Drive, Dropbox, Dailymotion, MP4).
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
 * Construit un chemin de stockage hiérarchique et sécurisé par profil et par bien
 * Format : <userId>/<listingId>/<category>/<timestamp>_<random>.<ext>
 * Exemple : user_d4f8b9e1/lst_17276012/photos/1727602000_a8f9d.webp
 */
export function buildStoragePath({
  userId = 'partner',
  listingId = 'general',
  category = 'photos',
  filename = ''
}) {
  const sanitize = (val) => String(val || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
  const cleanUser = sanitize(userId) || 'partner';
  const cleanListing = sanitize(listingId) || 'general';
  const cleanCategory = sanitize(category) || 'photos';
  
  let ext = 'webp';
  if (filename && filename.includes('.')) {
    ext = filename.split('.').pop().toLowerCase();
  } else if (category === 'videos') {
    ext = 'mp4';
  }

  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  return `${cleanUser}/${cleanListing}/${cleanCategory}/${cleanName}`;
}

/**
 * Convertit un fichier ou Blob en Data URL Base64 de manière asynchrone
 */
export function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    if (typeof file === 'string' && (file.startsWith('data:') || file.startsWith('http'))) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Téléverse un fichier (Image ou Vidéo) dans Supabase Storage dans un dossier structuré
 * Avec repli automatique sans boucle infinie sur Base64 (photos) ou IndexedDB (vidéos).
 * @param {File|Blob} file 
 * @param {Object} options { userId, listingId, category }
 * @returns {Promise<string>} Retourne l'URL publique Supabase, un Data URL Base64 ou l'identifiant IndexedDB
 */
export async function uploadMediaFile(file, options = {}) {
  const {
    userId = 'partner',
    listingId = 'general',
    category = 'photos' // 'photos' | 'videos'
  } = options;

  if (!file) return '';

  const contentType = file.type || (category === 'videos' ? 'video/mp4' : 'image/webp');

  // 1. Envoi prioritaire vers Supabase Storage dans le dossier approprié
  if (isSupabaseConfigured && supabase) {
    try {
      const storagePath = buildStoragePath({
        userId,
        listingId,
        category,
        filename: file.name || (category === 'videos' ? 'video.mp4' : 'photo.webp')
      });

      const { data, error } = await supabase.storage
        .from('listings')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType
        });

      if (!error && data?.path) {
        const { data: { publicUrl } } = supabase.storage
          .from('listings')
          .getPublicUrl(data.path);

        if (publicUrl) {
          return publicUrl;
        }
      } else if (error) {
        console.warn('Supabase storage upload error:', error.message);
      }
    } catch (err) {
      console.warn('Exception upload Supabase Storage :', err?.message || err);
    }
  }

  // 2. Repli immédiat et garanti :
  // - Pour les photos : Data URL Base64 universel (lisible directement par toutes balises <img> et enregistrable en DB)
  // - Pour les vidéos : IndexedDB local sécurisé
  if (category === 'photos') {
    const dataUrl = await fileToDataUrl(file);
    if (dataUrl) return dataUrl;
  }

  return saveMediaBlob(file, null, options);
}

/**
 * Enregistre un fichier média localement dans IndexedDB (sans rappel récursif vers Supabase)
 */
export async function saveMediaBlob(file, optionalId = null, options = {}) {
  // Stockage IndexedDB local
  try {
    const db = await openMediaDB();
    const id = optionalId || `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id,
        blob: file,
        name: file.name || 'media_file',
        type: file.type || (options.category === 'videos' ? 'video/mp4' : 'image/webp'),
        size: file.size || 0,
        createdAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(`idb:${id}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erreur sauvegarde média IndexedDB, fallback FileReader:', err);
    return fileToDataUrl(file);
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

// Cache mémoire des ObjectURLs créés pour libérer les ressources proprement
const activeObjectUrls = new Map();

/**
 * Résout une URL vidéo pour le lecteur HTML5 ou iframe
 * Gère les protocoles "idb:", "data:", "http(s):" et services tiers
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

  return trimmed;
}

/**
 * Détecte intelligemment la plateforme vidéo et construit l'URL de lecture intégrée optimale.
 * Supporte :
 * - YouTube (standard, shorts, embed, youtu.be, m.youtube)
 * - Vimeo
 * - Google Drive (conversion automatique en lecteur /preview)
 * - Dropbox (conversion automatique en flux direct raw=1)
 * - Dailymotion
 * - Fichiers MP4 / WebM / Cloud / Supabase Storage directs
 */
export function parseVideoEmbed(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // 1. Détection YouTube (toutes variantes y compris shorts, youtu.be, m.youtube)
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      serviceName: 'YouTube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1`
    };
  }

  // 2. Détection Google Drive (ex: drive.google.com/file/d/ID/view, open?id=ID)
  const gDriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return {
      type: 'gdrive',
      serviceName: 'Google Drive',
      embedUrl: `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`
    };
  }

  // 3. Détection Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      serviceName: 'Vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0`
    };
  }

  // 4. Détection Dropbox (remplacement de ?dl=0 par ?raw=1 pour lecture directe)
  if (trimmed.includes('dropbox.com')) {
    let directDropbox = trimmed.replace(/[?&]dl=[01]/, '');
    directDropbox += directDropbox.includes('?') ? '&raw=1' : '?raw=1';
    return {
      type: 'html5',
      serviceName: 'Dropbox',
      url: directDropbox
    };
  }

  // 5. Détection Dailymotion
  const dailyMatch = trimmed.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dailyMatch && dailyMatch[1]) {
    return {
      type: 'dailymotion',
      serviceName: 'Dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${dailyMatch[1]}`
    };
  }

  // 6. Flux HTML5 standard (MP4, WebM, Supabase Storage, CDN, etc.)
  return {
    type: 'html5',
    serviceName: 'Lecteur direct',
    url: trimmed
  };
}

