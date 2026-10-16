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
import { checkDateAvailability } from '../services/bookingService';
import {
  startNyoleCheckout,
  verifyNyolePayment,
  savePendingCheckout,
  getPendingCheckout,
  clearPendingCheckout
} from '../services/nyoleService';
import { ScrollReveal } from '../components/ScrollReveal';
import { ConfirmModal } from '../components/ConfirmModal';
import { printInvoiceDocument } from '../utils/invoicePrinter';
import { useLanguage } from '../context/LanguageContext';

const processedNyoleCallbacks = new Set();

export function CheckoutPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, registerOrLoginClient } = useAuth();

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

  // Retour de Nyole (?payment_status=success / cancelled&booking_ref=...)
  // La réservation existe déjà côté serveur ; seul le serveur (fonction benin-beyond, route nyole-webhook,
  // après vérification auprès de Nyole) peut la marquer comme payée.
  useEffect(() => {
    const handleNyoleCallback = async () => {
      // Un même retour de paiement ne doit être traité qu'une fois (StrictMode, double rendu, F5)
      const callbackKey = window.location.search;
      if (processedNyoleCallbacks.has(callbackKey)) return;
      processedNyoleCallbacks.add(callbackKey);

      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get('payment_status');
      const pending = getPendingCheckout();
      const bookingRef = searchParams.get('booking_ref') || pending?.bookingRef || null;

      if (!paymentStatus) return;
      window.history.replaceState({}, '', window.location.pathname);

      if (paymentStatus === 'cancelled') {
        setPaymentCancelNotice(true);
        clearPendingCheckout();
        // Libère les dates si Nyole confirme l'annulation
        if (bookingRef) verifyNyolePayment(bookingRef).catch(() => {});
        return;
      }

      if (paymentStatus !== 'success') return;

      if (!bookingRef) {
        setPaymentVerificationError(
          t("Référence de réservation introuvable. Si votre compte a été débité, votre réservation sera confirmée automatiquement ; contactez le support Bénin Beyond en cas de doute.")
        );
        return;
      }

      setIsVerifyingPayment(true);
      setVerificationMessage(t("Validation de votre paiement auprès de Nyole…"));

      try {
        let result = await verifyNyolePayment(bookingRef);
        let retries = 0;
        while (result.booking?.payment_status !== 'paid' && result.nyoleStatus !== 'CANCELLED' && retries < 5) {
          retries++;
          setVerificationMessage(t('Confirmation en cours auprès du réseau de paiement ({n}/5)…', { n: retries }));
          await new Promise((resolve) => setTimeout(resolve, 2000));
          result = await verifyNyolePayment(bookingRef);
        }

        const booking = result.booking;
        if (booking?.payment_status === 'paid') {
          setConfirmedBooking(booking);
          clearCart();
          clearPendingCheckout();

          // Inscription et association automatique du compte Voyageur
          if (registerOrLoginClient && booking.customer_email) {
            try {
              registerOrLoginClient({
                name: booking.customer_name,
                email: booking.customer_email,
                phone: booking.customer_phone
              });
            } catch (e) {
              console.warn('Auto register client notice:', e);
            }
          }
        } else if (result.nyoleStatus === 'CANCELLED' || booking?.status === 'cancelled') {
          clearPendingCheckout();
          setPaymentVerificationError(
            t("Le paiement a été annulé ou rejeté par l’opérateur. Aucun débit n’a été effectué.")
          );
        } else {
          // Paiement pas encore confirmé : la réservation reste enregistrée et sera
          // confirmée automatiquement à réception de la notification Nyole.
          clearPendingCheckout();
          setPaymentVerificationError(
            t('Votre paiement est en cours de confirmation. Votre réservation {ref} est bien enregistrée et sera confirmée automatiquement dès que Nyole nous notifie le règlement. Inutile de payer à nouveau.', { ref: bookingRef })
          );
        }
      } catch (err) {
        console.error('[Nyole Callback Error]:', err);
        setPaymentVerificationError(
          t('Impossible de vérifier le paiement pour le moment. Votre réservation {ref} est enregistrée et sera confirmée automatiquement dès réception du paiement.', { ref: bookingRef })
        );
      } finally {
        setIsVerifyingPayment(false);
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

  const finalTotal = subtotal;

  // Launch Nyole Checkout Session
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!customer.name || !customer.phone) {
      setAlertModal({
        isOpen: true,
        title: t("Informations requises"),
        message: t("Veuillez renseigner votre nom complet et votre numéro de téléphone pour pouvoir finaliser le règlement.")
      });
      return;
    }

    setIsSubmitting(true);
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
          title: t("Bien déjà réservé sur cette période"),
          message: t('Le bien « {title} » a déjà été réservé par un autre voyageur du {start} au {end}. Aucun débit n’a été effectué. Veuillez modifier vos dates pour continuer.', { title: firstItem.title, start: checkRes.conflict.startDate, end: checkRes.conflict.endDate })
        });
        return;
      }
    }

    const payload = {
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
      subtotal: subtotal,
      options_total: 0,
      total_amount: finalTotal
    };

    // Réservation enregistrée côté serveur (en attente de paiement) + session Nyole
    const checkoutRes = await startNyoleCheckout(payload);

    if (checkoutRes.success && checkoutRes.url) {
      // Mémorisation de la référence pour la vérification au retour
      savePendingCheckout({
        sessionId: checkoutRes.sessionId,
        bookingRef: checkoutRes.bookingRef,
        timestamp: Date.now()
      });

      // Redirection directe vers la passerelle officielle Nyole (plein écran, sans conteneur bloquant)
      window.location.href = checkoutRes.url;
    } else {
      setIsSubmitting(false);
      setAlertModal({
        isOpen: true,
        title: t("Initialisation du paiement Nyole"),
        message:
          checkoutRes.error ||
          t("Une erreur est survenue lors de l’initialisation de votre session de paiement sécurisé Nyole. Veuillez réessayer dans quelques instants.")
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
          {t("Sécurisation de votre réservation")}
        </h1>
        <div className="mt-4 rounded-2xl bg-card border-2 border-primary/30 p-4 shadow-lg">
          <p className="text-foreground text-base sm:text-lg font-bold leading-relaxed">
            {verificationMessage || 'Validation immédiate de votre réservation auprès de Nyole…'}
          </p>
          <p className="text-foreground/80 text-xs sm:text-sm font-medium mt-1">
            {t("Veuillez ne pas fermer cette fenêtre. Nous finalisons vos vouchers officiels.")}
          </p>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-5 py-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-bold shadow-sm">
          <FontAwesomeIcon icon={faLock} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t("Passerelle Sécurisée Nyole Pay — Chiffrement bancaire SSL")}</span>
        </div>
      </div>
    );
  }

  // Case 1: Empty cart and not confirmed
  if (items.length === 0 && !confirmedBooking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-32 text-center md:px-12">
        <h1 className="section-title text-3xl">{t("Aucune réservation à finaliser")}</h1>
        <p className="mt-3 text-foreground/60">
          {t("Votre panier est actuellement vide. Choisissez vos expériences pour procéder au règlement.")}
        </p>
        <Link to="/explore" className="mt-6 inline-block text-primary font-medium hover:underline">
          {t("← Retour au catalogue")}
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
            <h1 className="section-title mt-5 text-3xl">{t("Réservation confirmée")}</h1>
            <p className="mt-2 text-sm text-secondary-foreground/75">
              {t("Votre itinéraire et votre voucher officiel sont enregistrés pour")} <strong>{confirmedBooking.customer_email || customer.email}</strong>.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3.5 py-1 text-xs text-accent font-medium">
              <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
              <span>{t("Paiement validé avec succès via Nyole Pay")}</span>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <span className="caption text-foreground/50">{t("Itinéraire")}</span>
              <span className="font-mono text-base font-bold text-primary">
                {confirmedBooking.booking_ref}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-xs text-foreground/50 uppercase tracking-wider font-semibold mb-3">
                {t("Prestations réservées")}
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
              <span className="font-semibold text-foreground">{t("Mode de paiement")}</span>
              <span className="font-medium text-foreground/80 text-sm">
                {confirmedBooking.payment_method || 'Nyole Pay'}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">{t("Total réglé")}</span>
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
                    {t("Connectez-vous pour accéder à votre Espace Voyageur")}
                  </h3>
                  <p className="mt-2 text-sm text-foreground font-medium leading-relaxed">
                    {t("Votre réservation")} <strong>{confirmedBooking.booking_ref}</strong> {t("est validée. Connectez-vous avec l'adresse")} <strong>{confirmedBooking.customer_email || customer.email}</strong> {t("pour accéder à vos codes d'accès, le QR code de confirmation et suivre votre prestation en temps réel.")}
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-card border border-foreground/15 shadow-sm">
                    <span className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                      {!isCountdownPaused
                        ? t('Redirection vers la connexion dans {n} s…', { n: redirectCountdown })
                        : t("Redirection suspendue.")}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isCountdownPaused && (
                        <button
                          type="button"
                          onClick={() => setIsCountdownPaused(true)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-foreground/20 hover:bg-muted text-foreground/80 transition-colors"
                        >
                          {t("Mettre en pause")}
                        </button>
                      )}
                      <Link
                        to={`/login?email=${encodeURIComponent(confirmedBooking.customer_email || customer.email || '')}&fromCheckout=true`}
                        className="text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>{t("Se connecter pour suivre")}</span>
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
                <span>{t("Imprimer / Télécharger le voucher & facture")}</span>
              </button>

              <Link to={`/login?email=${encodeURIComponent(confirmedBooking.customer_email || customer.email || '')}&fromCheckout=true`} className="flex-1">
                <button className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                  <span>{t("Se connecter à mon espace voyageur")}</span>
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
              <p className="font-bold text-base text-amber-900 dark:text-amber-300">{t("Paiement interrompu")}</p>
              <p className="text-sm font-medium text-foreground">{t("Vous avez interrompu le règlement sur la passerelle Nyole. Aucun montant n’a été débité.")}</p>
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
              <p className="font-bold text-base text-rose-900 dark:text-rose-300">{t("Information sur votre transaction")}</p>
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
              {t("Paiement Sécurisé")}
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              {t("Finalisez votre réservation en toute sécurité avec la passerelle officielle Nyole.")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            <FontAwesomeIcon icon={faLock} className="h-3 w-3" />
            <span>{t("Passerelle Nyole Active")}</span>
          </div>
        </div>
      </ScrollReveal>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Accordion Steps */}
        <div className="space-y-4">
          {/* Coordonnées du voyageur */}
          <ScrollReveal delay={80} y={20} className="overflow-hidden rounded-xl border border-foreground/10 bg-card">
            <div className="px-6 py-4">
              <span className="font-heading font-semibold text-base">{t("Identité du voyageur")}</span>
            </div>
            <div className="border-t border-foreground/10 p-6 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block">
                      <span className="caption text-foreground/50">{t("Nom complet")}</span>
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
                      <span className="caption text-foreground/50">{t("Téléphone Mobile Money (avec indicatif)")}</span>
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
                      <span className="caption text-foreground/50">{t("Email (pour la facture & le voucher)")}</span>
                      <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder={t('vous@email.com')}
                        className="mt-1.5 w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  </div>
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
                      <span>{t("Redirection vers la passerelle Nyole…")}</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faLock} className="h-4 w-4" />
                      <span>{t('Payer {amount} avec Nyole', { amount: formatPrice(finalTotal) })}</span>
                    </>
                  )}
                </button>
            </div>
          </ScrollReveal>
        </div>

        {/* Right Summary Column */}
        <div className="lg:sticky lg:top-8 lg:h-fit">
          <ScrollReveal delay={120} y={24} scale={0.97} className="rounded-xl border border-foreground/10 bg-card p-6 shadow-xl shadow-foreground/5">
            <h2 className="caption text-foreground/50">{t("Détail de la commande")}</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-foreground/80">
                <span>{t('Prestations')} ({items.length})</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-foreground/80">
                <span>{t("Frais de conciergerie")}</span>
                <span className="text-emerald-700 font-medium">{t("0 FCFA (Inclus)")}</span>
              </div>

              <div className="flex justify-between text-foreground/80">
                <span>{t("Passerelle de paiement")}</span>
                <span className="text-primary font-semibold">Nyole Pay</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-baseline border-t border-foreground/10 pt-4">
              <span className="font-semibold text-foreground">{t("Total à régler")}</span>
              <span className="font-heading text-2xl font-bold text-primary">
                {formatPrice(finalTotal)}
              </span>
            </div>

            <div className="mt-6 border-t border-foreground/10 pt-4 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-emerald-600" />
                <span>{t("Paiement garanti sans frais cachés")}</span>
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
        confirmText={t("J'ai compris")}
        isAlert={true}
        variant="warning"
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}
