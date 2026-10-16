import { supabase, isSupabaseConfigured, runSupabaseQuery } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_discoveries';

export const INITIAL_DISCOVERIES = [
  // ==========================================
  // 1. GASTRONOMIE & RESTAURANTS (INSCRIPTION GRATUITE 0 FCFA)
  // ==========================================
  {
    id: 'disc-resto-jardin-canala',
    category: 'restaurants',
    subcategory: 'gastronomie',
    title: 'Le Jardin de Canala — Gastronomie & Jardin Tropical',
    badge: 'Table d\'Exception',
    location: 'Cotonou · Quartier Haie Vive',
    tagline: 'Saveurs Locales & Fusion Contemporaine',
    description:
      'Véritable oasis végétale en plein cœur de Cotonou, Le Jardin de Canala sublime le terroir béninois : mérou grillé au feu de bois, agouti en sauce graine, aloco doré et cocktails aux fruits de la côte. Une ambiance feutrée idéale pour vos dîners d’affaires ou escapades gourmandes.',
    highlights: [
      'Poissons frais de l’océan et arrivages du port',
      'Jardin ombragé & cocktails signatures',
      'Accueil chaleureux et carte raffinée'
    ],
    tips: 'Réservation recommandée en soirée et le week-end. Établissement situé à 10 minutes de l’aéroport.',
    pricing: 'Carte : 10 000 — 35 000 FCFA',
    phone: '+229 97 00 11 22',
    whatsapp: '22997001122',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    inHomeService: false,
    creator_role: 'admin',
    payment_status: 'free',
    status: 'active',
    created_at: '2026-01-10T10:00:00Z'
  },
  {
    id: 'disc-resto-maman-bene',
    category: 'restaurants',
    subcategory: 'terroir',
    title: 'Chez Maman Béné — Terroir Authentique Littoral',
    badge: 'Authenticité & Fraîcheur',
    location: 'Ouidah · Route des Pêches',
    tagline: 'Les Trésors Culinaires du Littoral Océanique',
    description:
      'Institution incontournable de la côte d’Ouidah, Chez Maman Béné propose une cuisine béninoise généreuse et savoureuse : langoustes grillées, capitaine sauce tomate pimentée, crabes de lagune et pâte noire amèvo cuisinée selon les secrets des grands-mères.',
    highlights: [
      'Langoustes et gambas braisées à la minute',
      'Cadre paillote les pieds dans le sable',
      'Hospitalité béninoise légendaire'
    ],
    tips: 'Parfait pour un déjeuner convivial après la visite de la Porte du Non-Retour.',
    pricing: 'Plats : 6 000 — 22 000 FCFA',
    phone: '+229 96 11 22 33',
    whatsapp: '22996112233',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    inHomeService: false,
    creator_role: 'admin',
    payment_status: 'free',
    status: 'active',
    created_at: '2026-01-12T10:00:00Z'
  },
  {
    id: 'disc-resto-atelier-gourmand',
    category: 'restaurants',
    subcategory: 'haute-cuisine',
    title: 'L\'Atelier Gourmand de la Marina — Haute Cuisine Béninoise',
    badge: 'Table Recommandée',
    location: 'Cotonou · Boulevard de la Marina',
    tagline: 'Gastronomie Béninoise & Inspirations Contemporaines',
    description:
      'Surplombant la marina de Cotonou, cette table gastronomique propose des créations d\'exception : carpaccio de mérou aux agrumes du terroir, agouti confit aux épices béninoises, et fondants au chocolat local. Une ambiance feutrée et une carte des vins raffinée.',
    highlights: [
      'Vue panoramique sur la côte et la marina',
      'Poissons nobles et arrivages côtiers',
      'Terrasse lounge climatisée'
    ],
    tips: 'Idéal pour vos dîners de prestige et rendez-vous d’affaires. Réservation conseillée.',
    pricing: 'Menu dégustation : 25 000 FCFA',
    phone: '+229 95 33 44 55',
    whatsapp: '22995334455',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    inHomeService: false,
    creator_role: 'admin',
    payment_status: 'free',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'disc-resto-cabane-pecheur',
    category: 'restaurants',
    subcategory: 'fruits-de-mer',
    title: 'La Cabane du Pêcheur — Fruits de Mer & Paillote Littorale',
    badge: 'Arrivages Côtiers',
    location: 'Grand-Popo · Bord de Mer',
    tagline: 'L\'Esprit des Plages & Grillades Braisées',
    description:
      'Face aux déferlantes de l\'océan à Grand-Popo, dégustez des langoustes grillées au feu de bois, des dorades royales et des brochettes de gambas fraîches accompagnées d\'aloco doré. Une atmosphère dépaysante au rythme des vagues atlantiques.',
    highlights: [
      'Langoustes braisées à la minute',
      'Cadre en bois flotté les pieds dans le sable',
      'Cocktails de fruits frais tropicaux'
    ],
    tips: 'Parfait pour un déjeuner convivial après une journée au bord de l’océan.',
    pricing: 'Plats : 8 000 — 26 000 FCFA',
    phone: '+229 94 44 55 66',
    whatsapp: '22994445566',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    inHomeService: false,
    creator_role: 'admin',
    payment_status: 'free',
    status: 'active',
    created_at: '2026-01-20T10:00:00Z'
  },

  // ==========================================
  // 2. AUTRES SERVICES & À DOMICILE (ACTIVATION 500 FCFA)
  // (Coiffure, Onglerie, Soins, Massage, Chef Privé, Pressing)
  // Déplacement direct dans les villas & résidences de standing
  // ==========================================
  {
    id: 'disc-srv-coiffure-vip',
    category: 'services',
    subcategory: 'coiffure',
    title: 'Atelier Capi-Luxe — Coiffure Afro & Brushing en Villa',
    badge: 'Service en Villa & Résidence',
    location: 'Cotonou & Abomey-Calavi · Déplacement à domicile',
    tagline: 'Expertise Capillaire Privée sans Sortir de Chez Vous',
    description:
      'Service sur-mesure de coiffure masculine et féminine directement dans votre appartement ou villa de standing Bénin Beyond. Maîtrise absolue des tresses africaines haute couture (knotless braids, twists), locks, brushings soyeux, coupes modernes et soins hydratants avec produits professionnels.',
    highlights: [
      'Déplacement avec matériel complet, shampoing nomade & bac autonome',
      'Disponibilité 7j/7 de 07h à 21h sur rendez-vous',
      'Coiffeurs stylistes certifiés et discrets'
    ],
    tips: 'Idéal pour préparer une soirée de gala, un événement ou simplement pour un rafraîchissement sans affronter la circulation de Cotonou.',
    pricing: 'Prestations dès 12 000 FCFA · Déplacement inclus selon quartier',
    phone: '+229 97 88 44 11',
    whatsapp: '22997884411',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
    inHomeService: true,
    creator_role: 'provider',
    payment_status: 'paid',
    status: 'active',
    created_at: '2026-02-01T10:00:00Z'
  },
  {
    id: 'disc-srv-onglerie-glamour',
    category: 'services',
    subcategory: 'onglerie',
    title: 'Diva Nails & Art — Onglerie & Pédicure de Prestige à Domicile',
    badge: 'Soins Beauté en Villa',
    location: 'Cotonou (Haie Vive, Fidjrossè, Cadjèhoun, Cocotiers) · Calavi',
    tagline: 'Manucure Russe, Gel & Pédicure Spa chez Vous',
    description:
      'Offrez-vous une prestation manucure et pédicure de luxe dans le confort absolu de votre résidence privée. Pose de capsules américaines, gel UV porcelaine, vernis semi-permanent longue tenue, nail art minutieux et gommage spa aux sels marins.',
    highlights: [
      'Stérilisation médicale rigoureuse et instruments sous sachet scellé',
      'Large nuancier de plus de 80 teintes nudes et vibrantes',
      'Pédicure bien-être complète avec massage relaxant des pieds'
    ],
    tips: 'Réservez 24h à l’avance pour vos créneaux du week-end ou en début de soirée.',
    pricing: 'Pose complète dès 15 000 FCFA · Entretien dès 8 000 FCFA',
    phone: '+229 96 44 22 88',
    whatsapp: '22996442288',
    image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
    inHomeService: true,
    creator_role: 'provider',
    payment_status: 'paid',
    status: 'active',
    created_at: '2026-02-05T10:00:00Z'
  },
  {
    id: 'disc-srv-massage-zenith',
    category: 'services',
    subcategory: 'soins',
    title: 'Aura Sérénité — Massages Relaxants & Spa Nomade',
    badge: 'Bien-Être Holistique en Villa',
    location: 'Cotonou, Ouidah & Grand-Popo · Déplacement',
    tagline: 'Table de Massage Ergonomique & Huiles Essentielles',
    description:
      'Transformez votre terrasse de villa ou votre suite en un sanctuaire de relaxation absolue. Praticiens diplômés proposant massages suédois énergisants, massages californiens anti-stress, drainage lymphatique et réflexologie plantaire avec beurre de karité bio du Nord Bénin.',
    highlights: [
      'Table de massage professionnelle chauffante apportée sur place',
      'Ambiance sonore douce et aromathérapie personnalisée',
      'Séances individuelles ou en couple'
    ],
    tips: 'Parfait après un vol long-courrier ou après une journée de déplacement intense.',
    pricing: 'Séance 60 min : 25 000 FCFA · Séance 90 min : 35 000 FCFA',
    phone: '+229 95 12 34 56',
    whatsapp: '22995123456',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
    inHomeService: true,
    creator_role: 'provider',
    payment_status: 'paid',
    status: 'active',
    created_at: '2026-02-10T10:00:00Z'
  },
  {
    id: 'disc-srv-chef-danxome',
    category: 'services',
    subcategory: 'chef',
    title: 'Le Majordome & Chef Privé Danxomè — Haute Table en Résidence',
    badge: 'Chef Privé Exclusif',
    location: 'Cotonou, Ouidah, Calavi & Porto-Novo',
    tagline: 'Votre Dîner de Prestige Cuisiné Sous Vos Yeux',
    description:
      'Un chef privé prend les commandes de la cuisine équipée de votre villa de standing Bénin Beyond. Achat des produits frais le matin au port de pêche, service à table raffiné, accords mets et boissons locales et remise en ordre intégrale de la cuisine.',
    highlights: [
      'Menu 3 à 5 services 100% sur-mesure selon vos préférences alimentaires',
      'Service discret de majordome inclus pour le dressage de table',
      'Expérience inoubliable pour anniversaires et dîners d’affaires'
    ],
    tips: 'Réservation recommandée au moins 48 heures à l’avance.',
    pricing: 'À partir de 40 000 FCFA / prestation + coût réel des ingrédients',
    phone: '+229 98 76 54 32',
    whatsapp: '22998765432',
    image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80',
    inHomeService: true,
    creator_role: 'provider',
    payment_status: 'paid',
    status: 'active',
    created_at: '2026-02-15T10:00:00Z'
  },
  {
    id: 'disc-srv-pressing-express',
    category: 'services',
    subcategory: 'pressing',
    title: 'Pressing & Blanchisserie Express — Collecte & Livraison en Villa',
    badge: 'Conciergerie Linge VIP',
    location: 'Cotonou & Littoral',
    tagline: 'Nettoyage à Sec & Repassage Délicat Livré sous 24h',
    description:
      'Service haut de gamme de pressing à domicile pour vos costumes, robes de créateurs, soieries et tenues traditionnelles béninoises brodées. Collecte directe à la conciergerie ou au seuil de votre appartement et livraison sur cintre sous housse protectrice.',
    highlights: [
      'Collecte matinale et restitution en 24h chrono',
      'Traitement écologique des textiles délicats et lin',
      'Paiement direct à la livraison ou en ligne'
    ],
    tips: 'Formule express en 8h disponible sur simple demande WhatsApp.',
    pricing: 'Pièce dès 1 500 FCFA · Forfait valise dès 18 000 FCFA',
    phone: '+229 97 55 66 77',
    whatsapp: '22997556677',
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80',
    inHomeService: true,
    creator_role: 'provider',
    payment_status: 'paid',
    status: 'active',
    created_at: '2026-02-20T10:00:00Z'
  }
];

