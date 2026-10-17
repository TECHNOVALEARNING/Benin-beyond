import { supabase, isSupabaseConfigured, runSupabaseQuery } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_cultural_events';

/**
 * Grands rendez-vous officiels du Bénin (dates vérifiées en octobre 2026).
 * start_month : mois de début (1-12), sert à afficher d'abord les prochains événements ;
 * absent = visible toute l'année.
 */
export const INITIAL_CULTURAL_EVENTS = [
  {
    id: 'evt-vodun-days',
    title: 'Vodun Days',
    badge: 'Festival International',
    period: '8 — 10 janvier',
    start_month: 1,
    location: 'Ouidah · Plage & Temple des Pythons',
    description: 'La plus grande célébration des arts, musiques rituelles et traditions vodun, sur le littoral de Ouidah.',
    long_description:
      'Chaque année du 8 au 10 janvier, Ouidah accueille les Vodun Days, dans le prolongement de la Fête nationale du Vodun du 10 janvier, jour férié au Bénin. ' +
      'Danses rituelles, sorties de masques, tambours et grande cérémonie sur la plage se succèdent pendant trois jours.\n\n' +
      'La dernière édition a rassemblé plus de 740 000 participants, venus du Bénin et du monde entier.',
    tips: 'Réservez votre hébergement plusieurs semaines à l’avance : Ouidah et Cotonou affichent complet à cette période. Demandez toujours l’autorisation avant de photographier une cérémonie.',
    image: 'https://i.pinimg.com/736x/a9/79/63/a9796310554972a7a7fd10c421e538c6.jpg',
    tag: 'Culture & Spiritualité'
  },
  {
    id: 'evt-festival-masques',
    title: 'Festival des Masques',
    badge: 'Festival Officiel',
    period: '7 — 8 août',
    start_month: 8,
    location: 'Porto-Novo · Capitale du Bénin',
    description: 'Deux jours de processions et de spectacles autour des grandes traditions masquées du Bénin : Egungun, Zangbeto, Guèlèdè, Gunuko.',
    long_description:
      'Organisé par Bénin Tourisme et la Ville de Porto-Novo, le Festival des Masques (ancien Festival international de Porto-Novo) réunit les principales sociétés de masques du pays. ' +
      'Au programme : une grande procession dans les rues de la capitale, des démonstrations et des rencontres autour du patrimoine masqué.\n\n' +
      'La prochaine édition est annoncée les 7 et 8 août par le site officiel du festival.',
    tips: 'Porto-Novo est à environ 45 minutes de Cotonou : un véhicule avec chauffeur permet de suivre la procession sans souci de stationnement.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Festival_des_masques_de_Porto-Novo_2025_32.jpg/1280px-Festival_des_masques_de_Porto-Novo_2025_32.jpg',
    tag: 'Masques & Traditions'
  },
  {
    id: 'evt-independance',
    title: 'Fête de l’Indépendance',
    badge: 'Fête Nationale',
    period: '1er août',
    start_month: 8,
    location: 'Cotonou & tout le pays',
    description: 'Le Bénin célèbre chaque 1er août son indépendance, proclamée le 1er août 1960.',
    long_description:
      'Jour férié national, le 1er août marque l’anniversaire de l’indépendance du Bénin, proclamée en 1960. ' +
      'Cérémonies officielles, drapeaux aux couleurs nationales et festivités animent les villes du pays.\n\n' +
      'Une belle occasion de combiner un séjour à Cotonou avec les autres grands rendez-vous du mois d’août.',
    tips: 'Le mois d’août concentre plusieurs grandes fêtes (Indépendance, igname, Festival des Masques) : réservez tôt.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Place_de_Etoile_rouge.jpg',
    tag: 'Patrimoine National'
  },
  {
    id: 'evt-fete-igname',
    title: 'Fête de l’igname',
    badge: 'Fête Traditionnelle',
    period: '15 août (rites le 14)',
    start_month: 8,
    location: 'Savalou · Dassa-Zoumè · Bassila',
    description: 'La fête des nouvelles récoltes : le roi de Savalou autorise officiellement la consommation des premières ignames.',
    long_description:
      'Chaque 15 août, Savalou et plusieurs localités du centre et du nord du Bénin, comme Dassa-Zoumè et Bassila, célèbrent la récolte de l’igname. ' +
      'Les rites préparatoires ont lieu la veille, le 14 août, avant la grande journée de festivités.\n\n' +
      'C’est le roi de Savalou qui autorise officiellement la consommation des ignames fraîchement récoltées : un moment fort de la culture mahi.',
    tips: 'Savalou est à environ 3 h 30 de route de Cotonou : prévoyez de partir la veille.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/R%C3%A9coltes_d%27igname_%C3%A0_Savalou_au_B%C3%A9nin.png',
    tag: 'Récoltes & Royauté'
  },
  {
    id: 'evt-gaani',
    title: 'Fête de la Gaani',
    badge: 'Célébration Royale',
    period: 'Août (date variable)',
    start_month: 8,
    location: 'Nikki · Cour Impériale du Borgou',
    description: 'Somptueuse parade de cavaliers bariba en tenue d’apparat, au son des trompettes royales, en hommage au roi de Nikki.',
    long_description:
      'La Gaani est la grande fête du peuple Baatonu (Bariba), célébrée à Nikki, capitale historique du royaume du Borgou. ' +
      'Pendant plusieurs jours, des centaines de cavaliers défilent devant le roi, au son des trompettes et des tambours royaux.\n\n' +
      'Sa date suit le calendrier lunaire baatonu et change chaque année ; ces dernières éditions se sont tenues fin août.',
    tips: 'Comptez une journée de route depuis Cotonou (environ 550 km) : un véhicule avec chauffeur est recommandé. Vérifiez la date de l’édition auprès de Bénin Tourisme avant de réserver.',
    image: 'https://i.pinimg.com/1200x/90/94/c7/9094c71aa1b36b8d3387bc5880662d70.jpg',
    tag: 'Patrimoine Équestre'
  },
  {
    id: 'evt-safari-pendjari',
    title: 'Saison des Safaris de la Pendjari',
    badge: 'Saison Touristique',
    period: 'Décembre — mai',
    start_month: 12,
    location: 'Parc National de la Pendjari · Atacora',
    description: 'La saison sèche, idéale pour observer éléphants, buffles, antilopes et, avec un peu de chance, les lions.',
    long_description:
      'Au nord-ouest du Bénin, le Parc National de la Pendjari est l’une des dernières grandes réserves de faune sauvage d’Afrique de l’Ouest. ' +
      'Pendant la saison sèche, les animaux se regroupent autour des points d’eau, ce qui facilite leur observation.\n\n' +
      'Les safaris se font en 4x4 avec un guide agréé, de préférence tôt le matin ou en fin d’après-midi.',
    tips: 'Prévoyez un véhicule tout-terrain avec chauffeur depuis Natitingou, des vêtements couvrants et une bonne réserve d’eau.',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
    tag: 'Faune & Aventure'
  },
  {
    id: 'evt-route-des-esclaves',
    title: 'La Route des Esclaves',
    badge: 'Mémoire & Histoire',
    period: 'Toute l’année',
    location: 'Ouidah · Place des Enchères → Porte du Non-Retour',
    description: 'Quatre kilomètres de mémoire entre la ville historique et l’océan, jalonnés de monuments jusqu’à la Porte du Non-Retour.',
    long_description:
      'De la place des Enchères à la plage, la Route des Esclaves retrace le dernier chemin parcouru par des milliers de captifs avant leur déportation vers les Amériques. ' +
      'Le parcours passe par l’Arbre de l’Oubli, l’Arbre du Retour et plusieurs mémoriaux, jusqu’à la Porte du Non-Retour face à l’Atlantique.\n\n' +
      'Une visite forte, à compléter par le Musée d’Histoire de Ouidah installé dans l’ancien fort portugais.',
    tips: 'Faites la visite avec un guide local pour comprendre chaque étape du parcours. Prévoyez une demi-journée, idéalement le matin.',
    image: 'https://i.pinimg.com/736x/1b/5e/07/1b5e07312492ae6116e3a150377e1d6b.jpg',
    tag: 'Histoire'
  }
];

