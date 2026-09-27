import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient.js';
import { INITIAL_LISTINGS } from '../data/initialListings.js';

const CUSTOM_LISTINGS_KEY = 'benin_beyond_custom_listings';

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
    return list.map((item) => ({
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
    localStorage.setItem(CUSTOM_LISTINGS_KEY, JSON.stringify(listings));
  } catch (err) {
    console.error('Failed to save custom listings in localStorage:', err);
  }
}

/**
 * Synchronise les annonces locales vers Supabase en tâche de fond
 */
async function syncLocalListingsToSupabase(localListings = []) {
  if (!isSupabaseConfigured || !supabase || !localListings || localListings.length === 0) return;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const item of localListings) {
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
        rating: Number(item.rating) || 5.0,
        reviews_count: Number(item.reviews_count) || 1,
        owner_id: item.owner_id && uuidRegex.test(item.owner_id) ? item.owner_id : null,
        created_date: item.created_date || new Date().toISOString()
      };
      await supabase.from('listings').upsert(payload, { onConflict: 'id' });
    } catch {
      // Ignoré si RLS non encore débloqué
    }
  }
}

/**
 * Récupère toutes les annonces (Supabase en priorité + cache local + catalogue de référence)
 */
export async function getListings(options = {}) {
  const { includePending = false } = options;
  const custom = getCustomListings();
  const itemsMap = new Map();

  // 1. Initialiser avec le catalogue de base curaté
  INITIAL_LISTINGS.forEach((item) => {
    itemsMap.set(item.id, { ...item });
  });

  // 2. Fusionner avec le cache local
  custom.forEach((item) => {
    itemsMap.set(item.id, { ...item });
  });

  // 3. Charger depuis Supabase si configuré
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_date', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((dbItem) => {
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
        });
      }

      // Synchronisation en tâche de fond des annonces créées localement qui ne sont pas encore en base
      syncLocalListingsToSupabase(custom);
    } catch (err) {
      console.warn('Erreur chargement Supabase listings, utilisation du cache:', err);
    }
  }

  const all = Array.from(itemsMap.values());

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
 * Récupère une annonce par son ID
 */
export async function getListingById(id) {
  const custom = getCustomListings();
  const foundCustom = custom.find((item) => item.id === id);
  if (foundCustom) return foundCustom;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

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
      }
    } catch (err) {
      console.warn('Supabase getListingById error:', err);
    }
  }

  // Fallback sur le dataset de base
  return INITIAL_LISTINGS.find((item) => item.id === id) || null;
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
    rating: listingData.rating || 5.0,
    reviews_count: listingData.reviews_count || 1,
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
    owner_id: dbOwnerId,
    owner_name: listingData.owner_name || 'Partenaire Bénin Beyond',
    owner_email: listingData.owner_email || ''
  };

  // 1. Toujours enregistrer immédiatement dans le cache local
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

      const { data, error } = await supabase
        .from('listings')
        .upsert(dbPayload, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        return { ...newListing, ...data };
      }
      if (error) {
        console.warn('Supabase addListing warning:', error.message);
      }
    } catch (err) {
      console.warn('Exception Supabase addListing:', err);
    }
  }

  return newListing;
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
 * Supprime une annonce
 */
export async function deleteListing(id) {
  // 1. Cache local
  const custom = getCustomListings();
  const updated = custom.filter((item) => item.id !== id);
  saveCustomListings(updated);

  // 2. Base Supabase
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
