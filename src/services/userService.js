import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_registered_users';
const OVERRIDES_STORAGE_KEY = 'benin_beyond_user_admin_overrides';
const DELETED_USERS_KEY = 'benin_beyond_deleted_users';
const SUPER_ADMIN_EMAIL = 'isidoretoudonou@gmail.com';

function getAdminOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAdminOverride(key, overrides) {
  if (!key) return;
  try {
    const all = getAdminOverrides();
    const cleanKey = key.trim().toLowerCase();
    all[cleanKey] = {
      ...(all[cleanKey] || {}),
      ...overrides,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Failed to save admin user override:', e);
  }
}

function getDeletedUserIds() {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markUserAsDeleted(idOrEmail) {
  if (!idOrEmail) return;
  try {
    const set = getDeletedUserIds();
    set.add(idOrEmail.toString().trim().toLowerCase());
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const overrides = getAdminOverrides();
    const deleted = getDeletedUserIds();

    return list
      .filter((u) => {
        const email = (u.email || '').trim().toLowerCase();
        const id = (u.id || '').toString().toLowerCase();
        return !deleted.has(email) && !deleted.has(id);
      })
      .map((u) => {
        const email = (u.email || '').trim().toLowerCase();
        const id = (u.id || '').toString().toLowerCase();
        const isAdmin = email === SUPER_ADMIN_EMAIL || u.role === 'admin';
        const override = overrides[email] || overrides[id] || {};

        return {
          id: u.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: isAdmin ? 'Isidore Toudonou' : (override.name || u.name || email.split('@')[0]),
          email: email,
          phone: override.phone || u.phone || 'Non renseigné',
          role: isAdmin ? 'admin' : (override.role || u.role === 'owner' || u.role === 'partner' ? 'owner' : 'client'),
          company: override.company || u.company || (u.role === 'owner' ? 'Partenaire Hébergeur / Auto' : ''),
          partner_type: override.partner_type || u.partner_type || u.partnerType || 'stay',
          tax_id: override.tax_id || u.tax_id || u.taxId || '',
          rccm: override.rccm || u.rccm || '',
          cip: override.cip || u.cip || '',
          kyc_doc_type: override.kyc_doc_type || u.kyc_doc_type || u.kycDocType || 'Dossier Conforme',
          kyc_doc_url: override.kyc_doc_url || u.kyc_doc_url || u.kycDocUrl || '',
          kyc_status: isAdmin ? 'verified' : (override.kyc_status !== undefined ? override.kyc_status : (u.kyc_status || (u.verified ? 'verified' : 'pending'))),
          rejection_reason: override.rejection_reason !== undefined ? override.rejection_reason : (u.rejection_reason || ''),
          verified: isAdmin ? true : (override.verified !== undefined ? Boolean(override.verified) : Boolean(u.verified)),
          is_active: isAdmin ? true : (override.is_active !== undefined ? Boolean(override.is_active) : (u.is_active !== undefined ? u.is_active : true)),
          created_at: u.createdAt || u.created_at || new Date().toISOString()
        };
      });
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users to localStorage:', e);
  }
}

const withTimeout = (promise, ms = 3000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ms);
  });
  return Promise.race([
    Promise.resolve(promise).then(
      (res) => {
        clearTimeout(timeoutId);
        return res;
      },
      (err) => {
        clearTimeout(timeoutId);
        throw err;
      }
    ),
    timeoutPromise
  ]);
};

/**
 * Récupérer tous les utilisateurs de la plateforme (Supabase profiles + localStorage fusionnés avec priorités administrateur)
 */
