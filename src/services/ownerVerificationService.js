import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { updateUser, getUsers } from './userService';

/**
 * ==============================================================================
 * BÉNIN BEYOND — SERVICE DE VÉRIFICATION ET ONBOARDING DES PROPRIÉTAIRES (KYC/KYB)
 * ==============================================================================
 * Gestion modulaire et dynamique du cycle de vie des dossiers de vérification :
 * 1. Définition dynamique et configurable des exigences documentaires.
 * 2. Dissociation stricte de l'abonnement et de la vérification des actifs.
 * 3. Persistance résiliente (Supabase + cache local sécurisé localStorage).
 * 4. Auditabilité complète de chaque décision administrative et document par document.
 */

const STORAGE_KEY = 'benin_beyond_owner_verifications';
const AUDIT_LOG_KEY = 'benin_beyond_verification_audit_logs';

/**
 * CATALOGUE DES RÈGLES DOCUMENTAIRES (CONFIGURABLE)
 * Chaque règle définit la finalité, le public cible, les formats acceptés et les critères d'acceptabilité.
 */
export const DOCUMENT_CATALOG = {
  // --- IDENTITÉ COMMUNE & PERSONNE PHYSIQUE ---
  identity_proof: {
    id: 'identity_proof',
    name: 'Pièce d’identité officielle en cours de validité',
    shortName: 'Pièce d’identité',
    category: 'identity',
    purpose: 'Vérifier l’identité légale du déclarant (CIP, CNI biométrique ou Passeport international).',
    acceptedFormats: ['PDF', 'JPG', 'PNG', 'WEBP'],
    maxSizeMb: 15,
    acceptableCriteria: 'Document officiel avec photo nette, nom et prénoms lisibles, les 4 coins visibles, non expiré.',
    isMandatory: () => true
  },
  selfie_with_id: {
    id: 'selfie_with_id',
    name: 'Photo d’identité ou Selfie de contrôle',
    shortName: 'Photo de contrôle',
    category: 'identity',
    purpose: 'Attester formellement que le demandeur est bien le titulaire de la pièce d’identité présentée.',
    acceptedFormats: ['JPG', 'PNG', 'WEBP'],
    maxSizeMb: 15,
    acceptableCriteria: 'Visage dégagé, sans lunettes de soleil ni couvre-chef, bonne luminosité, pièce tenue en main lisible.',
    isMandatory: (ownerType) => ownerType === 'individual'
  },

  // --- ENTREPRISES & PERSONNES MORALES (KYB) ---
  business_rccm: {
    id: 'business_rccm',
    name: 'Extrait du Registre du Commerce et du Crédit Mobilier (RCCM)',
    shortName: 'Extrait RCCM',
    category: 'business',
    purpose: 'Prouver l’existence juridique et l’immatriculation de l’entreprise au greffe du tribunal de commerce.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Extrait datant de moins de 3 mois ou certificat d’immatriculation définitif avec numéro RCCM lisible.',
    isMandatory: (ownerType) => ownerType === 'registered_business'
  },
  business_tax_ifu: {
    id: 'business_tax_ifu',
    name: 'Attestation d’Immatriculation Fiscale (Certificat IFU Bénin)',
    shortName: 'Attestation IFU',
    category: 'business',
    purpose: 'Justifier de la régularité fiscale et de l’identifiant fiscal unique (IFU) émis par la DGI Bénin.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Certificat officiel délivré par la Direction Générale des Impôts du Bénin avec QR code ou signature.',
    isMandatory: (ownerType) => ownerType === 'registered_business'
  },
  legal_representative_id: {
    id: 'legal_representative_id',
    name: 'Pièce d’identité du Gérant ou Représentant Légal',
    shortName: 'ID du Gérant',
    category: 'business',
    purpose: 'Identifier la personne physique habilitée à engager la responsabilité de la société.',
    acceptedFormats: ['PDF', 'JPG', 'PNG', 'WEBP'],
    maxSizeMb: 15,
    acceptableCriteria: 'CIP, CNI ou Passeport du dirigeant mentionné sur les statuts ou le RCCM.',
    isMandatory: (ownerType) => ownerType === 'registered_business'
  },

  // --- GESTIONNAIRES MANDATÉS / CONCIERGERIES ---
  management_mandate: {
    id: 'management_mandate',
    name: 'Mandat de gestion ou Procuration notariée légalisée',
    shortName: 'Mandat de gestion',
    category: 'mandate',
    purpose: 'Prouver l’autorisation expresse donnée par le propriétaire pour exploiter et louer ses biens sur la plateforme.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Contrat de gérance ou procuration signé par les deux parties, légalisé en mairie ou chez un notaire.',
    isMandatory: (ownerType) => ownerType === 'authorized_manager'
  },
  mandate_owner_id: {
    id: 'mandate_owner_id',
    name: 'Pièce d’identité du Propriétaire Mandant',
    shortName: 'ID du Propriétaire Mandant',
    category: 'mandate',
    purpose: 'Vérifier l’identité du titulaire réel des biens ayant accordé le mandat de gestion.',
    acceptedFormats: ['PDF', 'JPG', 'PNG', 'WEBP'],
    maxSizeMb: 15,
    acceptableCriteria: 'Copie lisible de la pièce d’identité en cours de validité du propriétaire du bien.',
    isMandatory: (ownerType) => ownerType === 'authorized_manager'
  },

  // --- IMMOBILIER (APPARTEMENT, VILLA, MAISON, TERRAIN) ---
  real_estate_title: {
    id: 'real_estate_title',
    name: 'Titre Foncier, Attestation de Recasement ou Bail Commercial',
    shortName: 'Titre Foncier / Droit Foncier',
    category: 'real_estate',
    purpose: 'Justifier du droit de propriété ou du droit légal d’exploitation locative des biens immobiliers déclarés.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Titre Foncier (ANDF), Attestation de Recasement officielle, Certificat de Propriété ou Bail autorisant expressément la sous-location.',
    isMandatory: (ownerType, categories) =>
      categories.some((c) => ['apartment', 'villa_house', 'land'].includes(c))
  },

  // --- HÔTELLERIE & ÉTABLISSEMENTS RECEVANT DU PUBLIC ---
  hotel_operating_permit: {
    id: 'hotel_operating_permit',
    name: 'Licence d’exploitation touristique ou Agrément Hôtelier',
    shortName: 'Licence Touristique',
    category: 'hotel',
    purpose: 'Attester de l’autorisation officielle d’ouverture et d’exploitation délivrée par le Ministère du Tourisme du Bénin.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Arrêté d’autorisation ministérielle, licence de classement ou récépissé de déclaration d’exploitation hôtelière.',
    isMandatory: (ownerType, categories) => categories.includes('hotel')
  },
  hotel_safety_compliance: {
    id: 'hotel_safety_compliance',
    name: 'Certificat de Conformité Sécurité & Hygiène',
    shortName: 'Conformité Sécurité',
    category: 'hotel',
    purpose: 'Garantir la conformité aux normes incendie, sécurité des personnes et règles sanitaires en vigueur.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Rapport ou PV de visite des services de la Protection Civile, attestation de conformité ERP en cours de validité.',
    isMandatory: (ownerType, categories) => categories.includes('hotel'),
    optionalIfUnavailable: true // Recommandé fortement mais ne bloque pas si en cours d'audit initial
  },

  // --- VÉHICULES & MOBILITÉ VIP ---
  vehicle_registration_card: {
    id: 'vehicle_registration_card',
    name: 'Certificat d’Immatriculation (Carte Grise du véhicule)',
    shortName: 'Carte Grise',
    category: 'vehicle',
    purpose: 'Prouver l’immatriculation officielle au Bénin (ANaTT) et les spécifications techniques du véhicule.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Carte grise officielle en cours de validité avec numéro de châssis (VIN) et plaque lisibles.',
    isMandatory: (ownerType, categories) => categories.includes('vehicle')
  },
  vehicle_insurance: {
    id: 'vehicle_insurance',
    name: 'Attestation d’Assurance Transport / Location de Véhicule',
    shortName: 'Assurance Location',
    category: 'vehicle',
    purpose: 'Attester d’une couverture d’assurance active adaptée à la mise en location ou au transport de passagers.',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Police d’assurance en cours de validité mentionnant la garantie Responsabilité Civile et protection des passagers.',
    isMandatory: (ownerType, categories) => categories.includes('vehicle')
  },
  vehicle_technical_inspection: {
    id: 'vehicle_technical_inspection',
    name: 'Certificat de Contrôle Technique (Visite Technique CCER)',
    shortName: 'Visite Technique',
    category: 'vehicle',
    purpose: 'Garantir le bon état mécanique et la sécurité routière du véhicule (Centre de Contrôle et d’Essais Routiers).',
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSizeMb: 15,
    acceptableCriteria: 'Certificat CCER en cours de validité avec date d’expiration postérieure à la date du jour.',
    isMandatory: (ownerType, categories) => categories.includes('vehicle')
  }
};

