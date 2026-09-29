import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { INITIAL_LISTINGS } from '../data/initialListings.js';

const CUSTOM_LISTINGS_KEY = 'benin_beyond_custom_listings';
const DELETED_LISTINGS_KEY = 'benin_beyond_deleted_listings';

export function getDeletedListingIds() {
  try {
    const raw = localStorage.getItem(DELETED_LISTINGS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markListingAsDeleted(id) {
  try {
    const deletedSet = getDeletedListingIds();
    deletedSet.add(id);
    localStorage.setItem(DELETED_LISTINGS_KEY, JSON.stringify(Array.from(deletedSet)));
  } catch (e) {
    console.error('Error saving deleted listings key:', e);
  }
}

function sanitizeImage(url, type) {
  if (!url || typeof url !== 'string' || url.includes('base44.com') || url.includes('_generated_')) {
    return type === 'drive'
      ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
      : 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80';
  }
  return url;
}

export function getCustomListings() {
  try {
    const raw = localStorage.getItem(CUSTOM_LISTINGS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const deletedIds = getDeletedListingIds();
    return list
      .filter((item) => !deletedIds.has(item.id))
      .map((item) => ({
        ...item,
        gallery: (item.gallery && item.gallery.length > 0)
          ? item.gallery.map((img) => sanitizeImage(img, item.type))
          : [
              item.type === 'drive'
                ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
                : 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
            ]
      }));
  } catch {
    return [];
  }
}

export function saveCustomListings(listings) {
  try {
    const deletedIds = getDeletedListingIds();
    const cleanList = (listings || []).filter((item) => !deletedIds.has(item.id));
    localStorage.setItem(CUSTOM_LISTINGS_KEY, JSON.stringify(cleanList));
  } catch (err) {
    console.error('Failed to save custom listings in localStorage:', err);
  }
}

const withTimeout = (promise, ms = 4000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ms);
  });
  return Promise.race([
    Promise.resolve(promise).then(
      (res) => {
        clearTimeout(timeoutId);
        return res;
      },
      (err) => {
        clearTimeout(timeoutId);
        throw err;
      }
    ),
    timeoutPromise
  ]);
};

/**
 * Synchronise les annonces locales vers Supabase en tâche de fond (uniquement les nouveaux ajouts non synchronisés)
 */
async function syncLocalListingsToSupabase(localListings = []) {
  if (!isSupabaseConfigured || !supabase || !localListings || localListings.length === 0) return;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const deletedIds = getDeletedListingIds();

  // Ne synchroniser que les créations locales non encore en base et strictement non supprimées
  const toSync = localListings.filter((item) => Boolean(item.needs_sync) && !deletedIds.has(item.id));
  if (toSync.length === 0) return;

  for (const item of toSync) {
    try {
      const payload = {
        id: item.id,
        title: item.title,
        type: item.type,
        subcategory: item.subcategory || (item.type === 'drive' ? 'car' : 'villa'),
        location: item.location || 'Cotonou',
        price: Number(item.price) || 0,
        price_unit: item.price_unit || (item.type === 'drive' ? 'jour' : 'nuit'),
        rooms_count: item.rooms_count ? Number(item.rooms_count) : 1,
        available_from: item.available_from || null,
        available_to: item.available_to || null,
        status: item.status || 'active',
        rejection_reason: item.rejection_reason || null,
        badge: item.badge || null,
        featured: Boolean(item.featured),
        summary: item.summary || item.description?.slice(0, 160) || null,
        description: item.description || null,
        specs: Array.isArray(item.specs) ? item.specs : [],
        amenities: Array.isArray(item.amenities) ? item.amenities : [],
        gallery: Array.isArray(item.gallery) ? item.gallery : [],
        video_url: item.video_url || null,
        rating: item.rating ? Number(item.rating) : null,
        reviews_count: item.reviews_count ? Number(item.reviews_count) : 0,
        owner_id: item.owner_id && uuidRegex.test(item.owner_id) ? item.owner_id : null,
        created_date: item.created_date || new Date().toISOString()
      };
      const queryPromise = supabase.from('listings').upsert(payload, { onConflict: 'id' });
      const { error } = await withTimeout(queryPromise, 3000);
      if (!error) {
        item.needs_sync = false;
      }
    } catch {
      // Ignoré si RLS non encore débloqué ou timeout
    }
  }
}

/**
 * Récupère toutes les annonces (Priorité absolue aux données certifiées Supabase avec purge automatique des éléments supprimés)
 */
export async function getListings(options = {}) {
  const { includePending = false } = options;
  const deletedIds = getDeletedListingIds();
  const custom = getCustomListings();
  const itemsMap = new Map();

  // 1. Initialiser avec le cache local pour un rendu instantané sans scintillement
  custom.forEach((item) => {
    if (!deletedIds.has(item.id)) {
      itemsMap.set(item.id, { ...item });
    }
  });

  // 2. Charger depuis Supabase si configuré : Supabase est la source de vérité absolue
  if (isSupabaseConfigured && supabase) {
    try {
      const queryPromise = supabase
        .from('listings')
        .select('*')
        .order('created_date', { ascending: false });

      const { data, error } = await withTimeout(queryPromise, 4000);

      if (!error && Array.isArray(data)) {
        const dbIds = new Set(data.map((d) => d.id));

        // Purge immédiate : supprimer du cache local tout élément qui n'est plus dans Supabase
        // (sauf brouillons créés hors-ligne avec needs_sync === true)
        itemsMap.clear();

        // Réinjecter uniquement les créations locales en attente d'envoi hors-ligne
        custom.forEach((item) => {
          if (!deletedIds.has(item.id) && Boolean(item.needs_sync) && !dbIds.has(item.id)) {
            itemsMap.set(item.id, { ...item });
          }
        });

        // Enregistrer les données certifiées actuelles de Supabase
        data.forEach((dbItem) => {
          if (!deletedIds.has(dbItem.id)) {
            itemsMap.set(dbItem.id, {
              ...dbItem,
              gallery: (dbItem.gallery && dbItem.gallery.length > 0)
                ? dbItem.gallery.map((img) => sanitizeImage(img, dbItem.type))
                : [
                    dbItem.type === 'drive'
                      ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
                      : 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
                  ]
            });
          }
        });

        // Mettre à jour le cache local avec l'état réel et propre
        saveCustomListings(Array.from(itemsMap.values()));
      }

      // Synchronisation en tâche de fond des annonces créées localement non encore en base
      syncLocalListingsToSupabase(Array.from(itemsMap.values())).catch(() => {});
    } catch (err) {
      console.warn('Chargement Supabase optimisé via cache local instantané:', err?.message || err);
    }
  }

  const all = Array.from(itemsMap.values()).filter((item) => !deletedIds.has(item.id));

  // Tri par date de création (les plus récentes en premier)
  all.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  // Filtrer les types de biens gérés (stay & drive)
  const valid = all.filter((item) => item.type === 'stay' || item.type === 'drive');

  // Si appel public (includePending: false), masquer impérativement les annonces en attente ou rejetées
  if (!includePending) {
    return valid.filter((item) => item.status === 'active' || !item.status);
  }

  // Si appel d'administration ou partenaire, renvoyer tout pour la modération
  return valid;
}

/**
 * Récupère une annonce par son ID (Priorité Supabase directe avec détection des suppressions)
 */
export async function getListingById(id) {
  const deletedIds = getDeletedListingIds();
  if (deletedIds.has(id)) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          gallery: (data.gallery && data.gallery.length > 0)
            ? data.gallery.map((img) => sanitizeImage(img, data.type))
            : [
                data.type === 'drive'
                  ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
                  : 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
              ]
        };
      } else if (!error && !data) {
        // Supprimé de Supabase : purger du cache local
        const custom = getCustomListings();
        saveCustomListings(custom.filter((item) => item.id !== id));
        return null;
      }
    } catch (err) {
      console.warn('Supabase getListingById error:', err);
    }
  }

  // Fallback sur le cache local
  const custom = getCustomListings();
  return custom.find((item) => item.id === id) || null;
}

