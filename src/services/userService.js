import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';

const STORAGE_KEY = 'benin_beyond_registered_users';
const SUPER_ADMIN_EMAIL = 'isidoretoudonou@gmail.com';

function getLocalUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.map((u) => {
      const email = (u.email || '').trim().toLowerCase();
      const isAdmin = email === SUPER_ADMIN_EMAIL || u.role === 'admin';
      return {
        id: u.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: isAdmin ? 'Isidore Toudonou' : (u.name || email.split('@')[0]),
        email: email,
        phone: u.phone || 'Non renseigné',
        role: isAdmin ? 'admin' : (u.role === 'owner' || u.role === 'partner' ? 'owner' : 'client'),
        company: u.company || (u.role === 'owner' ? 'Partenaire Hébergeur / Auto' : ''),
        partner_type: u.partner_type || u.partnerType || 'stay',
        tax_id: u.tax_id || u.taxId || '',
        rccm: u.rccm || '',
        cip: u.cip || '',
        kyc_doc_type: u.kyc_doc_type || u.kycDocType || 'Dossier Conforme',
        kyc_doc_url: u.kyc_doc_url || u.kycDocUrl || '',
        kyc_status: u.kyc_status || (isAdmin || u.verified ? 'verified' : 'pending'),
        verified: isAdmin ? true : Boolean(u.verified),
        is_active: u.is_active !== undefined ? u.is_active : (u.isActive !== undefined ? u.isActive : true),
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

/**
 * Récupérer tous les utilisateurs de la plateforme (Supabase profiles + localStorage fusionnés)
 */
export async function getUsers() {
  const localList = getLocalUsers();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: dbProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbProfiles && dbProfiles.length > 0) {
        const emailMap = new Map();

        // 1. Ajouter d'abord les profils réels de Supabase
        dbProfiles.forEach((p) => {
          const email = (p.email || '').trim().toLowerCase();
          if (!email) return;
          const isAdmin = email === SUPER_ADMIN_EMAIL || p.role === 'admin';
          emailMap.set(email, {
            id: p.id,
            name: isAdmin ? 'Isidore Toudonou' : (p.full_name || email.split('@')[0]),
            email: email,
            phone: p.phone || 'Non renseigné',
            role: isAdmin ? 'admin' : (p.role === 'partner' || p.role === 'owner' ? 'owner' : 'client'),
            company: p.company_name || '',
            partner_type: p.partner_type || 'stay',
            tax_id: p.tax_id || '',
            rccm: p.rccm || '',
            cip: p.cip || '',
            kyc_doc_type: p.kyc_doc_type || 'Dossier Conforme',
            kyc_doc_url: p.kyc_doc_url || '',
            kyc_status: p.kyc_status || (isAdmin || p.verified ? 'verified' : 'pending'),
            verified: isAdmin ? true : Boolean(p.verified),
            is_active: p.is_active !== undefined ? p.is_active : true,
            created_at: p.created_at || new Date().toISOString()
          });
        });

        // 2. Fusionner avec les comptes enregistrés localement
        localList.forEach((lu) => {
          const email = (lu.email || '').trim().toLowerCase();
          if (!email) return;
          if (!emailMap.has(email)) {
            emailMap.set(email, lu);
          } else {
            const existing = emailMap.get(email);
            emailMap.set(email, {
              ...existing,
              phone: existing.phone && existing.phone !== 'Non renseigné' ? existing.phone : (lu.phone || 'Non renseigné'),
              company: existing.company || lu.company || '',
              partner_type: existing.partner_type || lu.partner_type || 'stay',
              tax_id: existing.tax_id || lu.tax_id || '',
              rccm: existing.rccm || lu.rccm || '',
              cip: existing.cip || lu.cip || '',
              kyc_doc_type: existing.kyc_doc_type || lu.kyc_doc_type || 'Dossier Conforme',
              kyc_doc_url: existing.kyc_doc_url || lu.kyc_doc_url || '',
              kyc_status: existing.kyc_status || lu.kyc_status || 'pending',
              is_active: existing.is_active !== undefined ? existing.is_active : (lu.is_active !== undefined ? lu.is_active : true)
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
 * Mettre à jour un utilisateur (Nom, Rôle, Société, Téléphone, Statut Actif)
 */
export async function updateUser(userId, updates) {
  const cleanEmail = (updates.email || '').trim().toLowerCase();
  const isAdmin = cleanEmail === SUPER_ADMIN_EMAIL;

  const sanitizedUpdates = {
    ...updates,
    role: isAdmin ? 'admin' : (updates.role === 'owner' || updates.role === 'partner' ? 'owner' : updates.role || 'client'),
    name: isAdmin ? 'Isidore Toudonou' : (updates.name || cleanEmail.split('@')[0]),
    is_active: isAdmin ? true : Boolean(updates.is_active !== undefined ? updates.is_active : true)
  };

  // 1. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbRole = sanitizedUpdates.role === 'admin' ? 'admin' : (sanitizedUpdates.role === 'owner' ? 'partner' : 'client');
      const payload = {
        full_name: sanitizedUpdates.name,
        phone: sanitizedUpdates.phone,
        role: dbRole,
        company_name: sanitizedUpdates.company || '',
        is_active: sanitizedUpdates.is_active,
        updated_at: new Date().toISOString()
      };
      if (sanitizedUpdates.verified !== undefined) payload.verified = sanitizedUpdates.verified;
      if (sanitizedUpdates.kyc_status) payload.kyc_status = sanitizedUpdates.kyc_status;
      if (sanitizedUpdates.tax_id) payload.tax_id = sanitizedUpdates.tax_id;
      if (sanitizedUpdates.kyc_doc_type) payload.kyc_doc_type = sanitizedUpdates.kyc_doc_type;
      if (sanitizedUpdates.partner_type) payload.partner_type = sanitizedUpdates.partner_type;

      await supabase
        .from('profiles')
        .update(payload)
        .or(`id.eq.${userId},email.ilike.${cleanEmail}`);
    } catch (e) {
      console.warn('Erreur updateUser Supabase:', e);
    }
  }

  // 2. LocalStorage
  const list = getLocalUsers();
  const updatedList = list.map((u) => {
    if (u.id === userId || (cleanEmail && u.email.toLowerCase() === cleanEmail)) {
      return {
        ...u,
        ...sanitizedUpdates
      };
    }
    return u;
  });
  saveLocalUsers(updatedList);

  // 3. Mettre à jour la session utilisateur active si c'est ce compte
  try {
    const rawSession = localStorage.getItem('benin_beyond_user_session');
    if (rawSession) {
      const current = JSON.parse(rawSession);
      if (current.email?.toLowerCase() === cleanEmail || current.id === userId) {
        localStorage.setItem(
          'benin_beyond_user_session',
          JSON.stringify({ ...current, ...sanitizedUpdates })
        );
      }
    }
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

  // 1. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('profiles')
        .delete()
        .or(`id.eq.${userId},email.ilike.${cleanEmail}`);
    } catch (e) {
      console.warn('Erreur deleteUser Supabase:', e);
    }
  }

  // 2. LocalStorage
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
    kyc_status: 'verified'
  });
}