/**
 * Trie les événements : les prochains d'abord (selon start_month), puis ceux visibles toute l'année.
 * Les événements créés par l'administrateur sans mois restent en tête, dans leur ordre.
 */
export function sortByNextDate(events, now = new Date()) {
  const month = now.getMonth() + 1;
  const rank = (evt) => {
    if (!evt.start_month) return evt.id?.startsWith('evt-route') ? 99 : -1;
    return (Number(evt.start_month) - month + 12) % 12;
  };
  return [...events].sort((a, b) => rank(a) - rank(b));
}

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

      if (!error && Array.isArray(data)) {
        const result = data.length > 0 ? data : [...INITIAL_CULTURAL_EVENTS];
        saveStoredEventsLocal(result);
        return result;
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
      await runSupabaseQuery('events.insert', supabase.from('events').insert([newEvent]));
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
      await runSupabaseQuery('events.update', supabase.from('events').update(updatedFields).eq('id', id));
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
      await runSupabaseQuery('events.delete', supabase.from('events').delete().eq('id', id));
    } catch (err) {
      console.warn('Erreur delete events Supabase:', err);
    }
  }

  const current = getStoredEventsLocal();
  const updated = current.filter((evt) => evt.id !== id);
  saveStoredEventsLocal(updated);
  return updated;
}

/**
 * Un événement par son identifiant (base Supabase, sinon événements par défaut).
 */
export async function getEventById(id) {
  const events = await getEvents();
  return events.find((evt) => String(evt.id) === String(id))
    || INITIAL_CULTURAL_EVENTS.find((evt) => evt.id === id)
    || null;
}
