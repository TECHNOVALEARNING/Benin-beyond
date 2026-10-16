import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

/**
 * Signalements d'annonces par les voyageurs (table listing_reports, voir src/supabase/listing_reports.sql).
 * Tout visiteur peut signaler ; seule l'équipe (admin / assistants) peut lire et traiter.
 */

export const REPORT_REASONS = [
  { id: 'fake', label: 'Annonce fausse ou trompeuse' },
  { id: 'photos', label: 'Photos ne correspondant pas au bien' },
  { id: 'price', label: 'Prix abusif ou demande de paiement hors site' },
  { id: 'scam', label: 'Arnaque ou comportement suspect' },
  { id: 'other', label: 'Autre problème' }
];

export async function submitListingReport({ listingId, listingTitle, reason, message, reporterEmail }) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Service indisponible pour le moment.' };
  }
  const { error } = await supabase.from('listing_reports').insert([{
    listing_id: String(listingId),
    listing_title: (listingTitle || '').slice(0, 200),
    reason,
    message: (message || '').trim().slice(0, 1000) || null,
    reporter_email: (reporterEmail || '').trim().toLowerCase().slice(0, 200) || null
  }]);
  if (error) {
    console.error('[Signalement] Échec :', error.message);
    return { success: false, error: "Le signalement n'a pas pu être envoyé. Réessayez plus tard." };
  }
  return { success: true };
}

export async function getOpenListingReports() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('listing_reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Signalements] Lecture impossible :', error.message);
    return [];
  }
  return data || [];
}

export async function closeListingReport(id, status = 'resolved') {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await supabase
    .from('listing_reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[Signalements] Mise à jour impossible :', error.message);
  return !error;
}
