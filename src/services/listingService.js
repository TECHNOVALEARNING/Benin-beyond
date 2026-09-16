import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { INITIAL_LISTINGS } from '../data/initialListings';

const CUSTOM_LISTINGS_KEY = 'benin_beyond_custom_listings';

function getCustomListings() {
  try {
    const raw = localStorage.getItem(CUSTOM_LISTINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomListings(listings) {
  try {
    localStorage.setItem(CUSTOM_LISTINGS_KEY, JSON.stringify(listings));
  } catch (err) {
    console.error('Failed to save custom listings in localStorage:', err);
  }
}

export async function getListings() {
  const custom = getCustomListings();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return [...custom, ...data].filter((item) => item.type === 'stay' || item.type === 'drive');
      }
      if (error) {
        console.warn('Supabase listings fetch error, falling back to local dataset:', error.message);
      }
    } catch (err) {
      console.warn('Network or Supabase query exception:', err);
    }
  }

  // Fallback to custom + initial listings (strictly stay & drive)
  return [...custom, ...INITIAL_LISTINGS].filter((item) => item.type === 'stay' || item.type === 'drive');
}

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
        return data;
      }
    } catch (err) {
      console.warn('Supabase getListingById error:', err);
    }
  }

  // Fallback
  return INITIAL_LISTINGS.find((item) => item.id === id) || null;
}

export function addListing(listingData) {
  const custom = getCustomListings();
  const newListing = {
    id: `lst_custom_${Date.now()}`,
    created_date: new Date().toISOString(),
    status: listingData.status || 'pending', // 'pending' | 'active' | 'refused' | 'suspended'
    rejection_reason: '',
    video_url: listingData.video_url || null,
    rating: 5.0,
    reviews_count: 1,
    featured: false,
    ...listingData
  };

  const updated = [newListing, ...custom];
  saveCustomListings(updated);
  return newListing;
}

export function updateListingStatus(id, newStatus, rejectionReason = '') {
  const custom = getCustomListings();
  const index = custom.findIndex((item) => item.id === id);
  if (index !== -1) {
    custom[index] = {
      ...custom[index],
      status: newStatus,
      rejection_reason: rejectionReason || custom[index].rejection_reason || ''
    };
    saveCustomListings(custom);
    return custom[index];
  }
  return null;
}

export function deleteListing(id) {
  const custom = getCustomListings();
  const updated = custom.filter((item) => item.id !== id);
  saveCustomListings(updated);
  return true;
}

export function getOwnerListings(ownerEmailOrId) {
  const allCustom = getCustomListings();
  if (!ownerEmailOrId) return allCustom;
  return allCustom.filter(
    (l) => l.owner_email === ownerEmailOrId || l.owner_id === ownerEmailOrId
  );
}