const DELETED_DISCOVERIES_KEY = 'benin_beyond_deleted_discoveries';

/**
 * Récupère les IDs de découvertes définitivement supprimées
 */
export function getDeletedDiscoveryIds() {
  try {
    const raw = localStorage.getItem(DELETED_DISCOVERIES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Inscrit un ID de découverte dans la liste noire des suppressions
 */
export function markDiscoveryAsDeleted(id) {
  try {
    const set = getDeletedDiscoveryIds();
    if (id) set.add(String(id));
    localStorage.setItem(DELETED_DISCOVERIES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error('Erreur blacklist suppression découverte:', e);
  }
}

function getStoredDiscoveriesLocal() {
  try {
    const deletedIds = getDeletedDiscoveryIds();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initClean = INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initClean));
      return initClean;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initClean = INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initClean));
      return initClean;
    }
    // Filtrage strict : seuls 'restaurants' et 'services' autorisés, aucun élément supprimé
    const cleaned = parsed
      .filter((item) => {
        if (deletedIds.has(String(item.id))) return false;
        return item.category === 'restaurants' || item.category === 'services' || item.category === 'gastronomie';
      })
      .map((item) => ({
        ...item,
        category: item.category === 'gastronomie' ? 'restaurants' : item.category
      }));

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned.length > 0 ? cleaned : INITIAL_DISCOVERIES.filter((it) => !deletedIds.has(String(it.id)));
  } catch (e) {
    console.warn('Erreur lecture localStorage discoveries:', e);
    return INITIAL_DISCOVERIES.filter((it) => !getDeletedDiscoveryIds().has(String(it.id)));
  }
}

