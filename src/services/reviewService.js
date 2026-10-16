import { supabase, isSupabaseConfigured, runSupabaseQuery } from '../supabase/supabaseClient';

const LOCAL_STORAGE_REVIEWS_KEY = 'benin_beyond_reviews';
const DELETED_REVIEWS_KEY = 'benin_beyond_deleted_reviews';

const withTimeout = (promise, ms = 3500) => {
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
 * Aucun avis fictif ou simulé : la plateforme ne diffuse que les retours 100% authentiques
 * et réels déposés par les voyageurs et validés par l'administrateur.
 */
export const INITIAL_CURATED_REVIEWS = [];

/**
 * Filtre utilitaire garantissant qu'aucun avis fictif ou résiduel des anciennes maquettes
 * ne subsiste dans le cache local ou dans les flux de données.
 */
function sanitizeReviews(reviews) {
  if (!Array.isArray(reviews)) return [];
  return reviews.filter(
    (r) => r && !r.is_seed && !String(r.id || '').startsWith('rev_curated_')
  );
}

/**
 * Récupère l'ensemble des IDs d'avis supprimés par l'administrateur
 * pour garantir qu'un avis supprimé ne réapparaisse jamais.
 */
export function getDeletedReviewIds() {
  try {
    const raw = localStorage.getItem(DELETED_REVIEWS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Inscrit un ID d'avis et son booking_id associé dans la liste noire des suppressions.
 */
export function markReviewAsDeleted(reviewId, bookingId = null) {
  try {
    const set = getDeletedReviewIds();
    if (reviewId) set.add(String(reviewId));
    if (bookingId) set.add(String(bookingId));
    localStorage.setItem(DELETED_REVIEWS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Erreur inscription liste noire avis:', e);
  }
}

/**
 * Récupère tous les avis avec déduplication stricte et purge des avis supprimés.
 * Uniquement les avis réels créés par les utilisateurs (aucun avis fictif).
 */
export async function getReviews(listingId = null, options = {}) {
  try {
    const { includeAll = true } = options;
    const deletedIds = getDeletedReviewIds();
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    let localReviews = sanitizeReviews(raw ? JSON.parse(raw) : []);

    let remoteReviews = null;
    let supabaseSuccess = false;

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false });

        if (listingId) {
          query = query.eq('listing_id', String(listingId));
        }

        const { data, error } = await withTimeout(query, 3500);
        if (!error && Array.isArray(data)) {
          remoteReviews = sanitizeReviews(data);
          supabaseSuccess = true;
        } else if (error) {
          console.warn('Notice requête Supabase reviews:', error?.message || error);
        }
      } catch (e) {
        console.warn('Reviews fetch timeout/error, utilisation du cache local:', e?.message || e);
      }
    }

    // Détermination de la source de vérité :
    // 1. Si Supabase est connecté et a répondu (même avec 0 avis), Supabase est la SEULE autorité.
    //    Si un avis a été supprimé en base de données, il NE DOIT PLUS JAMAIS être ressuscité par le cache local !
    // 2. Si Supabase est indisponible (offline / erreur réseau), on bascule sur le cache local de secours.
    let candidates = [];
    if (supabaseSuccess && Array.isArray(remoteReviews)) {
      candidates = remoteReviews;
      // Synchronisation immédiate du cache local pour écraser les avis supprimés
      try {
        localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(remoteReviews));
      } catch {}
    } else {
      candidates = localReviews;
    }

    // Déduplication stricte par ID et empreinte
    const uniqueMap = new Map();
    const seenSignatures = new Set();

    candidates.forEach((rev) => {
      if (!rev) return;
      const rId = String(rev.id || '');
      const bId = String(rev.booking_id || '');

      // Bloquer tout avis marqué comme supprimé
      if (deletedIds.has(rId) || (bId && deletedIds.has(bId))) {
        return;
      }

      // Empreinte unique
      const signature = bId
        ? `booking_${bId}`
        : `${(rev.author_email || '').trim().toLowerCase()}_${(rev.comment || '').trim().slice(0, 50).toLowerCase()}`;

      if (seenSignatures.has(signature)) {
        return;
      }

      seenSignatures.add(signature);
      uniqueMap.set(rId, rev);
    });

    // Mettre à jour le cache local complet (avant filtre de vue)
    const allUnique = Array.from(uniqueMap.values());
    try {
      localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(allUnique));
    } catch {}

    let cleanReviews = allUnique;

    // Filtrer par annonce si demandée
    if (listingId) {
      cleanReviews = cleanReviews.filter((r) => String(r.listing_id) === String(listingId));
    }

    // Si on n'est pas en mode admin complet, ne renvoyer que les avis approuvés
    if (!includeAll) {
      cleanReviews = cleanReviews.filter((r) => r.status === 'approved' || !r.status);
    }

    return cleanReviews;
  } catch (err) {
    console.error('Erreur getReviews:', err);
    return [];
  }
}

/**
 * Récupère la sélection des meilleurs avis approuvés réels pour la page d'accueil (Top 10 max).
 * Règle de remplacement :
 * - Sélectionne en priorité les avis ayant les meilleures notes (5★ puis 4★).
 * - Tri chronologique récent pour les notes égales.
 * - Si le total dépasse la limite (ex: 10), le nouvel avis approuvé remplace l'ancien ayant la note la plus faible.
 */
