import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faLock,
  faXmark,
  faSpinner,
  faCheck,
  faArrowUpRightFromSquare,
  faMobileScreen,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '../data/initialListings';
import { checkNyoleSessionStatus } from '../services/nyoleService';

/**
 * NyolePaymentModal
 * Modal intégré de paiement Nyole pour Bénin Beyond.
 * Affiche l'interface de règlement officielle Nyole dans un modal responsive
 * et effectue un polling intelligent en temps réel pour valider la transaction
 * dès que le client valide le push USSD/OTP sur son téléphone.
 */
export function NyolePaymentModal({
  isOpen,
  onClose,
  sessionUrl,
  sessionId,
  amount,
  bookingRef,
  onSuccess,
  onCancel
}) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const pollingRef = useRef(null);
  const isCompletedRef = useRef(false);

  // Réinitialiser les états à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setIsVerifying(false);
      setPaymentCompleted(false);
      setVerificationError(null);
      setPollCount(0);
      isCompletedRef.current = false;
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [isOpen, sessionId]);

  // Écoute des messages envoyés depuis l'iframe de redirection
  useEffect(() => {
    const handleWindowMessage = (event) => {
      if (!isOpen || isCompletedRef.current) return;
      // N'accepter que les messages de notre propre site (page de retour) ou de la passerelle Nyole
      const trustedOrigin =
        event.origin === window.location.origin || /^https:\/\/([a-z0-9-]+\.)*nyole\.com$/i.test(event.origin);
      if (!trustedOrigin) return;
      if (event.data?.type === 'NYOLE_PAYMENT_SUCCESS' || event.data?.type === 'NYOLE_IFRAME_REDIRECT') {
        handleTriggerSuccess({ source: 'postMessage' });
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isOpen]);

  // Polling automatique en arrière-plan pour détecter la validation USSD/OTP
  useEffect(() => {
    if (!isOpen || !sessionId || sessionId === '{id}') return;

    const pollStatus = async () => {
      if (isCompletedRef.current) return;

      try {
        setPollCount((prev) => prev + 1);
        const res = await checkNyoleSessionStatus(sessionId);

        if (res.success && (res.paid || res.status === 'SUCCESS')) {
          handleTriggerSuccess(res.data);
        } else if (res.status === 'FAILED' || res.status === 'CANCELLED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setVerificationError(
            res.status === 'CANCELLED'
              ? 'Le paiement a été interrompu ou annulé.'
              : 'La transaction a été rejetée par l’opérateur.'
          );
        }
      } catch (e) {
        console.warn('[Nyole Modal Polling] notice:', e?.message || e);
      }
    };

    // Démarrer après 2 secondes pour laisser le temps au client d'initier la saisie
    const initialTimer = setTimeout(() => {
      pollStatus();
      pollingRef.current = setInterval(pollStatus, 2500);
    }, 2000);

    return () => {
      clearTimeout(initialTimer);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, sessionId]);

  const handleTriggerSuccess = (data) => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPaymentCompleted(true);
    setIsVerifying(false);

    // Déclencher le callback parent après animation visuelle
    setTimeout(() => {
      if (onSuccess) {
        onSuccess({ sessionId, statusData: data });
      }
    }, 1400);
  };

  const handleManualClose = () => {
    if (paymentCompleted) return;

    const confirmClose = window.confirm(
      'Souhaitez-vous fermer la fenêtre de paiement ?\nSi vous avez déjà validé la transaction sur votre téléphone, votre paiement sera automatiquement confirmé.'
    );

    if (confirmClose) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (onCancel) onCancel();
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg md:max-w-xl h-[88vh] max-h-[760px] bg-card rounded-2xl shadow-2xl border border-foreground/15 flex flex-col overflow-hidden animate-scale-up">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-3.5 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Paiement Sécurisé Nyole
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  SSL 256-bit
                </span>
              </div>
              <div className="text-[11px] text-foreground/55 font-mono">
                Réf: {bookingRef || 'Réservation'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-foreground/50">
                Montant total
              </div>
              <div className="font-heading text-sm font-bold text-primary">
                {formatPrice(amount || 0)}
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualClose}
              disabled={paymentCompleted}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
              title="Fermer"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Iframe Container */}
        <div className="relative flex-1 w-full bg-background overflow-hidden">
          {/* Success Overlay Animation */}
          {paymentCompleted && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card p-6 text-center animate-fade-in">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xl mb-4">
                <FontAwesomeIcon icon={faCheck} className="h-10 w-10 animate-bounce" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground">
                Paiement Validé avec Succès !
              </h3>
              <p className="mt-2 text-sm text-foreground/70 max-w-sm">
                Votre transaction de <strong>{formatPrice(amount)}</strong> a été confirmée par Nyole. Nous générons vos vouchers et factures officielles…
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-primary font-medium">
                <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                <span>Finalisation de votre réservation…</span>
              </div>
            </div>
          )}

          {/* Verification Error Overlay */}
          {verificationError && !paymentCompleted && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-8 w-8" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Paiement non abouti
              </h3>
              <p className="mt-2 text-xs text-foreground/70 max-w-xs leading-relaxed">
                {verificationError}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationError(null)}
                  className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={handleManualClose}
                  className="rounded-full border border-foreground/20 px-5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Shimmer Loader while iframe loads */}
          {iframeLoading && !paymentCompleted && !verificationError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card p-6 text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin" />
              </div>
              <h4 className="font-heading text-base font-semibold text-foreground">
                Chargement de la passerelle Nyole…
              </h4>
              <p className="mt-1 text-xs text-foreground/60 max-w-xs">
                Connexion sécurisée aux opérateurs MTN, Moov, Celtiis, Wave et Cartes bancaires.
              </p>
            </div>
          )}

          {/* Embedded Nyole Checkout Iframe */}
          {sessionUrl && (
            <iframe
              src={sessionUrl}
              title="Passerelle de paiement Nyole"
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              allow="payment; camera; microphone; geolocation"
            />
          )}
        </div>

        {/* Footer Info & Real-Time Sync Status */}
        <div className="border-t border-foreground/10 px-5 py-2.5 bg-muted/30 flex items-center justify-between text-xs text-foreground/65">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-foreground/70">
              Synchronisation instantanée avec votre téléphone
            </span>
          </div>

          {sessionUrl && (
            <a
              href={sessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
              title="Ouvrir dans un nouvel onglet"
            >
              <span>Plein écran</span>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
