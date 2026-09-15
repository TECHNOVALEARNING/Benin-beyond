import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const LOCAL_STORAGE_BOOKINGS_KEY = 'benin_beyond_bookings';

export const INITIAL_BOOKINGS = [
  {
    id: 'bkg_001',
    booking_ref: 'BB-892410',
    customer_name: 'Amina Diallo',
    customer_email: 'amina.diallo@gmail.com',
    customer_phone: '+229 97 12 34 56',
    customer_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    customer_country: 'Sénégal / Diaspora',
    listing_id: '6a7562469fa797d5bba5f683',
    listing_title: 'Villa Cotonou Riviera',
    listing_type: 'stay',
    listing_category: 'Hébergement',
    listing_image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/f7eb9d7b5_generated_bd25ef85.png',
    location: 'Cotonou, Lagune',
    dates: '18 Oct — 22 Oct (4 nuits)',
    guests: '3 voyageurs',
    gross_amount: 340000,
    commission_rate: 0.10,
    commission_amount: 34000,
    net_amount: 306000,
    status: 'confirmed', // 'confirmed' | 'pending' | 'completed' | 'cancelled'
    payment_method: 'MTN Mobile Money',
    created_at: '2026-09-14T15:20:00.000Z'
  },
  {
    id: 'bkg_002',
    booking_ref: 'BB-731902',
    customer_name: 'Dr. Jean-Marc Dossou',
    customer_email: 'jm.dossou@cabinet-consult.bj',
    customer_phone: '+229 95 88 11 22',
    customer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    customer_country: 'Bénin (Cotonou)',
    listing_id: '6a7562469fa797d5bba5f686',
    listing_title: 'SUV Toyota Fortuner (VIP 7 Places)',
    listing_type: 'drive',
    listing_category: 'Véhicule',
    listing_image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/786f87a7e_generated_f72ae80f.png',
    location: 'Cotonou & Littoral',
    dates: '25 Oct — 28 Oct (3 jours)',
    guests: 'Conducteur accrédité',
    gross_amount: 135000,
    commission_rate: 0.10,
    commission_amount: 13500,
    net_amount: 121500,
    status: 'confirmed',
    payment_method: 'Carte Bancaire Visa',
    created_at: '2026-09-15T09:40:00.000Z'
  },
  {
    id: 'bkg_003',
    booking_ref: 'BB-619483',
    customer_name: 'Florence Hountondji',
    customer_email: 'florence.h@outlook.com',
    customer_phone: '+33 6 45 12 89 00',
    customer_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    customer_country: 'France / Diaspora Bénin',
    listing_id: '6a7562469fa797d5bba5f685',
    listing_title: 'Loft Cocotier Ouidah (Bord de mer)',
    listing_type: 'stay',
    listing_category: 'Hébergement',
    listing_image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/8d23f1177_generated_fc0ecad1.png',
    location: 'Ouidah Plage',
    dates: '01 Nov — 06 Nov (5 nuits)',
    guests: '2 voyageurs',
    gross_amount: 210000,
    commission_rate: 0.10,
    commission_amount: 21000,
    net_amount: 189000,
    status: 'pending',
    payment_method: 'Moov Money Bénin',
    created_at: '2026-09-15T18:15:00.000Z'
  },
  {
    id: 'bkg_004',
    booking_ref: 'BB-502847',
    customer_name: 'Christian Agbo',
    customer_email: 'c.agbo@invest-africa.org',
    customer_phone: '+229 96 33 44 55',
    customer_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    customer_country: 'Côte d’Ivoire',
    listing_id: '6a7562469fa797d5bba5f687',
    listing_title: 'Berline Hyundai Elantra Climatisée',
    listing_type: 'drive',
    listing_category: 'Véhicule',
    listing_image: 'https://media.base44.com/images/public/6a7561b29fa797d5bba5f614/84aa52bc0_generated_f9756aa3.png',
    location: 'Cotonou Centre',
    dates: '10 Nov — 14 Nov (4 jours)',
    guests: 'Usage professionnel',
    gross_amount: 100000,
    commission_rate: 0.10,
    commission_amount: 10000,
    net_amount: 90000,
    status: 'confirmed',
    payment_method: 'Celtiis Cash',
    created_at: '2026-09-15T21:05:00.000Z'
  }
];

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
