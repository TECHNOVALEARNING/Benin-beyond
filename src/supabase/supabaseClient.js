import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('your_')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;


/**
 * Exécute une requête Supabase et journalise l'erreur éventuelle.
 * supabase-js ne lève pas d'exception sur un refus (RLS, contrainte, colonne absente) :
 * l'erreur est renvoyée dans `error`, il faut donc la vérifier explicitement.
 */
export async function runSupabaseQuery(label, query) {
  try {
    const result = await query;
    if (result?.error) {
      console.error(`[Supabase] ${label} :`, result.error.message, result.error.code || '');
    }
    return result;
  } catch (err) {
    console.error(`[Supabase] ${label} (réseau) :`, err?.message || err);
    return { data: null, error: err };
  }
}
