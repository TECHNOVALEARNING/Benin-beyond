import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const LOCAL_STORAGE_BOOKINGS_KEY = 'benin_beyond_bookings';
const DELETED_BOOKINGS_KEY = 'benin_beyond_deleted_bookings';

export const INITIAL_BOOKINGS = [];

/**
 * Récupère l'ensemble des IDs et références de réservations supprimées par l'administrateur
 * afin d'éviter qu'une réservation supprimée ne réapparaisse côté Partenaire ou Voyageur.
 */
export function getDeletedBookingIds() {
  try {
    const raw = localStorage.getItem(DELETED_BOOKINGS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Inscrit un ID ou une référence de réservation dans la liste noire des suppressions.
 */
export function markBookingAsDeleted(id, bookingRef = null) {
  try {
    const set = getDeletedBookingIds();
    if (id) set.add(String(id));
    if (bookingRef) set.add(String(bookingRef));
    localStorage.setItem(DELETED_BOOKINGS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Erreur inscription liste noire réservations:', e);
  }
}

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

export async function getBookings() {
  try {
    const deletedIds = getDeletedBookingIds();
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    const localBookings = raw ? JSON.parse(raw) : [];

    let remoteBookings = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        const { data, error } = await withTimeout(queryPromise, 3000);
        if (!error && data && data.length > 0) {
          remoteBookings = data;
        }
      } catch (e) {
        console.warn('Booking fetch timeout/error, using local fallback:', e?.message || e);
      }
    }

    // Fusion sans doublons par booking_ref ou id
    const combinedMap = new Map();
    [...localBookings, ...remoteBookings].forEach((b) => {
      const key = b.booking_ref || b.id;
      if (key) {
        const bId = String(b.id || '');
        const bRef = String(b.booking_ref || '');
        // Bloquer immédiatement si la réservation est sur liste noire
        if (deletedIds.has(bId) || deletedIds.has(bRef)) {
          return;
        }
        // En cas de conflit, on fusionne pour préserver les métadonnées locales enrichies
        const existing = combinedMap.get(key) || {};
        combinedMap.set(key, { ...existing, ...b });
      }
    });

    const mergedList = Array.from(combinedMap.values());

    // Normalisation complète pour garantir la visibilité côté Partenaire & Admin
    const normalized = mergedList.map((b) => {
      let items = [];
      if (Array.isArray(b.items)) {
        items = b.items;
      } else if (typeof b.items === 'string') {
        try {
          const parsed = JSON.parse(b.items || '[]');
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }
      }
      
      const firstItem = items[0] || {};
      const gross = Number(b.gross_amount || b.total_amount || b.total_price || 0);
      const commRate = Number(b.commission_rate || 0.10);
      const comm = Number(b.commission_amount || Math.round(gross * commRate));
      const net = Number(b.partner_payout_amount || b.net_amount || (gross - comm));

      const dates = b.dates || (
        b.check_in && b.check_out
          ? `Du ${b.check_in} au ${b.check_out}`
          : (firstItem.startDate && firstItem.endDate
              ? `Du ${firstItem.startDate} au ${firstItem.endDate}`
              : (firstItem.days ? `${firstItem.days} jour(s)` : (firstItem.nights ? `${firstItem.nights} nuit(s)` : 'Dates confirmées')))
      );

      const guests = b.guests || (
        b.guests_count
          ? `${b.guests_count} voyageur(s)`
          : (firstItem.guests ? `${firstItem.guests} voyageur(s)` : '1 voyageur')
      );

      return {
        ...b,
        id: b.id || b.booking_ref,
        booking_ref: b.booking_ref || `BB-${String(b.id || Date.now()).slice(-6)}`,
        customer_name: b.customer_name || 'Client Bénin Beyond',
        customer_email: b.customer_email || 'client@beninbeyond.com',
        customer_phone: b.customer_phone || 'Non renseigné',
        customer_avatar: b.customer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.customer_name || 'Voyageur')}&background=0D8ABC&color=fff`,
        items: items,
        listing_id: b.listing_id || firstItem.listing_id || firstItem.listingId || firstItem.id || null,
        listing_title: b.listing_title || firstItem.title || 'Réservation Bénin Beyond',
        listing_image: b.listing_image || firstItem.image || firstItem.image_url || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        location: b.location || firstItem.location || 'Cotonou, Bénin',
        dates: dates,
        guests: guests,
        owner_id: b.owner_id || firstItem.owner_id || null,
        owner_name: b.owner_name || firstItem.owner_name || null,
        owner_email: b.owner_email || firstItem.owner_email || null,
        payment_method: b.payment_method || 'Paiement Sécurisé en Ligne',
        gross_amount: gross,
        commission_rate: commRate,
        commission_amount: comm,
        net_amount: net,
        partner_payout_amount: net,
        status: b.status || 'confirmed',
        created_at: b.created_at || new Date().toISOString()
      };
    });

    // Tri antéchronologique (les plus récentes en premier)
    const sorted = normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Sauvegarde de la liste nettoyée dans le cache local (sans les éléments supprimés)
    try {
      localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(sorted));
    } catch {}

    return sorted;
  } catch (err) {
    console.warn('Erreur chargement réservations:', err);
    return INITIAL_BOOKINGS;
  }
}

export async function updateBookingStatus(bookingId, newStatus) {
  try {
    const bookings = await getBookings();
    const updated = bookings.map((b) =>
      b.id === bookingId || b.booking_ref === bookingId ? { ...b, status: newStatus } : b
    );
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured && supabase) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (bookingId && uuidRegex.test(bookingId)) {
          await supabase
            .from('bookings')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', bookingId);
        } else if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('booking_ref', bookingId);
        }
      } catch (err) {
        console.warn('Supabase booking update error:', err);
      }
    }

    return true;
  } catch (err) {
    console.error('Erreur mise à jour réservation:', err);
    return false;
  }
}

export async function deleteBooking(bookingId, bookingRef = null) {
  try {
    // 1. Inscrire immédiatement dans la liste noire pour interdire toute résurgence
    markBookingAsDeleted(bookingId, bookingRef);

    // 2. Nettoyage immédiat du LocalStorage
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    const bookings = raw ? JSON.parse(raw) : [];
    const bIdStr = String(bookingId || '');
    const bRefStr = String(bookingRef || '');

    const filtered = bookings.filter((b) => {
      const curId = String(b.id || '');
      const curRef = String(b.booking_ref || '');
      if (bIdStr && (curId === bIdStr || curRef === bIdStr)) return false;
      if (bRefStr && (curId === bRefStr || curRef === bRefStr)) return false;
      return true;
    });
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(filtered));

    // 3. Suppression définitive dans Supabase (table payments puis bookings)
    if (isSupabaseConfigured && supabase) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Supprimer d'abord les paiements liés pour éviter les violations de clés étrangères
        if (bookingId && uuidRegex.test(bookingId)) {
          try {
            await supabase.from('payments').delete().eq('booking_id', bookingId);
          } catch (payDelErr) {
            console.warn('Paiement lié non supprimé ou inexistant:', payDelErr);
          }
        }

        // Supprimer la réservation par son UUID si valide
        if (bookingId && uuidRegex.test(bookingId)) {
          await supabase.from('bookings').delete().eq('id', bookingId);
        }

        // Supprimer la réservation par sa référence booking_ref
        const refToDelete = bookingRef || (!uuidRegex.test(bookingId) ? bookingId : null);
        if (refToDelete) {
          await supabase.from('bookings').delete().eq('booking_ref', refToDelete);
        }
      } catch (err) {
        console.warn('Supabase booking delete error:', err);
      }
    }

    return true;
  } catch (err) {
    console.error('Erreur suppression réservation:', err);
    return false;
  }
}

export async function createBooking(bookingPayload) {
  const bookingRef = bookingPayload.booking_ref || `BB-${Math.floor(Math.random() * 900000 + 100000)}`;
  const gross = Number(bookingPayload.gross_amount || bookingPayload.total_amount || bookingPayload.total_price || 85000);
  const commissionRate = 0.10;
  const commissionAmount = Math.round(gross * commissionRate);
  const netAmount = gross - commissionAmount;

  const items = Array.isArray(bookingPayload.items) ? bookingPayload.items : [];
  const firstItem = items[0] || {};
  const ownerId = bookingPayload.owner_id || firstItem.owner_id || null;
  const ownerEmail = bookingPayload.owner_email || firstItem.owner_email || null;
  const ownerName = bookingPayload.owner_name || firstItem.owner_name || null;
  const listingId = bookingPayload.listing_id || firstItem.listing_id || firstItem.listingId || firstItem.id || null;
  const listingTitle = bookingPayload.listing_title || firstItem.title || 'Réservation Bénin Beyond';
  const listingImage = bookingPayload.listing_image || firstItem.image || firstItem.image_url || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
  const location = bookingPayload.location || firstItem.location || 'Cotonou, Bénin';
  const dates = bookingPayload.dates || (firstItem.startDate && firstItem.endDate ? `Du ${firstItem.startDate} au ${firstItem.endDate}` : 'Dates confirmées');
  const guests = bookingPayload.guests || (firstItem.guests ? `${firstItem.guests} voyageur(s)` : '1 voyageur');

  const record = {
    ...bookingPayload,
    id: `bkg_${Date.now()}`,
    booking_ref: bookingRef,
    customer_name: bookingPayload.customer_name || 'Client',
    customer_email: bookingPayload.customer_email || 'client@beninbeyond.com',
    customer_phone: bookingPayload.customer_phone || '',
    customer_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(bookingPayload.customer_name || 'Voyageur')}&background=0D8ABC&color=fff`,
    items: items,
    listing_id: listingId,
    listing_title: listingTitle,
    listing_image: listingImage,
    location: location,
    dates: dates,
    guests: guests,
    owner_id: ownerId,
    owner_name: ownerName,
    owner_email: ownerEmail,
    gross_amount: gross,
    subtotal: Number(bookingPayload.subtotal || gross),
    options_total: Number(bookingPayload.options_total || 0),
    total_amount: gross,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    partner_payout_amount: netAmount,
    status: bookingPayload.status || 'confirmed',
    payment_method: bookingPayload.payment_method || 'Mobile Money / Carte',
    payment_status: 'paid',
    created_at: new Date().toISOString()
  };

  // Insertion sécurisée dans Supabase (ne passe que les colonnes valides de la table bookings)
  if (isSupabaseConfigured && supabase) {
    try {
      const supabasePayload = {
        booking_ref: bookingRef,
        customer_name: record.customer_name,
        customer_email: record.customer_email,
        customer_phone: record.customer_phone,
        items: record.items,
        protection_options: record.protection_options || {},
        subtotal: record.subtotal,
        options_total: record.options_total,
        total_amount: record.total_amount,
        commission_rate: record.commission_rate,
        commission_amount: record.commission_amount,
        partner_payout_amount: record.partner_payout_amount,
        status: record.status,
        payment_status: 'paid',
        guests_count: parseInt(record.guests) || 1,
        created_at: record.created_at
      };

      // Si owner_id est un UUID valide, on l'ajoute
      if (ownerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId)) {
        supabasePayload.owner_id = ownerId;
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert([supabasePayload])
        .select()
        .single();

      if (!error && data) {
        record.id = data.id;

        // Enregistrement automatique de la transaction dans la table payments (Dépôt / Encaissement client)
        try {
          const methodLower = (record.payment_method || '').toLowerCase();
          const cleanMethod = methodLower.includes('moov')
            ? 'moov_money'
            : (methodLower.includes('card') || methodLower.includes('carte') ? 'card' : 'mtn_momo');

          await supabase.from('payments').insert([{
            booking_id: data.id,
            transaction_ref: `TXN-${bookingRef}`,
            customer_email: record.customer_email,
            amount: record.total_amount,
            currency: 'XOF',
            payment_method: cleanMethod,
            payment_provider: 'fedapay',
            status: 'completed',
            paid_at: record.created_at
          }]);
        } catch (payErr) {
          console.warn('Notice insertion transaction payment:', payErr?.message || payErr);
        }
      } else if (error) {
        console.warn('Supabase booking insert notice:', error?.message || error);
      }
    } catch (err) {
      console.warn('Supabase booking insert error:', err);
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY) || '[]');
    existing.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('LocalStorage booking write error:', e);
  }

  return { success: true, booking: record };
}
