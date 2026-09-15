import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const LOCAL_STORAGE_BOOKINGS_KEY = 'benin_beyond_bookings';

export async function createBooking(bookingPayload) {
  // Generate booking reference code if not provided
  const bookingRef = bookingPayload.booking_ref || `BB-${Math.floor(Math.random() * 900000 + 100000)}`;
  const record = {
    ...bookingPayload,
    booking_ref: bookingRef,
    created_at: new Date().toISOString()
  };

  // Try saving to Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([record])
        .select()
        .single();

      if (error) {
        console.warn('Supabase booking insert error:', error.message);
      } else if (data) {
        return { success: true, booking: data };
      }
    } catch (err) {
      console.warn('Supabase booking exception:', err);
    }
  }

  // Fallback / local persistence
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY) || '[]');
    existing.push(record);
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('LocalStorage booking write error:', e);
  }

  return { success: true, booking: record };
}
