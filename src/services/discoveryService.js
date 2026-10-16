import { supabase, isSupabaseConfigured, runSupabaseQuery } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_discoveries';

/**
 * Aucune fiche de démonstration : seules les fiches réelles enregistrées dans Supabase
 * (validées par l'équipe) sont affichées.
 */
export const INITIAL_DISCOVERIES = [];

// Identifiants des anciennes fiches fictives, purgées des caches navigateur existants
const LEGACY_DEMO_DISCOVERY_IDS = new Set([
  'disc-resto-jardin-canala', 'disc-resto-maman-bene', 'disc-resto-atelier-gourmand',
  'disc-resto-cabane-pecheur', 'disc-srv-coiffure-vip', 'disc-srv-onglerie-glamour',
  'disc-srv-massage-zenith', 'disc-srv-chef-danxome', 'disc-srv-pressing-express'
]);

const DELETED_DISCOVERIES_KEY = 'benin_beyond_deleted_discoveries';

/**
 * Récupère les IDs de découvertes définitivement supprimées
 */
export function getDeletedDiscoveryIds() {
  try {
    const raw = localStorage.getItem(DELETED_DISCOVERIES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Inscrit un ID de découverte dans la liste noire des suppressions
 */
export function markDiscoveryAsDeleted(id) {
  try {
    const set = getDeletedDiscoveryIds();
    if (id) set.add(String(id));
    localStorage.setItem(DELETED_DISCOVERIES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Erreur blacklist suppression découverte:', e);
  }
}

function getStoredDiscoveriesLocal() {
  try {
    const deletedIds = getDeletedDiscoveryIds();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initClean = INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initClean));
      return initClean;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initClean = INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initClean));
      return initClean;
    }
    // Filtrage strict : seuls 'restaurants' et 'services' autorisés, aucun élément supprimé
    const cleaned = parsed
      .filter((item) => {
        if (deletedIds.has(String(item.id)) || LEGACY_DEMO_DISCOVERY_IDS.has(String(item.id))) return false;
        return item.category === 'restaurants' || item.category === 'services' || item.category === 'gastronomie';
      })
      .map((item) => ({
        ...item,
        category: item.category === 'gastronomie' ? 'restaurants' : item.category
      }));

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned.length > 0 ? cleaned : INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
  } catch (e) {
    console.warn('Erreur lecture localStorage discoveries:', e);
    return INITIAL_DISCOVERIES.filter((it) => !getDeletedDiscoveryIds().has(String(it.id)));
  }
}

function saveStoredDiscoveriesLocal(items) {
  try {
    const deletedIds = getDeletedDiscoveryIds();
    const cleanItems = (items || []).filter((it) => !deletedIds.has(String(it.id)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanItems));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benin_beyond_discoveries_updated', { detail: cleanItems }));
    }
  } catch (e) {
    console.error('Failed to save discoveries to localStorage:', e);
  }
}

/**
 * Récupérer toutes les découvertes (Gastronomie & Restaurants, Autres Services & À Domicile)
 */
export async function getDiscoveries() {
  const deletedIds = getDeletedDiscoveryIds();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('discoveries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Filtrage strict : exclure monuments et nature, exclure éléments supprimés
        const valid = data
          .filter(
            (item) => !deletedIds.has(String(item.id)) && !LEGACY_DEMO_DISCOVERY_IDS.has(String(item.id)) &&
              (item.category === 'restaurants' || item.category === 'services' || item.category === 'gastronomie')
          )
          .map((item) => ({
            ...item,
            category: item.category === 'gastronomie' ? 'restaurants' : item.category
          }));
        // Table encore vide : on affiche la sélection éditoriale par défaut (fichier source, pas le cache)
        const result = valid.length > 0
          ? valid
          : INITIAL_DISCOVERIES.filter((item) => !deletedIds.has(String(item.id)));
        saveStoredDiscoveriesLocal(result);
        return result;
      }
    } catch (err) {
      console.warn('Erreur lecture discoveries Supabase, fallback local:', err);
    }
  }

  return getStoredDiscoveriesLocal();
}

