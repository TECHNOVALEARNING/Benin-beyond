import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const LOCAL_STORAGE_REVIEWS_KEY = 'benin_beyond_reviews';

const withTimeout = (promise, ms = 3000) => {
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

export async function getReviews(listingId = null) {
  try {
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

        const { data, error } = await withTimeout(query, 3000);
        if (!error && data) {
          remoteReviews = data;
        }
      } catch (e) {
        console.warn('Reviews fetch timeout/error, using local fallback:', e?.message || e);
      }
    }

    const combinedMap = new Map();
    [...localReviews, ...remoteReviews].forEach((rev) => {
      if (rev && rev.id) {
        combinedMap.set(String(rev.id), rev);
      }
    });

    let result = Array.from(combinedMap.values());
    if (listingId) {
      result = result.filter((r) => String(r.listing_id) === String(listingId));
    }
    return result;
  } catch (err) {
    console.error('Erreur getReviews:', err);
    return [];
  }
}

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

    // 1. LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = raw ? JSON.parse(raw) : [];
    local.unshift(newReview);
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(local));

    // 2. Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await withTimeout(
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
          }]),
          4000
        );
      } catch (err) {
        console.warn('Supabase review insert error:', err);
      }
    }

    return { success: true, review: newReview };
  } catch (err) {
    console.error('Erreur submitReview:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteReview(reviewId) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
    const local = raw ? JSON.parse(raw) : [];
    const filtered = local.filter((r) => String(r.id) !== String(reviewId));
    localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('reviews').delete().eq('id', reviewId);
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
