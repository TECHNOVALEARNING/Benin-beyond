import React, { useEffect, useState } from 'react';
import { SYNC_ERROR_EVENT } from '../supabase/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

/**
 * Affiche les écritures refusées par le serveur (Supabase) au lieu de les laisser passer en silence.
 */
export function SyncErrorToast() {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');

  useEffect(() => {
    let timer;
    const handle = (event) => {
      setMessage(event.detail?.message || "Vos modifications n'ont pas été enregistrées sur le serveur.");
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(''), 7000);
    };
    window.addEventListener(SYNC_ERROR_EVENT, handle);
    return () => {
      window.removeEventListener(SYNC_ERROR_EVENT, handle);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-rose-500/30 bg-card px-4 py-3 text-sm text-foreground shadow-lg"
    >
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
      <p className="flex-1 leading-snug">{t(message)}</p>
      <button
        type="button"
        onClick={() => setMessage('')}
        className="text-xs font-medium text-foreground/50 hover:text-foreground"
        aria-label="Fermer"
      >
        Fermer
      </button>
    </div>
  );
}

export default SyncErrorToast;
