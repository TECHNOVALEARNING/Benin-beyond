import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const LOCAL_STORAGE_BOOKINGS_KEY = 'benin_beyond_bookings';

export const INITIAL_BOOKINGS = [];

export async function getBookings() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    const custom = raw ? JSON.parse(raw) : [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return [...custom, ...data];
      }
    }

    return [...custom, ...INITIAL_BOOKINGS];
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
    return true;
  } catch (err) {
    console.error('Erreur mise à jour réservation:', err);
    return false;
  }
}

export async function createBooking(bookingPayload) {
  const bookingRef = bookingPayload.booking_ref || `BB-${Math.floor(Math.random() * 900000 + 100000)}`;
  const gross = Number(bookingPayload.gross_amount || bookingPayload.total_price || 85000);
  const commissionRate = 0.10;
  const commissionAmount = Math.round(gross * commissionRate);
  const netAmount = gross - commissionAmount;

  const record = {
    ...bookingPayload,
    id: `bkg_${Date.now()}`,
    booking_ref: bookingRef,
    gross_amount: gross,
    commission_rate: commissionRate,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    status: 'confirmed',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        return { success: true, booking: data };
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
