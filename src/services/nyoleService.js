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

const NYOLE_PUBLIC_KEY =
  (import.meta.env?.VITE_NYOLE_PUBLIC_KEY || '').trim() ||
  'af_live_pub_518c867febff49ff09ec1a83f8ba98a70205cc6d052f8eca';

const NYOLE_BASE_URL =
  (import.meta.env?.VITE_NYOLE_BASE_URL || '').trim().replace(/\/+$/, '') ||
  'https://app.nyole.com/api/v1';

export const PENDING_CHECKOUT_STORAGE_KEY = 'benin_beyond_nyole_pending_checkout';

/**
 * Vérifie si la passerelle Nyole est configurée
 */
export function isNyoleConfigured() {
  return Boolean(NYOLE_PUBLIC_KEY && NYOLE_PUBLIC_KEY.startsWith('af_'));
}

/**
 * Récupère la clé publique / token d'autorisation
 */
export function getNyolePublicKey() {
  return NYOLE_PUBLIC_KEY;
}

/**
 * Crée une session de paiement hébergée Nyole
 *
 * @param {Object} params
 * @param {number} params.amount - Montant en FCFA (XOF)
 * @param {string} params.bookingRef - Référence unique de réservation (ex: BB-123456)
 * @param {string} params.customerName - Nom complet du client
 * @param {string} params.customerEmail - Email du client
 * @param {string} params.customerPhone - Téléphone avec indicatif (+229...)
 * @param {string} [params.description] - Libellé affiché au client
 * @param {string} [params.successUrl] - URL de redirection après paiement réussi
 * @param {string} [params.cancelUrl] - URL de redirection en cas d'annulation
 * @param {Object} [params.metadata] - Données additionnelles
 * @returns {Promise<{success: boolean, session?: Object, error?: string}>}
 */
export async function createNyoleCheckoutSession({
  amount,
  bookingRef,
  customerName,
  customerEmail,
  customerPhone,
  description,
  successUrl,
  cancelUrl,
  metadata = {}
}) {
  try {
    if (!NYOLE_PUBLIC_KEY) {
      throw new Error("Clé d'API Nyole non configurée. Veuillez renseigner VITE_NYOLE_PUBLIC_KEY.");
    }

    const cleanAmount = Math.round(Number(amount));
    if (!cleanAmount || cleanAmount <= 0) {
      throw new Error('Le montant de la transaction doit être supérieur à 0.');
    }

    const currentOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:5173';

    const defaultSuccessUrl = `${currentOrigin}/checkout?payment_status=success&session_id={id}&booking_ref=${encodeURIComponent(
      bookingRef || ''
    )}`;
    const defaultCancelUrl = `${currentOrigin}/checkout?payment_status=cancelled&booking_ref=${encodeURIComponent(
      bookingRef || ''
    )}`;

    const payload = {
      amount: cleanAmount,
      currency: 'XOF',
      customer_name: (customerName || '').trim(),
      customer_email: (customerEmail || '').trim().toLowerCase(),
      customer_phone: (customerPhone || '').trim(),
      description: description || `Réservation Bénin Beyond #${bookingRef}`,
      merchant_name: 'Bénin Beyond',
      success_url: successUrl || defaultSuccessUrl,
      cancel_url: cancelUrl || defaultCancelUrl,
      metadata: {
        booking_ref: bookingRef,
        source: 'benin_beyond_web',
        ...metadata
      }
    };

    const response = await fetch(`${NYOLE_BASE_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NYOLE_PUBLIC_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.error ||
        `Échec de création de la session Nyole (HTTP ${response.status})`;
      console.error('[Nyole] Erreur API:', errorMsg, data);
      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      session: data
    };
  } catch (err) {
    console.error('[Nyole] Erreur réseau ou configuration:', err);
    return {
      success: false,
      error: err?.message || 'Impossible de contacter le service de paiement Nyole.'
    };
  }
}

/**
 * Vérifie le statut d'une session de paiement Nyole
 *
 * @param {string} sessionId - L'identifiant de la session Nyole
 * @returns {Promise<{success: boolean, paid?: boolean, status?: string, data?: Object, error?: string}>}
 */
export async function checkNyoleSessionStatus(sessionId) {
  try {
    if (!sessionId || sessionId === '{id}') {
      return { success: false, error: 'Identifiant de session invalide' };
    }

    const response = await fetch(
      `${NYOLE_BASE_URL}/checkout/sessions/${encodeURIComponent(sessionId)}/status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${NYOLE_PUBLIC_KEY}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        data?.error ||
        `Erreur lors de la vérification de session (HTTP ${response.status})`;
      return { success: false, error: errorMsg };
    }

    const rawStatus = String(data?.status || '').toUpperCase();
    const isPaid = Boolean(
      data?.paid === true ||
      ['SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'APPROVED'].includes(rawStatus)
    );

    return {
      success: true,
      paid: isPaid,
      status: data?.status || (isPaid ? 'SUCCESS' : 'PENDING'),
      data
    };
  } catch (err) {
    console.error('[Nyole] Erreur vérification statut:', err);
    return {
      success: false,
      error: err?.message || 'Erreur lors de la communication avec Nyole'
    };
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
