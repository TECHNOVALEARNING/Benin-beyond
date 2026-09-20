import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { COMBINED_PACKS } from '../data/packsData';

const CUSTOM_PACKS_KEY = 'benin_beyond_custom_packs';

export function getCustomPacks() {
  try {
    const raw = localStorage.getItem(CUSTOM_PACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPacks(packs) {
  try {
    localStorage.setItem(CUSTOM_PACKS_KEY, JSON.stringify(packs));
  } catch (err) {
    console.error('Failed to save packs in localStorage:', err);
  }
}

export async function getPacks() {
  const custom = getCustomPacks();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return [...custom, ...data];
      }
    } catch (err) {
      console.warn('Supabase packs fetch error:', err.message);
    }
  }
  return custom.length > 0 ? custom : COMBINED_PACKS;
}

export async function addPack(newPack) {
  const packWithId = {
    id: newPack.id || `pack-${Date.now()}`,
    ...newPack,
    rating: newPack.rating || 5.0,
    reviewsCount: newPack.reviewsCount || 1,
    created_at: newPack.created_at || new Date().toISOString()
  };

  const custom = getCustomPacks();
  const updated = [packWithId, ...custom.filter((p) => p.id !== packWithId.id)];
  saveCustomPacks(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('packs').insert([packWithId]);
    } catch (err) {
      console.warn('Supabase pack insertion error:', err.message);
    }
  }

  return packWithId;
}

export async function deletePack(packId) {
  const custom = getCustomPacks();
  const filtered = custom.filter((p) => p.id !== packId);
  saveCustomPacks(filtered);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('packs').delete().eq('id', packId);
    } catch (err) {
      console.warn('Supabase pack deletion error:', err.message);
    }
  }
  return true;
}
