import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

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
 * Récupère l'ensemble des IDs ou booking_ids d'avis supprimés par l'administrateur
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
 */
export async function getReviews(listingId = null) {
  try {
    const deletedIds = getDeletedReviewIds();
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    let localReviews = raw ? JSON.parse(raw) : [];

    let remoteReviews = [];
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
          remoteReviews = data;
        }
      } catch (e) {
        console.warn('Reviews fetch timeout/error, utilisation du cache local:', e?.message || e);
      }
    }

    // Déduplication stricte par ID et par empreinte unique pour éliminer tout doublon
    const uniqueMap = new Map();
    const seenSignatures = new Set();

    // Priorité aux données distantes certifiées de Supabase pour l'unicité des IDs
    const candidates = remoteReviews.length > 0 ? [...remoteReviews, ...localReviews] : localReviews;

    candidates.forEach((rev) => {
      if (!rev) return;
      const rId = String(rev.id || '');
      const bId = String(rev.booking_id || '');

      // Bloquer tout avis marqué comme supprimé
      if (deletedIds.has(rId) || (bId && deletedIds.has(bId))) {
        return;
      }

      // Empreinte unique : si même réservation OU même auteur + commentaire identique
      const signature = bId
        ? `booking_${bId}`
        : `${(rev.author_email || '').trim().toLowerCase()}_${(rev.comment || '').trim().slice(0, 50).toLowerCase()}`;

      if (seenSignatures.has(signature)) {
        return; // doublon éliminé
      }

      seenSignatures.add(signature);
      uniqueMap.set(rId, rev);
    });

    const cleanReviews = Array.from(uniqueMap.values());
    
    // Mettre à jour le cache local avec l'état propre sans doublons
    try {
      localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(cleanReviews));
    } catch {}

    if (listingId) {
      return cleanReviews.filter((r) => String(r.listing_id) === String(listingId));
    }
    return cleanReviews;
  } catch (err) {
    console.error('Erreur getReviews:', err);
    return [];
  }
}

/**
 * Enregistre un nouvel avis voyageur vérifié dans Supabase et le cache local avec un ID unifié.
 */
export async function submitReview(reviewPayload) {
  try {
    const newReview = {
      id: `rev_${Date.now()}`,
      booking_id: reviewPayload.booking_id || null,
      listing_id: reviewPayload.listing_id || null,
      pack_id: reviewPayload.pack_id || null,
      author_name: reviewPayload.author_name || 'Voyageur Bénin Beyond',
      author_email: reviewPayload.author_email || '',
      author_avatar: reviewPayload.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewPayload.author_name || 'Client')}&background=0D8ABC&color=fff`,
      rating: Math.min(5, Math.max(1, Number(reviewPayload.rating) || 5)),
      comment: reviewPayload.comment?.trim() || '',
      status: 'approved',
      created_at: new Date().toISOString()
    };

    // 1. Enregistrement prioritaire dans Supabase pour obtenir l'ID UUID officiel
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

    // 2. Enregistrement dans le LocalStorage avec l'ID officiel unifié
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = raw ? JSON.parse(raw) : [];
    // Filtrer d'éventuels doublons sur la même réservation
    const filteredLocal = local.filter((r) => !newReview.booking_id || String(r.booking_id) !== String(newReview.booking_id));
    filteredLocal.unshift(newReview);
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(filteredLocal));

    return { success: true, review: newReview };
  } catch (err) {
    console.error('Erreur submitReview:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Supprime définitivement un avis de la base Supabase et du cache local avec inscription en liste noire.
 */
export async function deleteReview(reviewId, bookingId = null) {
  try {
    // 1. Inscrire dans la liste noire pour bloquer toute réapparition au rafraîchissement
    markReviewAsDeleted(reviewId, bookingId);

    // 2. Purge du LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = raw ? JSON.parse(raw) : [];
    const filtered = local.filter((r) =>
      String(r.id) !== String(reviewId) &&
      (!bookingId || String(r.booking_id) !== String(bookingId))
    );
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(filtered));

    // 3. Suppression physique dans Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (reviewId && uuidRegex.test(reviewId)) {
          await supabase.from('reviews').delete().eq('id', reviewId);
        }
        if (bookingId) {
          await supabase.from('reviews').delete().eq('booking_id', String(bookingId));
        } else if (reviewId && !uuidRegex.test(reviewId)) {
          await supabase.from('reviews').delete().eq('booking_id', String(reviewId));
        }
      } catch (err) {
        console.warn('Supabase review delete error:', err);
      }
    }
    return true;
  } catch (err) {
    console.error('Erreur deleteReview:', err);
    return false;
  }
}