export async function getUsers() {
  const localList = getLocalUsers();
  const overrides = getAdminOverrides();
  const deleted = getDeletedUserIds();

  if (isSupabaseConfigured && supabase) {
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbProfiles, error } = await withTimeout(queryPromise, 3000);

      if (!error && dbProfiles && dbProfiles.length > 0) {
        const emailMap = new Map();

        // 1. Ajouter d'abord les profils réels de Supabase non supprimés
        dbProfiles.forEach((p) => {
          const email = (p.email || '').trim().toLowerCase();
          const id = (p.id || '').toString().toLowerCase();
          if (!email || deleted.has(email) || deleted.has(id)) return;

          const isAdmin = email === SUPER_ADMIN_EMAIL || p.role === 'admin';
          const override = overrides[email] || overrides[id] || {};

          emailMap.set(email, {
            id: p.id,
            name: isAdmin ? 'Isidore Toudonou' : (override.name || p.full_name || email.split('@')[0]),
            email: email,
            phone: override.phone || p.phone || 'Non renseigné',
            role: isAdmin ? 'admin' : (override.role || (p.role === 'partner' || p.role === 'owner' ? 'owner' : 'client')),
            company: override.company || p.company_name || '',
            partner_type: override.partner_type || p.partner_type || 'stay',
            tax_id: override.tax_id || p.tax_id || '',
            rccm: override.rccm || p.rccm || '',
            cip: override.cip || p.cip || '',
            kyc_doc_type: override.kyc_doc_type || p.kyc_doc_type || 'Dossier Conforme',
            kyc_doc_url: override.kyc_doc_url || p.kyc_doc_url || '',
            kyc_status: isAdmin ? 'verified' : (override.kyc_status !== undefined ? override.kyc_status : (p.kyc_status || (p.verified ? 'verified' : 'pending'))),
            rejection_reason: override.rejection_reason !== undefined ? override.rejection_reason : (p.rejection_reason || ''),
            verified: isAdmin ? true : (override.verified !== undefined ? Boolean(override.verified) : Boolean(p.verified)),
            is_active: isAdmin ? true : (override.is_active !== undefined ? Boolean(override.is_active) : (p.is_active !== undefined ? p.is_active : true)),
            created_at: p.created_at || new Date().toISOString()
          });
        });

        // 2. Fusionner avec les comptes enregistrés localement
        localList.forEach((lu) => {
          const email = (lu.email || '').trim().toLowerCase();
          const id = (lu.id || '').toString().toLowerCase();
          if (!email || deleted.has(email) || deleted.has(id)) return;

          if (!emailMap.has(email)) {
            emailMap.set(email, lu);
          } else {
            const existing = emailMap.get(email);
            const override = overrides[email] || overrides[id] || {};
            emailMap.set(email, {
              ...existing,
              ...lu,
              ...override,
              kyc_status: override.kyc_status !== undefined ? override.kyc_status : (lu.kyc_status || existing.kyc_status),
              is_active: override.is_active !== undefined ? override.is_active : (lu.is_active !== undefined ? lu.is_active : existing.is_active),
              rejection_reason: override.rejection_reason !== undefined ? override.rejection_reason : (lu.rejection_reason || existing.rejection_reason || '')
            });
          }
        });

        const merged = Array.from(emailMap.values());
        saveLocalUsers(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Erreur chargement utilisateurs Supabase, fallback local:', err);
    }
  }

  return localList;
}

/**
 * Mettre à jour un utilisateur (Nom, Rôle, Société, Téléphone, Statut Actif, KYC)
 */
