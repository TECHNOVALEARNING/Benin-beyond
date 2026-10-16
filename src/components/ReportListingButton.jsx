import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFlag, faXmark, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { REPORT_REASONS, submitListingReport } from '../services/reportService';
import { useLanguage } from '../context/LanguageContext';

/**
 * Lien discret « Signaler cette annonce » + fenêtre de signalement.
 */
export function ReportListingButton({ listingId, listingTitle }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const close = () => {
    setIsOpen(false);
    setReason('');
    setMessage('');
    setError('');
    setSent(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError(t('Choisissez un motif.'));
      return;
    }
    setIsSending(true);
    setError('');
    const res = await submitListingReport({ listingId, listingTitle, reason, message, reporterEmail: email });
    setIsSending(false);
    if (res.success) setSent(true);
    else setError(t(res.error));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-foreground/50 underline-offset-2 hover:text-rose-600 hover:underline"
      >
        <FontAwesomeIcon icon={faFlag} className="h-3 w-3" />
        <span>{t('Signaler cette annonce')}</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('Signaler cette annonce')}
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-foreground">{t('Signaler cette annonce')}</h2>
              <button type="button" onClick={close} aria-label={t('Fermer')} className="rounded-md p-1.5 text-foreground/50 hover:bg-muted">
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <div className="mt-4 space-y-4 text-sm text-foreground/80">
                <p className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 h-4 w-4 text-emerald-600" />
                  <span>{t('Merci. Notre équipe va examiner cette annonce et la suspendre si nécessaire.')}</span>
                </p>
                <button type="button" onClick={close} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                  {t('Fermer')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-foreground/60">{t('Motif')}</legend>
                  {REPORT_REASONS.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-foreground/10 px-3 py-2 text-sm hover:bg-muted/40">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.id}
                        checked={reason === r.id}
                        onChange={() => setReason(r.id)}
                        className="accent-primary"
                      />
                      <span>{t(r.label)}</span>
                    </label>
                  ))}
                </fieldset>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={t('Précisions (facultatif)')}
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('Votre e-mail (facultatif, pour vous répondre)')}
                  className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {error && <p className="text-xs text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSending ? t('Envoi…') : t('Envoyer le signalement')}
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
