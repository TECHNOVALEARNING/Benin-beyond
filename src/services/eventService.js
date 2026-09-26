import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_cultural_events';

export const INITIAL_CULTURAL_EVENTS = [
  {
    id: 'evt-vodun-days',
    title: 'Vodun Days',
    badge: 'Festival International',
    period: '09 — 10 Janvier',
    location: 'Ouidah · Plage & Temple des Pythons',
    description: 'La plus grande célébration mondiale des arts, musiques rituelles et traditions séculaires sur le littoral d’Ouidah.',
    image: 'https://i.pinimg.com/736x/a9/79/63/a9796310554972a7a7fd10c421e538c6.jpg',
    tag: 'Culture & Spiritualité'
  },
  {
    id: 'evt-gaani',
    title: 'Fête de la Gaani',
    badge: 'Célébration Royale',
    period: 'Novembre / Décembre',
    location: 'Nikki · Cour Impériale du Borgou',
    description: 'Somptueuse parade de centaines de cavaliers bariba aux caparaçons brodés, son des trompettes sacrées et hommage au Roi.',
    image: 'https://i.pinimg.com/1200x/90/94/c7/9094c71aa1b36b8d3387bc5880662d70.jpg',
    tag: 'Patrimoine Équestre'
  },
  {
    id: 'evt-safari-pendjari',
    title: 'Saison des Safaris de la Pendjari',
    badge: 'Pleine Saison',
    period: 'Décembre — Mai',
    location: 'Parc National de la Pendjari · Atacora',
    description: 'Période royale pour l’observation des éléphants, lions, cobes de Buffon et bivouacs confortables sous la voûte céleste.',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    tag: 'Faune & Aventure'
  }
];

function getStoredEventsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CULTURAL_EVENTS));
      return [...INITIAL_CULTURAL_EVENTS];
    }
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_CULTURAL_EVENTS];
  }
}

function saveStoredEventsLocal(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save events to localStorage:', e);
  }
}

export async function getEvents() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Erreur lecture events Supabase, fallback local:', err);
    }
  }

  return getStoredEventsLocal();
}

export async function addEvent(eventData) {
  const newEvent = {
    id: eventData.id || `evt-${Date.now()}`,
    title: eventData.title,
    badge: eventData.badge || 'Événement Spécial',
    period: eventData.period || 'À déterminer',
    location: eventData.location || 'Bénin',
    description: eventData.description || '',
    image: eventData.image || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    tag: eventData.tag || 'Culture',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').insert([newEvent]);
    } catch (err) {
      console.warn('Erreur insert events Supabase:', err);
    }
  }

  const current = getStoredEventsLocal();
  const updated = [newEvent, ...current];
  saveStoredEventsLocal(updated);
  return newEvent;
}

export async function updateEvent(id, updatedFields) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').update(updatedFields).eq('id', id);
    } catch (err) {
      console.warn('Erreur update events Supabase:', err);
    }
  }

  const current = getStoredEventsLocal();
  const updated = current.map((evt) => (evt.id === id ? { ...evt, ...updatedFields } : evt));
  saveStoredEventsLocal(updated);
  return updated;
}

export async function deleteEvent(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('events').delete().eq('id', id);
    } catch (err) {
      console.warn('Erreur delete events Supabase:', err);
    }
  }

  const current = getStoredEventsLocal();
  const updated = current.filter((evt) => evt.id !== id);
  saveStoredEventsLocal(updated);
  return updated;
}