/**
 * Calcule dynamiquement les documents requis et recommandés
 * en fonction du type de propriétaire et des catégories d'actifs sélectionnées.
 */
export function getRequiredDocuments(ownerType = 'individual', assetCategories = []) {
  const categoriesList = Array.isArray(assetCategories) ? assetCategories : [assetCategories];
  const required = [];
  const optional = [];

  Object.values(DOCUMENT_CATALOG).forEach((docRule) => {
    const isMandatory = docRule.isMandatory(ownerType, categoriesList);
    const docEntry = {
      ...docRule,
      required: Boolean(isMandatory && !docRule.optionalIfUnavailable),
      optional: Boolean(!isMandatory || docRule.optionalIfUnavailable)
    };

    // Filtre de pertinence : Si le document concerne une catégorie non sélectionnée, on ne l'affiche pas
    let isRelevant = false;
    if (docRule.category === 'identity') {
      isRelevant = true;
    } else if (docRule.category === 'business') {
      isRelevant = ownerType === 'registered_business';
    } else if (docRule.category === 'mandate') {
      isRelevant = ownerType === 'authorized_manager';
    } else if (docRule.category === 'real_estate') {
      isRelevant = categoriesList.some((c) => ['apartment', 'villa_house', 'land'].includes(c));
    } else if (docRule.category === 'hotel') {
      isRelevant = categoriesList.includes('hotel');
    } else if (docRule.category === 'vehicle') {
      isRelevant = categoriesList.includes('vehicle');
    }

    if (isRelevant) {
      if (docEntry.required) {
        required.push(docEntry);
      } else {
        optional.push(docEntry);
      }
    }
  });

  return { required, optional, all: [...required, ...optional] };
}

