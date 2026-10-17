/**
 * ==============================================================================
 * BÉNIN BEYOND — SERVICE DE PAIEMENT NYOLE (OFFICIEL)
 * ==============================================================================
 * Passerelle de paiement principale et exclusive pour Bénin Beyond.
 * Supporte :
 *  - MTN Mobile Money (Bénin & sous-région)
 *  - Moov Money (Flooz Bénin & UEMOA)
 *  - Celtiis Cash (Bénin)
 *  - Wave Mobile Money
 *  - Cartes Bancaires Internationales (Visa / Mastercard)
 *
 * Documentation officielle : https://nyole.com/docs
 */

import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

export const PENDING_CHECKOUT_STORAGE_KEY = 'benin_beyond_nyole_pending_checkout';

// Les appels à l'API Nyole (clé secrète) sont faits uniquement par les fonctions serveur
// supabase/functions/benin-beyond : aucune clé Nyole dans le navigateur.

/**
 * Démarre le paiement côté serveur (fonction Supabase « benin-beyond », route nyole-checkout) :
 * la réservation est enregistrée en attente de paiement, puis la session Nyole
 * est créée avec la clé secrète. Le site n'a plus qu'à rediriger vers `url`.
 *
 * @param {Object} booking - Détails de la réservation (client, articles, montants)
 * @returns {Promise<{success: boolean, bookingRef?: string, sessionId?: string, url?: string, error?: string}>}
 */
export async function startNyoleCheckout(booking) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Service de réservation indisponible (Supabase non configuré).' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('benin-beyond/nyole-checkout', { body: { booking } });
    if (error || !data?.url) {
      // Fonction absente (404) ou injoignable : le navigateur ne reçoit qu'une erreur réseau (CORS)
      if (error?.context?.status === 404 || error?.name === 'FunctionsFetchError') {
        console.error('[Nyole] Fonction serveur « benin-beyond » introuvable ou injoignable : vérifiez son déploiement sur Supabase.');
        return {
          success: false,
          error: 'Le paiement en ligne est momentanément indisponible. Veuillez réessayer plus tard ou contacter Bénin Beyond.'
        };
      }
      const serverMessage = await error?.context?.json?.().then((d) => d?.error).catch(() => null);
      return {
        success: false,
        error: serverMessage || data?.error || 'Impossible de contacter le service de paiement Nyole.'
      };
    }
    return { success: true, bookingRef: data.booking_ref, sessionId: data.session_id, url: data.url };
  } catch (err) {
    console.error('[Nyole] Erreur démarrage paiement:', err);
    return { success: false, error: err?.message || 'Impossible de contacter le service de paiement Nyole.' };
  }
}

/**
 * Demande au serveur (fonction « benin-beyond », route nyole-webhook) de vérifier auprès de Nyole
 * le paiement d'une réservation et renvoie la réservation à jour.
 *
 * @param {string} bookingRef
 * @returns {Promise<{success: boolean, booking?: Object, nyoleStatus?: string|null, error?: string}>}
 */
export async function verifyNyolePayment(bookingRef) {
  if (!bookingRef || !isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Référence de réservation manquante' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('benin-beyond/nyole-webhook', {
      body: { action: 'verify', booking_ref: bookingRef }
    });
    if (error || !data?.booking) {
      return { success: false, error: data?.error || error?.message || 'Vérification impossible' };
    }
    return { success: true, booking: data.booking, nyoleStatus: data.nyole_status || null };
  } catch (err) {
    console.error('[Nyole] Erreur vérification paiement:', err);
    return { success: false, error: err?.message || 'Vérification impossible' };
  }
}

/**
 * Sauvegarde la commande en attente avant redirection Nyole
 */
export function savePendingCheckout(data) {
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Nyole] Sauvegarde session locale échouée:', e);
  }
}

/**
 * Récupère la commande en attente après retour de Nyole
 */
export function getPendingCheckout() {
  try {
    const rawSession = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (rawSession) return JSON.parse(rawSession);
    const rawLocal = localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (rawLocal) return JSON.parse(rawLocal);
    return null;
  } catch {
    return null;
  }
}

/**
 * Nettoie la commande en attente
 */
export function clearPendingCheckout() {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch (e) {
    console.warn('[Nyole] Nettoyage session échoué:', e);
  }
}