export async function getFeaturedHomeReviews(maxCount = 10) {
  try {
    const allReviews = await getReviews(null, { includeAll: true });
    // Filtrer uniquement les avis réels approuvés
    const approved = allReviews.filter(
      (r) => !r.is_seed && !String(r.id || '').startsWith('rev_curated_') && (r.status === 'approved' || !r.status)
    );

    // Tri d'excellence et chronologique
    const sorted = [...approved].sort((a, b) => {
      const ratingA = Number(a.rating) || 5;
      const ratingB = Number(b.rating) || 5;
      if (ratingB !== ratingA) {
        return ratingB - ratingA; // Meilleure note en premier (5★ puis 4★)
      }
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return sorted.slice(0, maxCount);
  } catch (err) {
    console.error('Erreur getFeaturedHomeReviews:', err);
    return [];
  }
}

/**
 * Enregistre un nouvel avis voyageur vérifié depuis l'espace client.
 * Par défaut, l'avis est placé en statut 'pending' pour modération par l'administrateur.
 */
export async function submitReview(reviewPayload) {
  try {
    const newReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      booking_id: reviewPayload.booking_id || null,
      listing_id: reviewPayload.listing_id || null,
      pack_id: reviewPayload.pack_id || null,
      author_name: reviewPayload.author_name || 'Voyageur Bénin Beyond',
      author_email: reviewPayload.author_email || '',
      author_avatar: reviewPayload.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewPayload.author_name || 'Client')}&background=C5A880&color=000`,
      rating: Math.min(5, Math.max(1, Number(reviewPayload.rating) || 5)),
      comment: reviewPayload.comment?.trim() || '',
      status: reviewPayload.status || 'pending', // En attente de modération par défaut
      created_at: new Date().toISOString()
    };

    // 1. Enregistrement prioritaire dans Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await withTimeout(
          supabase.from('reviews').insert([{
            booking_id: newReview.booking_id,
            listing_id: newReview.listing_id,
            pack_id: newReview.pack_id,
            author_name: newReview.author_name,
            author_email: newReview.author_email,
            author_avatar: newReview.author_avatar,
            rating: newReview.rating,
            comment: newReview.comment,
            status: newReview.status
          }]).select().single(),
          4000
        );

        if (!error && data?.id) {
          newReview.id = String(data.id);
        }
      } catch (err) {
        console.warn('Supabase review insert error:', err);
      }
    }

    // 2. Enregistrement dans le LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = sanitizeReviews(raw ? JSON.parse(raw) : []);
    const filteredLocal = local.filter((r) => !newReview.booking_id || String(r.booking_id) !== String(newReview.booking_id));
    filteredLocal.unshift(newReview);
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(filteredLocal));

    // Déclencher l'événement de mise à jour pour rafraîchir la page d'accueil en temps réel
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benin_beyond_reviews_updated', { detail: newReview }));
    }

    return { success: true, review: newReview };
  } catch (err) {
    console.error('Erreur submitReview:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Modère et met à jour le statut d'un avis ('approved', 'pending', 'rejected').
 * Si 'approved', l'avis devient immédiatement éligible pour la sélection de la page d'accueil.
 */
export async function updateReviewStatus(reviewId, newStatus, bookingId = null) {
  try {
    // 1. Mise à jour dans le LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    let local = sanitizeReviews(raw ? JSON.parse(raw) : []);
    let targetReview = null;

    local = local.map((r) => {
      if (String(r.id) === String(reviewId) || (bookingId && String(r.booking_id) === String(bookingId))) {
        targetReview = { ...r, status: newStatus };
        return targetReview;
      }
      return r;
    });

    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(local));

    // 2. Mise à jour dans Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (reviewId && uuidRegex.test(reviewId)) {
          await runSupabaseQuery('reviews.update', supabase.from('reviews').update({ status: newStatus }).eq('id', reviewId));
        } else if (bookingId) {
          await runSupabaseQuery('reviews.update', supabase.from('reviews').update({ status: newStatus }).eq('booking_id', String(bookingId)));
        }
      } catch (err) {
        console.warn('Supabase review status update error:', err);
      }
    }

    // 3. Notification d'événement global
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benin_beyond_reviews_updated', {
        detail: { reviewId, status: newStatus }
      }));
    }

    return { success: true, review: targetReview };
  } catch (err) {
    console.error('Erreur updateReviewStatus:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Supprime définitivement un avis de la base Supabase et du cache local avec inscription en liste noire.
 */
export async function deleteReview(reviewId, bookingId = null) {
  try {
    // 1. Inscrire dans la liste noire pour bloquer toute réapparition
    markReviewAsDeleted(reviewId, bookingId);

    // 2. Suppression physique dans Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (reviewId && uuidRegex.test(reviewId)) {
          await runSupabaseQuery('reviews.delete', supabase.from('reviews').delete().eq('id', reviewId));
        } else if (bookingId) {
          await runSupabaseQuery('reviews.delete', supabase.from('reviews').delete().eq('booking_id', String(bookingId)));
        } else if (reviewId) {
          await runSupabaseQuery('reviews.delete', supabase.from('reviews').delete().eq('booking_id', String(reviewId)));
        }
      } catch (err) {
        console.warn('Supabase review delete error:', err);
      }
    }

    // 3. Purge du LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = raw ? JSON.parse(raw) : [];
    const filtered = local.filter((r) =>
      String(r.id) !== String(reviewId) &&
      (!bookingId || String(r.booking_id) !== String(bookingId))
    );
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(filtered));

    // 4. Notification d'événement global pour mise à jour immédiate de tous les composants
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benin_beyond_reviews_updated', {
        detail: { reviewId, deleted: true }
      }));
    }

    return true;
  } catch (err) {
    console.error('Erreur deleteReview:', err);
    return false;
  }
}
