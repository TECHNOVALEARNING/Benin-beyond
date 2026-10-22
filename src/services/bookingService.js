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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);

const newUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};
const ALLOWED_BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

// Colonne absente du schéma (migration non appliquée) : PostgREST PGRST204 / Postgres 42703
const isMissingColumnError = (error) =>
  Boolean(error) && (error.code === 'PGRST204' || error.code === '42703');

const toDateOrNull = (value) => {
  if (!value) return null;
  const str = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
};

const toAmount = (...values) => {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  return 0;
};

/**
 * Insère une réservation dans Supabase. Si une colonne étendue n'existe pas encore
 * dans la base (migration non appliquée), on réessaie avec les seules colonnes du schéma de base.
 */
async function insertRemoteBooking(corePayload, extendedPayload) {
  // L'identifiant est généré ici et la ligne n'est pas relue après insertion :
  // un voyageur sans compte n'a pas le droit de lire les réservations (RLS).
  const id = newUuid();
  const insertRow = async (row) => {
    const { error } = await supabase.from('bookings').insert([{ id, ...row }]);
    return { data: error ? null : { id }, error };
  };

  const first = await insertRow({ ...corePayload, ...extendedPayload });
  if (!first.error || !isMissingColumnError(first.error)) return first;

  console.warn('[Bookings] Colonnes étendues absentes, insertion du schéma de base :', first.error.message);
  return insertRow(corePayload);
}

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

      const rawStart = b.start_date || b.check_in || firstItem.startDate || null;
      const rawEnd = b.end_date || b.check_out || firstItem.endDate || null;

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
        start_date: rawStart,
        end_date: rawEnd,
        check_in: rawStart,
        check_out: rawEnd,
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
      if (!ALLOWED_BOOKING_STATUSES.includes(newStatus)) {
        console.warn(`[Bookings] Statut "${newStatus}" non autorisé par la base, mise à jour locale uniquement.`);
        return true;
      }
      try {
        const column = isUuid(bookingId) ? 'id' : 'booking_ref';
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq(column, bookingId);
        if (error) {
          console.error('[Bookings] Échec mise à jour du statut :', error.message);
          return false;
        }
      } catch (err) {
        console.error('[Bookings] Erreur réseau mise à jour du statut :', err);
        return false;
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
        // Les paiements liés sont supprimés en cascade (payments.booking_id ON DELETE CASCADE)
        if (isUuid(bookingId)) {
          const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
          if (error) console.error('[Bookings] Échec suppression par id :', error.message);
        }

        const refToDelete = bookingRef || (!isUuid(bookingId) ? bookingId : null);
        if (refToDelete) {
          const { error } = await supabase.from('bookings').delete().eq('booking_ref', refToDelete);
          if (error) console.error('[Bookings] Échec suppression par référence :', error.message);
        }
      } catch (err) {
        console.error('[Bookings] Erreur réseau suppression :', err);
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
  const gross = toAmount(bookingPayload.gross_amount, bookingPayload.total_amount, bookingPayload.total_price);
  const isManualBlock = Boolean(bookingPayload.is_manual_block);
  const commissionRate = 0.10;
  const commissionAmount = isManualBlock ? 0 : Math.round(gross * commissionRate);
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

  const isVehicleBooking = bookingPayload.rental_type === 'drive' || firstItem.type === 'drive' || firstItem.rental_type === 'drive' || firstItem.price_unit === 'jour';
  const rentalType = isVehicleBooking ? 'drive' : (bookingPayload.rental_type || firstItem.type || 'stay');
  const durationDays = isVehicleBooking ? (bookingPayload.duration_days || firstItem.days || 1) : null;
  const roomsCount = isVehicleBooking ? 0 : (bookingPayload.rooms_count ?? firstItem.rooms_count ?? 1);

  const record = {
    ...bookingPayload,
    id: `bkg_${Date.now()}`,
    booking_ref: bookingRef,
    customer_name: bookingPayload.customer_name || 'Client',
    customer_email: bookingPayload.customer_email || 'client@beninbeyond.com',
    customer_phone: bookingPayload.customer_phone || '',
    customer_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(bookingPayload.customer_name || 'Voyageur')}&background=0D8ABC&color=fff`,
    items: items,
    rental_type: rentalType,
    duration_days: durationDays,
    rooms_count: roomsCount,
    listing_id: listingId,
    listing_title: listingTitle,
    listing_image: listingImage,
    location: location,
    dates: dates,
    start_date: bookingPayload.start_date || bookingPayload.check_in || firstItem.startDate || null,
    end_date: bookingPayload.end_date || bookingPayload.check_out || firstItem.endDate || null,
    check_in: bookingPayload.check_in || bookingPayload.start_date || firstItem.startDate || null,
    check_out: bookingPayload.check_out || bookingPayload.end_date || firstItem.endDate || null,
    guests: guests,
    owner_id: ownerId,
    owner_name: ownerName,
    owner_email: ownerEmail,
    gross_amount: gross,
    subtotal: toAmount(bookingPayload.subtotal, gross),
    options_total: toAmount(bookingPayload.options_total),
    total_amount: gross,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    partner_payout_amount: netAmount,
    status: bookingPayload.status || 'confirmed',
    payment_method: bookingPayload.payment_method || 'Mobile Money / Carte',
    payment_status: bookingPayload.payment_status || 'paid',
    created_at: new Date().toISOString()
  };

  // Insertion sécurisée dans Supabase (ne passe que les colonnes valides de la table bookings)
  if (isSupabaseConfigured && supabase) {
    try {
      const status = ALLOWED_BOOKING_STATUSES.includes(record.status) ? record.status : 'confirmed';
      const corePayload = {
        booking_ref: bookingRef,
        customer_name: record.customer_name,
        customer_email: record.customer_email,
        customer_phone: record.customer_phone || '',
        items: record.items,
        protection_options: record.protection_options || {},
        subtotal: record.subtotal,
        options_total: record.options_total,
        total_amount: record.total_amount,
        commission_rate: record.commission_rate,
        commission_amount: record.commission_amount,
        partner_payout_amount: record.partner_payout_amount,
        status,
        payment_status: ['unpaid', 'paid', 'refunded'].includes(record.payment_status) ? record.payment_status : 'paid',
        check_in: toDateOrNull(record.check_in),
        check_out: toDateOrNull(record.check_out),
        guests_count: parseInt(record.guests, 10) || 1,
        special_requests: record.notes || record.special_requests || null,
        created_at: record.created_at
      };

      // Colonnes ajoutées par les migrations (bien, propriétaire, type de location)
      const extendedPayload = {
        rental_type: rentalType,
        duration_days: durationDays,
        rooms_count: roomsCount,
        listing_id: listingId ? String(listingId) : null,
        listing_title: listingTitle,
        listing_image: listingImage,
        location,
        dates,
        guests,
        owner_email: ownerEmail,
        gross_amount: gross,
        net_amount: netAmount,
        payment_method: record.payment_method
      };
      if (isUuid(ownerId)) extendedPayload.owner_id = ownerId;
      if (isUuid(bookingPayload.client_id)) extendedPayload.client_id = bookingPayload.client_id;

      const { data, error } = await insertRemoteBooking(corePayload, extendedPayload);

      if (!error && data) {
        record.id = data.id;

        // Enregistrement de l'encaissement client (pas pour un blocage manuel du propriétaire)
        if (!isManualBlock && record.total_amount > 0) try {
          const methodLower = (record.payment_method || '').toLowerCase();
          const cleanMethod = methodLower.includes('moov')
            ? 'moov_money'
            : (methodLower.includes('celtiis')
              ? 'celtiis'
              : (methodLower.includes('card') || methodLower.includes('carte') ? 'card' : 'mtn_momo'));

          const { error: payError } = await supabase.from('payments').insert([{
            booking_id: data.id,
            transaction_ref: `TXN-${bookingRef}`,
            customer_email: record.customer_email,
            amount: record.total_amount,
            currency: 'XOF',
            payment_method: cleanMethod,
            payment_provider: 'nyole',
            provider_tx_id: record.nyole_session_id || record.nyole_order_id || null,
            status: 'completed',
            paid_at: record.created_at,
            metadata: {
              nyole_session_id: record.nyole_session_id || null,
              nyole_order_id: record.nyole_order_id || null,
              nyole_provider: record.nyole_provider || null
            }
          }]);
          if (payError) console.warn('[Bookings] Transaction de paiement non enregistrée :', payError.message);
        } catch (payErr) {
          console.warn('Notice insertion transaction payment:', payErr?.message || payErr);
        }
      } else if (error) {
        console.error('[Bookings] Réservation non enregistrée dans Supabase :', error.message);
        record.sync_error = error.message;
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

/**
 * =========================================================================
 * GESTION DE LA DISPONIBILITÉ & PRÉVENTION DES DOUBLES RÉSERVATIONS
 * =========================================================================
 */

/**
 * Extrait les dates de début et de fin d'une réservation au format YYYY-MM-DD
 */
export function extractBookingDates(booking) {
  if (!booking) return null;

  let start = booking.start_date || booking.check_in || null;
  let end = booking.end_date || booking.check_out || null;

  // 1. Depuis items[0]
  if ((!start || !end) && Array.isArray(booking.items) && booking.items.length > 0) {
    const it = booking.items[0];
    if (it.startDate) start = it.startDate;
    if (it.endDate) end = it.endDate;
  }

  // 2. Parser la chaîne "Du YYYY-MM-DD au YYYY-MM-DD"
  if ((!start || !end) && typeof booking.dates === 'string') {
    const match = booking.dates.match(/(\d{4}-\d{2}-\d{2})\s+au\s+(\d{4}-\d{2}-\d{2})/);
    if (match) {
      start = match[1];
      end = match[2];
    }
  }

  // 3. Fallback sur created_at + duration_days
  if (!start && booking.created_at) {
    start = String(booking.created_at).slice(0, 10);
  }
  if (!end && start) {
    const days = Number(booking.duration_days) || 1;
    const sDate = new Date(start);
    const eDate = new Date(sDate.getTime() + days * 86400000);
    end = eDate.toISOString().slice(0, 10);
  }

  if (start && end) {
    return {
      start: String(start).slice(0, 10),
      end: String(end).slice(0, 10)
    };
  }

  return null;
}

/**
 * Récupère toutes les réservations actives/confirmées pour un bien donné
 */
export async function getBookingsForListing(listingId) {
  if (!listingId) return [];
  const deletedIds = getDeletedBookingIds();

  // Les réservations ne sont plus lisibles par tous : la base renvoie seulement
  // les plages de dates occupées du bien (sans nom, e-mail ni téléphone).
  let remotePeriods = null;
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('get_listing_booked_periods', { p_listing_id: String(listingId) }),
        3000
      );
      if (error) {
        console.warn('[Bookings] get_listing_booked_periods indisponible :', error.message);
      } else if (Array.isArray(data)) {
        remotePeriods = data;
      }
    } catch (e) {
      console.warn('[Bookings] Plages occupées non chargées :', e?.message || e);
    }
  }

  // Fonction absente (script SQL pas encore exécuté) : ancien comportement
  let allBookings;
  if (remotePeriods) {
    // La base fait foi ; on ajoute seulement les réservations locales jamais enregistrées dans Supabase
    let localBookings = [];
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY) || '[]');
      localBookings = Array.isArray(cached) ? cached.filter((b) => b && b.sync_error) : [];
    } catch {}
    const periodBookings = remotePeriods.map((p, index) => ({
      id: `period_${listingId}_${index}`,
      listing_id: String(listingId),
      start_date: p.start_date,
      end_date: p.end_date,
      status: 'confirmed'
    }));
    allBookings = [...periodBookings, ...localBookings];
  } else {
    allBookings = await getBookings();
  }

  return allBookings.filter((b) => {
    const bId = String(b.id || '');
    const bRef = String(b.booking_ref || '');
    if (deletedIds.has(bId) || deletedIds.has(bRef)) return false;
    if (b.status === 'cancelled' || b.status === 'refunded') return false;

    // Correspondance exacte ou partielle de l'identifiant du bien
    const target = String(listingId);
    const directMatch = String(b.listing_id || '') === target;
    const itemsMatch =
      Array.isArray(b.items) &&
      b.items.some(
        (it) =>
          String(it.listing_id || it.listingId || it.id || '') === target
      );

    return directMatch || itemsMatch;
  });
}

/**
 * Vérifie si la plage [requestedStart, requestedEnd] entre en conflit avec une réservation existante
 */
export async function checkDateAvailability(listingId, requestedStart, requestedEnd) {
  if (!listingId || !requestedStart || !requestedEnd) {
    return { isAvailable: true, conflict: null, allBookedPeriods: [] };
  }

  const reqS = new Date(requestedStart).getTime();
  const reqE = new Date(requestedEnd).getTime();

  if (isNaN(reqS) || isNaN(reqE)) {
    return { isAvailable: true, conflict: null, allBookedPeriods: [] };
  }

  const bookings = await getBookingsForListing(listingId);
  const allBookedPeriods = [];

  let conflictingBooking = null;
  let conflictDates = null;

  for (const b of bookings) {
    const range = extractBookingDates(b);
    if (!range) continue;

    allBookedPeriods.push({
      startDate: range.start,
      endDate: range.end,
      bookingRef: b.booking_ref
    });

    const bookS = new Date(range.start).getTime();
    const bookE = new Date(range.end).getTime();

    // Deux intervalles [reqS, reqE] et [bookS, bookE] se chevauchent si :
    // reqS < bookE ET reqE > bookS
    const hasOverlap = reqS < bookE && reqE > bookS;

    if (hasOverlap && !conflictingBooking) {
      conflictingBooking = b;
      conflictDates = range;
    }
  }

  if (conflictingBooking) {
    return {
      isAvailable: false,
      conflict: {
        booking: conflictingBooking,
        startDate: conflictDates.start,
        endDate: conflictDates.end,
        customerName: conflictingBooking.customer_name || 'Un voyageur'
      },
      allBookedPeriods
    };
  }

  return {
    isAvailable: true,
    conflict: null,
    allBookedPeriods
  };
}

/**
 * Résumé de l'état d'occupation actuel ou à venir d'un bien
 */
export async function getActiveReservationSummary(listingId) {
  if (!listingId) return null;
  const bookings = await getBookingsForListing(listingId);
  const todayStr = new Date().toISOString().slice(0, 10);

  const ranges = bookings
    .map((b) => {
      const dates = extractBookingDates(b);
      return dates ? { ...dates, booking: b } : null;
    })
    .filter(Boolean);

  // 1. Actuellement occupé aujourd'hui
  const current = ranges.find((r) => r.start <= todayStr && r.end >= todayStr);
  if (current) {
    return {
      status: 'occupied',
      startDate: current.start,
      endDate: current.end,
      booking: current.booking
    };
  }

  // 2. Prochaine réservation à venir
  const upcoming = ranges
    .filter((r) => r.start > todayStr)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  if (upcoming.length > 0) {
    return {
      status: 'upcoming',
      startDate: upcoming[0].start,
      endDate: upcoming[0].end,
      booking: upcoming[0].booking,
      allUpcoming: upcoming
    };
  }

  return null;
}

/**
 * =========================================================================
 * GESTION DE LA DISPONIBILITÉ PAR LE PROPRIÉTAIRE (BLOCAGE & RÉSERVATIONS PHYSIQUES)
 * =========================================================================
 */

/**
 * Permet au propriétaire d'enregistrer une réservation physique ou de bloquer des dates.
 * Ces dates deviennent immédiatement indisponibles pour les voyageurs en ligne.
 */
export async function blockListingDates({
  listingId,
  listingTitle,
  listingImage,
  listingLocation,
  listingType = 'stay',
  startDate,
  endDate,
  customerName = 'Réservation physique directe',
  customerPhone = '',
  customerEmail = '',
  notes = '',
  reason = 'Réservation physique / Client direct',
  ownerId = null,
  ownerEmail = null,
  ownerName = null
}) {
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const diffDays = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)));

  const bookingRef = `BB-PHY-${Date.now().toString().slice(-6)}`;

  const payload = {
    booking_ref: bookingRef,
    customer_name: customerName || 'Client Réservation Directe',
    customer_email: customerEmail || 'reservation-directe@benin-beyond.com',
    customer_phone: customerPhone || '',
    listing_id: listingId,
    start_date: startDate,
    end_date: endDate,
    check_in: startDate,
    check_out: endDate,
    dates: `Du ${startDate} au ${endDate}`,
    duration_days: diffDays,
    rental_type: listingType,
    status: 'confirmed',
    is_manual_block: true,
    block_reason: reason || 'Réservation physique / Client direct',
    notes: notes || '',
    payment_method: 'Réservation physique directe (En main propre)',
    payment_status: 'paid',
    total_amount: 0,
    gross_amount: 0,
    commission_amount: 0,
    net_amount: 0,
    partner_payout_amount: 0,
    owner_id: ownerId,
    owner_email: ownerEmail,
    owner_name: ownerName,
    items: [
      {
        id: listingId,
        listing_id: listingId,
        title: listingTitle || 'Bien réservé en direct',
        image: listingImage || '',
        location: listingLocation || '',
        startDate: startDate,
        endDate: endDate,
        days: diffDays,
        nights: diffDays,
        rental_type: listingType
      }
    ]
  };

  const res = await createBooking(payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('benin_beyond_availability_updated', {
        detail: { listingId, startDate, endDate, bookingRef }
      })
    );
  }

  return res;
}

/**
 * Libère une période précédemment bloquée par le propriétaire
 */
export async function unblockListingDates(bookingId, bookingRef = null) {
  const success = await deleteBooking(bookingId, bookingRef);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('benin_beyond_availability_updated', {
        detail: { bookingId, bookingRef }
      })
    );
  }
  return success;
}