/**
 * Récupère toutes les demandes stockées localement
 */
function getLocalApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const cleanList = list.filter((a) => a && a.id !== 'app_owner_patrice_demo' && a.owner_email !== 'proprietaire@beninbeyond.com');
    if (cleanList.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    }
    return cleanList;
  } catch {
    return [];
  }
}

/**
 * Enregistre la liste des demandes dans le stockage local
 */
function saveLocalApplications(apps) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch (err) {
    console.warn('Erreur de sauvegarde locale des demandes KYC:', err);
  }
}

/**
 * Récupère le journal d'audit local
 */
function getLocalAuditLog() {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Ajoute une entrée au journal d'audit
 */
function appendAuditLog(entry) {
  try {
    const log = getLocalAuditLog();
    const newEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    log.unshift(newEntry);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log.slice(0, 500)));
    return newEntry;
  } catch {
    return null;
  }
}

/**
 * Récupère la demande de vérification d'un utilisateur par son ID ou son email
 */
export async function getVerificationApplication(userId, userEmail = '') {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  let application = null;

  // 1. Essai de lecture depuis Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('owner_verification_applications').select('*');
      if (userId) {
        query = query.or(`user_id.eq.${userId},owner_email.ilike.${cleanEmail || 'none'}`);
      } else if (cleanEmail) {
        query = query.ilike('owner_email', cleanEmail);
      }
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        application = data;
      }
    } catch (e) {
      console.warn('Supabase getVerificationApplication notice:', e?.message || e);
    }
  }

  // 2. Repli vers le stockage local si non trouvé ou Supabase hors-ligne
  if (!application) {
    const localList = getLocalApplications();
    application = localList.find((app) => {
      const matchId = userId && String(app.user_id) === String(userId);
      const matchEmail = cleanEmail && app.owner_email && app.owner_email.toLowerCase() === cleanEmail;
      return matchId || matchEmail;
    }) || null;
  }

  return application;
}