function saveStoredDiscoveriesLocal(items) {
  try {
    const deletedIds = getDeletedDiscoveryIds();
    const cleanItems = (items || []).filter((it) => !deletedIds.has(String(it.id)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanItems));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benin_beyond_discoveries_updated', { detail: cleanItems }));
    }
  } catch (e) {
    console.error('Failed to save discoveries to localStorage:', e);
  }
}

/**
 * Récupérer toutes les découvertes (Gastronomie & Restaurants, Autres Services & À Domicile)
 */
export async function getDiscoveries() {
  const deletedIds = getDeletedDiscoveryIds();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('discoveries')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Filtrage strict : exclure monuments et nature, exclure éléments supprimés
        const valid = data
          .filter(
            (item) => !deletedIds.has(String(item.id)) &&
              (item.category === 'restaurants' || item.category === 'services' || item.category === 'gastronomie')
          )
          .map((item) => ({
            ...item,
            category: item.category === 'gastronomie' ? 'restaurants' : item.category
          }));
        saveStoredDiscoveriesLocal(valid);
        return valid;
      }
    } catch (err) {
      console.warn('Erreur lecture discoveries Supabase, fallback local:', err);
    }
  }

  return getStoredDiscoveriesLocal();
}

/**
 * Ajouter une nouvelle découverte / service
 * - Gastronomie & Restaurants : Inscription 100% GRATUITE (0 FCFA)
 * - Autres Services & À Domicile (Prestataires) : Inscription & Activation à 500 FCFA
 * - Admin : Accès gratuit illimité (0 FCFA)
 */