export async function updateUser(userId, updates) {
  const cleanEmail = (updates.email || '').trim().toLowerCase();
  const isAdmin = cleanEmail === SUPER_ADMIN_EMAIL;

  const currentList = getLocalUsers();
  const existingUser = currentList.find((u) => u.id === userId || (cleanEmail && u.email?.toLowerCase() === cleanEmail));

  const sanitizedUpdates = {
    ...updates,
    role: isAdmin ? 'admin' : (updates.role === 'owner' || updates.role === 'partner' ? 'owner' : updates.role || existingUser?.role || 'client'),
    name: isAdmin ? 'Isidore Toudonou' : (updates.name || existingUser?.name || cleanEmail.split('@')[0]),
    is_active: isAdmin ? true : (updates.is_active !== undefined ? Boolean(updates.is_active) : (existingUser?.is_active !== undefined ? existingUser.is_active : true)),
    kyc_status: isAdmin ? 'verified' : (updates.kyc_status || existingUser?.kyc_status || 'pending'),
    verified: isAdmin ? true : (updates.verified !== undefined ? Boolean(updates.verified) : (existingUser?.verified ?? false)),
    rejection_reason: updates.rejection_reason !== undefined ? updates.rejection_reason : (existingUser?.rejection_reason || '')
  };

  // 1. Sauvegarder immédiatement l'override administrateur prioritaire et indestructible
  if (cleanEmail) saveAdminOverride(cleanEmail, sanitizedUpdates);
  if (userId) saveAdminOverride(userId, sanitizedUpdates);

  // 2. Supabase (uniquement avec les colonnes valides existantes dans le schéma Supabase)
  if (isSupabaseConfigured && supabase) {
    try {
      const dbRole = sanitizedUpdates.role === 'admin' ? 'admin' : (sanitizedUpdates.role === 'owner' ? 'partner' : 'client');
      const payload = {
        full_name: sanitizedUpdates.name,
        role: dbRole,
        is_active: sanitizedUpdates.is_active,
        verified: sanitizedUpdates.verified,
        kyc_status: sanitizedUpdates.kyc_status,
        updated_at: new Date().toISOString()
      };
      if (sanitizedUpdates.phone && sanitizedUpdates.phone !== 'Non renseigné') payload.phone = sanitizedUpdates.phone;
      if (sanitizedUpdates.company) payload.company_name = sanitizedUpdates.company;
      if (sanitizedUpdates.tax_id) payload.tax_id = sanitizedUpdates.tax_id;
      if (sanitizedUpdates.partner_type) payload.partner_type = sanitizedUpdates.partner_type;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
      let query = supabase.from('profiles').update(payload);
      if (isUuid && cleanEmail) {
        query = query.or(`id.eq.${userId},email.ilike.${cleanEmail}`);
      } else if (isUuid) {
        query = query.eq('id', userId);
      } else if (cleanEmail) {
        query = query.ilike('email', cleanEmail);
      }
      await query;
    } catch (e) {
      console.warn('Erreur updateUser Supabase:', e);
    }
  }

  // 3. LocalStorage
  const list = getLocalUsers();
  let found = false;
  const updatedList = list.map((u) => {
    if (u.id === userId || (cleanEmail && u.email.toLowerCase() === cleanEmail)) {
      found = true;
      return {
        ...u,
        ...sanitizedUpdates
      };
    }
    return u;
  });
  if (!found && cleanEmail) {
    updatedList.unshift({
      id: userId || `usr_${Date.now()}`,
      email: cleanEmail,
      ...sanitizedUpdates
    });
  }
  saveLocalUsers(updatedList);

  // 4. Mettre à jour la session utilisateur active si c'est ce compte
  try {
    ['benin_beyond_user', 'benin_beyond_user_session'].forEach((key) => {
      const rawSession = localStorage.getItem(key);
      if (rawSession) {
        const current = JSON.parse(rawSession);
        if (current.email?.toLowerCase() === cleanEmail || current.id === userId) {
          localStorage.setItem(
            key,
            JSON.stringify({ ...current, ...sanitizedUpdates })
          );
        }
      }
    });
  } catch {}

  return sanitizedUpdates;
}

/**
 * Activer ou Désactiver un compte utilisateur
 */
export async function toggleUserStatus(userId, currentIsActive, userEmail = '') {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    throw new Error('Le compte Super-Administrateur principal ne peut pas être désactivé.');
  }

  const newStatus = !currentIsActive;
  return updateUser(userId, { email: userEmail, is_active: newStatus });
}

/**
 * Supprimer définitivement un utilisateur (protège le Super-Administrateur)
 */
export async function deleteUser(userId, userEmail = '') {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (cleanEmail === SUPER_ADMIN_EMAIL) {
    throw new Error('Le compte Super-Administrateur principal ne peut pas être supprimé.');
  }

  // 1. Inscrire immédiatement l'ID et l'email dans la liste noire des suppressions
  if (userId) markUserAsDeleted(userId);
  if (cleanEmail) markUserAsDeleted(cleanEmail);

  // 2. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
      let query = supabase.from('profiles').delete();
      if (isUuid && cleanEmail) {
        query = query.or(`id.eq.${userId},email.ilike.${cleanEmail}`);
      } else if (isUuid) {
        query = query.eq('id', userId);
      } else if (cleanEmail) {
        query = query.ilike('email', cleanEmail);
      }
      await query;
    } catch (e) {
      console.warn('Erreur deleteUser Supabase:', e);
    }
  }

  // 3. LocalStorage
  const list = getLocalUsers();
  const filtered = list.filter((u) => u.id !== userId && u.email.toLowerCase() !== cleanEmail);
  saveLocalUsers(filtered);

  return true;
}

/**
 * Valider le KYC d'un partenaire hôte / loueur
 */
export async function verifyPartnerKYC(userId, userEmail = '') {
  return updateUser(userId, {
    email: userEmail,
    verified: true,
    kyc_status: 'verified',
    rejection_reason: ''
  });
}

/**
 * Refuser le KYC d'un partenaire avec notification du motif
 */
export async function rejectPartnerKYC(userId, userEmail = '', reason = '') {
  return updateUser(userId, {
    email: userEmail,
    verified: false,
    kyc_status: 'rejected',
    rejection_reason: reason || 'Dossier KYC incomplet ou pièces non conformes.'
  });
}