/**
 * Enregistre un brouillon de vérification (Autosave / Sauvegarde intermédiaire)
 */
export async function saveVerificationDraft(userId, payload) {
  const cleanEmail = (payload.owner_email || payload.email || '').trim().toLowerCase();
  const appId = payload.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const applicationData = {
    id: appId,
    user_id: userId || payload.user_id || `usr_${Date.now()}`,
    owner_email: cleanEmail,
    owner_name: payload.owner_name || payload.name || '',
    phone: payload.phone || '',
    owner_type: payload.owner_type || 'individual',
    asset_categories: payload.asset_categories || ['apartment'],
    profile_data: payload.profile_data || {},
    documents: payload.documents || {},
    declarations: payload.declarations || {},
    status: payload.status || 'draft',
    current_step: payload.current_step || 1,
    rejection_reason: payload.rejection_reason || '',
    admin_feedback: payload.admin_feedback || '',
    created_at: payload.created_at || now,
    updated_at: now
  };

  // 1. Sauvegarde locale immédiate
  const localList = getLocalApplications();
  const existingIdx = localList.findIndex((a) => a.id === appId || (cleanEmail && a.owner_email?.toLowerCase() === cleanEmail));

  if (existingIdx >= 0) {
    localList[existingIdx] = { ...localList[existingIdx], ...applicationData, updated_at: now };
  } else {
    localList.unshift(applicationData);
  }
  saveLocalApplications(localList);

  // 2. Persistance Supabase (asynchrone avec repli)
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('owner_verification_applications').upsert(applicationData, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase saveVerificationDraft notice:', e?.message || e);
    }
  }

  return applicationData;
}

/**
 * Soumet officiellement le dossier de vérification pour revue administrative
 */
export async function submitVerificationApplication(userId, payload) {
  const now = new Date().toISOString();
  const cleanEmail = (payload.owner_email || payload.email || '').trim().toLowerCase();

  // Marque tous les documents nouvellement soumis comme "pending" (en attente) s'ils n'étaient pas déjà validés
  const processedDocs = { ...(payload.documents || {}) };
  Object.keys(processedDocs).forEach((ruleId) => {
    if (processedDocs[ruleId] && processedDocs[ruleId].status !== 'approved') {
      processedDocs[ruleId].status = 'pending';
    }
  });

  const fullData = {
    ...payload,
    documents: processedDocs,
    status: 'submitted',
    submitted_at: now,
    updated_at: now
  };

  const saved = await saveVerificationDraft(userId, fullData);

  // Journalisation
  appendAuditLog({
    application_id: saved.id,
    user_id: userId,
    user_email: cleanEmail,
    action: 'APPLICATION_SUBMITTED',
    actor_email: cleanEmail,
    actor_role: 'owner',
    previous_status: payload.status || 'draft',
    new_status: 'submitted',
    notes: 'Dossier complet de vérification propriétaire soumis pour revue administrative.'
  });

  // Mettre à jour le profil utilisateur en "pending" pour synchronisation globale
  try {
    await updateUser(userId, {
      email: cleanEmail,
      kyc_status: 'pending',
      verified: false
    });
  } catch {}

  return saved;
}

/**
 * Soumission de remplacement pour les documents signalés "action_required" ou rejetés
 * Permet au propriétaire de corriger son dossier SANS avoir à tout ressaisir
 */