/**
 * Ajouter une nouvelle découverte / service
 * - Gastronomie & Restaurants : Inscription 100% GRATUITE (0 FCFA)
 * - Autres Services & À Domicile (Prestataires) : Inscription & Activation à 500 FCFA
 * - Admin : Accès gratuit illimité (0 FCFA)
 */
export async function addDiscovery(itemData) {
  const isRestaurant = itemData.category === 'restaurants' || itemData.category === 'gastronomie';
  const isAdmin = itemData.creator_role === 'admin';

  // Les 500 FCFA des prestataires sont encaissés par l'équipe avant la mise en ligne :
  // la fiche reste « non payée » tant que l'administrateur ne l'a pas activée.
  let paymentStatus = 'unpaid';
  let paymentReference = itemData.payment_reference || null;
  let activationFee = 500;

  if (isRestaurant) {
    // Inscription gratuite pour la Gastronomie & Restaurants
    paymentStatus = 'free';
    paymentReference = 'RESTO-FREE-0F';
    activationFee = 0;
  } else if (isAdmin) {
    paymentStatus = 'free_admin';
    paymentReference = 'ADMIN-FREE';
    activationFee = 0;
  }

  const defaultCreatorRole = isAdmin ? 'admin' : (isRestaurant ? 'restaurant_partner' : 'provider');
  const creatorRole = itemData.creator_role || defaultCreatorRole;

  const newDiscovery = {
    id: itemData.id || `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: isRestaurant ? 'restaurants' : 'services',
    subcategory: itemData.subcategory || (isRestaurant ? 'gastronomie' : 'autre'),
    title: itemData.title,
    badge: itemData.badge || (itemData.inHomeService ? 'Service en Villa' : isRestaurant ? 'Table Recommandée' : 'Recommandé'),
    location: itemData.location || 'Bénin',
    tagline: itemData.tagline || '',
    description: itemData.description || '',
    highlights: Array.isArray(itemData.highlights)
      ? itemData.highlights
      : typeof itemData.highlights === 'string'
      ? itemData.highlights.split('\n').filter(Boolean)
      : [],
    tips: itemData.tips || '',
    pricing: itemData.pricing || '',
    phone: itemData.phone || '',
    whatsapp: (itemData.whatsapp || itemData.phone || '').replace(/[^0-9]/g, ''),
    image: itemData.image || (isRestaurant
      ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
      : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
    gallery: Array.isArray(itemData.gallery) ? itemData.gallery : [],
    inHomeService: Boolean(itemData.inHomeService),
    creator_role: creatorRole,
    payment_status: paymentStatus,
    payment_reference: paymentReference,
    activation_fee: activationFee,
    // Toute fiche déposée par un restaurant ou un prestataire attend la validation de l'équipe
    status: isAdmin ? (itemData.status || 'active') : 'pending',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.insert', supabase.from('discoveries').insert([newDiscovery]));
    } catch (err) {
      console.warn('Erreur insert discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = [newDiscovery, ...current];
  saveStoredDiscoveriesLocal(updated);

  return newDiscovery;
}

/**
 * Mettre à jour une découverte existante
 */
export async function updateDiscovery(id, updates) {
  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.update', supabase
        .from('discoveries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id));
    } catch (err) {
      console.warn('Erreur update discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveStoredDiscoveriesLocal(updated);

  return updated.find((i) => i.id === id);
}

/**
 * Supprimer une découverte
 */
export async function deleteDiscovery(id) {
  markDiscoveryAsDeleted(id);

  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.delete', supabase.from('discoveries').delete().eq('id', id));
    } catch (err) {
      console.warn('Erreur delete discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = current.filter((item) => item.id !== id);
  saveStoredDiscoveriesLocal(updated);

  return true;
}

/**
 * Basculer le statut d'une découverte (active / suspended)
 */
export async function toggleDiscoveryStatus(id) {
  const current = getStoredDiscoveriesLocal();
  const target = current.find((i) => i.id === id);
  if (!target) return null;

  const nextStatus = target.status === 'active' ? 'suspended' : 'active';
  const updates = { status: nextStatus };
  // L'administrateur publie un prestataire après avoir encaissé ses 500 FCFA
  if (nextStatus === 'active' && target.payment_status === 'unpaid') {
    updates.payment_status = 'paid';
  }
  return updateDiscovery(id, updates);
}