export async function addDiscovery(itemData) {
  const isRestaurant = itemData.category === 'restaurants' || itemData.category === 'gastronomie';
  const isAdmin = itemData.creator_role === 'admin';

  let paymentStatus = 'paid';
  let paymentReference = itemData.payment_reference || `BB-SRV-500-${Date.now()}`;
  let activationFee = 500;

  if (isRestaurant) {
    // Inscription gratuite pour la Gastronomie & Restaurants
    paymentStatus = 'free';
    paymentReference = 'RESTO-FREE-0F';
    activationFee = 0;
  } else if (isAdmin) {
    paymentStatus = 'free_admin';
    paymentReference = 'ADMIN-FREE';
    activationFee = 0;
  }

  const defaultCreatorRole = isAdmin ? 'admin' : (isRestaurant ? 'restaurant_partner' : 'provider');
  const creatorRole = itemData.creator_role || defaultCreatorRole;

  const newDiscovery = {
    id: itemData.id || `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: isRestaurant ? 'restaurants' : 'services',
    subcategory: itemData.subcategory || (isRestaurant ? 'gastronomie' : 'autre'),
    title: itemData.title,
    badge: itemData.badge || (itemData.inHomeService ? 'Service en Villa' : isRestaurant ? 'Table Recommandée' : 'Recommandé'),
    location: itemData.location || 'Bénin',
    tagline: itemData.tagline || '',
    description: itemData.description || '',
    highlights: Array.isArray(itemData.highlights)
      ? itemData.highlights
      : typeof itemData.highlights === 'string'
      ? itemData.highlights.split('\n').filter(Boolean)
      : [],
    tips: itemData.tips || '',
    pricing: itemData.pricing || '',
    phone: itemData.phone || '',
    whatsapp: (itemData.whatsapp || itemData.phone || '').replace(/[^0-9]/g, ''),
    image: itemData.image || (isRestaurant
      ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
      : 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80'),
    gallery: Array.isArray(itemData.gallery) ? itemData.gallery : [],
    inHomeService: Boolean(itemData.inHomeService),
    creator_role: creatorRole,
    payment_status: paymentStatus,
    payment_reference: paymentReference,
    activation_fee: activationFee,
    status: itemData.status || 'active',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.insert', supabase.from('discoveries').insert([newDiscovery]));
    } catch (err) {
      console.warn('Erreur insert discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = [newDiscovery, ...current];
  saveStoredDiscoveriesLocal(updated);

  return newDiscovery;
}

/**
 * Mettre à jour une découverte existante
 */
export async function updateDiscovery(id, updates) {
  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.update', supabase
        .from('discoveries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id));
    } catch (err) {
      console.warn('Erreur update discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = current.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveStoredDiscoveriesLocal(updated);

  return updated.find((i) => i.id === id);
}

/**
 * Supprimer une découverte
 */
export async function deleteDiscovery(id) {
  markDiscoveryAsDeleted(id);

  if (isSupabaseConfigured && supabase) {
    try {
      await runSupabaseQuery('discoveries.delete', supabase.from('discoveries').delete().eq('id', id));
    } catch (err) {
      console.warn('Erreur delete discoveries Supabase:', err);
    }
  }

  const current = getStoredDiscoveriesLocal();
  const updated = current.filter((item) => item.id !== id);
  saveStoredDiscoveriesLocal(updated);

  return true;
}

/**
 * Basculer le statut d'une découverte (active / suspended)
 */
export async function toggleDiscoveryStatus(id) {
  const current = getStoredDiscoveriesLocal();
  const target = current.find((i) => i.id === id);
  if (!target) return null;

  const nextStatus = target.status === 'active' ? 'suspended' : 'active';
  return updateDiscovery(id, { status: nextStatus });
}