export async function resubmitCorrectedDocuments(userId, userEmail, updatedDocs = {}) {
  const existingApp = await getVerificationApplication(userId, userEmail);
  if (!existingApp) {
    throw new Error('Dossier de vérification introuvable.');
  }

  const mergedDocuments = {
    ...(existingApp.documents || {}),
    ...updatedDocs
  };

  // Chaque document révisé repasse en statut 'pending'
  Object.keys(updatedDocs).forEach((key) => {
    if (mergedDocuments[key]) {
      mergedDocuments[key].status = 'pending';
      mergedDocuments[key].adminFeedback = '';
      mergedDocuments[key].resubmitted_at = new Date().toISOString();
    }
  });

  const updatedApp = {
    ...existingApp,
    documents: mergedDocuments,
    status: 'submitted', // Repasse en examen par l'administration
    admin_feedback: '',
    updated_at: new Date().toISOString()
  };

  const saved = await saveVerificationDraft(userId, updatedApp);

  appendAuditLog({
    application_id: saved.id,
    user_id: userId,
    user_email: userEmail,
    action: 'DOCUMENTS_RESUBMITTED',
    actor_email: userEmail,
    actor_role: 'owner',
    previous_status: existingApp.status,
    new_status: 'submitted',
    notes: `Documents de remplacement transmis pour : ${Object.keys(updatedDocs).join(', ')}`
  });

  return saved;
}

/**
 * Récupère l'ensemble des demandes de vérification pour le tableau de bord Administrateur
 */
