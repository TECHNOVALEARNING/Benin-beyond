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
      notifySyncError(describeSupabaseError(result.error));
    }
    return result;
  } catch (err) {
    console.error(`[Supabase] ${label} (réseau) :`, err?.message || err);
    notifySyncError('Connexion au serveur impossible. Vos dernières modifications n’ont pas été enregistrées.');
    return { data: null, error: err };
  }
}

export const SYNC_ERROR_EVENT = 'benin_beyond_sync_error';

/** Signale à l'interface qu'une écriture n'a pas été enregistrée sur le serveur. */
export function notifySyncError(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SYNC_ERROR_EVENT, { detail: { message } }));
}

function describeSupabaseError(error) {
  if (error?.code === '42501' || /row-level security|permission/i.test(error?.message || '')) {
    return "Action refusée par le serveur : votre session n'a pas les droits nécessaires. Reconnectez-vous puis réessayez.";
  }
  if (error?.code === '23505') {
    return 'Cet élément existe déjà sur le serveur.';
  }
  return "Le serveur a refusé l'enregistrement de vos modifications. Réessayez dans un instant.";
}
