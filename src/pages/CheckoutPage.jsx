import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faPrint,
  faLocationDot,
  faShieldHalved,
  faArrowRight,
  faLock,
  faSpinner,
  faCircleCheck,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { createBooking, getBookings, checkDateAvailability } from '../services/bookingService';
import {
  createNyoleCheckoutSession,
  checkNyoleSessionStatus,
  savePendingCheckout,
  getPendingCheckout,
  clearPendingCheckout,
  isNyoleConfigured
} from '../services/nyoleService';
import { ScrollReveal } from '../components/ScrollReveal';
import { ConfirmModal } from '../components/ConfirmModal';
import { printInvoiceDocument } from '../utils/invoicePrinter';

const STEPS = ['Identité', 'Protection'];

const PROTECTION_OPTIONS = [
  {
    id: 'cancel',
    label: 'Annulation flexible',
    price: 5000,
    desc: "Remboursement garanti jusqu'à 24h avant le début."
  },
  {
    id: 'damage',
    label: 'Protection dommages',
    price: 7500,
    desc: 'Couverture intégrale véhicules & logements.'
  }
];


const processedNyoleCallbacks = new Set();

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, registerOrLoginClient } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});

  const [customer, setCustomer] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);

  // Nyole verification state
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [paymentCancelNotice, setPaymentCancelNotice] = useState(false);
  const [paymentVerificationError, setPaymentVerificationError] = useState(null);

  // Sync customer info when user signs in
  useEffect(() => {
    if (user) {
      setCustomer((prev) => ({
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  // Handle Nyole Return Callback (?payment_status=success / cancelled)
  useEffect(() => {
    const handleNyoleCallback = async () => {
      // Un même retour de paiement ne doit être traité qu'une fois (StrictMode, double rendu, F5)
      const callbackKey = window.location.search;
      if (processedNyoleCallbacks.has(callbackKey)) return;
      processedNyoleCallbacks.add(callbackKey);

      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get('payment_status');
      const rawSessionId = searchParams.get('session_id');
      const urlBookingRef = searchParams.get('booking_ref');

      if (!paymentStatus) return;

      if (paymentStatus === 'cancelled') {
        setPaymentCancelNotice(true);
        clearPendingCheckout();
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (paymentStatus === 'success') {
        setIsVerifyingPayment(true);
        setVerificationMessage('Connexion à la passerelle sécurisée Nyole…');

        const pending = getPendingCheckout();
        const sessionId =
          rawSessionId && rawSessionId !== '{id}' ? rawSessionId : pending?.sessionId;

        if (!sessionId) {
          // Si nous avons la référence de réservation, vérifions si elle est déjà enregistrée
          if (urlBookingRef) {
            try {
              const all = await getBookings();
              const existing = all.find((b) => b.booking_ref === urlBookingRef);
              if (existing) {
                setConfirmedBooking(existing);
                clearCart();
                clearPendingCheckout();
                setIsVerifyingPayment(false);
                window.history.replaceState({}, '', window.location.pathname);
                return;
              }
            } catch (e) {
              console.warn('Erreur récupération booking existant:', e);
            }
          }

          setPaymentVerificationError(
            'Identifiant de session de paiement non trouvé. Si votre compte a été débité, contactez le support Bénin Beyond avec votre référence.'
          );
          setIsVerifyingPayment(false);
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        try {
          // Synchronisation du statut auprès de Nyole
          setVerificationMessage('Validation immédiate de votre réservation auprès de Nyole…');
          let statusRes = await checkNyoleSessionStatus(sessionId);
          let retries = 0;

          // Tentative rapide de synchronisation du statut réseau
          while ((!statusRes.success || statusRes.status === 'PENDING') && retries < 3) {
            retries++;
            setVerificationMessage(
              `Confirmation en cours auprès du réseau télécoms (${retries}/3)…`
            );
            await new Promise((resolve) => setTimeout(resolve, 1500));
            statusRes = await checkNyoleSessionStatus(sessionId);
          }

          // Si Nyole signale explicitement un échec ou une annulation
          if (statusRes.status === 'FAILED' || statusRes.status === 'CANCELLED') {
            setPaymentVerificationError(
              'Le paiement a été rejeté ou interrompu par l’opérateur. Aucun débit n’a été effectué.'
            );
            clearPendingCheckout();
            return;
          }

          // Seul un statut payé renvoyé par Nyole confirme la réservation. Sinon (en attente,
          // serveur injoignable) elle est enregistrée "en attente / non payée" pour vérification.
          const paymentConfirmed = Boolean(statusRes.success && statusRes.paid);
          const bookingStatus = paymentConfirmed ? 'confirmed' : 'pending';
          const bookingPaymentStatus = paymentConfirmed ? 'paid' : 'unpaid';
          const providerName = statusRes.data?.provider || 'Mobile Money / Carte';
          let payloadToConfirm = pending?.payload;

          // Fallback si la session locale n'a pas survécu
          if (!payloadToConfirm && items.length > 0) {
            const firstItem = items[0] || {};
            const isVehicle =
              firstItem.type === 'drive' ||
              firstItem.rental_type === 'drive' ||
              firstItem.price_unit === 'jour';

            payloadToConfirm = {
              booking_ref: urlBookingRef || `BB-${Math.floor(Math.random() * 900000 + 100000)}`,
              customer_name: customer.name || user?.name || 'Voyageur Bénin Beyond',
              customer_email: (customer.email || user?.email || 'voyageur@beninbeyond.com').trim().toLowerCase(),
              customer_phone: customer.phone || user?.phone || '+229 00 00 00 00',
              items: items,
              rental_type: isVehicle ? 'drive' : (firstItem.rental_type || firstItem.type || 'stay'),
              duration_days: isVehicle ? (firstItem.days || 1) : null,
              rooms_count: isVehicle ? 0 : (firstItem.rooms_count || 1),
              listing_id: firstItem.listing_id || firstItem.id || null,
              listing_title: firstItem.title || 'Réservation Bénin Beyond',
              listing_image: firstItem.image || firstItem.image_url || '',
              location: firstItem.location || 'Cotonou, Bénin',
              dates: firstItem.startDate && firstItem.endDate ? `Du ${firstItem.startDate} au ${firstItem.endDate}` : 'Prestation validée',
              start_date: firstItem.startDate || null,
              end_date: firstItem.endDate || null,
              guests: firstItem.guests ? `${firstItem.guests} voyageur(s)` : '1 voyageur',
              subtotal: subtotal,
              options_total: optionsTotal,
              total_amount: finalTotal,
              gross_amount: finalTotal,
              status: 'confirmed'
            };
          }

          if (payloadToConfirm) {
            const enrichedPayload = {
              ...payloadToConfirm,
              status: bookingStatus,
              payment_status: bookingPaymentStatus,
              payment_method: `Nyole (${providerName})`,
              nyole_session_id: sessionId,
              nyole_order_id: statusRes.data?.order_id || null,
              nyole_provider: providerName
            };

            const createRes = await createBooking(enrichedPayload);
            if (createRes.success && !paymentConfirmed) {
              clearPendingCheckout();
              setPaymentVerificationError(
                `Votre paiement n'a pas encore été confirmé par Nyole. La réservation ${createRes.booking.booking_ref} est enregistrée en attente et sera validée dès réception du paiement. Si vous avez été débité, contactez le support avec cette référence.`
              );
            } else if (createRes.success) {
              setConfirmedBooking(createRes.booking);
              clearCart();
              clearPendingCheckout();

              // Inscription et association automatique du compte Voyageur
              if (registerOrLoginClient && enrichedPayload.customer_email) {
                try {
                  registerOrLoginClient({
                    name: enrichedPayload.customer_name,
                    email: enrichedPayload.customer_email,
                    phone: enrichedPayload.customer_phone
                  });
                } catch (e) {
                  console.warn('Auto register client notice:', e);
                }
              }
            } else {
              setPaymentVerificationError(
                'Votre paiement a bien été validé, mais la finalisation a rencontré un bref délai. Vos justificatifs sont sauvegardés.'
              );
            }
          } else {
            // Vérifier si la réservation existe déjà dans la base
            const allBookings = await getBookings();
            const found = allBookings.find(
              (b) => b.booking_ref === (urlBookingRef || pending?.bookingRef) || b.nyole_session_id === sessionId
            );
            if (found) {
              setConfirmedBooking(found);
              clearCart();
              clearPendingCheckout();
            } else {
              const targetRef = urlBookingRef || pending?.bookingRef || `BB-${String(Date.now()).slice(-6)}`;
              const directBooking = {
                booking_ref: targetRef,
                customer_name: user?.name || customer.name || 'Voyageur Bénin Beyond',
                customer_email: (user?.email || customer.email || 'voyageur@beninbeyond.com').trim().toLowerCase(),
                customer_phone: user?.phone || customer.phone || '',
                status: bookingStatus,
                payment_status: bookingPaymentStatus,
                payment_method: `Nyole (${providerName})`,
                nyole_session_id: sessionId,
                items: [],
                total_amount: Number(statusRes.data?.amount || finalTotal || 0)
              };
              const createRes = await createBooking(directBooking);
              if (createRes.success && !paymentConfirmed) {
                clearPendingCheckout();
                setPaymentVerificationError(
                  `Votre paiement n'a pas encore été confirmé par Nyole. La réservation ${createRes.booking.booking_ref} est enregistrée en attente. Si vous avez été débité, contactez le support avec cette référence.`
                );
              } else if (createRes.success) {
                setConfirmedBooking(createRes.booking);
                clearCart();
                clearPendingCheckout();
              }
            }
          }
        } catch (err) {
          console.error('[Nyole Callback Error]:', err);
          const pending = getPendingCheckout();
          if (pending?.payload) {
            // Paiement non vérifiable : on garde la réservation, mais en attente de confirmation
            const enriched = {
              ...pending.payload,
              status: 'pending',
              payment_status: 'unpaid',
              payment_method: 'Nyole Pay (à vérifier)',
              nyole_session_id: sessionId
            };
            const fallbackCreate = await createBooking(enriched);
            if (fallbackCreate.success) {
              clearPendingCheckout();
              setPaymentVerificationError(
                `Le serveur de paiement Nyole est momentanément injoignable. La réservation ${fallbackCreate.booking.booking_ref} est enregistrée en attente de vérification. Si vous avez été débité, contactez le support avec cette référence.`
              );
              return;
            }
          }
          setPaymentVerificationError(
            'Impossible de joindre le serveur de validation Nyole. Vos justificatifs sont sauvegardés.'
          );
        } finally {
          setIsVerifyingPayment(false);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    handleNyoleCallback();
  }, []); // Run once on mount

  // Auto redirect countdown on confirmation screen vers la page de connexion
  useEffect(() => {
    if (confirmedBooking && !isCountdownPaused) {
      if (redirectCountdown <= 0) {
        const loginEmail = confirmedBooking.customer_email || customer.email || '';
        navigate(`/login?email=${encodeURIComponent(loginEmail)}&fromCheckout=true`, { replace: true });
        return;
      }
      const timer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [confirmedBooking, redirectCountdown, isCountdownPaused, navigate]);

  // Calculate options total
  const optionsTotal = PROTECTION_OPTIONS.reduce(
    (sum, opt) => sum + (selectedOptions[opt.id] ? opt.price : 0),
    0
  );
  const finalTotal = subtotal + optionsTotal;

  const toggleOption = (id) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleNextStep = () => {
    setActiveStep((prev) => Math.min(1, prev + 1));
  };

  // Launch Nyole Checkout Session
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customer.name || !customer.phone) {
      setActiveStep(0);
      setAlertModal({
        isOpen: true,
        title: 'Informations requises',
        message: 'Veuillez renseigner votre nom complet et votre numéro de téléphone pour pouvoir finaliser le règlement.'
      });
      return;
    }

    setIsSubmitting(true);
    const bookingRef = `BB-${Math.floor(Math.random() * 900000 + 100000)}`;
    const clientEmail = (customer.email || 'voyageur@beninbeyond.com').trim().toLowerCase();

    // Activation automatique du compte Voyageur au moment de l'achat
    if (registerOrLoginClient) {
      registerOrLoginClient({
        name: customer.name,
        email: clientEmail,
        phone: customer.phone
      });
    }

    const firstItem = items[0] || {};
    const isVehicleBooking =
      firstItem.type === 'drive' ||
      firstItem.rental_type === 'drive' ||
      firstItem.price_unit === 'jour';
    const formattedDates =
      firstItem.startDate && firstItem.endDate
        ? `Du ${firstItem.startDate} au ${firstItem.endDate}`
        : firstItem.days
        ? `${firstItem.days} jour(s)`
        : firstItem.nights
        ? `${firstItem.nights} nuit(s)`
        : 'Séjour / Prestation';

    const formattedGuests = firstItem.guests ? `${firstItem.guests} voyageur(s)` : '1 voyageur';

    // Vérification stricte anti-doublon : empêcher tout paiement si le bien a déjà été réservé sur ces dates
    if (firstItem.listing_id || firstItem.listingId || firstItem.id) {
      const targetListingId = firstItem.listing_id || firstItem.listingId || firstItem.id;
      const checkRes = await checkDateAvailability(targetListingId, firstItem.startDate, firstItem.endDate);
      if (!checkRes.isAvailable && checkRes.conflict) {
        setIsSubmitting(false);
        setAlertModal({
          isOpen: true,
          title: 'Bien déjà réservé sur cette période',
          message: `Le bien "${firstItem.title}" a déjà été réservé et payé par un autre voyageur du ${checkRes.conflict.startDate} au ${checkRes.conflict.endDate}. Aucun débit n’a été effectué. Veuillez modifier vos dates pour continuer.`
        });
        return;
      }
    }

    const payload = {
      booking_ref: bookingRef,
      customer_name: customer.name,
      customer_email: clientEmail,
      customer_phone: customer.phone,
      items: items,
      rental_type: isVehicleBooking ? 'drive' : (firstItem.rental_type || firstItem.type || 'stay'),
      duration_days: isVehicleBooking ? (firstItem.days || 1) : null,
      rooms_count: isVehicleBooking ? 0 : (firstItem.rooms_count || 1),
      listing_id: firstItem.listing_id || firstItem.listingId || firstItem.id || null,
      listing_title: firstItem.title || 'Réservation Bénin Beyond',
      listing_image:
        firstItem.image ||
        firstItem.image_url ||
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      location: firstItem.location || 'Cotonou, Bénin',
      dates: formattedDates,
      start_date: firstItem.startDate || null,
      end_date: firstItem.endDate || null,
      check_in: firstItem.startDate || null,
      check_out: firstItem.endDate || null,
      guests: formattedGuests,
      owner_id: firstItem.owner_id || null,
      owner_name: firstItem.owner_name || null,
      owner_email: firstItem.owner_email || null,
      protection_options: selectedOptions,
      payment_method: 'Nyole Pay',
      subtotal: subtotal,
      options_total: optionsTotal,
      total_amount: finalTotal,
      gross_amount: finalTotal,
      status: 'confirmed'
    };

    // Création session Nyole officielle
    const sessionRes = await createNyoleCheckoutSession({
      amount: finalTotal,
      bookingRef,
      customerName: customer.name,
      customerEmail: clientEmail,
      customerPhone: customer.phone,
      description: `Réservation Bénin Beyond #${bookingRef} — ${firstItem.title || 'Prestations'}`,
      metadata: {
        items_count: items.length
      }
    });

    if (sessionRes.success && sessionRes.session?.url) {
      // Mémorisation de la commande en attente pour la vérification au retour
      savePendingCheckout({
        sessionId: sessionRes.session.id,
        bookingRef,
        payload,
        timestamp: Date.now()
      });

      // Redirection directe vers la passerelle officielle Nyole (plein écran, sans conteneur bloquant)
      window.location.href = sessionRes.session.url;
    } else {
      setIsSubmitting(false);
      setAlertModal({
        isOpen: true,
        title: 'Initialisation du paiement Nyole',
        message:
          sessionRes.error ||
          'Une erreur est survenue lors de l’initialisation de votre session de paiement sécurisé Nyole. Veuillez réessayer dans quelques instants.'
      });
    }
  };

  // Case: Verification Loader State
  if (isVerifyingPayment) {
    return (
      <div className="mx-auto max-w-xl px-6 py-32 text-center md:px-12">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-lg">
            <FontAwesomeIcon icon={faSpinner} className="h-10 w-10 animate-spin" />
          </div>
        </div>
        <h1 className="section-title text-2xl md:text-3xl font-extrabold text-foreground">
          Sécurisation de votre réservation
        </h1>
        <div className="mt-4 rounded-2xl bg-card border-2 border-primary/30 p-4 shadow-lg">
          <p className="text-foreground text-base sm:text-lg font-bold leading-relaxed">
            {verificationMessage || 'Validation immédiate de votre réservation auprès de Nyole…'}
          </p>
          <p className="text-foreground/80 text-xs sm:text-sm font-medium mt-1">
            Veuillez ne pas fermer cette fenêtre. Nous finalisons vos vouchers officiels.
          </p>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-5 py-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-bold shadow-sm">
          <FontAwesomeIcon icon={faLock} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Passerelle Sécurisée Nyole Pay — Chiffrement bancaire SSL</span>
        </div>
      </div>
    );
  }

  // Case 1: Empty cart and not confirmed
  if (items.length === 0 && !confirmedBooking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center md:px-12">
        <h1 className="section-title text-3xl">Aucune réservation à finaliser</h1>
        <p className="mt-3 text-foreground/60">
          Votre panier est actuellement vide. Choisissez vos expériences pour procéder au règlement.
        </p>
        <Link to="/explore" className="mt-6 inline-block text-primary font-medium hover:underline">
          ← Retour au catalogue
        </Link>
      </div>
    );
  }

  // Case 2: Confirmation screen
  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12">
        <ScrollReveal delay={0} y={24} scale={0.96} className="printable-receipt overflow-hidden rounded-2xl border border-foreground/10 bg-card shadow-2xl shadow-foreground/5">
          {/* Header Banner */}
          <div className="bg-secondary px-8 py-10 text-center text-secondary-foreground">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
              <FontAwesomeIcon icon={faCheck} className="h-8 w-8" />
            </div>
            <h1 className="section-title mt-5 text-3xl">Réservation confirmée</h1>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              Votre itinéraire et votre voucher officiel sont enregistrés pour <strong>{confirmedBooking.customer_email || customer.email}</strong>.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3.5 py-1 text-xs text-accent font-medium">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
              <span>Paiement validé avec succès via Nyole Pay</span>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <span className="caption text-foreground/50">Itinéraire</span>
              <span className="font-mono text-base font-bold text-primary">
                {confirmedBooking.booking_ref}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs text-foreground/50 uppercase tracking-wider font-semibold mb-3">
                Prestations réservées
              </p>
              <ul className="space-y-3">
                {(confirmedBooking.items || []).map((it, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm py-1">
                    <span className="flex items-center gap-2 text-foreground/90 font-medium">
                      <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-accent" />
                      {it.title}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatPrice((it.price || 0) * (it.nights || it.days || it.qty || 1))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Mode de paiement</span>
              <span className="font-medium text-foreground/80 text-sm">
                {confirmedBooking.payment_method || 'Nyole Pay'}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Total réglé</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(confirmedBooking.total_amount || finalTotal)}
              </span>
            </div>

            <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-primary/10 p-6 shadow-md animate-fadeIn">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/20 p-3 text-primary text-xl shrink-0">
                  <FontAwesomeIcon icon={faShieldHalved} />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    Connectez-vous pour accéder à votre Espace Voyageur
                  </h3>
                  <p className="mt-2 text-sm text-foreground font-medium leading-relaxed">
                    Votre réservation <strong>{confirmedBooking.booking_ref}</strong> est validée. Connectez-vous avec l'adresse <strong>{confirmedBooking.customer_email || customer.email}</strong> pour accéder à vos codes d'accès, le QR code de confirmation et suivre votre prestation en temps réel.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-card border border-foreground/15 shadow-sm">
                    <span className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                      {!isCountdownPaused
                        ? `Redirection vers la connexion dans ${redirectCountdown} seconde${redirectCountdown > 1 ? 's' : ''}...`
                        : 'Redirection suspendue.'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isCountdownPaused && (
                        <button
                          type="button"
                          onClick={() => setIsCountdownPaused(true)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-foreground/20 hover:bg-muted text-foreground/80 transition-colors"
                        >
                          Mettre en pause
                        </button>
                      )}
                      <Link
                        to={`/login?email=${encodeURIComponent(confirmedBooking.customer_email || customer.email || '')}&fromCheckout=true`}
                        className="text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Se connecter pour suivre</span>
                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row no-print">
              <button
                type="button"
                onClick={() => {
                  setIsCountdownPaused(true);
                  if (confirmedBooking) {
                    printInvoiceDocument(confirmedBooking, customer || user);
                  } else {
                    window.print();
                  }
                }}
                className="flex-1 rounded-full border border-foreground/20 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faPrint} className="h-4 w-4" />
                <span>Imprimer / Télécharger le voucher & facture</span>
              </button>

              <Link to={`/login?email=${encodeURIComponent(confirmedBooking.customer_email || customer.email || '')}&fromCheckout=true`} className="flex-1">
                <button className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  <span>Se connecter à mon espace voyageur</span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  // Case 3: 3-step checkout flow
  return (
    <div className="mx-auto max-w-8xl px-6 py-12 md:px-12 md:py-16">
      {/* Alert Notices */}
      {paymentCancelNotice && (
        <div className="mb-6 rounded-2xl border-2 border-amber-500/40 bg-amber-500/15 p-5 text-base font-semibold text-amber-950 dark:text-amber-100 flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold text-base text-amber-900 dark:text-amber-300">Paiement interrompu</p>
              <p className="text-sm font-medium text-foreground">Vous avez interrompu le règlement sur la passerelle Nyole. Aucun montant n’a été débité.</p>
            </div>
          </div>
          <button
            onClick={() => setPaymentCancelNotice(false)}
            className="ml-4 font-bold text-lg p-1 text-foreground/60 hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {paymentVerificationError && (
        <div className="mb-6 rounded-2xl border-2 border-rose-500/40 bg-rose-500/15 p-5 text-base font-semibold text-rose-950 dark:text-rose-100 flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold text-base text-rose-900 dark:text-rose-300">Information sur votre transaction</p>
              <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">{paymentVerificationError}</p>
            </div>
          </div>
          <button
            onClick={() => setPaymentVerificationError(null)}
            className="ml-4 font-bold text-lg p-1 text-foreground/60 hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      <ScrollReveal delay={0} y={20}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-foreground/15 pt-6 gap-3">
          <div>
            <h1 className="section-title text-3xl md:text-4xl">
              Paiement Sécurisé
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Finalisez votre réservation en toute sécurité avec la passerelle officielle Nyole.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            <FontAwesomeIcon icon={faLock} className="h-3 w-3" />
            <span>Passerelle Nyole Active</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Stepper Breadcrumb */}
      <ScrollReveal delay={40} y={15} className="mt-6 flex items-center gap-3">
        {STEPS.map((label, idx) => (
          <React.Fragment key={label}>
            <button
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                idx === activeStep ? 'text-primary' : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  idx === activeStep
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-foreground/70'
                }`}
              >
                {idx + 1}
              </span>
              <span>{label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="h-px w-8 bg-foreground/15 hidden sm:block" />
            )}
          </React.Fragment>
        ))}
      </ScrollReveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Accordion Steps */}
        <div className="space-y-4">
          {/* Step 1: Identité */}
          <ScrollReveal delay={80} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <button
              onClick={() => setActiveStep(0)}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  1
                </span>
                <span className="font-heading font-semibold text-base">Identité du voyageur</span>
              </span>
            </button>

            {activeStep === 0 && (
              <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block">
                      <span className="caption text-foreground/50">Nom complet</span>
                      <input
                        type="text"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Koffi Adjovi"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                        required
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block">
                      <span className="caption text-foreground/50">Téléphone Mobile Money (avec indicatif)</span>
                      <input
                        type="tel"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="+229 01 00 00 00"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                        required
                      />
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block">
                      <span className="caption text-foreground/50">Email (pour la facture & le voucher)</span>
                      <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="vous@email.com"
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                >
                  Continuer vers les options
                </button>
              </div>
            )}
          </ScrollReveal>

          {/* Step 2: Protection & Options */}
          <ScrollReveal delay={140} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <button
              onClick={() => setActiveStep(1)}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/20 transition-colors"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  2
                </span>
                <span className="font-heading font-semibold text-base">Protections & assurances</span>
              </span>
            </button>

            {activeStep === 1 && (
              <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="space-y-3">
                  {PROTECTION_OPTIONS.map((opt) => {
                    const isChecked = Boolean(selectedOptions[opt.id]);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                          isChecked
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-foreground/15 hover:border-foreground/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOption(opt.id)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary accent-primary"
                          />
                          <div>
                            <div className="font-heading text-sm font-semibold text-foreground">
                              {opt.label}
                            </div>
                            <div className="text-xs text-foreground/60">{opt.desc}</div>
                          </div>
                        </div>
                        <span className="font-heading text-sm font-bold text-primary">
                          +{formatPrice(opt.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="mt-6 w-full rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin" />
                      <span>Redirection vers la passerelle Nyole…</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                      <span>Payer {formatPrice(finalTotal)} avec Nyole</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </ScrollReveal>
        </div>

        {/* Right Summary Column */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <ScrollReveal delay={120} y={24} scale={0.97} className="rounded-xl border border-foreground/10 bg-card p-6 shadow-xl shadow-foreground/5">
            <h2 className="caption text-foreground/50">Détail de la commande</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-foreground/80">
                <span>Prestations ({items.length})</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {optionsTotal > 0 && (
                <div className="flex justify-between text-foreground/80">
                  <span>Protections choisies</span>
                  <span className="font-medium text-primary">+{formatPrice(optionsTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-foreground/80">
                <span>Frais de conciergerie</span>
                <span className="text-emerald-700 font-medium">0 FCFA (Inclus)</span>
              </div>

              <div className="flex justify-between text-foreground/80">
                <span>Passerelle de paiement</span>
                <span className="text-primary font-semibold">Nyole Pay</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-baseline border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">Total à régler</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(finalTotal)}
              </span>
            </div>

            <div className="mt-6 border-t border-foreground/10 pt-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-emerald-600" />
                <span>Paiement garanti sans frais cachés</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Modal d'Alerte Pro */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="J'ai compris"
        isAlert={true}
        variant="warning"
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}