export async function getAllVerificationApplications(filters = {}) {
  let list = [];

  // 1. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('owner_verification_applications')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      }
    } catch {}
  }

  // 2. Fusion avec le cache local
  const localList = getLocalApplications();
  const map = new Map();

  // Priorité aux données les plus fraîches
  [...list, ...localList].forEach((app) => {
    if (app && app.id) {
      if (!map.has(app.id) || new Date(app.updated_at) > new Date(map.get(app.id).updated_at)) {
        map.set(app.id, app);
      }
    }
  });

  let results = Array.from(map.values()).filter(
    (a) => a && a.id !== 'app_owner_patrice_demo' && a.owner_email !== 'proprietaire@beninbeyond.com'
  );

  // Filtrage
  if (filters.status && filters.status !== 'all') {
    results = results.filter((a) => a.status === filters.status);
  }
  if (filters.ownerType && filters.ownerType !== 'all') {
    results = results.filter((a) => a.owner_type === filters.ownerType);
  }
  if (filters.category && filters.category !== 'all') {
    results = results.filter((a) => Array.isArray(a.asset_categories) && a.asset_categories.includes(filters.category));
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    results = results.filter((a) =>
      (a.owner_name && a.owner_name.toLowerCase().includes(q)) ||
      (a.owner_email && a.owner_email.toLowerCase().includes(q)) ||
      (a.phone && a.phone.toLowerCase().includes(q)) ||
      (a.profile_data?.businessName && a.profile_data.businessName.toLowerCase().includes(q)) ||
      (a.profile_data?.ifuNumber && a.profile_data.ifuNumber.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

/**
 * Revue administrative d'un DOCUMENT SPÉCIFIQUE
 * @param {string} applicationId Identifiant de la demande
 * @param {string} ruleId Identifiant de la règle documentaire
 * @param {'approved' | 'rejected' | 'action_required'} decision Décision
 * @param {string} feedback Motif obligatoire si rejet ou demande de remplacement
 * @param {Object} adminUser Administrateur réalisant l'action
 */
export async function reviewIndividualDocument(applicationId, ruleId, decision, feedback = '', adminUser = {}) {
  const localList = getLocalApplications();
  const appIndex = localList.findIndex((a) => a.id === applicationId);

  if (appIndex < 0) {
    throw new Error('Dossier de vérification introuvable.');
  }

  const app = localList[appIndex];
  const doc = app.documents?.[ruleId];

  if (!doc) {
    throw new Error(`Document avec l'ID ${ruleId} introuvable dans ce dossier.`);
  }

  if ((decision === 'rejected' || decision === 'action_required') && !feedback.trim()) {
    throw new Error('Un motif précis et explicite est obligatoire pour demander un remplacement ou rejeter une pièce.');
  }

  const now = new Date().toISOString();
  const updatedDoc = {
    ...doc,
    status: decision,
    adminFeedback: feedback.trim(),
    reviewedAt: now,
    reviewedBy: adminUser.email || 'Direction de la Conformité'
  };

  const updatedDocs = {
    ...(app.documents || {}),
    [ruleId]: updatedDoc
  };

  // Si au moins un document nécessite une action, le statut global du dossier bascule automatiquement sur 'additional_info_required'
  const hasActionRequired = Object.values(updatedDocs).some((d) => d.status === 'action_required' || d.status === 'rejected');
  const allApproved = Object.values(updatedDocs).length > 0 && Object.values(updatedDocs).every((d) => d.status === 'approved');

  let newAppStatus = app.status;
  if (hasActionRequired) {
    newAppStatus = 'additional_info_required';
  } else if (allApproved && app.status === 'submitted') {
    newAppStatus = 'under_review';
  }

  const updatedApp = {
    ...app,
    documents: updatedDocs,
    status: newAppStatus,
    updated_at: now
  };

  localList[appIndex] = updatedApp;
  saveLocalApplications(localList);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('owner_verification_applications').upsert(updatedApp, { onConflict: 'id' });
    } catch {}
  }

  appendAuditLog({
    application_id: applicationId,
    user_id: app.user_id,
    user_email: app.owner_email,
    action: `DOCUMENT_${decision.toUpperCase()}`,
    actor_email: adminUser.email || 'admin@beninbeyond.com',
    actor_role: adminUser.role || 'admin',
    notes: `Document [${doc.name || ruleId}] : ${decision}. Observation : ${feedback || 'Conforme'}`
  });

  return updatedApp;
}

/**
 * Revue administrative GLOBALE du dossier de vérification
 * @param {string} applicationId Identifiant de la demande
 * @param {'approved' | 'rejected' | 'additional_info_required' | 'under_review'} decision Décision globale
 * @param {string} adminNotes Notes ou motivation administrative
 * @param {Object} adminUser Profil de l'administrateur
 */
export async function reviewApplicationOverall(applicationId, decision, adminNotes = '', adminUser = {}) {
  const localList = getLocalApplications();
  const appIndex = localList.findIndex((a) => a.id === applicationId);

  if (appIndex < 0) {
    throw new Error('Dossier de vérification introuvable.');
  }

  const app = localList[appIndex];
  const previousStatus = app.status;

  if (decision === 'rejected' && !adminNotes.trim()) {
    throw new Error('Le motif du refus du dossier est obligatoire.');
  }

  const now = new Date().toISOString();

  // Si approbation globale, tous les documents non rejetés sont marqués validés
  let updatedDocs = { ...(app.documents || {}) };
  if (decision === 'approved') {
    Object.keys(updatedDocs).forEach((k) => {
      if (updatedDocs[k] && updatedDocs[k].status !== 'rejected') {
        updatedDocs[k].status = 'approved';
      }
    });
  }

  const updatedApp = {
    ...app,
    documents: updatedDocs,
    status: decision,
    admin_feedback: adminNotes.trim(),
    rejection_reason: decision === 'rejected' ? adminNotes.trim() : (decision === 'approved' ? '' : app.rejection_reason),
    reviewed_at: now,
    reviewed_by: adminUser.email || 'Super-Administrateur',
    updated_at: now
  };

  localList[appIndex] = updatedApp;
  saveLocalApplications(localList);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('owner_verification_applications').upsert(updatedApp, { onConflict: 'id' });
    } catch {}
  }

  // Synchronisation du statut du profil utilisateur
  const userKycStatus = decision === 'approved' ? 'verified' : (decision === 'rejected' ? 'rejected' : 'pending');
  const userVerified = decision === 'approved';

  await updateUser(app.user_id, {
    email: app.owner_email,
    verified: userVerified,
    kyc_status: userKycStatus,
    rejection_reason: decision === 'rejected' ? adminNotes.trim() : ''
  });

  appendAuditLog({
    application_id: applicationId,
    user_id: app.user_id,
    user_email: app.owner_email,
    action: `APPLICATION_${decision.toUpperCase()}`,
    actor_email: adminUser.email || 'admin@beninbeyond.com',
    actor_role: adminUser.role || 'admin',
    previous_status: previousStatus,
    new_status: decision,
    notes: adminNotes || `Dossier passé en statut : ${decision}`
  });

  return updatedApp;
}

/**
 * Récupère le journal d'audit complet d'une demande spécifique
 */
export function getApplicationAuditTrail(applicationId) {
  const allLogs = getLocalAuditLog();
  return allLogs.filter((entry) => entry.application_id === applicationId);
}
