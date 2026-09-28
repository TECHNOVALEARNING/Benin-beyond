import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faTrashCan,
  faCircleExclamation,
  faCircleCheck,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

export function ConfirmModal({
  isOpen,
  title = 'Confirmation requise',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  isAlert = false,
  onConfirm,
  onCancel,
  loading = false
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel?.();
      } else if (e.key === 'Enter' && !loading && !isAlert) {
        onConfirm?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, loading, isAlert]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: faTrashCan,
          iconBg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
          btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
        };
      case 'warning':
        return {
          icon: faTriangleExclamation,
          iconBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
          btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25'
        };
      case 'success':
        return {
          icon: faCircleCheck,
          iconBg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
          btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
        };
      case 'info':
      default:
        return {
          icon: faCircleExclamation,
          iconBg: 'bg-primary/10 text-primary border border-primary/20',
          btnConfirm: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25'
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-foreground/15 bg-card p-6 shadow-2xl transition-all duration-300 transform scale-100 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Close Button */}
        {!loading && (
          <button
            onClick={onCancel}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Fermer"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-start gap-4">
          {/* Icon Badge */}
          <div
            className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-lg ${style.iconBg}`}
          >
            <FontAwesomeIcon icon={style.icon} className="h-5 w-5" />
          </div>

          {/* Texts */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              id="confirm-modal-title"
              className="font-heading text-lg font-bold text-foreground leading-snug tracking-tight"
            >
              {title}
            </h3>
            <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-foreground/10">
          {!isAlert && (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-foreground/15 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 ${style.btnConfirm}`}
          >
            {loading && (
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
