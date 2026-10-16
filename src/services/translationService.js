import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

/**
 * Traduction automatique (FR -> EN) des textes saisis par les propriétaires et prestataires.
 * Les demandes sont regroupées puis envoyées à la fonction serveur « benin-beyond » (route translate) ;
 * les résultats sont gardés en mémoire et dans le navigateur. En cas d'échec,
 * le texte français reste affiché.
 */

const STORAGE_KEY = 'benin_beyond_auto_translations';
const MAX_STORED = 2000;
const memory = new Map();
const pending = new Map(); // texte -> [resolve...]
let flushTimer = null;
let functionAvailable = true;

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) Object.entries(JSON.parse(raw)).forEach(([k, v]) => memory.set(k, v));
} catch {}

function persist() {
  try {
    const entries = [...memory.entries()].slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

async function flush() {
  flushTimer = null;
  const batch = [...pending.keys()].slice(0, 50);
  if (batch.length === 0) return;

  let translations = batch;
  if (functionAvailable && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('benin-beyond/translate', { body: { texts: batch } });
      if (error) throw error;
      if (Array.isArray(data?.translations) && data.translations.length === batch.length) {
        translations = data.translations;
      }
    } catch (err) {
      // Fonction non déployée : on arrête d'essayer pour cette visite
      functionAvailable = false;
      console.warn('[Traduction] Service indisponible, affichage en français :', err?.message || err);
    }
  }

  batch.forEach((text, i) => {
    const out = translations[i] || text;
    if (out !== text) memory.set(text, out);
    (pending.get(text) || []).forEach((resolve) => resolve(out));
    pending.delete(text);
  });
  persist();
  if (pending.size > 0) flushTimer = setTimeout(flush, 30);
}

export function translateText(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return Promise.resolve(text);
  if (memory.has(text)) return Promise.resolve(memory.get(text));
  if (!functionAvailable) return Promise.resolve(text);
  return new Promise((resolve) => {
    if (!pending.has(text)) pending.set(text, []);
    pending.get(text).push(resolve);
    if (!flushTimer) flushTimer = setTimeout(flush, 60);
  });
}

/**
 * Renvoie le texte traduit quand le site est en anglais, sinon le texte d'origine.
 */
export function useAutoTranslate(text) {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState(() => (lang === 'en' && memory.has(text) ? memory.get(text) : text));

  useEffect(() => {
    let active = true;
    if (lang !== 'en' || !text) {
      setTranslated(text);
      return undefined;
    }
    if (memory.has(text)) {
      setTranslated(memory.get(text));
      return undefined;
    }
    setTranslated(text);
    translateText(text).then((out) => {
      if (active) setTranslated(out);
    });
    return () => {
      active = false;
    };
  }, [lang, text]);

  return translated;
}

/**
 * Affiche un texte saisi par un utilisateur, traduit automatiquement en anglais si besoin.
 */
export function AutoText({ text }) {
  return useAutoTranslate(text) ?? null;
}
