/**
 * ==============================================================================
 * BÉNIN BEYOND — FONCTION SERVEUR UNIQUE « benin-beyond »
 * ==============================================================================
 * Un seul fichier, une seule fonction à déployer dans Supabase. Elle regroupe :
 *
 *  - /benin-beyond/nyole-checkout : enregistre la réservation (en attente de paiement)
 *    puis crée la session de paiement Nyole avec la clé secrète ;
 *  - /benin-beyond/nyole-webhook  : reçoit les notifications Nyole (signées) et les
 *    vérifications du site ; seul endroit qui marque une réservation « payée »,
 *    enregistre le paiement et envoie les e-mails de confirmation ;
 *  - /benin-beyond/translate      : traduit en anglais les textes des propriétaires (DeepL).
 *
 * Secrets à déclarer dans Supabase > Edge Functions > Secrets :
 *  - NYOLE_SECRET_KEY      (obligatoire) clé secrète Nyole af_live_sec_...
 *  - SITE_URL              (recommandé) adresse du site, ex. https://benin-beyond.vercel.app
 *  - NYOLE_WEBHOOK_SECRET  (facultatif) clé de signature, si Nyole en fournit une distincte
 *  - NYOLE_BASE_URL        (facultatif) défaut https://app.nyole.com/api/v1
 *  - BREVO_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_FROM_NAME, ADMIN_NOTIFY_EMAIL (e-mails, facultatif)
 *  - RESEND_API_KEY / NOTIFY_FROM : alternative à Brevo (facultatif)
 *  - DEEPL_API_KEY         (facultatif) traduction automatique en anglais
 *  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : fournies automatiquement par Supabase
 *
 * À déployer SANS vérification JWT (Nyole et les visiteurs n'envoient pas de jeton Supabase).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const NYOLE_BASE_URL = (Deno.env.get('NYOLE_BASE_URL') || 'https://app.nyole.com/api/v1').replace(/\/+$/, '');
const NYOLE_SECRET_KEY = (Deno.env.get('NYOLE_SECRET_KEY') || '').trim();
const SIGNING_SECRET = (Deno.env.get('NYOLE_WEBHOOK_SECRET') || NYOLE_SECRET_KEY).trim();
const SIGNATURE_TOLERANCE_SECONDS = 300;
const BREVO_API_KEY = (Deno.env.get('BREVO_API_KEY') || '').trim();
const NOTIFY_FROM_EMAIL = (Deno.env.get('NOTIFY_FROM_EMAIL') || '').trim();
const NOTIFY_FROM_NAME = (Deno.env.get('NOTIFY_FROM_NAME') || 'Bénin Beyond').trim();
const RESEND_API_KEY = (Deno.env.get('RESEND_API_KEY') || '').trim();
const NOTIFY_FROM = (Deno.env.get('NOTIFY_FROM') || '').trim();
const ADMIN_NOTIFY_EMAIL = (Deno.env.get('ADMIN_NOTIFY_EMAIL') || '').trim();
const SITE_URL = (Deno.env.get('SITE_URL') || '').trim().replace(/\/+$/, '');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });

// ------------------------------------------------------------------------------
// Signature Nyole : v1 = HMAC-SHA256(secret, "<timestamp>.<corps brut>") en hexadécimal
// ------------------------------------------------------------------------------
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isValidSignature(req: Request, rawBody: string): Promise<boolean> {
  const header = req.headers.get('x-afriflow-signature') || '';
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const timestamp = parts.t || req.headers.get('x-afriflow-timestamp') || '';
  const received = (parts.v1 || '').toLowerCase();
  if (!timestamp || !received || !SIGNING_SECRET) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = await hmacSha256Hex(SIGNING_SECRET, `${timestamp}.${rawBody}`);
  return timingSafeEqual(expected, received);
}

// ------------------------------------------------------------------------------
// Statut faisant foi : API Nyole
// ------------------------------------------------------------------------------
type NyoleStatus = {
  id: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | string;
  paid?: boolean;
  amount?: number;
  currency?: string;
  order_id?: string;
  provider?: string;
  provider_reference?: string;
};

async function fetchNyoleStatus(sessionId: string): Promise<NyoleStatus> {
  const res = await fetch(`${NYOLE_BASE_URL}/checkout/sessions/${encodeURIComponent(sessionId)}/status`, {
    headers: { Authorization: `Bearer ${NYOLE_SECRET_KEY}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Statut Nyole indisponible (HTTP ${res.status}) : ${data?.message || data?.error || ''}`);
  }
  return data as NyoleStatus;
}

// Le fournisseur renvoyé par Nyole peut être l'agrégateur (ex. PayDunya) : 'nyole' par défaut
function toPaymentMethod(provider = ''): string {
  const p = provider.toLowerCase();
  if (p.includes('moov') || p.includes('flooz')) return 'moov_money';
  if (p.includes('celtiis')) return 'celtiis';
  if (p.includes('mtn')) return 'mtn_momo';
  if (p.includes('card') || p.includes('carte') || p.includes('visa') || p.includes('master')) return 'card';
  return 'nyole';
}

// ------------------------------------------------------------------------------
// E-mails de confirmation : Brevo (recommandé) ou Resend. Sans clé configurée : rien n'est envoyé.
// ------------------------------------------------------------------------------
const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const formatXof = (n: unknown) => `${Math.round(Number(n || 0)).toLocaleString('fr-FR')} FCFA`;

async function sendEmail(to: string, subject: string, html: string) {
  if (!to || !to.includes('@')) return;
  try {
    let res: Response | null = null;
    if (BREVO_API_KEY && NOTIFY_FROM_EMAIL) {
      res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: NOTIFY_FROM_NAME, email: NOTIFY_FROM_EMAIL },
          to: [{ email: to }],
          subject,
          htmlContent: html
        })
      });
    } else if (RESEND_API_KEY && NOTIFY_FROM) {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: NOTIFY_FROM, to: [to], subject, html })
      });
    }
    if (res && !res.ok) console.error(`[nyole-webhook] E-mail non envoyé à ${to} (HTTP ${res.status}) :`, await res.text());
  } catch (err) {
    console.error('[nyole-webhook] E-mail non envoyé :', err);
  }
}

async function sendBookingPaidEmails(booking: any) {
  const ref = escapeHtml(booking.booking_ref);
  const title = escapeHtml(booking.listing_title || 'Votre réservation');
  const dates = escapeHtml(booking.dates || [booking.check_in, booking.check_out].filter(Boolean).join(' → '));
  const total = formatXof(booking.total_amount);
  const loginLink = SITE_URL ? `<p><a href="${SITE_URL}/login">Accéder à mon espace</a></p>` : '';

  const details = `
    <ul>
      <li><strong>Référence :</strong> ${ref}</li>
      <li><strong>Prestation :</strong> ${title}</li>
      ${dates ? `<li><strong>Dates :</strong> ${dates}</li>` : ''}
      <li><strong>Voyageur :</strong> ${escapeHtml(booking.customer_name)} — ${escapeHtml(booking.customer_phone)}</li>
    </ul>`;

  await sendEmail(
    booking.customer_email,
    `Réservation confirmée — ${booking.booking_ref}`,
    `<p>Bonjour ${escapeHtml(booking.customer_name)},</p>
     <p>Votre paiement de <strong>${total}</strong> est confirmé. Votre réservation est validée.</p>
     ${details}${loginLink}
     <p>Merci d'avoir choisi Bénin Beyond.</p>`
  );

  if (booking.owner_email) {
    const net = formatXof(booking.partner_payout_amount ?? booking.net_amount);
    await sendEmail(
      booking.owner_email,
      `Nouvelle réservation payée — ${booking.booking_ref}`,
      `<p>Bonjour,</p>
       <p>Une nouvelle réservation vient d'être payée pour votre bien. Votre gain net : <strong>${net}</strong>.</p>
       ${details}${loginLink}`
    );
  }

  if (ADMIN_NOTIFY_EMAIL) {
    await sendEmail(
      ADMIN_NOTIFY_EMAIL,
      `[Bénin Beyond] Paiement reçu ${total} — ${booking.booking_ref}`,
      `<p>Réservation payée.</p>${details}<p>Propriétaire : ${escapeHtml(booking.owner_email || '—')}</p>`
    );
  }
}

// ------------------------------------------------------------------------------
// Synchronise une réservation avec le statut Nyole (idempotent)
// ------------------------------------------------------------------------------
async function findBooking(sessionId: string | null, bookingRef: string | null) {
  if (sessionId) {
    const { data, error } = await supabase.from('bookings').select('*').eq('nyole_session_id', sessionId).maybeSingle();
    if (error) throw new Error(`Lecture réservation : ${error.message}`);
    if (data) return data;
  }
  if (bookingRef) {
    const { data, error } = await supabase.from('bookings').select('*').eq('booking_ref', bookingRef).maybeSingle();
    if (error) throw new Error(`Lecture réservation : ${error.message}`);
    return data;
  }
  return null;
}

async function syncBooking({
  sessionId,
  bookingRef,
  trustedSessionId
}: {
  sessionId: string | null;
  bookingRef: string | null;
  trustedSessionId: boolean;
}) {
  const booking = await findBooking(sessionId, bookingRef);
  if (!booking) return { found: false };

  // Une session ne peut être rattachée qu'à la réservation pour laquelle elle a été créée.
  // Si l'identifiant n'a pas pu être enregistré à la création, seul un webhook signé peut le fournir.
  let effectiveSessionId: string | null = booking.nyole_session_id || null;
  if (!effectiveSessionId) {
    if (!trustedSessionId || !sessionId) return { found: true, booking, reason: 'no_session' };
    effectiveSessionId = sessionId;
  } else if (sessionId && sessionId !== effectiveSessionId) {
    console.warn(`[nyole-webhook] Session ${sessionId} ne correspond pas à ${booking.booking_ref}`);
    return { found: true, booking, reason: 'session_mismatch' };
  }

  const nyole = await fetchNyoleStatus(effectiveSessionId);
  const status = String(nyole.status || '').toUpperCase();
  const now = new Date().toISOString();

  if (status === 'SUCCESS' || nyole.paid === true) {
    let justPaid = false;
    const expected = Math.round(Number(booking.total_amount || 0));
    const received = Math.round(Number(nyole.amount || 0));
    if (received < expected) {
      console.error(`[nyole-webhook] Montant insuffisant pour ${booking.booking_ref} : ${received} < ${expected}`);
      return { found: true, booking, reason: 'amount_mismatch' };
    }

    if (booking.payment_status !== 'paid') {
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: booking.status === 'pending' || booking.status === 'cancelled' ? 'confirmed' : booking.status,
          payment_method: `Nyole (${nyole.provider || 'Mobile Money / Carte'})`,
          nyole_session_id: effectiveSessionId,
          nyole_order_id: nyole.order_id || null,
          updated_at: now
        })
        .eq('id', booking.id)
        .select('*')
        .single();
      if (error) throw new Error(`Confirmation réservation : ${error.message}`);
      Object.assign(booking, updated);
      justPaid = true;
    }

    const { error: payError } = await supabase.from('payments').upsert(
      {
        booking_id: booking.id,
        transaction_ref: `TXN-${booking.booking_ref}`,
        customer_email: booking.customer_email,
        amount: received,
        currency: nyole.currency || 'XOF',
        payment_method: toPaymentMethod(nyole.provider),
        payment_provider: 'nyole',
        provider_tx_id: nyole.provider_reference || nyole.order_id || effectiveSessionId,
        status: 'completed',
        paid_at: now,
        metadata: {
          nyole_session_id: effectiveSessionId,
          nyole_order_id: nyole.order_id || null,
          nyole_provider: nyole.provider || null
        }
      },
      { onConflict: 'transaction_ref', ignoreDuplicates: true }
    );
    if (payError) throw new Error(`Enregistrement paiement : ${payError.message}`);

    // Une seule fois, au passage à « payé »
    if (justPaid) await sendBookingPaidEmails(booking);

    return { found: true, booking };
  }

  if (status === 'REFUNDED' && booking.payment_status !== 'refunded') {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ payment_status: 'refunded', status: 'cancelled', updated_at: now })
      .eq('id', booking.id)
      .select('*')
      .single();
    if (error) throw new Error(`Remboursement réservation : ${error.message}`);
    await supabase.from('payments').update({ status: 'refunded' }).eq('transaction_ref', `TXN-${booking.booking_ref}`);
    return { found: true, booking: updated };
  }

  // Annulée chez Nyole : libère les dates. (FAILED reste en attente : le client peut réessayer.)
  if (status === 'CANCELLED' && booking.payment_status === 'unpaid' && booking.status === 'pending') {
    const { data: updated, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', booking.id)
      .select('*')
      .single();
    if (error) throw new Error(`Annulation réservation : ${error.message}`);
    return { found: true, booking: updated };
  }

  return { found: true, booking, nyoleStatus: status };
}

// ------------------------------------------------------------------------------
// Point d'entrée
// ------------------------------------------------------------------------------
async function handleNyoleWebhook(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!NYOLE_SECRET_KEY) return json({ error: 'NYOLE_SECRET_KEY non configurée' }, 500);

  const rawBody = await req.text();

  // 1. Webhook Nyole signé
  if (req.headers.has('x-afriflow-signature')) {
    if (!(await isValidSignature(req, rawBody))) {
      console.warn('[nyole-webhook] Signature invalide ou expirée');
      return json({ error: 'Signature invalide' }, 400);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Corps JSON invalide' }, 400);
    }

    const sessionId = event?.data?.id ? String(event.data.id) : null;
    const bookingRef = event?.data?.metadata?.booking_ref ? String(event.data.metadata.booking_ref) : null;
    console.log(`[nyole-webhook] ${event?.event} session=${sessionId} ref=${bookingRef}`);

    try {
      const result = await syncBooking({ sessionId, bookingRef, trustedSessionId: true });
      if (!result.found) console.warn(`[nyole-webhook] Aucune réservation pour session=${sessionId} ref=${bookingRef}`);
      return json({ received: true, reason: (result as any).reason || null });
    } catch (err) {
      // Réponse non-2xx : Nyole renverra l'événement plus tard
      console.error('[nyole-webhook] Erreur de traitement :', err);
      return json({ error: 'Traitement impossible, réessayez' }, 500);
    }
  }

  // 2. Vérification demandée par le site au retour du voyageur
  let body: any = {};
  try {
    body = JSON.parse(rawBody || '{}');
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }

  if (body?.action !== 'verify' || !body?.booking_ref) {
    return json({ error: 'Requête non reconnue' }, 400);
  }

  try {
    const result = await syncBooking({
      sessionId: null,
      bookingRef: String(body.booking_ref),
      trustedSessionId: false
    });
    if (!result.found) return json({ error: 'Réservation introuvable' }, 404);
    return json({
      booking: result.booking,
      nyole_status: (result as any).nyoleStatus || null,
      reason: (result as any).reason || null
    });
  } catch (err) {
    console.error('[nyole-webhook] Erreur de vérification :', err);
    return json({ error: 'Vérification momentanément impossible' }, 502);
  }
}

// ##############################################################################
// PAIEMENT : création de la réservation et de la session Nyole
// ##############################################################################
const COMMISSION_RATE = 0.1;



const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown) => typeof v === 'string' && UUID_REGEX.test(v);
const toDateOrNull = (v: unknown) => {
  const s = v ? String(v).slice(0, 10) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const toAmount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};
const text = (v: unknown, max = 500) => (v === null || v === undefined ? '' : String(v).trim().slice(0, max));

// Colonne absente du schéma (migration non appliquée) : PostgREST PGRST204 / Postgres 42703
const isMissingColumnError = (error: any) => Boolean(error) && (error.code === 'PGRST204' || error.code === '42703');

function newBookingRef() {
  return `BB-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function returnOrigin(req: Request): string {
  if (SITE_URL) return SITE_URL;
  const origin = req.headers.get('origin') || '';
  return /^https?:\/\/[^/]+$/i.test(origin) ? origin : 'http://localhost:5173';
}

async function handleNyoleCheckout(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!NYOLE_SECRET_KEY) return json({ error: 'Paiement indisponible : NYOLE_SECRET_KEY non configurée.' }, 500);

  let b: any;
  try {
    b = (await req.json())?.booking || {};
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }

  const items = Array.isArray(b.items) ? b.items.slice(0, 20) : [];
  const firstItem = items[0] || {};
  const subtotal = toAmount(b.subtotal);
  const optionsTotal = toAmount(b.options_total);
  const total = toAmount(b.total_amount);
  const customerName = text(b.customer_name, 120);
  const customerPhone = text(b.customer_phone, 40);
  const customerEmail = text(b.customer_email, 200).toLowerCase() || 'voyageur@beninbeyond.com';

  if (!customerName || !customerPhone) return json({ error: 'Nom et téléphone obligatoires.' }, 400);
  if (!total || items.length === 0) return json({ error: 'Panier vide ou montant invalide.' }, 400);

  const commission = Math.round(total * COMMISSION_RATE);
  const net = total - commission;
  const bookingRef = newBookingRef();

  const corePayload: Record<string, unknown> = {
    booking_ref: bookingRef,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    items,
    protection_options: b.protection_options && typeof b.protection_options === 'object' ? b.protection_options : {},
    subtotal: subtotal || total,
    options_total: optionsTotal,
    total_amount: total,
    commission_rate: COMMISSION_RATE,
    commission_amount: commission,
    partner_payout_amount: net,
    status: 'pending',
    payment_status: 'unpaid',
    check_in: toDateOrNull(b.check_in || b.start_date),
    check_out: toDateOrNull(b.check_out || b.end_date),
    guests_count: parseInt(String(b.guests || ''), 10) || 1,
    special_requests: text(b.special_requests || b.notes, 1000) || null
  };

  const extendedPayload: Record<string, unknown> = {
    rental_type: text(b.rental_type, 30) || 'stay',
    duration_days: b.duration_days ? toAmount(b.duration_days) : null,
    rooms_count: b.rooms_count === null || b.rooms_count === undefined ? null : toAmount(b.rooms_count),
    listing_id: b.listing_id ? text(b.listing_id, 100) : null,
    listing_title: text(b.listing_title || firstItem.title, 200) || 'Réservation Bénin Beyond',
    listing_image: text(b.listing_image || firstItem.image, 1000) || null,
    location: text(b.location || firstItem.location, 200) || null,
    dates: text(b.dates, 200) || null,
    guests: text(b.guests, 100) || null,
    owner_email: text(b.owner_email, 200) || null,
    gross_amount: total,
    net_amount: net,
    payment_method: 'Nyole Pay'
  };
  if (isUuid(b.owner_id)) extendedPayload.owner_id = b.owner_id;

  // 1. Réservation en attente de paiement
  let insert = await supabase.from('bookings').insert({ ...corePayload, ...extendedPayload }).select('id').single();
  if (insert.error && isMissingColumnError(insert.error)) {
    console.warn('[nyole-checkout] Colonnes étendues absentes, insertion du schéma de base :', insert.error.message);
    insert = await supabase.from('bookings').insert(corePayload).select('id').single();
  }
  if (insert.error || !insert.data) {
    console.error('[nyole-checkout] Réservation non enregistrée :', insert.error?.message);
    return json({ error: "La réservation n'a pas pu être enregistrée. Veuillez réessayer." }, 500);
  }
  const bookingId = insert.data.id;

  // 2. Session de paiement Nyole (clé secrète)
  const origin = returnOrigin(req);
  const ref = encodeURIComponent(bookingRef);
  const nyoleRes = await fetch(`${NYOLE_BASE_URL}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NYOLE_SECRET_KEY}`,
      'Idempotency-Key': bookingRef
    },
    body: JSON.stringify({
      amount: total,
      currency: 'XOF',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      description: `Réservation Bénin Beyond #${bookingRef} — ${extendedPayload.listing_title}`.slice(0, 250),
      merchant_name: 'Bénin Beyond',
      success_url: `${origin}/checkout?payment_status=success&booking_ref=${ref}`,
      cancel_url: `${origin}/checkout?payment_status=cancelled&booking_ref=${ref}`,
      metadata: { booking_ref: bookingRef, booking_id: bookingId, source: 'benin_beyond_web' }
    })
  }).catch((err) => {
    console.error('[nyole-checkout] Nyole injoignable :', err);
    return null;
  });

  const session = nyoleRes ? await nyoleRes.json().catch(() => ({})) : {};
  if (!nyoleRes || !nyoleRes.ok || !session?.id || !session?.url) {
    console.error('[nyole-checkout] Échec création session Nyole :', nyoleRes?.status, session);
    // Pas de session : la réservation en attente ne doit pas bloquer les dates
    await supabase.from('bookings').delete().eq('id', bookingId);
    return json(
      { error: session?.message || session?.error || 'Impossible de contacter le service de paiement Nyole.' },
      502
    );
  }

  // 3. Rattachement de la session à la réservation (utilisé par nyole-webhook)
  const { error: linkError } = await supabase
    .from('bookings')
    .update({ nyole_session_id: session.id, nyole_order_id: session.order_id || null })
    .eq('id', bookingId);
  if (linkError) {
    // Le webhook signé retrouvera quand même la réservation via metadata.booking_ref
    console.error('[nyole-checkout] Session non rattachée (script SQL nyole_1 exécuté ?) :', linkError.message);
  }

  return json({ booking_ref: bookingRef, booking_id: bookingId, session_id: session.id, url: session.url });
}

// ##############################################################################
// TRADUCTION AUTOMATIQUE (DeepL)
// ##############################################################################
const DEEPL_API_KEY = (Deno.env.get('DEEPL_API_KEY') || '').trim();
const DEEPL_URL = DEEPL_API_KEY.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';
const MAX_TEXTS = 50;
const MAX_LENGTH = 5000;



async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function handleTranslate(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let texts: string[] = [];
  try {
    const body = await req.json();
    texts = Array.isArray(body?.texts) ? body.texts : [];
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }
  texts = texts
    .slice(0, MAX_TEXTS)
    .map((t) => (typeof t === 'string' ? t.slice(0, MAX_LENGTH) : ''));
  if (texts.length === 0) return json({ translations: [] });

  const hashes = await Promise.all(texts.map((t) => sha256(t)));
  const results: (string | null)[] = texts.map(() => null);

  // 1. Cache
  const { data: cached, error: cacheError } = await supabase
    .from('translations')
    .select('id, en')
    .in('id', [...new Set(hashes)]);
  if (cacheError) console.warn('[translate] Lecture du cache impossible :', cacheError.message);
  const cacheMap = new Map((cached || []).map((row: any) => [row.id, row.en]));
  hashes.forEach((h, i) => {
    if (!texts[i].trim()) results[i] = texts[i];
    else if (cacheMap.has(h)) results[i] = cacheMap.get(h) as string;
  });

  // 2. DeepL pour les textes jamais traduits
  const todo = [...new Set(results.map((r, i) => (r === null ? i : -1)).filter((i) => i >= 0).map((i) => texts[i]))];
  if (todo.length > 0 && DEEPL_API_KEY) {
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: todo, source_lang: 'FR', target_lang: 'EN-GB', preserve_formatting: true })
    }).catch((err) => {
      console.error('[translate] DeepL injoignable :', err);
      return null;
    });

    if (res?.ok) {
      const data = await res.json();
      const translated: string[] = (data?.translations || []).map((t: any) => t.text);
      const byText = new Map(todo.map((t, i) => [t, translated[i]]));
      const rows: { id: string; source: string; en: string }[] = [];
      texts.forEach((t, i) => {
        if (results[i] === null && byText.get(t)) {
          results[i] = byText.get(t)!;
          rows.push({ id: hashes[i], source: t, en: results[i]! });
        }
      });
      if (rows.length) {
        const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
        const { error } = await supabase.from('translations').upsert(unique, { onConflict: 'id', ignoreDuplicates: true });
        if (error) console.warn('[translate] Écriture du cache impossible :', error.message);
      }
    } else if (res) {
      console.error('[translate] Erreur DeepL', res.status, await res.text());
    }
  }

  // Texte non traduit (pas de clé, quota atteint…) : on renvoie l'original
  return json({ translations: results.map((r, i) => r ?? texts[i]) });
}

// ==============================================================================
// Aiguillage : /benin-beyond/<route>
// ==============================================================================
const ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  'nyole-checkout': handleNyoleCheckout,
  'nyole-webhook': handleNyoleWebhook,
  translate: handleTranslate
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop() || '';
  const handler = ROUTES[route];
  if (!handler) return json({ error: `Route inconnue : ${route}` }, 404);
  return handler(req);
});