/**
 * Publie une nouvelle annonce (Sauvegarde Supabase universelle + cache local instantané)
 */
export async function addListing(listingData) {
  const custom = getCustomListings();
  const newId = listingData.id || `lst_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const dbOwnerId = listingData.owner_id && uuidRegex.test(listingData.owner_id) ? listingData.owner_id : null;

  const newListing = {
    id: newId,
    created_date: listingData.created_date || new Date().toISOString(),
    status: listingData.status || 'active', // 'active' ou 'pending'
    rejection_reason: listingData.rejection_reason || '',
    video_url: listingData.video_url || null,
    rating: listingData.rating ? Number(listingData.rating) : null,
    reviews_count: listingData.reviews_count ? Number(listingData.reviews_count) : 0,
    featured: listingData.featured !== undefined ? listingData.featured : true,
    title: listingData.title,
    type: listingData.type || 'stay',
    subcategory: listingData.subcategory || (listingData.type === 'drive' ? 'car' : 'villa'),
    location: listingData.location || 'Cotonou',
    price: Number(listingData.price) || 50000,
    price_unit: listingData.price_unit || (listingData.type === 'drive' ? 'jour' : 'nuit'),
    rooms_count: listingData.rooms_count ? Number(listingData.rooms_count) : 1,
    available_from: listingData.available_from || null,
    available_to: listingData.available_to || null,
    description: listingData.description || '',
    summary: listingData.summary || listingData.description?.slice(0, 160) || '',
    badge: listingData.badge || (listingData.status === 'active' ? 'Vérifié par Bénin Beyond' : 'En attente'),
    specs: Array.isArray(listingData.specs) ? listingData.specs : [],
    amenities: Array.isArray(listingData.amenities) ? listingData.amenities : [],
    gallery: (Array.isArray(listingData.gallery) && listingData.gallery.length > 0)
      ? listingData.gallery
      : [
          listingData.type === 'drive'
            ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
            : 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
        ],
    owner_id: listingData.owner_id || dbOwnerId,
    owner_name: listingData.owner_name || 'Partenaire Bénin Beyond',
    owner_email: listingData.owner_email || ''
  };

  // S'assurer que le nouvel identifiant n'est pas dans la liste des suppressions
  try {
    const deletedSet = getDeletedListingIds();
    if (deletedSet.has(newId)) {
      deletedSet.delete(newId);
      localStorage.setItem(DELETED_LISTINGS_KEY, JSON.stringify(Array.from(deletedSet)));
    }
  } catch {}

  // 1. Enregistrement immédiat dans le cache local (avec flag needs_sync par défaut)
  newListing.needs_sync = true;
  const updated = [newListing, ...custom.filter((item) => item.id !== newId)];
  saveCustomListings(updated);

  // 2. Persistance dans la base Supabase partagée pour tous les utilisateurs
  if (isSupabaseConfigured && supabase) {
    try {
      const dbPayload = {
        id: newListing.id,
        title: newListing.title,
        type: newListing.type,
        subcategory: newListing.subcategory,
        location: newListing.location,
        price: newListing.price,
        price_unit: newListing.price_unit,
        rooms_count: newListing.rooms_count,
        available_from: newListing.available_from,
        available_to: newListing.available_to,
        status: newListing.status,
        rejection_reason: newListing.rejection_reason,
        badge: newListing.badge,
        featured: newListing.featured,
        summary: newListing.summary,
        description: newListing.description,
        specs: newListing.specs,
        amenities: newListing.amenities,
        gallery: newListing.gallery,
        video_url: newListing.video_url,
        rating: newListing.rating,
        reviews_count: newListing.reviews_count,
        owner_id: dbOwnerId,
        created_date: newListing.created_date
      };

      const queryPromise = supabase
        .from('listings')
        .upsert(dbPayload, { onConflict: 'id' })
        .select()
        .single();

      const { data, error } = await withTimeout(queryPromise, 4000);

      if (!error && data) {
        newListing.needs_sync = false;
        saveCustomListings([newListing, ...custom.filter((item) => item.id !== newId)]);
        return { ...newListing, ...data };
      }
      if (error) {
        console.warn('Supabase addListing warning:', error.message);
      }
    } catch (err) {
      console.warn('Exception Supabase addListing:', err?.message || err);
    }
  }

  return newListing;
}

/**
 * Met à jour complètement une annonce (titre, prix, photos, vidéo, description, etc.)
 */
export async function updateListing(id, updates = {}) {
  if (!id) return null;

  // 1. Cache local instantané
  const custom = getCustomListings();
  const index = custom.findIndex((item) => item.id === id);
  let updatedListing = null;

  if (index !== -1) {
    const existing = custom[index];
    updatedListing = {
      ...existing,
      ...updates,
      id,
      updated_date: new Date().toISOString()
    };

    if (updatedListing.gallery && Array.isArray(updatedListing.gallery) && updatedListing.gallery.length > 0) {
      updatedListing.gallery = updatedListing.gallery.map((img) => sanitizeImage(img, updatedListing.type));
    }

    if (updates.description && !updates.summary) {
      updatedListing.summary = updates.description.slice(0, 160);
    }

    custom[index] = updatedListing;
    saveCustomListings(custom);
  }

  // 2. Base Supabase universelle
  if (isSupabaseConfigured && supabase) {
    try {
      const dbPayload = {};
      const allowedFields = [
        'title',
        'type',
        'subcategory',
        'location',
        'price',
        'price_unit',
        'rooms_count',
        'available_from',
        'available_to',
        'status',
        'rejection_reason',
        'badge',
        'featured',
        'summary',
        'description',
        'specs',
        'amenities',
        'gallery',
        'video_url'
      ];

      allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
          if (field === 'price' || field === 'rooms_count') {
            dbPayload[field] = Number(updates[field]) || 0;
          } else {
            dbPayload[field] = updates[field];
          }
        }
      });

      if (updates.description && updates.summary === undefined) {
        dbPayload.summary = updates.description.slice(0, 160);
      }

      dbPayload.updated_date = new Date().toISOString();

      const queryPromise = supabase
        .from('listings')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      const { data, error } = await withTimeout(queryPromise, 4000);
      if (!error && data) {
        updatedListing = { ...(updatedListing || {}), ...data };
        if (index !== -1) {
          custom[index] = updatedListing;
          saveCustomListings(custom);
        }
      } else if (error) {
        console.warn('Supabase updateListing warning:', error.message);
      }
    } catch (err) {
      console.warn('Exception Supabase updateListing:', err?.message || err);
    }
  }

  return updatedListing;
}

/**
 * Met à jour le statut d'une annonce (Validation, suspension, refus)
 */
export async function updateListingStatus(id, newStatus, rejectionReason = '') {
  // 1. Cache local
  const custom = getCustomListings();
  const index = custom.findIndex((item) => item.id === id);
  if (index !== -1) {
    custom[index] = {
      ...custom[index],
      status: newStatus,
      rejection_reason: rejectionReason || custom[index].rejection_reason || ''
    };
    saveCustomListings(custom);
  }

  // 2. Base Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('listings')
        .update({
          status: newStatus,
          rejection_reason: rejectionReason || null,
          updated_date: new Date().toISOString()
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Erreur Supabase updateListingStatus:', err);
    }
  }

  return custom[index] || { id, status: newStatus };
}

/**
 * Supprime une annonce (Purge locale + Supabase + inscription en liste noire pour bloquer la résurrection)
 */
export async function deleteListing(id) {
  // 1. Inscrire immédiatement l'ID dans la liste noire des suppressions
  markListingAsDeleted(id);

  // 2. Cache local : retirer définitivement
  const custom = getCustomListings();
  const updated = custom.filter((item) => item.id !== id);
  saveCustomListings(updated);

  // 3. Base Supabase : suppression physique
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('listings')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Erreur Supabase deleteListing:', err);
    }
  }

  return true;
}

export function getOwnerListings(ownerEmailOrId) {
  const allCustom = getCustomListings();
  if (!ownerEmailOrId) return allCustom;
  return allCustom.filter(
    (l) => l.owner_email === ownerEmailOrId || l.owner_id === ownerEmailOrId
  );
}

/**
 * Active automatiquement toutes les annonces en attente d'un propriétaire lorsque son profil KYC est validé
 */
export async function activateOwnerListings(ownerId, ownerEmail = '') {
  const cleanEmail = (ownerEmail || '').trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 1. Cache local instantané
  const custom = getCustomListings();
  let activatedCount = 0;
  const updated = custom.map((item) => {
    const matchId = Boolean(ownerId && (item.owner_id === ownerId || item.id === ownerId));
    const matchEmail = Boolean(cleanEmail && item.owner_email && item.owner_email.trim().toLowerCase() === cleanEmail);
    if ((matchId || matchEmail) && (item.status === 'pending' || item.status === 'in_review')) {
      activatedCount++;
      return {
        ...item,
        status: 'active',
        badge: item.badge && !item.badge.toLowerCase().includes('attente') && !item.badge.toLowerCase().includes('modération')
          ? item.badge
          : 'Vérifié par Bénin Beyond',
        rejection_reason: ''
      };
    }
    return item;
  });

  if (activatedCount > 0) {
    saveCustomListings(updated);
  }

  // 2. Base Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let targetOwnerId = ownerId && uuidRegex.test(ownerId) ? ownerId : null;
      if (!targetOwnerId && cleanEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (profile?.id) {
          targetOwnerId = profile.id;
        }
      }

      if (targetOwnerId) {
        await supabase
          .from('listings')
          .update({
            status: 'active',
            badge: 'Vérifié par Bénin Beyond',
            rejection_reason: null,
            updated_date: new Date().toISOString()
          })
          .eq('owner_id', targetOwnerId)
          .eq('status', 'pending');
      }
    } catch (err) {
      console.warn('Erreur Supabase activateOwnerListings:', err);
    }
  }

  return { activatedCount, updatedListings: updated };
}

