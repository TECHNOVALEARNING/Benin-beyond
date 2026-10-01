import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faShieldHalved,
  faCalendarCheck,
  faUsers,
  faWallet,
  faLayerGroup,
  faHouse,
  faCar,
  faCheckCircle,
  faCircleCheck,
  faCircleXmark,
  faClock,
  faFilter,
  faMagnifyingGlass,
  faEye,
  faTrash,
  faBuilding,
  faPhone,
  faEnvelope,
  faChartPie,
  faArrowTrendUp,
  faMoneyBillWave,
  faPercent,
  faRightFromBracket,
  faBars,
  faXmark,
  faDownload,
  faReceipt,
  faHandHoldingDollar,
  faArrowUpRightFromSquare,
  faCircleExclamation,
  faCheck,
  faBan,
  faFileContract,
  faLocationDot,
  faCamera,
  faVideo,
  faTriangleExclamation,
  faPlay,
  faCirclePlus,
  faUpload,
  faImage,
  faPlus,
  faPen,
  faStar,
  faLock,
  faUserShield,
  faEyeSlash,
  faKey
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { getListings, deleteListing, updateListingStatus, addListing, getCustomListings, activateOwnerListings } from '../services/listingService';
import { getBookings, updateBookingStatus, deleteBooking } from '../services/bookingService';
import { getReviews, deleteReview } from '../services/reviewService';
import { getPacks, addPack, deletePack } from '../services/packService';
import { getEvents, addEvent, updateEvent, deleteEvent } from '../services/eventService';
import { getUsers, updateUser, toggleUserStatus, deleteUser, verifyPartnerKYC, rejectPartnerKYC, createAssistantAdmin } from '../services/userService';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { ScrollReveal } from '../components/ScrollReveal';
import { compressImage, compressImageToBlob } from '../utils/imageOptimizer';
import { uploadMediaFile, parseVideoEmbed } from '../services/mediaStorage';
import { ConfirmModal } from '../components/ConfirmModal';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';
import { getTimeBasedGreeting } from '../utils/dateUtils';
import { BrandIcon } from '../components/BrandLogo';
import { EvolutionAreaChart } from '../components/EvolutionAreaChart';
import { printInvoiceDocument } from '../utils/invoicePrinter';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin: authIsSuperAdmin, updateSuperAdminPassword } = useAuth();
  const isSuperAdmin = Boolean(
    authIsSuperAdmin ||
    user?.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com' ||
    user?.is_super_admin
  );
  const isSubAdmin = !isSuperAdmin;

  // Navigation State persisté pour conserver la vue sélectionnée après actualisation (F5)
  const [currentSection, setCurrentSection] = useState(() => {
    try {
      const saved = localStorage.getItem('benin_beyond_admin_section') || 'cockpit';
      if (!isSuperAdmin && saved === 'users') return 'cockpit';
      return saved;
    } catch {
      return 'cockpit';
    }
  });

  useEffect(() => {
    if (!isSuperAdmin && currentSection === 'users') {
      setCurrentSection('cockpit');
      try {
        localStorage.setItem('benin_beyond_admin_section', 'cockpit');
      } catch {}
    }
  }, [isSuperAdmin, currentSection]);

  const handleSetSection = (sec) => {
    setCurrentSection(sec);
    try {
      localStorage.setItem('benin_beyond_admin_section', sec);
    } catch {}
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states (Chargement instantané 0ms depuis le cache + rafraîchissement Supabase en tâche de fond)
  const [listings, setListings] = useState(() => getCustomListings());
  const [bookings, setBookings] = useState([]);
  const [partners, setPartners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [events, setEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [compressingPhotos, setCompressingPhotos] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'danger',
    onConfirm: null
  });

  // Users Management State & Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'client' | 'owner' | 'admin'
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormRole, setUserFormRole] = useState('client');
  const [userFormCompany, setUserFormCompany] = useState('');
  const [userFormIsActive, setUserFormIsActive] = useState(true);

  // Assistant Admin (Sub-Admin) creation modal state (Super-Admin exclusive)
  const [showAddAssistantModal, setShowAddAssistantModal] = useState(false);
  const [newAssistantName, setNewAssistantName] = useState('');
  const [newAssistantEmail, setNewAssistantEmail] = useState('');
  const [newAssistantPhone, setNewAssistantPhone] = useState('');
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);

  // Super-Admin Password Management Modal State
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showAdminPasswordText, setShowAdminPasswordText] = useState(false);
  const [adminPasswordSaving, setAdminPasswordSaving] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState('');

  // Events Management Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtBadge, setEvtBadge] = useState('Festival International');
  const [evtPeriod, setEvtPeriod] = useState('');
  const [evtLocation, setEvtLocation] = useState('Ouidah');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtImage, setEvtImage] = useState('');
  const [evtTag, setEvtTag] = useState('Culture & Spiritualité');

  // Modals & Details
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [selectedKycModal, setSelectedKycModal] = useState(null);
  const [mediaAuditModal, setMediaAuditModal] = useState(null);
  const [rejectionModalListing, setRejectionModalListing] = useState(null);
  const [rejectionPresetReason, setRejectionPresetReason] = useState('Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)');
  const [rejectionCustomNote, setRejectionCustomNote] = useState('');

  // KYC Rejection Modal states (Admin review)
  const [rejectionKycPartner, setRejectionKycPartner] = useState(null);
  const [rejectionKycPresetReason, setRejectionKycPresetReason] = useState('Numéro IFU invalide ou non conforme DGI Bénin');
  const [rejectionKycCustomNote, setRejectionKycCustomNote] = useState('');

  // Filters & Searches
  const [listingSearch, setListingSearch] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all' | 'stay' | 'drive'
  const [listingStatusFilter, setListingStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'refused' | 'suspended'
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'confirmed' | 'pending'
  const [bookingSearch, setBookingSearch] = useState('');

  // Host & Direct Property Creation states inside Admin Cockpit
  const [formType, setFormType] = useState('stay'); // 'stay' | 'drive'
  const [formSubcategory, setFormSubcategory] = useState('villa'); // 'villa' | 'hotel'
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('Cotonou, Haie Vive');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceUnit, setFormPriceUnit] = useState('nuit');
  const [formPurpose, setFormPurpose] = useState('location'); // 'location' | 'vente'
  const [formDescription, setFormDescription] = useState('');
  const [formSpecs, setFormSpecs] = useState('4 Chambres, Piscine privée, Climatisation, Wi-Fi Fibre');
  const [adminInstantPublish, setAdminInstantPublish] = useState(true); // Direct online as Super-Admin

  // Pack Creation Modal & Form States (Super-Admin Exclusive)
  const [showNewPackModal, setShowNewPackModal] = useState(false);
  const [packTitle, setPackTitle] = useState('');
  const [packTagline, setPackTagline] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [packRegularPrice, setPackRegularPrice] = useState('');
  const [packPriceUnit, setPackPriceUnit] = useState('jour');
  const [packLocation, setPackLocation] = useState('Cotonou & Littoral');
  const [packBadge, setPackBadge] = useState('Offre Privilège');
  const [packStayTitle, setPackStayTitle] = useState('');
  const [packStayImage, setPackStayImage] = useState('');
  const [packDriveTitle, setPackDriveTitle] = useState('');
  const [packDriveImage, setPackDriveImage] = useState('');
  const [packAdvantages, setPackAdvantages] = useState('Prise en charge aéroport VIP\nPlein de carburant offert au départ\nConciergerie dédiée 24/7\nKilométrage illimité');
  const [packDescription, setPackDescription] = useState('');

  // Custom Photos & Video state
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null); // { url, previewUrl, name, sizeMB }
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/admin' } } });
    } else if (user.role !== 'admin' && user.role !== 'subadmin') {
      if (user.role === 'owner' || user.role === 'partner') {
        navigate('/dashboard/partner', { replace: true });
      } else {
        navigate('/dashboard/client', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allListings, allBookings, allPacks, allEvents, allUsers, allReviews] = await Promise.all([
        getListings({ includePending: true }),
        getBookings(),
        getPacks(),
        getEvents(),
        getUsers(),
        getReviews()
      ]);
      setListings(allListings || []);
      setBookings(allBookings || []);
      setPacks(allPacks || []);
      setEvents(allEvents || []);
      setUsersList(allUsers || []);
      setReviewsList(allReviews || []);

      // Récupération des partenaires réels depuis le registre unifié
      const ownerUsers = (allUsers || []).filter((u) => u.role === 'owner' || u.role === 'partner');
      setPartners(ownerUsers.map((p) => ({
        id: p.id,
        name: p.name || p.email.split('@')[0],
        company: p.company || 'Partenaire Bénin Beyond',
        email: p.email,
        phone: p.phone || 'Non renseigné',
        listingsCount: (allListings || []).filter((l) => l.owner_id === p.id || l.owner_email === p.email).length,
        kycStatus: p.kyc_status === 'rejected' ? 'rejected' : (p.kyc_status === 'verified' || p.verified ? 'verified' : 'pending'),
        taxId: p.tax_id || p.taxId || 'Non renseigné',
        rccm: p.rccm || '',
        cip: p.cip || '',
        partnerType: p.partner_type || p.partnerType || 'stay',
        docType: p.kyc_doc_type || p.kycDocType || 'Dossier Justificatif',
        docUrl: p.kyc_doc_url || p.kycDocUrl || '',
        joined: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Récemment',
        rejectionReason: p.rejection_reason || '',
        isActive: p.is_active !== false,
        balance: 0
      })));

      let fetchedPayouts = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: pData } = await supabase
            .from('payouts')
            .select('*')
            .order('created_at', { ascending: false });
          fetchedPayouts = pData || [];
        } catch {
          fetchedPayouts = [];
        }
      }
      try {
        const localP = JSON.parse(localStorage.getItem('benin_beyond_payouts') || '[]');
        const existingIds = new Set(fetchedPayouts.map((p) => p.id));
        localP.forEach((lp) => {
          if (!existingIds.has(lp.id)) {
            fetchedPayouts.push(lp);
          }
        });
      } catch {}
      setPayouts(fetchedPayouts);
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    } finally {
      setLoading(false);
    }
  };

  // Event Handlers for Cultural Events CRUD
  const handleOpenCreateEvent = () => {
    setEditingEvent(null);
    setEvtTitle('');
    setEvtBadge('Festival International');
    setEvtPeriod('');
    setEvtLocation('Ouidah');
    setEvtDescription('');
    setEvtImage('https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80');
    setEvtTag('Culture & Spiritualité');
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (evt) => {
    setEditingEvent(evt);
    setEvtTitle(evt.title || '');
    setEvtBadge(evt.badge || '');
    setEvtPeriod(evt.period || '');
    setEvtLocation(evt.location || '');
    setEvtDescription(evt.description || '');
    setEvtImage(evt.image || '');
    setEvtTag(evt.tag || '');
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!evtTitle || !evtPeriod || !evtLocation) {
      showToast('Veuillez renseigner le titre, la période et le lieu.');
      return;
    }

    if (editingEvent) {
      await updateEvent(editingEvent.id, {
        title: evtTitle,
        badge: evtBadge,
        period: evtPeriod,
        location: evtLocation,
        description: evtDescription,
        image: evtImage,
        tag: evtTag
      });
      showToast(`Événement "${evtTitle}" mis à jour avec succès !`);
    } else {
      await addEvent({
        title: evtTitle,
        badge: evtBadge,
        period: evtPeriod,
        location: evtLocation,
        description: evtDescription,
        image: evtImage,
        tag: evtTag
      });
      showToast(`Nouvel événement "${evtTitle}" publié en direct !`);
    }

    const updated = await getEvents();
    setEvents(updated);
    setShowEventModal(false);
  };

  const handleDeleteEvent = (id, title) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer l'événement",
      message: `Voulez-vous vraiment supprimer définitivement l'événement culturel "${title}" ? Cette action retirera l'événement de l'agenda public.`,
      confirmText: "Supprimer l'événement",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await deleteEvent(id);
        const updated = await getEvents();
        setEvents(updated);
        showToast(`Événement "${title}" supprimé.`);
      }
    });
  };

  // User Management Handlers (Super-Admin)
  const handleOpenEditUser = (targetUser) => {
    setEditingUser(targetUser);
    setUserFormName(targetUser.name || '');
    setUserFormEmail(targetUser.email || '');
    setUserFormPhone(targetUser.phone !== 'Non renseigné' ? (targetUser.phone || '') : '');
    setUserFormRole(targetUser.role || 'client');
    setUserFormCompany(targetUser.company || '');
    setUserFormIsActive(targetUser.is_active !== false);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        email: userFormEmail,
        name: userFormName,
        phone: userFormPhone || 'Non renseigné',
        role: userFormRole,
        company: userFormCompany,
        is_active: userFormIsActive
      });
      showToast(`Utilisateur "${userFormName}" mis à jour avec succès !`);
      const updated = await getUsers();
      setUsersList(updated);
      setShowUserModal(false);
    } catch (err) {
      showToast(err.message || 'Erreur lors de la modification');
    }
  };

  const handleToggleUserActive = (targetUser) => {
    const willBeActive = targetUser.is_active === false;
    const actionName = willBeActive ? 'réactiver' : 'désactiver temporairement';
    setConfirmDialog({
      isOpen: true,
      title: `${willBeActive ? 'Réactiver' : 'Désactiver'} l'utilisateur`,
      message: `Confirmez-vous vouloir ${actionName} le compte de "${targetUser.name}" (${targetUser.email}) ?`,
      confirmText: willBeActive ? 'Réactiver le compte' : 'Désactiver le compte',
      cancelText: 'Annuler',
      variant: willBeActive ? 'success' : 'warning',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await toggleUserStatus(targetUser.id, targetUser.is_active, targetUser.email);
          showToast(`Compte de ${targetUser.name} ${willBeActive ? 'réactivé' : 'désactivé'}.`);
          const updated = await getUsers();
          setUsersList(updated);
        } catch (err) {
          showToast(err.message || 'Erreur action utilisateur');
        }
      }
    });
  };

  const handleDeleteUserRecord = (targetUser) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Suppression définitive du compte',
      message: `ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement le compte de "${targetUser.name}" (${targetUser.email}) ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteUser(targetUser.id, targetUser.email);
          showToast(`Utilisateur "${targetUser.name}" supprimé.`);
          const updated = await getUsers();
          setUsersList(updated);
        } catch (err) {
          showToast(err.message || 'Erreur suppression utilisateur');
        }
      }
    });
  };

  const handleCreateAssistant = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Action non autorisée. Réservée au Super-Administrateur.');
      return;
    }
    if (!newAssistantEmail.trim() || !newAssistantName.trim()) {
      showToast("Veuillez renseigner le nom et l'adresse email de l'assistant.");
      return;
    }
    setIsCreatingAssistant(true);
    try {
      await createAssistantAdmin({
        name: newAssistantName,
        email: newAssistantEmail,
        phone: newAssistantPhone
      });
      showToast(`Assistant Admin "${newAssistantName}" créé avec succès !`);
      setShowAddAssistantModal(false);
      setNewAssistantName('');
      setNewAssistantEmail('');
      setNewAssistantPhone('');
      const updated = await getUsers();
      setUsersList(updated);
    } catch (err) {
      showToast(err.message || "Erreur lors de la création de l'assistant.");
    } finally {
      setIsCreatingAssistant(false);
    }
  };

  const handleSaveAdminPassword = (e) => {
    e.preventDefault();
    setAdminPasswordError('');
    const trimmed = (adminPasswordInput || '').trim();
    if (!trimmed) {
      setAdminPasswordError('Veuillez saisir votre nouveau mot de passe.');
      return;
    }
    if (trimmed.length < 4) {
      setAdminPasswordError('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (trimmed !== (adminPasswordConfirm || '').trim()) {
      setAdminPasswordError('Les deux mots de passe saisis ne sont pas identiques.');
      return;
    }

    setAdminPasswordSaving(true);
    try {
      const ok = updateSuperAdminPassword(trimmed);
      if (ok) {
        showToast('Votre mot de passe Super-Administrateur a été enregistré avec succès !');
        setShowAdminPasswordModal(false);
        setAdminPasswordInput('');
        setAdminPasswordConfirm('');
      } else {
        setAdminPasswordError('Erreur lors de la mise à jour du mot de passe.');
      }
    } catch {
      setAdminPasswordError('Une erreur inattendue est survenue.');
    } finally {
      setAdminPasswordSaving(false);
    }
  };

  const handleCreatePack = async (e) => {
    e.preventDefault();
    if (!packTitle || !packPrice) {
      showToast('Veuillez renseigner le titre et le tarif du pack.');
      return;
    }

    const priceNum = parseInt(packPrice, 10) || 100000;
    const regPriceNum = parseInt(packRegularPrice, 10) || Math.round(priceNum * 1.15);

    const newPackObj = {
      id: `pack-${Date.now()}`,
      title: packTitle,
      tagline: packTagline || 'Hébergement d’exception + Véhicule VIP avec conciergerie',
      price: priceNum,
      regularPrice: regPriceNum,
      priceUnit: packPriceUnit,
      savings: Math.max(0, regPriceNum - priceNum),
      location: packLocation,
      badge: packBadge || 'Offre Privilège',
      rating: 5.0,
      reviewsCount: 1,
      included: [
        {
          type: 'Hébergement',
          title: packStayTitle || 'Villa Royale ou Suite de Prestige',
          image: packStayImage || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'
        },
        {
          type: 'Véhicule',
          title: packDriveTitle || 'SUV 4x4 ou Berline avec Chauffeur Dédié',
          image: packDriveImage || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
        }
      ],
      advantages: packAdvantages.split('\n').map((s) => s.trim()).filter(Boolean),
      description: packDescription || 'Formule combinée exclusive créée et garantie par la Direction Bénin Beyond.',
      gallery: [
        packStayImage || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        packDriveImage || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80'
      ]
    };

    await addPack(newPackObj);
    const updated = await getPacks();
    setPacks(updated);
    setShowNewPackModal(false);
    showToast(`Pack "${packTitle}" créé et publié en ligne !`);

    // Reset pack form
    setPackTitle('');
    setPackTagline('');
    setPackPrice('');
    setPackRegularPrice('');
    setPackStayTitle('');
    setPackStayImage('');
    setPackDriveTitle('');
    setPackDriveImage('');
    setPackDescription('');
  };

  const handleDeletePack = (packId, title) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer le pack combiné",
      message: `Confirmez-vous la suppression définitive du pack "${title}" ? Il sera retiré de la vente en ligne.`,
      confirmText: "Supprimer le pack",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await deletePack(packId);
        const updated = await getPacks();
        setPacks(updated);
        showToast(`Pack "${title}" supprimé.`);
      }
    });
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Photo handlers for Admin Property Publishing (Optimisation haute résolution et stockage structuré)
  const handlePhotoUpload = async (e) => {
    setPhotoError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setCompressingPhotos(true);
    try {
      const adminOwnerId = user?.id || 'admin';
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setPhotoError('Format non supporté. Veuillez choisir des photos JPG, PNG ou WebP.');
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          setPhotoError(`L'image "${file.name}" dépasse 25 Mo.`);
          continue;
        }

        try {
          // Compression haute résolution 2048x1536 qualité 90% pour un rendu net et fidèle
          const optimizedBlob = await compressImageToBlob(file, 2048, 1536, 0.90);
          const uploadedUrl = await uploadMediaFile(optimizedBlob, {
            userId: adminOwnerId,
            listingId: 'admin_listing',
            category: 'photos'
          });

          if (uploadedUrl) {
            setUploadedPhotos((prev) => [...prev, uploadedUrl]);
          } else {
            const dataUrl = await compressImage(file, 2048, 1536, 0.90);
            setUploadedPhotos((prev) => [...prev, dataUrl]);
          }
        } catch (err) {
          console.warn('Erreur téléversement image admin:', err);
          const reader = new FileReader();
          reader.onload = (event) => {
            setUploadedPhotos((prev) => [...prev, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      }
    } finally {
      setCompressingPhotos(false);
    }
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    setUploadedPhotos((prev) => [...prev, photoUrlInput.trim()]);
    setPhotoUrlInput('');
    setPhotoError('');
  };

  const handleRemovePhoto = (idx) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
    if (featuredPhotoIndex >= idx && featuredPhotoIndex > 0) {
      setFeaturedPhotoIndex((prev) => prev - 1);
    }
  };

  // Video handlers (short tour video, max 50MB ou lien web)
  const handleVideoUpload = async (e) => {
    setVideoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setVideoError('Format vidéo non supporté. Veuillez choisir une vidéo MP4 ou WebM.');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50) {
      setVideoError(`Cette vidéo fait ${sizeMB.toFixed(1)} Mo. Pour préserver la fluidité mobile, la taille maximale est de 50 Mo.`);
      return;
    }

    setIsUploadingVideo(true);
    try {
      const adminOwnerId = user?.id || 'admin';
      const persistentUrl = await uploadMediaFile(file, {
        userId: adminOwnerId,
        listingId: 'admin_listing',
        category: 'videos'
      });
      const objectUrl = URL.createObjectURL(file);
      setUploadedVideo({
        url: persistentUrl,
        previewUrl: objectUrl,
        name: file.name,
        sizeMB: sizeMB.toFixed(1)
      });
    } catch (err) {
      console.warn('Erreur téléversement vidéo admin:', err);
      setVideoError('Impossible de traiter ce fichier vidéo. Vous pouvez également coller un lien URL (YouTube, Drive, etc.).');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleAddVideoUrl = () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setVideoError('Veuillez entrer une adresse URL valide commençant par https://');
      return;
    }
    const embedInfo = parseVideoEmbed(trimmed);
    setUploadedVideo({
      url: trimmed,
      previewUrl: trimmed,
      name: embedInfo?.serviceName ? `Vidéo ${embedInfo.serviceName}` : 'Vidéo en ligne',
      sizeMB: 'Web'
    });
    setVideoUrlInput('');
    setVideoError('');
  };

  const handleRemoveVideo = () => {
    if (uploadedVideo?.previewUrl && uploadedVideo.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedVideo.previewUrl);
    }
    setUploadedVideo(null);
    setVideoError('');
  };

  // Submit Listing by Admin directly inside Cockpit
  const handleAdminPublishSubmit = async (e) => {
    e.preventDefault();
    setPhotoError('');
    setVideoError('');

    if (uploadedPhotos.length === 0) {
      setPhotoError("Vous devez ajouter au moins une photo en haute résolution du bien.");
      return;
    }

    const specsArray = formSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const priceNum = parseInt(formPrice, 10) || (formType === 'stay' ? 85000 : 50000);

    // Reorder photos so featured photo is first
    const finalGallery = [...uploadedPhotos];
    if (featuredPhotoIndex > 0 && featuredPhotoIndex < finalGallery.length) {
      const [feat] = finalGallery.splice(featuredPhotoIndex, 1);
      finalGallery.unshift(feat);
    }

    const adminOwnerId = user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      ? user.id
      : 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

    const newListing = await addListing({
      title: formTitle || (formType === 'stay' ? 'Résidence de Standing Bénin Beyond' : 'Véhicule de Prestige Bénin Beyond'),
      type: formType,
      rooms_count: formType === 'stay' ? (formSubcategory === 'hotel' ? Number(roomsCount) : Math.max(1, Number(roomsCount) || 1)) : 0,
      vehicle_seats: formType === 'drive' ? 5 : 0,
      transmission: formType === 'drive' ? 'automatique' : null,
      fuel_type: formType === 'drive' ? 'essence' : null,
      with_driver: formType === 'drive' ? false : false,
      availability: formType === 'stay' && formSubcategory === 'hotel' ? {
        available_from: availableFrom || null,
        available_to: availableTo || null,
        rooms_count: Number(roomsCount)
      } : undefined,
      location: formLocation,
      price: priceNum,
      price_unit: formPurpose === 'vente' ? 'vente totale' : formPriceUnit,
      description: formDescription || 'Hébergement ou véhicule haut de gamme certifié par la direction Bénin Beyond.',
      badge: adminInstantPublish ? 'Vérifié par Bénin Beyond' : 'En attente de modération',
      specs: specsArray.length > 0 ? specsArray : ['Climatisation', 'Sécurité 24/7', 'Standing Exclusif'],
      gallery: finalGallery,
      video_url: uploadedVideo?.url || null,
      status: adminInstantPublish ? 'active' : 'pending',
      owner_id: adminOwnerId,
      owner_name: user?.name || 'Direction Plateforme Bénin Beyond',
      owner_email: user?.email || 'isidoretoudonou@gmail.com'
    });

    setListings((prev) => [newListing, ...prev.filter((l) => l.id !== newListing.id)]);
    setPublishSuccess(`Le bien "${newListing.title}" a été créé avec succès et est immédiatement EN LIGNE dans le catalogue et dans votre inventaire !`);
    showToast(adminInstantPublish ? `Bien "${newListing.title}" publié en ligne avec succès !` : `Bien "${newListing.title}" créé en attente.`);

    // Reset form
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    setUploadedPhotos([]);
    setUploadedVideo(null);

    // Basculer automatiquement sur l'inventaire des biens pour que l'admin le voie immédiatement
    setTimeout(() => {
      handleSetSection('catalog_inventory');
    }, 1200);
  };

  // Financial calculations 100% réelles
  const platformMetrics = useMemo(() => {
    const totalGmv = bookings.reduce((sum, b) => sum + (Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0), 0);
    const totalCommissions = bookings.reduce((sum, b) => sum + (Number(b.commission_amount) || Math.round((Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0) * 0.10)), 0);
    const totalDisbursed = totalGmv - totalCommissions;
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;
    const pendingKycCount = partners.filter((p) => p.kycStatus === 'pending' || p.kyc_status === 'pending').length;
    const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;

    return {
      gmv: totalGmv,
      commissions: totalCommissions,
      disbursed: totalDisbursed,
      activeListings: listings.filter((l) => l.status === 'active' || !l.status).length,
      partnersCount: partners.length,
      pendingBookingsCount,
      pendingPayoutsCount,
      pendingKycCount,
      pendingListingsCount
    };
  }, [bookings, listings, partners, payouts]);

  // Évolution financière dynamique (Montée à chaque achat, baisse aux annulations, paliers réels)
  const evolutionData = useMemo(() => {
    if (bookings.length === 0) return [];

    const sorted = [...bookings].sort((a, b) => {
      const ta = new Date(a.created_at || a.created_date || 0).getTime();
      const tb = new Date(b.created_at || b.created_date || 0).getTime();
      return ta - tb;
    });

    let runningGmv = 0;
    let runningComm = 0;
    const history = [];

    // Point de départ antérieur pour tracer la première montée
    const firstDate = sorted[0]?.created_at ? new Date(sorted[0].created_at) : new Date();
    const prevDate = new Date(firstDate.getTime() - 24 * 60 * 60 * 1000);
    history.push({
      label: prevDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      date: prevDate.toLocaleDateString('fr-FR'),
      value: 0,
      secondaryValue: 0,
      changeType: 'flat'
    });

    sorted.forEach((b) => {
      const gmv = Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0;
      const comm = Number(b.commission_amount) || Math.round(gmv * 0.10);
      const isCancelled = b.status === 'cancelled';

      if (isCancelled) {
        // En cas d'annulation : le chiffre d'affaires actif diminue fidèlement
        runningGmv = Math.max(0, runningGmv - gmv);
        runningComm = Math.max(0, runningComm - comm);
      } else {
        // En cas d'achat : le chiffre d'affaires monte
        runningGmv += gmv;
        runningComm += comm;
      }

      const d = b.created_at ? new Date(b.created_at) : new Date();
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

      history.push({
        label,
        date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
        value: runningGmv,
        secondaryValue: runningComm,
        changeType: isCancelled ? 'down' : 'up',
        bookingRef: b.booking_ref
      });
    });

    return history;
  }, [bookings]);

  // Statistiques mensuelles réelles
  const monthlyStats = useMemo(() => {
    if (bookings.length === 0) {
      return [];
    }
    const monthsMap = {};
    bookings.forEach((b) => {
      const d = b.created_at ? new Date(b.created_at) : new Date();
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
      if (!monthsMap[monthName]) {
        monthsMap[monthName] = { month: monthName, gmv: 0, commission: 0 };
      }
      const gmv = Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0;
      const comm = Number(b.commission_amount) || Math.round(gmv * 0.10);
      monthsMap[monthName].gmv += gmv;
      monthsMap[monthName].commission += comm;
    });
    return Object.values(monthsMap);
  }, [bookings]);

  // Répartition réelle des canaux de paiement
  const paymentBreakdown = useMemo(() => {
    if (bookings.length === 0) return null;
    const totals = { mtn: 0, moov: 0, celtiis: 0, card: 0 };
    bookings.forEach((b) => {
      const pm = (b.payment_method || '').toLowerCase();
      if (pm.includes('mtn')) totals.mtn += 1;
      else if (pm.includes('moov')) totals.moov += 1;
      else if (pm.includes('celtiis')) totals.celtiis += 1;
      else if (pm.includes('carte') || pm.includes('visa') || pm.includes('card')) totals.card += 1;
      else totals.mtn += 1;
    });
    const total = bookings.length || 1;
    return {
      mtn: Math.round((totals.mtn / total) * 100),
      moov: Math.round((totals.moov / total) * 100),
      celtiis: Math.round((totals.celtiis / total) * 100),
      card: Math.round((totals.card / total) * 100)
    };
  }, [bookings]);

  // Actions
  const handleToggleListingStatus = async (id) => {
    const current = listings.find((l) => l.id === id);
    const newStatus = current?.status === 'suspended' ? 'active' : 'suspended';
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    await updateListingStatus(id, newStatus);
    showToast('Statut de l’annonce mis à jour sur la marketplace.');
  };

  const handleApproveListing = async (id) => {
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'active', rejection_reason: '' } : item))
    );
    if (mediaAuditModal && mediaAuditModal.id === id) {
      setMediaAuditModal((prev) => ({ ...prev, status: 'active', rejection_reason: '' }));
    }
    await updateListingStatus(id, 'active');
    showToast("L'annonce a été approuvée et mise en ligne avec succès !");
  };

  const handleSuspendListing = async (id) => {
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'suspended' } : item))
    );
    if (mediaAuditModal && mediaAuditModal.id === id) {
      setMediaAuditModal((prev) => ({ ...prev, status: 'suspended' }));
    }
    await updateListingStatus(id, 'suspended');
    showToast("L'annonce a été suspendue et retirée de la mise en ligne.");
  };

  const handleOpenRejectionModal = (listing) => {
    setRejectionModalListing(listing);
    setRejectionPresetReason('Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)');
    setRejectionCustomNote('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectionModalListing) return;
    const finalReason = rejectionCustomNote.trim()
      ? `${rejectionPresetReason} — ${rejectionCustomNote.trim()}`
      : rejectionPresetReason;

    const targetId = rejectionModalListing.id;
    setListings((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? { ...item, status: 'refused', rejection_reason: finalReason }
          : item
      )
    );
    showToast(`Annonce refusée : motif de non-conformité notifié.`);
    setRejectionModalListing(null);
    if (mediaAuditModal && mediaAuditModal.id === targetId) {
      setMediaAuditModal((prev) => ({ ...prev, status: 'refused', rejection_reason: finalReason }));
    }
    await updateListingStatus(targetId, 'refused', finalReason);
  };

  const handleDeleteListingItem = (id, title) => {
    setConfirmDialog({
      isOpen: true,
      title: "Retirer l'annonce du catalogue",
      message: `Voulez-vous retirer définitivement l'annonce "${title}" de Bénin Beyond ? Le bien sera immédiatement supprimé du catalogue public.`,
      confirmText: "Supprimer l'annonce",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setListings((prev) => prev.filter((item) => item.id !== id));
        if (mediaAuditModal && mediaAuditModal.id === id) {
          setMediaAuditModal(null);
        }
        showToast(`L'annonce "${title}" a été supprimée.`);
        await deleteListing(id);
      }
    });
  };

  const handleUpdateBooking = async (bookingId, newStatus) => {
    await updateBookingStatus(bookingId, newStatus);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId || b.booking_ref === bookingId
          ? { ...b, status: newStatus }
          : b
      )
    );
    if (selectedBookingModal && (selectedBookingModal.id === bookingId || selectedBookingModal.booking_ref === bookingId)) {
      setSelectedBookingModal((prev) => ({ ...prev, status: newStatus }));
    }
    showToast(`Réservation mise à jour : Statut "${newStatus}".`);
  };

  const handleDeleteBookingItem = (bookingId, bookingRef) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer la réservation",
      message: `Voulez-vous supprimer définitivement la réservation "${bookingRef || bookingId}" ? Cette action effacera la réservation du système.`,
      confirmText: "Supprimer définitivement",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setBookings((prev) =>
          prev.filter(
            (b) =>
              b.id !== bookingId &&
              b.booking_ref !== bookingId &&
              (!bookingRef || (b.id !== bookingRef && b.booking_ref !== bookingRef))
          )
        );
        if (
          selectedBookingModal &&
          (selectedBookingModal.id === bookingId ||
            selectedBookingModal.booking_ref === bookingId ||
            (bookingRef && (selectedBookingModal.id === bookingRef || selectedBookingModal.booking_ref === bookingRef)))
        ) {
          setSelectedBookingModal(null);
        }
        showToast(`La réservation "${bookingRef || bookingId}" a été supprimée.`);
        await deleteBooking(bookingId, bookingRef);
      }
    });
  };

  const handleDeleteReviewItem = (reviewId, authorName, bookingId = null) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer l'avis client",
      message: `Voulez-vous supprimer définitivement cet avis de ${authorName || 'ce voyageur'} ? Cette action le retirera de la base de données et de l'affichage public.`,
      confirmText: "Supprimer l'avis",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setReviewsList((prev) =>
          prev.filter(
            (r) =>
              r.id !== reviewId &&
              (!bookingId || (r.booking_id !== bookingId && r.id !== bookingId))
          )
        );
        showToast("L'avis voyageur a été supprimé avec succès.");
        await deleteReview(reviewId, bookingId);
      }
    });
  };

  const handleApprovePayout = async (payoutId) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'approved' } : p))
    );
    try {
      const stored = JSON.parse(localStorage.getItem('benin_beyond_payouts') || '[]');
      const updated = stored.map((p) => (p.id === payoutId ? { ...p, status: 'approved' } : p));
      localStorage.setItem('benin_beyond_payouts', JSON.stringify(updated));
    } catch {}
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payouts').update({ status: 'approved' }).eq('id', payoutId);
      } catch (err) {
        console.warn('Supabase payout approve error:', err);
      }
    }
    showToast(`Virement validé pour le partenaire !`);
  };

  const handleRejectPayout = async (payoutId) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'rejected' } : p))
    );
    try {
      const stored = JSON.parse(localStorage.getItem('benin_beyond_payouts') || '[]');
      const updated = stored.map((p) => (p.id === payoutId ? { ...p, status: 'rejected' } : p));
      localStorage.setItem('benin_beyond_payouts', JSON.stringify(updated));
    } catch {}
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payouts').update({ status: 'rejected' }).eq('id', payoutId);
      } catch (err) {
        console.warn('Supabase payout reject error:', err);
      }
    }
    showToast(`Demande de versement rejetée.`);
  };

  const handleVerifyPartnerKyc = async (partnerId, partnerEmail = '') => {
    try {
      await verifyPartnerKYC(partnerId, partnerEmail);

      // Activation automatique et immédiate de toutes les annonces en attente du partenaire
      const { activatedCount, updatedListings } = await activateOwnerListings(partnerId, partnerEmail);
      if (activatedCount > 0 && Array.isArray(updatedListings)) {
        setListings(updatedListings);
      }

      setPartners((prev) =>
        prev.map((p) => (p.id === partnerId ? { ...p, kycStatus: 'verified', rejectionReason: '' } : p))
      );
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === partnerId || (partnerEmail && u.email?.toLowerCase() === partnerEmail.toLowerCase())
            ? { ...u, verified: true, kyc_status: 'verified', rejection_reason: '' }
            : u
        )
      );
      if (selectedKycModal && (selectedKycModal.id === partnerId || selectedKycModal.email === partnerEmail)) {
        setSelectedKycModal((prev) => ({ ...prev, kycStatus: 'verified', rejectionReason: '' }));
      }
      showToast(
        activatedCount > 0
          ? `Partenaire certifié avec succès ! ${activatedCount} annonce(s) en attente mise(s) en ligne automatiquement.`
          : 'Partenaire certifié conforme (KYC validé avec succès).'
      );
    } catch (err) {
      console.error('Erreur validation KYC:', err);
      showToast('Erreur lors de la validation du KYC.');
    }
  };

  const handleOpenRejectKycModal = (partner) => {
    setRejectionKycPartner(partner);
    setRejectionKycPresetReason('Numéro IFU invalide ou non conforme DGI Bénin');
    setRejectionKycCustomNote('');
  };

  const handleConfirmRejectKyc = async () => {
    if (!rejectionKycPartner) return;
    const finalReason = rejectionKycCustomNote.trim()
      ? `${rejectionKycPresetReason} — ${rejectionKycCustomNote.trim()}`
      : rejectionKycPresetReason;

    try {
      await rejectPartnerKYC(rejectionKycPartner.id, rejectionKycPartner.email, finalReason);
      setPartners((prev) =>
        prev.map((p) =>
          p.id === rejectionKycPartner.id || (rejectionKycPartner.email && p.email?.toLowerCase() === rejectionKycPartner.email.toLowerCase())
            ? { ...p, kycStatus: 'rejected', rejectionReason: finalReason }
            : p
        )
      );
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === rejectionKycPartner.id || (rejectionKycPartner.email && u.email?.toLowerCase() === rejectionKycPartner.email.toLowerCase())
            ? { ...u, verified: false, kyc_status: 'rejected', rejection_reason: finalReason }
            : u
        )
      );
      if (selectedKycModal && (selectedKycModal.id === rejectionKycPartner.id || selectedKycModal.email === rejectionKycPartner.email)) {
        setSelectedKycModal((prev) => ({ ...prev, kycStatus: 'rejected', rejectionReason: finalReason }));
      }
      showToast('Dossier KYC rejeté : motif de non-conformité notifié au partenaire.');
      setRejectionKycPartner(null);
    } catch (err) {
      console.error('Erreur rejet KYC:', err);
      showToast('Erreur lors du rejet du dossier KYC.');
    }
  };

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchType = listingTypeFilter === 'all' || item.type === listingTypeFilter;
      const q = listingSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.owner_name?.toLowerCase().includes(q);

      const matchStatus =
        listingStatusFilter === 'all' ||
        (listingStatusFilter === 'pending' && item.status === 'pending') ||
        (listingStatusFilter === 'active' && (item.status === 'active' || !item.status)) ||
        (listingStatusFilter === 'refused' && item.status === 'refused') ||
        (listingStatusFilter === 'suspended' && item.status === 'suspended');

      return matchType && matchSearch && matchStatus;
    });
  }, [listings, listingTypeFilter, listingSearch, listingStatusFilter]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchFilter = bookingFilter === 'all' || b.status === bookingFilter;
      const q = bookingSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.booking_ref?.toLowerCase().includes(q) ||
        b.listing_title?.toLowerCase().includes(q) ||
        b.customer_phone?.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [bookings, bookingFilter, bookingSearch]);

  // Filtered users & metrics
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.company?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q);

      const matchRole =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'client' && u.role === 'client') ||
        (userRoleFilter === 'owner' && (u.role === 'owner' || u.role === 'partner')) ||
        (userRoleFilter === 'subadmin' && u.role === 'subadmin') ||
        (userRoleFilter === 'admin' && (u.role === 'admin' || u.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com'));

      const matchStatus =
        userStatusFilter === 'all' ||
        (userStatusFilter === 'active' && u.is_active !== false) ||
        (userStatusFilter === 'suspended' && u.is_active === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [usersList, userSearch, userRoleFilter, userStatusFilter]);

  const userMetrics = useMemo(() => {
    const total = usersList.length;
    const clients = usersList.filter((u) => u.role === 'client' && u.is_active !== false).length;
    const owners = usersList.filter((u) => (u.role === 'owner' || u.role === 'partner') && u.is_active !== false).length;
    const subadmins = usersList.filter((u) => u.role === 'subadmin' && u.is_active !== false).length;
    const suspended = usersList.filter((u) => u.is_active === false).length;
    return { total, clients, owners, subadmins, suspended };
  }, [usersList]);

  const filteredReviews = useMemo(() => {
    return reviewsList.filter((rev) => {
      const matchSearch =
        !reviewSearch ||
        rev.author_name?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.author_email?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.comment?.toLowerCase().includes(reviewSearch.toLowerCase());
      const matchRating =
        reviewRatingFilter === 'all' || String(rev.rating) === String(reviewRatingFilter);
      return matchSearch && matchRating;
    });
  }, [reviewsList, reviewSearch, reviewRatingFilter]);

  const navGroups = [
    {
      title: isSuperAdmin ? 'SUPERVISION & GOUVERNANCE' : 'OPÉRATIONS & MODÉRATION DÉLÉGUÉE',
      items: [
        { key: 'cockpit', label: 'Tour de Contrôle', icon: faCrown },
        {
          key: 'moderation',
          label: 'Modération Catalogue',
          icon: faShieldHalved,
          badge: platformMetrics.pendingListingsCount > 0 ? `${platformMetrics.pendingListingsCount} en attente` : null,
          badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-500/40'
        },
        {
          key: 'reservations',
          label: 'Réservations Globales',
          icon: faCalendarCheck,
          badge: platformMetrics.pendingBookingsCount > 0 ? `${platformMetrics.pendingBookingsCount} à valider` : null,
          badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-500/40'
        },
        {
          key: 'partners',
          label: 'Hôtes & Partenaires',
          icon: faBuilding,
          badge: platformMetrics.pendingKycCount > 0 ? `${platformMetrics.pendingKycCount} audit KYC` : null,
          badgeColor: 'bg-rose-500/25 text-rose-300 border-rose-500/40'
        },
        ...(isSuperAdmin
          ? [
              {
                key: 'users',
                label: 'Gestion Utilisateurs',
                icon: faUsers,
                badge: usersList.length > 0 ? `${usersList.length} comptes` : null,
                badgeColor: 'bg-primary/20 text-primary border-primary/30'
              }
            ]
          : []),
        { key: 'finances', label: 'Trésorerie & Marges', icon: faWallet },
        { key: 'packs', label: 'Formules & Packs', icon: faLayerGroup },
        {
          key: 'events',
          label: 'Événements & Agenda',
          icon: faCalendarCheck,
          badge: events.length > 0 ? `${events.length} publiés` : null,
          badgeColor: 'bg-primary/20 text-primary border-primary/30'
        },
        {
          key: 'reviews',
          label: 'Avis & Retours Clients',
          icon: faStar,
          badge: reviewsList.length > 0 ? `${reviewsList.length} avis` : null,
          badgeColor: 'bg-amber-500/25 text-amber-300 border-amber-500/40'
        }
      ]
    },
    {
      title: 'CRÉATION & INVENTAIRE (PROPRIÉTAIRE)',
      items: [
        {
          key: 'publish',
          label: 'Publier une annonce',
          icon: faCirclePlus,
          isHighlight: true,
          badge: 'Direct en ligne',
          badgeColor: 'bg-accent text-black font-extrabold'
        },
        {
          key: 'catalog_inventory',
          label: 'Inventaire des Biens',
          icon: faHouse,
          badge: `${listings.length} biens`,
          badgeColor: 'bg-white/10 text-white/70 border-white/15'
        }
      ]
    }
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  return (
    <div className="h-screen w-screen overflow-hidden bg-muted/20 text-foreground flex flex-col md:flex-row">
      
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. SIDEBAR NAVIGATION (Apple-grade Minimalist Luxury - STRICTLY PINNED, NO SCROLL) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:w-[272px] h-[100dvh] max-h-[100dvh] md:h-screen bg-secondary text-secondary-foreground transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col justify-between border-r border-white/[0.08] select-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Logo & Superviseur status in compact, Apple-grade header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group" title="Retourner à l'accueil du site">
              <BrandIcon size={26} />
              <div className="flex items-center gap-2">
                <span className="font-heading text-[15px] font-bold tracking-wide text-white group-hover:text-accent transition-colors">
                  Bénin Beyond
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isSuperAdmin ? 'Superviseur' : 'Assistant Admin'}
                </span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="px-2.5 py-2.5 space-y-3 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-0.5">
                <div className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-widest text-white/45 font-heading">
                  {group.title}
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = currentSection === item.key;
                    if (item.isHighlight) {
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            handleSetSection(item.key);
                            setSidebarOpen(false);
                          }}
                          className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-semibold transition-all duration-150 btn-press ${
                            isActive
                              ? 'bg-accent text-secondary shadow-xs'
                              : 'bg-accent/15 text-accent hover:bg-accent/25 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FontAwesomeIcon
                              icon={item.icon}
                              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                isActive ? 'text-secondary' : 'text-accent group-hover:text-white'
                              }`}
                            />
                            <span className="font-heading tracking-wide text-[13.5px] truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                isActive ? 'bg-black/20 text-secondary' : 'bg-accent text-secondary'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          handleSetSection(item.key);
                          setSidebarOpen(false);
                        }}
                        className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-150 btn-press ${
                          isActive
                            ? 'bg-white/[0.12] text-white shadow-xs font-semibold nav-active-indicator'
                            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FontAwesomeIcon
                            icon={item.icon}
                            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                              isActive ? 'text-accent' : 'text-white/50 group-hover:text-white'
                            }`}
                          />
                          <span className="font-heading tracking-wide text-[13.5px] truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                              isActive
                                ? 'bg-black/30 text-white border-transparent'
                                : item.badgeColor
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer (Apple-grade compact footer) */}
        <div className="p-3 border-t border-white/[0.08] space-y-1.5 shrink-0 bg-secondary pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-accent" />
            <span>Voir le site public</span>
          </Link>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setAdminPasswordError('');
                setAdminPasswordInput('');
                setAdminPasswordConfirm('');
                setShowAdminPasswordModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-accent" />
              <span>Changer mon mot de passe</span>
            </button>
          )}

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center sm:justify-start gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-bold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-all shadow-sm active:scale-95"
            title="Se déconnecter"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5 text-rose-400" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER - INDEPENDENT FLUID SCROLL */}
      {/* ========================================================================= */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 flex flex-col scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-foreground/10 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg border border-foreground/10 text-foreground hover:bg-muted shrink-0"
              aria-label="Ouvrir le menu"
            >
              <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-heading text-base sm:text-lg font-bold text-foreground truncate">
                {currentSection === 'publish'
                  ? (isSuperAdmin ? 'Publier une Annonce' : 'Nouvelle Annonce')
                  : currentSection === 'catalog_inventory'
                  ? 'Inventaire des Biens'
                  : allNavItems.find((n) => n.key === currentSection)?.label || 'Administration'}
              </h1>
              <p className="text-[11px] text-foreground/60 truncate">
                {getTimeBasedGreeting()}, {user?.name || (isSuperAdmin ? 'Super-Admin' : 'Assistant')}
                <span className="hidden lg:inline"> • {isSuperAdmin ? 'Supervision générale & gouvernance' : 'Cockpit Assistant Admin'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Action: Publier un bien */}
            <button
              onClick={() => setCurrentSection('publish')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                currentSection === 'publish'
                  ? 'bg-accent text-black ring-2 ring-accent/40 shadow-accent/20'
                  : 'bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 hover:text-accent-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faCirclePlus} className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">+ Publier un bien</span>
            </button>

            {platformMetrics.pendingBookingsCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>{platformMetrics.pendingBookingsCount} résa(s)</span>
              </span>
            )}
            
            <Link
              to="/explore"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-primary transition-colors"
            >
              <span>Catalogue</span>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 text-foreground/40" />
            </Link>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setAdminPasswordError('');
                  setAdminPasswordInput('');
                  setAdminPasswordConfirm('');
                  setShowAdminPasswordModal(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/25 transition-all shadow-sm"
                title="Modifier mon mot de passe Super-Admin"
              >
                <FontAwesomeIcon icon={faLock} className="h-3 w-3" />
                <span>Mon mot de passe</span>
              </button>
            )}

            {/* Quick Logout Button directly on mobile */}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Feedback Toast */}
        {toastMessage && (
          <div className="m-6 mb-0 rounded-2xl bg-primary/15 border border-primary/30 p-4 text-xs font-semibold text-primary flex items-center gap-2 animate-toast-in">
            <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Section Content */}
        <div key={currentSection} className="flex-1 p-6 md:p-8 space-y-8 animate-section-enter">

          {/* ========================================================================= */}
          {/* SECTION 1: COCKPIT MACRO (TOUR DE CONTRÔLE) */}
          {/* ========================================================================= */}
          {currentSection === 'cockpit' && (
            <div className="space-y-8 animate-section-stagger">
              {/* Macro KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm card-hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <span className="caption text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">
                      Volume Global (GMV)
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-black text-foreground">
                    {formatPrice(platformMetrics.gmv)}
                  </p>
                  <p className="text-[11px] text-foreground/60 font-medium mt-1">
                    {bookings.length} réservation{bookings.length > 1 ? 's' : ''} enregistrée{bookings.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 shadow-sm card-hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <span className="caption text-[11px] uppercase tracking-wider text-foreground/75 font-semibold">
                      Commissions Bénin Beyond (10%)
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground">
                      <FontAwesomeIcon icon={faPercent} className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-black text-foreground">
                    {formatPrice(platformMetrics.commissions)}
                  </p>
                  <p className="text-[11px] text-foreground/70 font-medium mt-1">
                    Revenus nets conservés par la plateforme
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm card-hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <span className="caption text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">
                      Biens & Flottes Actifs
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-foreground/70">
                      <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-black text-foreground">
                    {platformMetrics.activeListings}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    Villas, appartements & véhicules vérifiés
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm card-hover-lift">
                  <div className="flex items-center justify-between mb-3">
                    <span className="caption text-[11px] uppercase tracking-wider text-foreground/60 font-semibold">
                      Hôtes & Partenaires
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center text-foreground/70">
                      <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="font-heading text-2xl font-black text-foreground">
                    {platformMetrics.partnersCount}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    Propriétaires certifiés au Bénin
                  </p>
                </div>
              </div>

              {/* Graphe d'Évolution Financière Ultra-Moderne Bénin Beyond */}
              <EvolutionAreaChart
                title="Évolution des Flux Financiers"
                subtitle="Volume d'affaires global (Paiements) & Commissions de la plateforme (10%)"
                data={evolutionData.length > 0 ? evolutionData : monthlyStats.map(m => ({ label: m.month, value: m.gmv, secondaryValue: m.commission }))}
                valueLabel="Volume Global Encaissé"
                secondaryLabel="Commissions Bénin Beyond (10%)"
                height={290}
              />

              {/* Quick Action Cards Grid */}
              {/* Quick Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => handleSetSection('moderation')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group card-hover-lift btn-press"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
                    </span>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Modérer les annonces
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1">
                    Gérer la conformité et les suspensions du catalogue ({listings.length} actifs).
                  </p>
                </div>

                <div
                  onClick={() => handleSetSection('reservations')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group card-hover-lift btn-press"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FontAwesomeIcon icon={faCalendarCheck} className="h-4 w-4" />
                    </span>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Superviser les réservations
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1">
                    Contrôler les réservations clients et l'attribution conciergerie.
                  </p>
                </div>

                <div
                  onClick={() => handleSetSection('partners')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group card-hover-lift btn-press"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground group-hover:bg-accent group-hover:text-black transition-colors">
                      <FontAwesomeIcon icon={faHandHoldingDollar} className="h-4 w-4" />
                    </span>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Demandes de versement
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1">
                    {payouts.filter((p) => p.status === 'pending').length} demande(s) de virement Mobile Money en attente d'approbation.
                  </p>
                </div>
              </div>

              {/* Dernières Annonces & Biens Récemment Publiés */}
              <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-foreground/10">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                      <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-primary" />
                      Dernières Annonces & Biens en Ligne
                    </h3>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      Visualisez instantanément vos annonces actives sans quitter le cockpit ({listings.length} au total)
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleSetSection('publish')}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-all"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                      Publier un bien
                    </button>
                    <button
                      onClick={() => handleSetSection('catalog_inventory')}
                      className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all"
                    >
                      Voir tout l'inventaire ({listings.length})
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 text-foreground/50" />
                    </button>
                  </div>
                </div>

                {listings.length === 0 ? (
                  <div className="py-12 text-center">
                    <FontAwesomeIcon icon={faHouse} className="h-10 w-10 text-foreground/20 mb-3" />
                    <p className="text-sm font-semibold text-foreground/70">Aucune annonce trouvée pour le moment.</p>
                    <p className="text-xs text-foreground/40 mt-1">Cliquez sur « Publier un bien » pour ajouter votre première propriété ou véhicule.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {listings.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="group flex flex-col justify-between rounded-xl border border-foreground/10 bg-background/50 hover:bg-background hover:border-primary/40 transition-all p-3.5 shadow-xs"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-18 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border border-foreground/10">
                            {item.gallery && item.gallery[0] ? (
                              <img
                                src={item.gallery[0]}
                                alt={item.title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-foreground/30">
                                <FontAwesomeIcon icon={item.type === 'vehicle' ? faCar : faHouse} className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                item.type === 'vehicle' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              }`}>
                                <FontAwesomeIcon icon={item.type === 'vehicle' ? faCar : faHouse} className="h-2.5 w-2.5" />
                                {item.type === 'vehicle' ? 'Véhicule' : 'Séjour'}
                              </span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                item.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : item.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              }`}>
                                {item.status === 'approved' ? 'En ligne' : item.status === 'pending' ? 'En attente' : 'Suspendu'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-foreground/60 flex items-center gap-1 mt-0.5 line-clamp-1">
                              <FontAwesomeIcon icon={faLocationDot} className="h-2.5 w-2.5 shrink-0 text-foreground/40" />
                              {item.location || 'Bénin'}
                            </p>
                            <p className="text-xs font-bold text-primary mt-1">
                              {formatPrice(item.price)} <span className="text-[10px] font-normal text-foreground/60">{item.price_unit || (item.type === 'vehicle' ? '/jour' : '/nuit')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-foreground/10 text-xs">
                          <Link
                            to={`/details/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70 hover:text-primary transition-colors"
                          >
                            <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                            Voir la fiche
                          </Link>
                          <button
                            onClick={() => handleSetSection('catalog_inventory')}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            Gérer dans l'inventaire →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: MODÉRATION DU CATALOGUE */}
          {/* ========================================================================= */}
          {currentSection === 'moderation' && (
            <div className="space-y-6 animate-section-stagger">
              {/* Filter and Search Bar */}
              <div className="flex flex-col gap-4 bg-card p-4 rounded-2xl border border-foreground/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40"
                    />
                    <input
                      type="text"
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      placeholder="Rechercher par titre, ville ou hôte..."
                      className="w-full rounded-xl border border-foreground/15 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Category Type Filter */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setListingTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        listingTypeFilter === 'all'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Tous ({listings.length})
                    </button>
                    <button
                      onClick={() => setListingTypeFilter('stay')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        listingTypeFilter === 'stay'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      🏡 Séjours
                    </button>
                    <button
                      onClick={() => setListingTypeFilter('drive')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        listingTypeFilter === 'drive'
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      🚗 Véhicules
                    </button>
                  </div>
                </div>

                {/* Status Tabs Filter (Pending, Active, Refused, Suspended) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-foreground/10 text-xs">
                  <span className="text-[11px] font-semibold text-foreground/60 mr-1">Filtrer par statut :</span>
                  <button
                    onClick={() => setListingStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      listingStatusFilter === 'all'
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    Tous ({listings.length})
                  </button>

                  <button
                    onClick={() => setListingStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      listingStatusFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                    <span>En attente ({listings.filter((l) => l.status === 'pending').length})</span>
                  </button>

                  <button
                    onClick={() => setListingStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      listingStatusFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" />
                    <span>En ligne ({listings.filter((l) => l.status === 'active' || !l.status).length})</span>
                  </button>

                  <button
                    onClick={() => setListingStatusFilter('refused')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      listingStatusFilter === 'refused'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                    <span>Refusées ({listings.filter((l) => l.status === 'refused').length})</span>
                  </button>

                  <button
                    onClick={() => setListingStatusFilter('suspended')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      listingStatusFilter === 'suspended'
                        ? 'bg-neutral-600 text-white shadow-sm'
                        : 'bg-neutral-500/10 text-neutral-700 hover:bg-neutral-500/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faBan} className="text-[10px]" />
                    <span>Suspendues ({listings.filter((l) => l.status === 'suspended').length})</span>
                  </button>
                </div>
              </div>

              {/* Listings Table */}
              <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Bien ou Véhicule</th>
                        <th className="p-4">Médias Fournis</th>
                        <th className="p-4">Catégorie</th>
                        <th className="p-4">Localisation</th>
                        <th className="p-4">Prix Public</th>
                        <th className="p-4">Hôte / Agence</th>
                        <th className="p-4">Statut Modération</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {filteredListings.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-foreground/50">
                            Aucune annonce ne correspond aux filtres sélectionnés.
                          </td>
                        </tr>
                      ) : (
                        filteredListings.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=120&q=80'}
                                  alt={item.title}
                                  className="h-11 w-16 object-cover rounded-lg border border-foreground/10 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setMediaAuditModal(item)}
                                  title="Cliquer pour inspecter les photos"
                                />
                                <div>
                                  <p className="font-bold text-foreground line-clamp-1">
                                    {item.title}
                                  </p>
                                  <span className="text-[10px] text-foreground/50 font-mono">
                                    ID: {item.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Médias & Vidéo */}
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[10px] font-semibold text-foreground/80">
                                  <FontAwesomeIcon icon={faCamera} className="text-primary text-[9px]" />
                                  <span>{item.gallery?.length || 1} photo(s)</span>
                                </span>

                                {item.video_url ? (
                                  <button
                                    onClick={() => setMediaAuditModal(item)}
                                    className="inline-flex items-center gap-1 bg-accent text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-sm hover:bg-accent/80 transition-colors"
                                    title="Regarder la visite vidéo"
                                  >
                                    <FontAwesomeIcon icon={faVideo} className="text-[9px]" />
                                    <span>Vidéo dispo</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-foreground/40 italic">Sans vidéo</span>
                                )}
                              </div>
                            </td>

                            <td className="p-4">
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                                {item.type === 'stay' ? 'Hébergement' : 'Véhicule'}
                              </span>
                            </td>

                            <td className="p-4 text-foreground/70">
                              {item.location}
                            </td>

                            <td className="p-4 font-bold text-foreground">
                              {formatPrice(item.price)}
                              <span className="text-[10px] text-foreground/50 font-normal">
                                {' '}/{item.price_unit || 'nuit'}
                              </span>
                            </td>

                            <td className="p-4 text-foreground/80">
                              {item.owner_name || 'Hôte Partenaire'}
                            </td>

                            {/* Statut Modération */}
                            <td className="p-4">
                              {item.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold border border-amber-500/30">
                                  <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" />
                                  À Contrôler
                                </span>
                              ) : item.status === 'refused' ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold border border-rose-500/30 cursor-pointer"
                                  title={item.rejection_reason || 'Non conforme'}
                                  onClick={() => handleOpenRejectionModal(item)}
                                >
                                  <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
                                  Refusée
                                </span>
                              ) : item.status === 'suspended' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/15 text-neutral-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faBan} className="h-2.5 w-2.5" />
                                  Suspendue
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" />
                                  En Ligne (Active)
                                </span>
                              )}
                            </td>

                            {/* Actions de modération */}
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Bouton Inspection Médias */}
                                <button
                                  onClick={() => setMediaAuditModal(item)}
                                  className="p-1.5 rounded-lg border border-accent/40 bg-accent/10 text-accent-foreground hover:bg-accent hover:text-black transition-colors"
                                  title="Auditer les photos et la vidéo"
                                >
                                  <FontAwesomeIcon icon={faCamera} className="h-3 w-3" />
                                </button>

                                {/* Bouton Approuver */}
                                {item.status !== 'active' && item.status && (
                                  <button
                                    onClick={() => handleApproveListing(item.id)}
                                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                    title="Approuver et mettre en ligne"
                                  >
                                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Bouton Refuser avec motif */}
                                {item.status !== 'refused' && (
                                  <button
                                    onClick={() => handleOpenRejectionModal(item)}
                                    className="p-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Refuser l'annonce (Photos/vidéo non conformes)"
                                  >
                                    <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Bouton Voir Public */}
                                <Link
                                  to={`/listing/${item.id}`}
                                  className="p-1.5 rounded-lg border border-foreground/10 text-foreground/70 hover:text-primary hover:border-primary transition-colors"
                                  title="Voir fiche publique"
                                >
                                  <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                                </Link>

                                {/* Bouton Supprimer Définitivement */}
                                <button
                                  onClick={() => handleDeleteListingItem(item.id, item.title)}
                                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                                  title="Supprimer définitivement"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: RÉSERVATIONS GLOBALES */}
          {/* ========================================================================= */}
          {currentSection === 'reservations' && (
            <div className="space-y-6 animate-section-stagger">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-4 rounded-2xl border border-foreground/10">
                <div className="relative flex-1 max-w-md">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40"
                  />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Rechercher par client, référence ou bien..."
                    className="w-full rounded-xl border border-foreground/15 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBookingFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bookingFilter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    Toutes ({bookings.length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('confirmed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bookingFilter === 'confirmed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    Confirmées
                  </button>
                  <button
                    onClick={() => setBookingFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bookingFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-muted text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    En Attente
                  </button>
                </div>
              </div>

              {/* Bookings Table */}
              <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Réf & Voyageur</th>
                        <th className="p-4">Prestation réservée</th>
                        <th className="p-4">Dates</th>
                        <th className="p-4">Brut Client</th>
                        <th className="p-4">Com. Bénin Beyond (10%)</th>
                        <th className="p-4">Net Hôte (90%)</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {filteredBookings.map((b) => {
                        const gross = Number(b.gross_amount) || 0;
                        const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
                        const net = gross - comm;

                        return (
                          <tr key={b.id || b.booking_ref} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-foreground">
                                {b.customer_name}
                              </p>
                              <p className="text-[11px] text-foreground/60">
                                {b.customer_phone}
                              </p>
                              <span className="font-mono text-[10px] text-accent font-bold">
                                {b.booking_ref}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-foreground">
                              {b.listing_title}
                            </td>
                            <td className="p-4 text-foreground/70 whitespace-nowrap">
                              {b.dates || 'Séjour à venir'}
                            </td>
                            <td className="p-4 font-bold text-foreground">
                              {formatPrice(gross)}
                            </td>
                            <td className="p-4 font-bold text-accent">
                              +{formatPrice(comm)}
                            </td>
                            <td className="p-4 font-bold text-emerald-700">
                              {formatPrice(net)}
                            </td>
                            <td className="p-4">
                              {b.status === 'confirmed' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" />
                                  Confirmée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faClock} className="h-2.5 w-2.5" />
                                  En attente
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedBookingModal(b)}
                                  className="p-1.5 rounded-lg border border-foreground/10 text-foreground/70 hover:text-primary transition-colors"
                                  title="Voir le reçu détaillé"
                                >
                                  <FontAwesomeIcon icon={faReceipt} className="h-3.5 w-3.5" />
                                </button>
                                {b.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateBooking(b.id || b.booking_ref, 'confirmed')}
                                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                                  >
                                    Valider
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteBookingItem(b.id || b.booking_ref, b.booking_ref)}
                                  className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors"
                                  title="Supprimer la réservation"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: HÔTES, PARTENAIRES & VÉRIFICATION KYC */}
          {/* ========================================================================= */}
          {currentSection === 'partners' && (
            <div className="space-y-8 animate-section-stagger">
              {/* Payout Requests Pending Admin Approval */}
              <div className="rounded-3xl border border-accent/40 bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-foreground/10">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faHandHoldingDollar} className="h-4 w-4 text-accent" />
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Demandes de Versement Partenaires (Mobile Money & Banque)
                    </h3>
                  </div>
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                    {payouts.filter((p) => p.status === 'pending').length} en attente
                  </span>
                </div>

                <div className="space-y-3">
                  {payouts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-foreground/50 border border-dashed border-foreground/10 rounded-2xl">
                      Aucune demande de reversement en attente.
                    </div>
                  ) : (
                    payouts.map((po) => (
                      <div
                        key={po.id}
                        className="rounded-2xl border border-foreground/10 bg-background/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{po.partnerName || po.partner_name || 'Partenaire'}</span>
                            <span className="text-xs text-foreground/60">({po.company || 'Hôte / Loueur'})</span>
                          </div>
                          <p className="text-xs text-foreground/70 mt-1">
                            Canal : <strong className="text-primary">{po.method}</strong> • Bénéficiaire : <span className="font-mono">{po.recipient}</span>
                          </p>
                          <p className="text-[11px] text-foreground/40 mt-0.5">
                            Date demande : {po.date || (po.created_at ? new Date(po.created_at).toLocaleDateString('fr-FR') : 'Récemment')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-heading text-base font-black text-foreground">
                              {formatPrice(po.amount)}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              po.status === 'approved' ? 'text-emerald-600' : po.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                            }`}>
                              {po.status === 'approved' ? '✓ Virement Exécuté' : po.status === 'rejected' ? '✕ Rejeté' : '⏳ En attente validation'}
                            </span>
                          </div>

                          {po.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprovePayout(po.id)}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleRejectPayout(po.id)}
                                className="rounded-xl border border-rose-500/30 hover:bg-rose-50 text-rose-600 px-3 py-1.5 text-xs font-bold transition-all"
                              >
                                Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Partners Directory & KYC Audit */}
              <div className="rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
                <div className="p-6 border-b border-foreground/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Annuaire des Hôtes & Audits Légaux (KYC)
                    </h3>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      Vérification des titres fonciers, cartes grises et pièces d'identité
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Hôte / Représentant</th>
                        <th className="p-4">Enseigne commerciale</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Conformité Bénin (IFU & Pièce)</th>
                        <th className="p-4">Statut KYC</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {partners.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-foreground/50">
                            Aucun partenaire inscrit pour le moment. Les nouveaux propriétaires et loueurs apparaîtront automatiquement ici lors de leur inscription.
                          </td>
                        </tr>
                      ) : (
                        partners.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-foreground">{p.name}</p>
                              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {p.partnerType === 'stay' ? '🏡 Hébergements' : p.partnerType === 'drive' ? '🚗 Mobilité VIP' : '🌟 Stay & Drive'}
                              </span>
                            </td>
                            <td className="p-4 text-foreground/80 font-medium">
                              {p.company}
                            </td>
                            <td className="p-4">
                              <p className="text-foreground/80 font-mono text-[11px]">{p.phone}</p>
                              <p className="text-[11px] text-foreground/50">{p.email}</p>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[11px] font-bold text-foreground">
                                  IFU: {p.taxId || 'Non renseigné'}
                                </span>
                                {p.rccm && (
                                  <span className="font-mono text-[10px] text-foreground/70">
                                    RCCM: {p.rccm}
                                  </span>
                                )}
                                {p.cip && (
                                  <span className="font-mono text-[10px] text-foreground/70">
                                    CIP: {p.cip}
                                  </span>
                                )}
                                <span className="text-[10px] text-foreground/50 italic truncate max-w-[180px]">
                                  {p.docType}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {p.kycStatus === 'verified' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
                                  Certifié Conforme
                                </span>
                              ) : p.kycStatus === 'rejected' ? (
                                <span
                                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold cursor-help"
                                  title={p.rejectionReason || 'Dossier non conforme'}
                                >
                                  <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                                  Non conforme (Rejeté)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">
                                  <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                                  Audit en attente
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedKycModal(p)}
                                  className="rounded-lg border border-foreground/20 bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-sm"
                                  title="Inspecter le dossier KYC complet"
                                >
                                  <FontAwesomeIcon icon={faEye} className="h-3 w-3 text-primary" />
                                  <span>Dossier</span>
                                </button>
                                {p.kycStatus === 'verified' ? (
                                  <span className="text-[11px] text-emerald-600 font-bold px-2 py-0.5">
                                    ✓ Validé
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyPartnerKyc(p.id, p.email)}
                                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white transition-colors shadow-sm"
                                      title="Valider la conformité du dossier"
                                    >
                                      Valider
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRejectKycModal(p)}
                                      className="rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-xs font-bold text-white transition-colors shadow-sm"
                                      title="Refuser le dossier KYC avec motif"
                                    >
                                      Refuser
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: GESTION DES UTILISATEURS & HABILITATIONS (SUPER-ADMIN ONLY) */}
          {/* ========================================================================= */}
          {currentSection === 'users' && isSuperAdmin && (
            <div className="space-y-6 animate-section-stagger">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 backdrop-blur border border-foreground/10 p-6 rounded-3xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                    <FontAwesomeIcon icon={faUsers} className="h-3 w-3" />
                    Répertoire & Gouvernance
                  </div>
                  <h2 className="font-heading text-2xl font-black text-foreground">
                    Gestion des Utilisateurs & Équipe
                  </h2>
                  <p className="text-xs text-foreground/60 max-w-2xl mt-1">
                    Pilotez tous les comptes de la plateforme (voyageurs, partenaires hôtes, assistants opérationnels et administrateurs). 
                    Créez des Assistants Admin avec droits opérationnels délégués ou ajustez les accès.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewAssistantName('');
                    setNewAssistantEmail('');
                    setNewAssistantPhone('');
                    setShowAddAssistantModal(true);
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-xs font-black text-black shadow-md hover:bg-white hover:text-black transition-all active:scale-95 shrink-0"
                >
                  <FontAwesomeIcon icon={faUserShield} className="h-3.5 w-3.5" />
                  <span>+ Ajouter un Assistant Admin</span>
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-2xl border border-foreground/10 bg-card p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 block mb-1">
                    Total Utilisateurs
                  </span>
                  <p className="font-heading text-2xl font-black text-foreground">{userMetrics.total}</p>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Comptes enregistrés</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                    Clients Voyageurs
                  </span>
                  <p className="font-heading text-2xl font-black text-emerald-700">{userMetrics.clients}</p>
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">Comptes actifs</p>
                </div>

                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent-foreground block mb-1">
                    Hôtes & Partenaires
                  </span>
                  <p className="font-heading text-2xl font-black text-accent-foreground">{userMetrics.owners}</p>
                  <p className="text-[10px] text-accent-foreground/70 mt-0.5">Gestionnaires d'annonces</p>
                </div>

                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                    Assistants Admin
                  </span>
                  <p className="font-heading text-2xl font-black text-indigo-700 dark:text-indigo-300">{userMetrics.subadmins}</p>
                  <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">Opérations & Modération</p>
                </div>

                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                    Comptes Suspendus
                  </span>
                  <p className="font-heading text-2xl font-black text-rose-600">{userMetrics.suspended}</p>
                  <p className="text-[10px] text-rose-500/70 mt-0.5">Accès désactivé</p>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="rounded-2xl border border-foreground/10 bg-card p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full md:w-80">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 h-3.5 w-3.5" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Rechercher par nom, email, société..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-foreground/15 text-xs text-foreground placeholder:text-foreground/40 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                  {/* Role filter buttons that wrap neatly on mobile so no category is cut off */}
                  <div className="w-full sm:w-auto">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-1.5 rounded-2xl bg-muted p-1">
                      {[
                        { key: 'all', label: 'Tous' },
                        { key: 'client', label: 'Clients' },
                        { key: 'owner', label: 'Propriétaires' },
                        { key: 'subadmin', label: 'Assistants' },
                        { key: 'admin', label: 'Super-Admin' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setUserRoleFilter(tab.key)}
                          className={`rounded-xl px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold transition-all shrink-0 ${
                            userRoleFilter === tab.key ? 'bg-card text-foreground shadow-sm font-bold' : 'text-foreground/60 hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status filter */}
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-foreground/15 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none shrink-0"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">✓ Actifs uniquement</option>
                    <option value="suspended">✕ Suspendus uniquement</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-4">Utilisateur</th>
                        <th className="p-4">Rôle</th>
                        <th className="p-4">Société / Pôle</th>
                        <th className="p-4">Téléphone</th>
                        <th className="p-4">Statut Compte</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-xs text-foreground/50">
                            Aucun utilisateur trouvé avec ces critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isRowSuperAdmin = u.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com';
                          const isRowSubAdmin = u.role === 'subadmin';
                          const isActive = u.is_active !== false;

                          return (
                            <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {u.name?.[0] || u.email?.[0] || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {isRowSuperAdmin && (
                                        <span className="text-[9px] rounded-full bg-accent/25 text-accent border border-accent/40 px-1.5 py-0.2 font-black uppercase">
                                          Super-Admin
                                        </span>
                                      )}
                                      {(isRowSubAdmin || (!isRowSuperAdmin && u.role === 'admin')) && (
                                        <span className="text-[9px] rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 font-bold uppercase">
                                          Assistant
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-foreground/50">{u.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-4">
                                {isRowSuperAdmin ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 text-accent-foreground border border-accent/50 px-2.5 py-0.5 text-[10px] font-black uppercase">
                                    <FontAwesomeIcon icon={faCrown} className="h-2.5 w-2.5 text-accent" />
                                    Super-Admin
                                  </span>
                                ) : isRowSubAdmin || u.role === 'admin' || u.role === 'subadmin' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase">
                                    <FontAwesomeIcon icon={faUserShield} className="h-2.5 w-2.5 text-indigo-400" />
                                    Assistant Admin (Sub-Admin)
                                  </span>
                                ) : u.role === 'owner' || u.role === 'partner' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                                    <FontAwesomeIcon icon={faBuilding} className="h-2.5 w-2.5" />
                                    Propriétaire / Hôte
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-foreground/70 px-2.5 py-0.5 text-[10px] font-semibold">
                                    Voyageur Client
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-foreground/80">
                                {u.company || <span className="text-foreground/40 italic">Particulier</span>}
                              </td>

                              <td className="p-4 text-foreground/80">
                                {u.phone}
                              </td>

                              <td className="p-4">
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Actif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Suspendu / Désactivé
                                  </span>
                                )}
                              </td>

                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Toggle Active / Suspended (Protected for Super-Admin) */}
                                  {!isRowSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserActive(u)}
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all shadow-sm ${
                                        isActive
                                          ? 'border border-amber-500/30 text-amber-700 hover:bg-amber-500/10'
                                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      }`}
                                      title={isActive ? "Suspendre l'accès de cet utilisateur" : "Réactiver l'accès"}
                                    >
                                      {isActive ? 'Désactiver' : 'Réactiver'}
                                    </button>
                                  )}

                                  {/* Edit User Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1.5 rounded-lg border border-foreground/15 text-foreground/70 hover:text-primary hover:bg-primary/5 transition-colors"
                                    title="Modifier les informations ou changer le rôle"
                                  >
                                    <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                                  </button>

                                  {/* Delete User Button (Protected for Super-Admin) */}
                                  {!isRowSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUserRecord(u)}
                                      className="p-1.5 rounded-lg border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors"
                                      title="Supprimer définitivement ce compte"
                                    >
                                      <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: TRÉSORERIE & COMMISSIONS */}
          {/* ========================================================================= */}
          {currentSection === 'finances' && (
            <div className="space-y-8 animate-section-stagger">
              {/* Financial Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-3xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Encaissé</span>
                  </div>
                  <p className="font-heading text-3xl font-black text-foreground">
                    {formatPrice(platformMetrics.gmv)}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    Volume Brut de réservations perçu sur la plateforme
                  </p>
                </div>

                <div className="rounded-3xl border border-accent/40 bg-accent/15 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-accent-foreground mb-2">
                    <FontAwesomeIcon icon={faPercent} className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Commissions Bénin Beyond (10%)</span>
                  </div>
                  <p className="font-heading text-3xl font-black text-foreground">
                    {formatPrice(platformMetrics.commissions)}
                  </p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Chiffre d'Affaires Net de la plateforme
                  </p>
                </div>

                <div className="rounded-3xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <FontAwesomeIcon icon={faHandHoldingDollar} className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reversements Hôtes (90%)</span>
                  </div>
                  <p className="font-heading text-3xl font-black text-foreground">
                    {formatPrice(platformMetrics.disbursed)}
                  </p>
                  <p className="text-xs text-foreground/60 mt-1">
                    Fonds transférés ou à transférer aux propriétaires
                  </p>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="rounded-3xl border border-foreground/10 bg-card p-6 md:p-8 shadow-sm">
                <h3 className="font-heading text-base font-bold text-foreground mb-4">
                  Répartition des Canaux de Paiement
                </h3>

                {!paymentBreakdown ? (
                  <div className="py-10 text-center text-xs text-foreground/50 border border-dashed border-foreground/15 rounded-2xl bg-muted/20">
                    <FontAwesomeIcon icon={faWallet} className="h-6 w-6 text-foreground/30 mb-2" />
                    <p className="font-semibold text-foreground/75">Aucun flux financier de réservation enregistré pour l'instant</p>
                    <p className="mt-1 max-w-md mx-auto">
                      La répartition par canal (MTN MoMo, Moov Money, Celtiis Cash, Carte Visa) se calculera automatiquement à mesure des réservations effectives des voyageurs.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                      <span className="text-xs font-bold text-amber-500">MTN Mobile Money</span>
                      <p className="font-heading text-xl font-bold text-foreground mt-1">{paymentBreakdown.mtn}%</p>
                      <p className="text-[11px] text-foreground/50">Canal N°1 au Bénin</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                      <span className="text-xs font-bold text-blue-600">Carte Visa / Mastercard</span>
                      <p className="font-heading text-xl font-bold text-foreground mt-1">{paymentBreakdown.card}%</p>
                      <p className="text-[11px] text-foreground/50">Cartes Bancaires Internationales</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                      <span className="text-xs font-bold text-emerald-600">Celtiis Cash</span>
                      <p className="font-heading text-xl font-bold text-foreground mt-1">{paymentBreakdown.celtiis}%</p>
                      <p className="text-[11px] text-foreground/50">Réseau national</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                      <span className="text-xs font-bold text-blue-400">Moov Money</span>
                      <p className="font-heading text-xl font-bold text-foreground mt-1">{paymentBreakdown.moov}%</p>
                      <p className="text-[11px] text-foreground/50">Opérateur Flooz</p>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-foreground/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-foreground/60">
                    <FontAwesomeIcon icon={faFileContract} className="text-accent h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">Synthèse certifiée OHADA</span>
                  </div>
                  <button
                    onClick={() => showToast('Relevé comptable mensuel (PDF/CSV) généré avec succès.')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                    <span>Télécharger le relevé</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: FORMULES & PACKS SIGNATURE (EXCLUSIVITÉ SUPER-ADMIN) */}
          {/* ========================================================================= */}
          {currentSection === 'packs' && (
            <div className="space-y-6 animate-section-stagger">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase">
                      Exclusivité Direction
                    </span>
                    <span className="text-xs text-foreground/50">
                      {packs.length} pack{packs.length > 1 ? 's' : ''} en ligne
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mt-1">
                    Gestion des Formules & Packs Signature
                  </h3>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    Seul le Super-Administrateur peut composer et publier des offres tout-en-un réunissant villa, véhicule VIP et chauffeur
                  </p>
                </div>

                <button
                  onClick={() => setShowNewPackModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all self-start sm:self-auto"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                  <span>+ Créer un nouveau Pack</span>
                </button>
              </div>

              {/* Empty state when 0 packs */}
              {packs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-foreground/20 bg-card/60 p-10 text-center max-w-xl mx-auto space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent font-bold">
                    <FontAwesomeIcon icon={faLayerGroup} className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-heading text-base font-bold text-foreground">
                      Aucun pack combiné pour le moment
                    </h4>
                    <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                      Le catalogue démarre à zéro comme neuf. Cliquez ci-dessous pour concevoir votre première offre signature combinant résidence privée et mobilité.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewPackModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                    <span>Créer le Premier Pack Signature</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packs.map((pk) => (
                    <div
                      key={pk.id}
                      className="rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm flex flex-col justify-between hover:border-foreground/25 transition-all"
                    >
                      <div>
                        <div className="relative h-44 w-full overflow-hidden bg-muted">
                          <img
                            src={pk.included?.[0]?.image || pk.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80'}
                            alt={pk.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute top-3 left-3 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-accent uppercase">
                            {pk.location}
                          </div>
                          {pk.badge && (
                            <div className="absolute top-3 right-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                              {pk.badge}
                            </div>
                          )}
                        </div>

                        <div className="p-5">
                          <h4 className="font-heading text-base font-bold text-foreground">
                            {pk.title}
                          </h4>
                          <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                            {pk.tagline}
                          </p>

                          <div className="mt-4 pt-4 border-t border-foreground/10 space-y-2 text-xs text-foreground/80">
                            {pk.included?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-accent shrink-0" />
                                <span className="line-clamp-1"><strong>{it.type} :</strong> {it.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t border-foreground/10 mt-4 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-foreground/50 uppercase">Tarif combiné</span>
                          <p className="font-heading text-base font-black text-primary">
                            {formatPrice(pk.price)} <span className="text-xs font-normal text-foreground/60">/ {pk.priceUnit || 'jour'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/pack/${pk.id}`}
                            className="rounded-xl border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary transition-colors"
                          >
                            Voir
                          </Link>
                          <button
                            onClick={() => handleDeletePack(pk.id, pk.title)}
                            className="rounded-xl border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                            title="Supprimer ce pack"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal de Création de Pack Exclusif Admin */}
              {showNewPackModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden">
                  <div className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-3xl bg-card border border-foreground/15 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
                    <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-foreground/10 shrink-0 bg-card z-10">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Formule Tout-en-un</span>
                        <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                          Créer un Pack Signature Bénin Beyond
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowNewPackModal(false)}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
                        title="Fermer"
                        aria-label="Fermer"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreatePack} className="flex flex-col flex-1 overflow-hidden min-h-0">
                      <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
                      {/* Titre & Accroche */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Titre du Pack *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ex: Pack Riviera & Évasion 4x4"
                            value={packTitle}
                            onChange={(e) => setPackTitle(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Accroche commerciale
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Villa d'exception + SUV 7 places tout terrain"
                            value={packTagline}
                            onChange={(e) => setPackTagline(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Tarification & Localisation */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Tarif remisé (FCFA) *
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="115000"
                            value={packPrice}
                            onChange={(e) => setPackPrice(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Tarif normal barré (FCFA)
                          </label>
                          <input
                            type="number"
                            placeholder="130000"
                            value={packRegularPrice}
                            onChange={(e) => setPackRegularPrice(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Unité de tarification
                          </label>
                          <select
                            value={packPriceUnit}
                            onChange={(e) => setPackPriceUnit(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                          >
                            <option value="jour">Par jour</option>
                            <option value="forfait">Forfait total</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Localisation
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Cotonou & Littoral"
                            value={packLocation}
                            onChange={(e) => setPackLocation(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-foreground/80 block mb-1">
                            Badge
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Offre Privilège, Coup de Cœur..."
                            value={packBadge}
                            onChange={(e) => setPackBadge(e.target.value)}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Hébergement Inclus */}
                      <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                          1. Hébergement Inclus dans le Pack
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-foreground/70 block mb-1">Titre de la villa ou suite</label>
                            <input
                              type="text"
                              placeholder="ex: Villa Cotonou Riviera (4 Chambres)"
                              value={packStayTitle}
                              onChange={(e) => setPackStayTitle(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-foreground/70 block mb-1">URL photo de l'hébergement</label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/photo-..."
                              value={packStayImage}
                              onChange={(e) => setPackStayImage(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Véhicule Inclus */}
                      <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                          2. Véhicule Inclus dans le Pack
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-foreground/70 block mb-1">Modèle du véhicule</label>
                            <input
                              type="text"
                              placeholder="ex: SUV Toyota Fortuner 7 Places VIP"
                              value={packDriveTitle}
                              onChange={(e) => setPackDriveTitle(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-foreground/70 block mb-1">URL photo du véhicule</label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/photo-..."
                              value={packDriveImage}
                              onChange={(e) => setPackDriveImage(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Avantages & Description */}
                      <div>
                        <label className="text-xs font-semibold text-foreground/80 block mb-1">
                          Avantages clés (un par ligne)
                        </label>
                        <textarea
                          rows={3}
                          value={packAdvantages}
                          onChange={(e) => setPackAdvantages(e.target.value)}
                          placeholder="Prise en charge aéroport VIP&#10;Plein de carburant offert&#10;Conciergerie 24/7"
                          className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground/80 block mb-1">
                          Description détaillée du pack
                        </label>
                        <textarea
                          rows={3}
                          value={packDescription}
                          onChange={(e) => setPackDescription(e.target.value)}
                          placeholder="Décrivez l'expérience unique proposée aux voyageurs..."
                          className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:outline-none"
                        />
                      </div>

                      </div>

                      <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-foreground/10 flex items-center justify-end gap-3 bg-card/95 backdrop-blur-sm z-10 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                        <button
                          type="button"
                          onClick={() => setShowNewPackModal(false)}
                          className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                        >
                          Publier le Pack en Ligne
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: ÉVÉNEMENTS & AGENDA CULTUREL DU BÉNIN */}
          {/* ========================================================================= */}
          {currentSection === 'events' && (
            <div className="space-y-6 animate-section-stagger">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 backdrop-blur border border-foreground/10 p-6 rounded-3xl">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                    <FontAwesomeIcon icon={faCalendarCheck} className="h-3 w-3" />
                    Bénin Live & Agenda
                  </div>
                  <h2 className="font-heading text-2xl font-black text-foreground">
                    Gestion des Événements Culturels
                  </h2>
                  <p className="text-xs text-foreground/60 max-w-2xl mt-1">
                    Ajoutez, modifiez ou retirez les célébrations et festivals affichés sur la page d'accueil de Bénin Beyond. 
                    Si le catalogue compte <strong>plus de 3 événements</strong>, un carrousel rotatif automatique avec transition fluide s'active pour les visiteurs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateEvent}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 shrink-0"
                >
                  <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                  Ajouter un Événement
                </button>
              </div>

              {/* Status info banner */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-foreground/80">
                    <strong className="text-foreground">{events.length} événement{events.length > 1 ? 's' : ''}</strong> en ligne.{' '}
                    {events.length > 3 ? (
                      <span className="text-primary font-semibold">
                        ✓ Switcher carrousel automatique actif sur la page d'accueil (&gt; 3 événements).
                      </span>
                    ) : (
                      <span className="text-foreground/60">
                        (Affichage en grille statique jusqu'à 3 événements. Ajoutez-en un 4ème pour activer le carrousel rotatif).
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Events Cards Grid */}
              {events.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-foreground/20 p-12 text-center bg-card/40">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground/40">
                    <FontAwesomeIcon icon={faCalendarCheck} className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Aucun événement culturel configuré
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/60">
                    Mettez en avant le Vodun Days, la Gani, le Festival Masques ou d'autres temps forts touristiques du Bénin.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateEvent}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
                    Créer le premier événement
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="group relative rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col"
                    >
                      {/* Image Header with Badge */}
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <img
                          src={evt.image}
                          alt={evt.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-accent/90 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase text-black tracking-wider shadow">
                            {evt.badge || 'Événement'}
                          </span>
                          <span className="rounded-full bg-black/60 backdrop-blur border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white/90">
                            {evt.tag || 'Culture'}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent mb-0.5">
                            <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                            <span>{evt.period}</span>
                          </div>
                          <h3 className="font-heading text-lg font-bold text-white line-clamp-1">
                            {evt.title}
                          </h3>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                            <FontAwesomeIcon icon={faLocationDot} className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-semibold">{evt.location}</span>
                          </div>
                          <p className="text-xs text-foreground/70 line-clamp-3 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-foreground/10 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvent(evt)}
                            className="flex-1 rounded-xl border border-foreground/15 hover:border-primary hover:bg-primary/5 py-2 text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
                          >
                            <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="rounded-xl border border-rose-500/20 hover:bg-rose-500/10 p-2 text-xs font-semibold text-rose-500 transition-colors"
                            title="Supprimer l'événement"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 7: PUBLIER UNE NOUVELLE ANNONCE (SUPER-ADMIN & PROPRIÉTAIRE) */}
          {/* ========================================================================= */}
          {currentSection === 'publish' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-section-stagger">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Publier une Nouvelle Annonce
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Ajoutez un hébergement de prestige ou un véhicule d'exception directement au catalogue Bénin Beyond
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setCurrentSection('catalog_inventory')}
                  className="rounded-xl border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-foreground/75 hover:bg-muted self-start sm:self-auto"
                >
                  <FontAwesomeIcon icon={faHouse} className="mr-1.5 text-accent" />
                  <span>Voir l'inventaire ({listings.length})</span>
                </button>
              </div>

              {/* Super-Admin Direct Publication Power Switch */}
              <div className="rounded-3xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/10 to-transparent p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-accent text-black font-bold flex items-center justify-center shrink-0 shadow-sm">
                      <FontAwesomeIcon icon={faCrown} className="text-sm" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-accent-foreground">Privilège Direction</span>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        Mode de Publication Instantané
                      </h4>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminInstantPublish}
                      onChange={(e) => setAdminInstantPublish(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                <p className="text-xs text-foreground/75 leading-relaxed">
                  {adminInstantPublish ? (
                    <span className="text-emerald-800 font-medium">
                      ✓ <strong>Mise en ligne immédiate activée</strong> : Cette annonce sera certifiée conforme et directement réservable par les voyageurs dès l'enregistrement.
                    </span>
                  ) : (
                    <span className="text-amber-800 font-medium">
                      ⏳ <strong>Mise en attente de modération</strong> : L'annonce sera enregistrée avec le statut « En attente » pour un audit ultérieur.
                    </span>
                  )}
                </p>
              </div>

              {/* Charte d'excellence visuelle */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 text-amber-900 font-bold text-sm">
                  <div className="h-9 w-9 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-800 shrink-0">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-base" />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-amber-800 font-bold">Standard de Luxe Bénin Beyond</span>
                    <h3 className="font-heading text-sm sm:text-base font-bold text-amber-950">
                      Critères d'Excellence & Médias Requis
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-amber-950">
                  <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <FontAwesomeIcon icon={faCamera} className="text-amber-700 text-xs" />
                      <span>Photos Nettes 1080p (Horizontales)</span>
                    </div>
                    <p className="text-foreground/70 leading-snug">
                      Clichés lumineux en plein jour. Pas de captures floues ou sombres.
                    </p>
                  </div>

                  <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <FontAwesomeIcon icon={faVideo} className="text-amber-700 text-xs" />
                      <span>Vidéo Courte d'Aperçu (25 Mo max)</span>
                    </div>
                    <p className="text-foreground/70 leading-snug">
                      Visite immersive de 15 à 45 secondes pour maximiser le taux de réservation.
                    </p>
                  </div>
                </div>
              </div>

              {publishSuccess && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600 text-lg shrink-0" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAdminPublishSubmit} className="rounded-3xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* 1. Sélection de Catégorie */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block mb-3">
                    1. Catégorie du bien
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('stay');
                        setFormPriceUnit('nuit');
                      }}
                      className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                        formType === 'stay'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                          : 'border-foreground/15 bg-background text-foreground/75 hover:border-foreground/30'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faHouse} className="text-primary text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground">Hébergement</p>
                        <p className="text-[11px] text-foreground/60 leading-snug">Villa, Appartement, Loft lagune</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormType('drive');
                        setFormPriceUnit('jour');
                      }}
                      className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                        formType === 'drive'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                          : 'border-foreground/15 bg-background text-foreground/75 hover:border-foreground/30'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faCar} className="text-primary text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-foreground">Véhicule</p>
                        <p className="text-[11px] text-foreground/60 leading-snug">SUV VIP, Berline ou Vente certifiée</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 1b. Sous-catégorie Hébergement & Disponibilités Hôtel */}
                {formType === 'stay' && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-foreground/10 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground/80 block mb-2">
                        Type d'établissement
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormSubcategory('villa')}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                            formSubcategory === 'villa'
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                              : 'border-foreground/15 bg-card text-foreground/70'
                          }`}
                        >
                          <div className="font-bold">Villa / Loft Privé</div>
                          <div className="text-[10px] text-foreground/50 mt-0.5">Location exclusive d'un bien entier</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormSubcategory('hotel')}
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                            formSubcategory === 'hotel'
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                              : 'border-foreground/15 bg-card text-foreground/70'
                          }`}
                        >
                          <div className="font-bold">Chambre d'Hôtel / Suite</div>
                          <div className="text-[10px] text-foreground/50 mt-0.5">Établissement avec chambres & dates de dispo</div>
                        </button>
                      </div>
                    </div>

                    {formSubcategory === 'hotel' && (
                      <div className="pt-3 border-t border-foreground/10 space-y-3">
                        <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                          Disponibilités & Stock Hôtelier
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                              Stock de chambres
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={roomsCount}
                              onChange={(e) => setRoomsCount(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                              Disponible à partir du
                            </label>
                            <input
                              type="date"
                              value={availableFrom}
                              onChange={(e) => setAvailableFrom(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                              Disponible jusqu'au
                            </label>
                            <input
                              type="date"
                              value={availableTo}
                              onChange={(e) => setAvailableTo(e.target.value)}
                              className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Titre & Localisation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                      Titre de l'annonce *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={formType === 'stay' ? 'ex: Villa Royale Cotonou Lagune' : 'ex: SUV Toyota Fortuner 7 Places VIP'}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                      Ville & Quartier *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: Cotonou, Haie Vive ou Ouidah Plage"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Tarification */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Tarification & Commission Plateforme (10%)
                    </span>
                    <span className="text-[11px] text-accent-foreground font-semibold bg-accent/20 px-2 py-0.5 rounded-full">
                      Commission standard : 10%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground/80 block mb-1">
                        Tarif brut public (FCFA) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder={formType === 'stay' ? '85000' : '45000'}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full rounded-xl border border-foreground/15 bg-card px-3.5 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground/80 block mb-1">
                        Fréquence / Modalité
                      </label>
                      <select
                        value={formPriceUnit}
                        onChange={(e) => setFormPriceUnit(e.target.value)}
                        className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                      >
                        {formType === 'stay' ? (
                          <>
                            <option value="nuit">Par nuit</option>
                            <option value="semaine">Par semaine</option>
                            <option value="mois">Par mois</option>
                          </>
                        ) : (
                          <>
                            <option value="jour">Par jour</option>
                            <option value="semaine">Par semaine</option>
                            <option value="vente totale">Vente directe (Prix total)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="bg-card p-2.5 rounded-xl border border-foreground/10 flex flex-col justify-center">
                      <p className="text-[10px] text-foreground/60">Marge plateforme (10%) :</p>
                      <p className="font-heading text-sm font-bold text-accent font-mono">
                        {formPrice ? formatPrice(Math.round(parseInt(formPrice, 10) * 0.10)) : '0 FCFA'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Caractéristiques & Description */}
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                    Caractéristiques clés (séparées par des virgules)
                  </label>
                  <input
                    type="text"
                    value={formSpecs}
                    onChange={(e) => setFormSpecs(e.target.value)}
                    placeholder={
                      formType === 'stay'
                        ? '4 Chambres, Piscine privée, Climatisation, Wifi Fibre'
                        : '7 Places, Automatique, Climatisation, Essence'
                    }
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                    Description détaillée du bien
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Décrivez les atouts majeurs, les finitions, l'accès sécurisé et le niveau de confort..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                {/* 5. Photos Upload */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                      3. Photos Haute Définition *
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Sélectionnez les photos du bien (1 photo minimum requise)
                    </p>
                  </div>

                  {photoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {/* Dropzone */}
                  <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-6 text-center transition-colors bg-muted/20">
                    <input
                      type="file"
                      id="admin-photo-upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg">
                        <FontAwesomeIcon icon={faUpload} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Cliquez pour sélectionner vos photos ou glissez-déposez
                        </p>
                        <p className="text-[10px] text-foreground/50 mt-0.5">
                          JPG, PNG, WebP — Résolution recommandée : 1920x1080px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* URL Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Ou collez un lien URL d'image web..."
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      className="flex-1 rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoUrl}
                      className="rounded-xl border border-foreground/15 bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                    >
                      Ajouter
                    </button>
                  </div>

                  {/* Preview Grid */}
                  {uploadedPhotos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-foreground/70">
                        <span className="font-semibold">{uploadedPhotos.length} photo(s) sélectionnée(s)</span>
                        <span className="text-[11px] text-accent font-medium">La photo avec le badge doré est la couverture</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {uploadedPhotos.map((photo, index) => (
                          <div
                            key={index}
                            className={`group relative aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all ${
                              featuredPhotoIndex === index
                                ? 'border-accent ring-2 ring-accent/40'
                                : 'border-foreground/10 hover:border-foreground/30'
                            }`}
                          >
                            <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />

                            {featuredPhotoIndex === index ? (
                              <span className="absolute top-1.5 left-1.5 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                ★ Couverture
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setFeaturedPhotoIndex(index)}
                                className="absolute top-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Définir couverture
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors"
                              title="Supprimer"
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Video Tour Upload */}
                <div className="space-y-3 pt-3 border-t border-foreground/10">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                      4. Visite Vidéo d'Aperçu (Optionnelle)
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Téléversez un clip vidéo (MP4/WebM jusqu'à 50 Mo) ou collez un lien vidéo (Google Drive, YouTube, Vimeo, lien direct).
                    </p>
                  </div>

                  {videoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                      <span>{videoError}</span>
                    </div>
                  )}

                  {!uploadedVideo ? (
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-5 text-center transition-colors bg-muted/10">
                        <input
                          type="file"
                          id="admin-video-upload"
                          accept="video/mp4,video/webm,video/quicktime"
                          disabled={isUploadingVideo}
                          onChange={handleVideoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                          <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground text-lg">
                            <FontAwesomeIcon icon={isUploadingVideo ? faClock : faVideo} className={isUploadingVideo ? 'animate-spin' : ''} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {isUploadingVideo ? 'Téléversement dans Supabase Storage...' : 'Sélectionner une vidéo d\'aperçu (.MP4 ou .WebM)'}
                            </p>
                            <p className="text-[10px] text-foreground/50">
                              {isUploadingVideo ? 'Veuillez patienter pendant l\'envoi...' : 'Fichier vidéo jusqu\'à 50 Mo max (dossier structuré)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Video URL Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Ou collez un lien Google Drive, YouTube, Vimeo..."
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          className="flex-1 rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddVideoUrl}
                          className="rounded-xl border border-foreground/15 bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                        >
                          Ajouter lien
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-foreground/10 bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faVideo} className="text-accent text-sm" />
                          <span className="text-xs font-bold text-foreground">{uploadedVideo.name}</span>
                          <span className="text-[10px] text-foreground/50 font-mono">({uploadedVideo.sizeMB} Mo)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          <span>Supprimer la vidéo</span>
                        </button>
                      </div>

                      <div className="w-full max-w-xl mx-auto rounded-xl overflow-hidden bg-black shadow">
                        <ListingVideoPlayer videoUrl={uploadedVideo.url} compact={true} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-foreground/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('catalog_inventory')}
                    className="rounded-xl border border-foreground/15 px-5 py-2.5 text-xs font-semibold text-foreground/75 hover:bg-muted"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    <span>{adminInstantPublish ? 'Mettre en ligne immédiatement' : 'Enregistrer en attente de modération'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 8: INVENTAIRE GLOBAL DES BIENS & PROPRIÉTÉS */}
          {/* ========================================================================= */}
          {currentSection === 'catalog_inventory' && (
            <div className="space-y-6 animate-section-stagger">
              
              {/* Header & Quick Action */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Inventaire Global des Biens & Flotte
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Gérez l'ensemble des hébergements et véhicules enregistrés sur Bénin Beyond ({listings.length} biens au total)
                  </p>
                </div>

                <button
                  onClick={() => setCurrentSection('publish')}
                  className="rounded-xl bg-accent text-black px-4 py-2 text-xs font-bold shadow-md hover:bg-accent/90 transition-all flex items-center gap-2 self-start sm:self-auto"
                >
                  <FontAwesomeIcon icon={faCirclePlus} />
                  <span>+ Publier un nouveau bien</span>
                </button>
              </div>

              {/* Inventory Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-foreground/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setListingTypeFilter('all');
                      setListingStatusFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      listingTypeFilter === 'all' && listingStatusFilter === 'all'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-foreground/75 hover:bg-muted'
                    }`}
                  >
                    Tous ({listings.length})
                  </button>

                  <button
                    onClick={() => {
                      setListingTypeFilter('stay');
                      setListingStatusFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      listingTypeFilter === 'stay' && listingStatusFilter === 'all'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-foreground/75 hover:bg-muted'
                    }`}
                  >
                    Hébergements ({listings.filter((l) => l.type === 'stay').length})
                  </button>

                  <button
                    onClick={() => {
                      setListingTypeFilter('drive');
                      setListingStatusFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      listingTypeFilter === 'drive' && listingStatusFilter === 'all'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-foreground/75 hover:bg-muted'
                    }`}
                  >
                    Véhicules ({listings.filter((l) => l.type === 'drive').length})
                  </button>

                  <button
                    onClick={() => {
                      setListingTypeFilter('all');
                      setListingStatusFilter('active');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      listingStatusFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                    }`}
                  >
                    En ligne ({listings.filter((l) => l.status === 'active' || !l.status).length})
                  </button>

                  <button
                    onClick={() => {
                      setListingTypeFilter('all');
                      setListingStatusFilter('pending');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      listingStatusFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                    }`}
                  >
                    En attente ({listings.filter((l) => l.status === 'pending').length})
                  </button>
                </div>

                {/* Search */}
                <div className="relative min-w-[220px]">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40" />
                  <input
                    type="text"
                    placeholder="Rechercher par titre ou ville..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Listings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Header with Badges */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                        <img
                          src={item.gallery?.[0] || item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                            {item.type === 'stay' ? 'Hébergement' : 'Véhicule'}
                          </span>
                          {item.video_url && (
                            <span className="rounded-full bg-accent text-black px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow">
                              <FontAwesomeIcon icon={faVideo} className="text-[9px]" />
                              <span>Vidéo</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3">
                          {(!item.status || item.status === 'active') && (
                            <span className="rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow">
                              ✓ En ligne
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="rounded-full bg-amber-500 text-black px-2.5 py-0.5 text-[10px] font-bold shadow">
                              ⏳ En attente
                            </span>
                          )}
                          {item.status === 'refused' && (
                            <span className="rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow">
                              ✕ Refusé
                            </span>
                          )}
                          {item.status === 'suspended' && (
                            <span className="rounded-full bg-gray-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow">
                              ⏸ Suspendu
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-2.5">
                        <h4 className="font-heading text-base font-bold text-foreground line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-foreground/60 flex items-center gap-1">
                          <FontAwesomeIcon icon={faLocationDot} className="text-accent" />
                          <span className="truncate">{item.location}</span>
                        </p>

                        <div className="pt-2 flex items-center justify-between border-t border-foreground/10 text-xs">
                          <span className="font-heading font-black text-primary text-sm">
                            {formatPrice(item.price)} <span className="text-[10px] font-normal text-foreground/60">/ {item.price_unit || (item.type === 'stay' ? 'nuit' : 'jour')}</span>
                          </span>
                          <span className="text-[11px] text-foreground/50 truncate max-w-[120px]">
                            {item.owner_name || 'Direction'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="p-4 pt-0 border-t border-foreground/10 mt-3 flex items-center justify-between gap-2">
                      <Link
                        to={`/listing/${item.id}`}
                        className="rounded-xl border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary transition-colors flex items-center gap-1.5"
                      >
                        <FontAwesomeIcon icon={faEye} className="text-xs" />
                        <span>Fiche</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        {item.status === 'pending' || item.status === 'suspended' || item.status === 'refused' ? (
                          <button
                            onClick={() => {
                              handleApproveListing(item.id);
                              showToast(`Bien "${item.title}" activé et mis en ligne !`);
                            }}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            title="Mettre en ligne"
                          >
                            <FontAwesomeIcon icon={faCheck} className="mr-1" />
                            <span>Mettre en ligne</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              handleSuspendListing(item.id);
                              showToast(`Bien "${item.title}" suspendu.`);
                            }}
                            className="rounded-xl bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground/75 hover:bg-muted/80"
                            title="Suspendre"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteListingItem(item.id)}
                          className="h-8 w-8 rounded-xl border border-rose-500/20 text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                          title="Supprimer définitivement"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredListings.length === 0 && (
                <div className="rounded-3xl border border-dashed border-foreground/20 p-12 text-center bg-card">
                  <FontAwesomeIcon icon={faHouse} className="h-10 w-10 text-foreground/20 mb-3" />
                  <h4 className="font-heading text-base font-bold text-foreground">
                    Aucun bien correspondant
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                    Aucun hébergement ou véhicule ne correspond aux critères de recherche actuels.
                  </p>
                  <button
                    onClick={() => setCurrentSection('publish')}
                    className="mt-4 rounded-xl bg-accent text-black px-4 py-2 text-xs font-bold shadow-md hover:bg-accent/90 transition-all inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    <span>Publier un nouveau bien</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: AVIS & RETOURS CLIENTS (AUTHENTIQUES ET MODÉRABLES) */}
          {/* ========================================================================= */}
          {currentSection === 'reviews' && (
            <div className="space-y-6 animate-section-stagger">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                    <FontAwesomeIcon icon={faStar} className="text-amber-400" />
                    <span>Avis & Retours d'Expérience Clients</span>
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Consultez, modérez et gérez les retours authentiques laissés par les voyageurs après séjour ({reviewsList.length} avis enregistrés)
                  </p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-foreground/10 bg-card p-4">
                  <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Total Avis Reçus</span>
                  <div className="mt-1 text-2xl font-bold text-foreground font-heading">{reviewsList.length}</div>
                  <span className="text-[11px] text-foreground/50">Retours vérifiés après réservation</span>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-4">
                  <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Note Moyenne Globale</span>
                  <div className="mt-1 text-2xl font-bold text-amber-500 font-heading flex items-center gap-1.5">
                    {reviewsList.length > 0
                      ? `${(reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewsList.length).toFixed(1)} / 5`
                      : 'Aucun avis'}
                    {reviewsList.length > 0 && <FontAwesomeIcon icon={faStar} className="text-amber-400 text-lg" />}
                  </div>
                  <span className="text-[11px] text-foreground/50">Moyenne calculée en temps réel</span>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-4">
                  <span className="text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Taux de Satisfaction</span>
                  <div className="mt-1 text-2xl font-bold text-emerald-500 font-heading">
                    {reviewsList.length > 0
                      ? `${Math.round((reviewsList.filter(r => (Number(r.rating) || 0) >= 4).length / reviewsList.length) * 100)}%`
                      : '—'}
                  </div>
                  <span className="text-[11px] text-foreground/50">Notes 4 étoiles et 5 étoiles</span>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom de voyageur, email, contenu du commentaire..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value)}
                  className="rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="all">Toutes les notes</option>
                  <option value="5">5 Étoiles (Excellent)</option>
                  <option value="4">4 Étoiles (Très bien)</option>
                  <option value="3">3 Étoiles (Moyen)</option>
                  <option value="2">2 Étoiles (Décevant)</option>
                  <option value="1">1 Étoile (Insatisfaisant)</option>
                </select>
              </div>

              {/* Reviews List */}
              {filteredReviews.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-foreground/20 p-12 text-center bg-card">
                  <FontAwesomeIcon icon={faStar} className="h-10 w-10 text-foreground/20 mb-3" />
                  <h4 className="font-heading text-base font-bold text-foreground">
                    Aucun avis client pour le moment
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                    Dès que les voyageurs auront terminé leur séjour ou confirmé leur réservation, ils pourront laisser leur retour authentique depuis leur espace client.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-foreground/10 bg-card p-4 sm:p-5 shadow-sm hover:border-foreground/20 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 overflow-hidden"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                            {rev.author_name ? rev.author_name.charAt(0) : 'V'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading text-sm font-bold text-foreground truncate">
                                {rev.author_name || 'Voyageur'}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20 shrink-0">
                                Client Vérifié
                              </span>
                            </div>
                            <span className="text-[11px] text-foreground/50 truncate block">{rev.author_email || 'Email non renseigné'}</span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1 text-amber-400 text-sm">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FontAwesomeIcon
                              key={star}
                              icon={faStar}
                              className={star <= (Number(rev.rating) || 5) ? 'text-amber-400' : 'text-foreground/20'}
                            />
                          ))}
                          <span className="ml-2 text-xs font-bold text-foreground">
                            {rev.rating} / 5
                          </span>
                        </div>

                        {/* Comment */}
                        <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-xl border border-foreground/5 break-words">
                          "{rev.comment || 'Aucun commentaire écrit'}"
                        </p>

                        {/* Metadata row with flex-wrap so reservation ID never overflows */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10.5px] text-foreground/50 pt-1 max-w-full">
                          <span className="shrink-0">
                            Publié le {rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récemment'}
                          </span>
                          {rev.listing_id && (
                            <span className="inline-flex items-center gap-1 bg-muted/50 border border-foreground/10 px-2 py-0.5 rounded-md text-[10px] font-mono truncate max-w-[130px] sm:max-w-[180px]" title={rev.listing_id}>
                              Bien : {rev.listing_id}
                            </span>
                          )}
                          {rev.pack_id && (
                            <span className="inline-flex items-center gap-1 bg-muted/50 border border-foreground/10 px-2 py-0.5 rounded-md text-[10px] font-mono truncate max-w-[130px] sm:max-w-[180px]" title={rev.pack_id}>
                              Pack : {rev.pack_id}
                            </span>
                          )}
                          {rev.booking_id && (
                            <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold truncate max-w-[140px] sm:max-w-[200px]" title={rev.booking_id}>
                              Résa : {rev.booking_id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action: Delete review */}
                      <div className="shrink-0 flex items-center md:items-end justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-foreground/10">
                        <button
                          onClick={() => handleDeleteReviewItem(rev.id, rev.author_name, rev.booking_id)}
                          className="rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          title="Supprimer cet avis client de la base"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          <span>Supprimer l'avis</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODAL REÇU / CONCIERGERIE OFFICIEL */}
      {/* ========================================================================= */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn print-friendly">
          <div className="printable-receipt relative w-full max-w-lg rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedBookingModal(null)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground no-print"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faReceipt} className="h-5 w-5 text-accent" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                Reçu Officiel Bénin Beyond
              </h3>
            </div>

            <div className="rounded-2xl bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground/60">Réf. Réservation :</span>
                <span className="font-mono font-bold text-foreground">{selectedBookingModal.booking_ref}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Client :</span>
                <span className="font-semibold text-foreground">{selectedBookingModal.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Téléphone Client :</span>
                <span className="font-semibold text-foreground">{selectedBookingModal.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Prestation :</span>
                <span className="font-semibold text-foreground">{selectedBookingModal.listing_title}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-foreground/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground/70">Montant Total Brut :</span>
                <span className="font-bold text-foreground">{formatPrice(selectedBookingModal.gross_amount)}</span>
              </div>
              <div className="flex justify-between text-accent font-bold">
                <span>Commission Bénin Beyond (10%) :</span>
                <span>+{formatPrice(selectedBookingModal.commission_amount || Math.round(selectedBookingModal.gross_amount * 0.10))}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-sm pt-1 border-t border-foreground/10">
                <span>Net Partenaire à reverser (90%) :</span>
                <span>{formatPrice(selectedBookingModal.net_amount || (selectedBookingModal.gross_amount - Math.round(selectedBookingModal.gross_amount * 0.10)))}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 no-print">
              <button
                type="button"
                onClick={() => {
                  const target = selectedBookingModal;
                  setSelectedBookingModal(null);
                  handleDeleteBookingItem(target.id || target.booking_ref, target.booking_ref);
                }}
                className="rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-50 px-3.5 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faTrash} />
                <span>Supprimer la réservation</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    printInvoiceDocument(selectedBookingModal, {
                      name: selectedBookingModal.customer_name,
                      email: selectedBookingModal.customer_email,
                      phone: selectedBookingModal.customer_phone
                    }, { role: 'admin' });
                  }}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faPrint} className="h-3 w-3" />
                  <span>Imprimer le Reçu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBookingModal(null)}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/95 transition-all shadow-md"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL AUDIT MÉDIAS (PHOTOS & VIDÉO) */}
      {/* ========================================================================= */}
      {mediaAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground">
                  <FontAwesomeIcon icon={faCamera} className="text-base" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Audit Visuel & Contrôle de Conformité
                  </h3>
                  <p className="text-[11px] text-foreground/60">
                    Contrôle de la qualité des photos et de la vidéo soumises par l'hôte
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMediaAuditModal(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {/* Listing Details Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 rounded-2xl bg-muted/40 border border-foreground/10 text-xs">
              <div>
                <p className="font-bold text-foreground text-sm">{mediaAuditModal.title}</p>
                <p className="text-foreground/60 flex items-center gap-1.5 mt-0.5">
                  <FontAwesomeIcon icon={faLocationDot} className="text-primary text-[10px]" />
                  <span>{mediaAuditModal.location}</span>
                  <span>•</span>
                  <span>{mediaAuditModal.owner_name || 'Hôte'}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="font-heading text-base font-bold text-primary font-mono">
                  {formatPrice(mediaAuditModal.price)} <span className="text-[10px] font-normal text-foreground/60">/{mediaAuditModal.price_unit || 'nuit'}</span>
                </p>
                <span className="text-[10px] font-semibold text-foreground/60 uppercase">
                  {mediaAuditModal.type === 'stay' ? 'Hébergement' : 'Véhicule'}
                </span>
              </div>
            </div>

            {/* Rejection Alert if already refused */}
            {mediaAuditModal.status === 'refused' && mediaAuditModal.rejection_reason && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  <span>Motif de refus actuel :</span>
                </div>
                <p>{mediaAuditModal.rejection_reason}</p>
              </div>
            )}

            {/* Photos Gallery Inspection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faCamera} className="text-primary" />
                  <span>Photos transmises ({mediaAuditModal.gallery?.length || 1})</span>
                </span>
                <span className="text-[11px] text-foreground/50">Vérifiez la netteté et la luminosité</span>
              </div>

              {/* Main Photo Full View */}
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black shadow">
                <img
                  src={mediaAuditModal.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'}
                  alt={mediaAuditModal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  ★ Photo Principale
                </div>
              </div>

              {/* Thumbnails Row if multiple photos */}
              {mediaAuditModal.gallery && mediaAuditModal.gallery.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                  {mediaAuditModal.gallery.map((img, i) => (
                    <div key={i} className="aspect-[16/10] rounded-xl overflow-hidden border border-foreground/10 bg-black">
                      <img src={img} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Short Tour Video Inspection Player */}
            <div className="space-y-2 pt-3 border-t border-foreground/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faVideo} className="text-accent" />
                  <span>Visite Vidéo d'Aperçu</span>
                </span>
                {mediaAuditModal.video_url ? (
                  <span className="text-emerald-700 font-bold text-[11px]">✓ Vidéo chargée</span>
                ) : (
                  <span className="text-foreground/40 italic text-[11px]">Aucune vidéo transmise</span>
                )}
              </div>

              {mediaAuditModal.video_url ? (
                <div className="rounded-2xl overflow-hidden shadow">
                  <ListingVideoPlayer
                    videoUrl={mediaAuditModal.video_url}
                    poster={mediaAuditModal.gallery?.[0]}
                    title={mediaAuditModal.title}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-foreground/15 text-center text-xs text-foreground/50">
                  L'hôte n'a pas inclus de courte vidéo d'ambiance pour cette annonce.
                </div>
              )}
            </div>

            {/* Description & Specs preview */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-foreground/10 text-xs space-y-2">
              <p className="font-bold text-foreground">Descriptif & Prestations :</p>
              <p className="text-foreground/75 leading-relaxed">{mediaAuditModal.description}</p>
              {mediaAuditModal.specs && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mediaAuditModal.specs.map((sp, idx) => (
                    <span key={idx} className="bg-background border border-foreground/10 px-2 py-0.5 rounded-full text-[10px] text-foreground/70">
                      {sp}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => handleDeleteListingItem(mediaAuditModal.id, mediaAuditModal.title)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 self-start sm:self-auto"
              >
                <FontAwesomeIcon icon={faTrash} />
                <span>Supprimer l'annonce</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleOpenRejectionModal(mediaAuditModal)}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faBan} />
                  <span>Refuser (Non conforme)</span>
                </button>

                <button
                  onClick={() => handleApproveListing(mediaAuditModal.id)}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faCheck} />
                  <span>Approuver & Mettre en ligne</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE REFUS DE CONFORMITÉ (REJECTION REASON) */}
      {/* ========================================================================= */}
      {rejectionModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-card border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-base">
                <div className="h-8 w-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBan} />
                </div>
                <span>Refuser l'Annonce</span>
              </div>
              <button
                onClick={() => setRejectionModalListing(null)}
                className="text-foreground/40 hover:text-foreground p-1"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div>
              <p className="text-[11px] text-foreground/60 mb-0.5 font-medium">Bien concerné :</p>
              <p className="font-bold text-foreground text-sm">{rejectionModalListing.title}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Motif principal de non-conformité *
                </label>
                <select
                  value={rejectionPresetReason}
                  onChange={(e) => setRejectionPresetReason(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)">
                    Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)
                  </option>
                  <option value="Vidéo trop lourde, instable ou non représentative des lieux">
                    Vidéo trop lourde, instable ou non représentative des lieux
                  </option>
                  <option value="Tarif incohérent ou anormal pour la catégorie">
                    Tarif incohérent ou anormal pour la catégorie
                  </option>
                  <option value="Description trompeuse ou informations de contact privées">
                    Description trompeuse ou informations de contact privées
                  </option>
                  <option value="Bien non conforme au positionnement de luxe Bénin Beyond">
                    Bien non conforme au positionnement de luxe Bénin Beyond
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Précisions / Consignes pour l'hôte (Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={rejectionCustomNote}
                  onChange={(e) => setRejectionCustomNote(e.target.value)}
                  placeholder="Ex : Merci de reprendre des photos horizontales lumineuses du séjour et de la piscine..."
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-rose-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectionModalListing(null)}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/75 hover:bg-muted"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmRejection}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-md"
              >
                Confirmer le Refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION / MODIFICATION ÉVÉNEMENT CULTUREL */}
      {/* ========================================================================= */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="relative w-full max-w-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-3xl bg-card border border-foreground/15 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-foreground/10 shrink-0 bg-card z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {editingEvent ? 'Mise à jour' : 'Nouvel Événement'}
                </span>
                <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                  {editingEvent ? `Modifier "${editingEvent.title}"` : 'Ajouter un Événement Culturel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
                title="Fermer"
                aria-label="Fermer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Titre de l'Événement *
                </label>
                <input
                  type="text"
                  required
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  placeholder="Ex : Vodun Days 2026, Fête de la Gani, Festival Masques..."
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Badge d'Accroche
                  </label>
                  <input
                    type="text"
                    value={evtBadge}
                    onChange={(e) => setEvtBadge(e.target.value)}
                    placeholder="Ex : Festival International, Célébration Royale..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Thématique / Catégorie
                  </label>
                  <input
                    type="text"
                    value={evtTag}
                    onChange={(e) => setEvtTag(e.target.value)}
                    placeholder="Ex : Culture & Spiritualité, Arts Contemporains..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Période / Dates *
                  </label>
                  <input
                    type="text"
                    required
                    value={evtPeriod}
                    onChange={(e) => setEvtPeriod(e.target.value)}
                    placeholder="Ex : 9 - 11 Janvier 2026, Novembre 2026..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Lieu / Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={evtLocation}
                    onChange={(e) => setEvtLocation(e.target.value)}
                    placeholder="Ex : Ouidah, Nikki, Cotonou, Grand-Popo..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  URL de l'image représentative
                </label>
                <input
                  type="url"
                  value={evtImage}
                  onChange={(e) => setEvtImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {evtImage && (
                  <div className="mt-2 h-28 w-full rounded-xl overflow-hidden border border-foreground/10 bg-muted">
                    <img
                      src={evtImage}
                      alt="Aperçu"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Description détaillée du temps fort
                </label>
                <textarea
                  rows={3}
                  value={evtDescription}
                  onChange={(e) => setEvtDescription(e.target.value)}
                  placeholder="Racontez la portée spirituelle, artistique ou culturelle de l'événement pour les voyageurs..."
                  className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              </div>

              <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-foreground/10 flex items-center justify-end gap-3 bg-card/95 backdrop-blur-sm z-10 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all"
                >
                  {editingEvent ? 'Enregistrer les Modifications' : 'Publier en Ligne'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ÉDITION UTILISATEUR */}
      {/* ========================================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-foreground">
                  Modifier l'Utilisateur
                </h3>
                <p className="text-xs text-foreground/60">
                  Ajustez le profil, le rôle ou le statut d'activation du compte
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="h-8 w-8 rounded-full border border-foreground/15 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Nom Complet *
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Adresse Email (Identifiant)
                </label>
                <input
                  type="email"
                  disabled
                  value={userFormEmail}
                  className="w-full rounded-xl border border-foreground/10 bg-muted/50 px-3.5 py-2.5 text-xs text-foreground/60 cursor-not-allowed"
                />
                <span className="text-[10px] text-foreground/40 mt-1 block">L'email sert d'identifiant unique sécurisé de connexion.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={userFormPhone}
                    onChange={(e) => setUserFormPhone(e.target.value)}
                    placeholder="+229 97 00 00 00"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Rôle sur la Plateforme
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value)}
                    disabled={editingUser?.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com'}
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="client">Client</option>
                    <option value="owner">Propriétaire / Hôte / Loueur</option>
                    <option value="subadmin">Assistant Admin (Sub-Admin - Opérations)</option>
                  </select>
                  {editingUser?.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com' && (
                    <span className="text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                      Le rôle Super-Administrateur est exclusif et inaltérable.
                    </span>
                  )}
                </div>
              </div>

              {(userFormRole === 'owner' || userFormRole === 'partner') && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Société / Nom de la structure hôte
                  </label>
                  <input
                    type="text"
                    value={userFormCompany}
                    onChange={(e) => setUserFormCompany(e.target.value)}
                    placeholder="Ex: Villa Royale Ouidah SARL"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              {userFormRole === 'subadmin' && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-[11px] text-foreground/80">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                    <FontAwesomeIcon icon={faUserShield} className="h-3 w-3" />
                    Statut Assistant Admin (Délégué Opérationnel)
                  </p>
                  <p className="text-foreground/60 text-[10.5px]">
                    Ce compte dispose des accès complets aux opérations (réservations, catalogue, avis, agenda), mais la gestion des utilisateurs lui sera sécurisée et verrouillée.
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-foreground/10 bg-muted/20 p-4">
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Statut d'Activation du Compte
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="userActiveRadio"
                      checked={userFormIsActive === true}
                      onChange={() => setUserFormIsActive(true)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-emerald-600">Actif (Accès autorisé)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="userActiveRadio"
                      checked={userFormIsActive === false}
                      onChange={() => setUserFormIsActive(false)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-rose-600">Suspendu (Désactivé)</span>
                  </label>
                </div>
                <p className="text-[11px] text-foreground/50 mt-2">
                  Un compte suspendu ne peut plus se connecter à la plateforme, mais toutes ses données restent archivées.
                </p>
              </div>

              <div className="pt-3 border-t border-foreground/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CRÉATION ASSISTANT ADMIN (SUB-ADMIN) - SUPER-ADMIN ONLY */}
      {/* ========================================================================= */}
      {showAddAssistantModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-wider mb-1">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-2.5 w-2.5" />
                  Délégation Opérationnelle
                </div>
                <h3 className="text-base font-black text-foreground">
                  Créer un Assistant Admin
                </h3>
                <p className="text-xs text-foreground/60">
                  Attribuez un compte Sub-Admin pour gérer les opérations du quotidien
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAssistantModal(false)}
                className="h-8 w-8 rounded-full border border-foreground/15 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssistant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Nom Complet de l'Assistant *
                </label>
                <input
                  type="text"
                  required
                  value={newAssistantName}
                  onChange={(e) => setNewAssistantName(e.target.value)}
                  placeholder="Ex: Marc Lawson"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Adresse Email Professionnelle *
                </label>
                <input
                  type="email"
                  required
                  value={newAssistantEmail}
                  onChange={(e) => setNewAssistantEmail(e.target.value)}
                  placeholder="ex: adjoint@monentreprise.com"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <span className="text-[10px] text-foreground/50 mt-1 block">
                  L'assistant pourra se connecter via cet email ou via Google avec cette adresse.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Numéro de Téléphone
                </label>
                <input
                  type="tel"
                  value={newAssistantPhone}
                  onChange={(e) => setNewAssistantPhone(e.target.value)}
                  placeholder="+229 97 00 00 00"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5 text-[11px] text-foreground/80 space-y-1.5">
                <p className="font-bold text-accent flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
                  Droits & Périmètre de l'Assistant Admin :
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-foreground/70 text-[10.5px]">
                  <li>Accès complet au Cockpit, Réservations, Avis, Agenda et Biens.</li>
                  <li>Publication d'annonces et modération des partenaires.</li>
                  <li className="font-semibold text-rose-500">Aucun accès à la gestion des utilisateurs (sécurisé).</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-foreground/10">
                <button
                  type="button"
                  onClick={() => setShowAddAssistantModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAssistant}
                  className="rounded-xl bg-accent px-5 py-2 text-xs font-black text-black hover:bg-white transition-all shadow-sm disabled:opacity-50"
                >
                  {isCreatingAssistant ? 'Création en cours...' : 'Valider & Créer l’Assistant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL MODIFIER MOT DE PASSE SUPER-ADMIN */}
      {/* ========================================================================= */}
      {showAdminPasswordModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold uppercase tracking-wider mb-1">
                  <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" />
                  Sécurité Compte Super-Admin
                </div>
                <h3 className="text-base font-black text-foreground">
                  Modifier mon mot de passe
                </h3>
                <p className="text-xs text-foreground/60">
                  Définissez votre propre mot de passe personnalisé ({user?.email || 'isidoretoudonou@gmail.com'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminPasswordModal(false)}
                className="h-8 w-8 rounded-full border border-foreground/15 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminPassword} className="space-y-4">
              {adminPasswordError && (
                <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5 shrink-0" />
                  <span>{adminPasswordError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showAdminPasswordText ? 'text' : 'password'}
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Votre mot de passe personnel"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 pr-10 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordText(!showAdminPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1 text-xs"
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={showAdminPasswordText ? faEyeSlash : faEye} />
                  </button>
                </div>
                <span className="text-[10.5px] text-foreground/50 mt-1 block">
                  Ce mot de passe sera immédiatement enregistré et requis à votre prochaine connexion.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Confirmer le nouveau mot de passe *
                </label>
                <input
                  type={showAdminPasswordText ? 'text' : 'password'}
                  required
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-foreground/10">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adminPasswordSaving}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {adminPasswordSaving ? 'Enregistrement...' : 'Enregistrer mon mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AUDIT CONFORMITÉ & DOSSIER KYC PARTENAIRE */}
      {/* ========================================================================= */}
      {selectedKycModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-foreground/15 bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-foreground/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Dossier KYC & Conformité Bénin
                  </h3>
                  <p className="text-xs text-foreground/60">
                    Vérification des pièces officielles et habilitation de l'opérateur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKycModal(null)}
                className="h-8 w-8 rounded-full border border-foreground/15 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Profile & Business info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 block">
                  Identité de l'Opérateur
                </span>
                <p className="text-sm font-bold text-foreground">{selectedKycModal.name}</p>
                <p className="text-xs font-semibold text-primary">{selectedKycModal.company}</p>
                <div className="pt-2 text-[11px] text-foreground/70 space-y-1">
                  <p className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3 text-foreground/40" />
                    <span>{selectedKycModal.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-foreground/40" />
                    <span className="font-mono">{selectedKycModal.phone}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 block">
                  Registre Fiscal & Légal (Bénin)
                </span>
                <div>
                  <span className="text-[10px] text-foreground/50">Numéro IFU (Identifiant Fiscal Unique) :</span>
                  <p className="font-mono text-sm font-bold text-primary tracking-wide">
                    {selectedKycModal.taxId || 'Non renseigné'}
                  </p>
                </div>
                {selectedKycModal.rccm && (
                  <div>
                    <span className="text-[10px] text-foreground/50">Numéro RCCM (Société) :</span>
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {selectedKycModal.rccm}
                    </p>
                  </div>
                )}
                {selectedKycModal.cip && (
                  <div>
                    <span className="text-[10px] text-foreground/50">Numéro CIP / CNI (Particulier) :</span>
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {selectedKycModal.cip}
                    </p>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-[10px] text-foreground/50">Spécialisation : </span>
                  <span className="text-xs font-bold text-foreground">
                    {selectedKycModal.partnerType === 'stay' ? '🏡 Résidences & Lodges' : selectedKycModal.partnerType === 'drive' ? '🚗 Flotte Automobile VIP' : '🌟 Stay & Drive Combiné'}
                  </span>
                </div>
              </div>
            </div>

            {/* Document justification */}
            <div className="rounded-2xl border border-foreground/10 bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/50 block">
                    Pièce Justificative Fournie
                  </span>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {selectedKycModal.docType || 'Dossier Justificatif Officiel'}
                  </p>
                </div>
                {selectedKycModal.docUrl && (
                  <a
                    href={selectedKycModal.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3" />
                    <span>Ouvrir le scan</span>
                  </a>
                )}
              </div>

              {selectedKycModal.docUrl ? (
                <div className="rounded-xl border border-foreground/15 overflow-hidden bg-black/40 flex items-center justify-center max-h-72">
                  <img
                    src={selectedKycModal.docUrl}
                    alt="Document KYC"
                    className="max-h-72 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-foreground/20 p-6 text-center text-xs text-foreground/50">
                  <FontAwesomeIcon icon={faFileContract} className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  <p>Aucun fichier numérisé transmis pour le moment.</p>
                  <p className="text-[10px] text-foreground/40 mt-1">Le numéro IFU renseigné peut être vérifié directement auprès des services fiscaux béninois.</p>
                </div>
              )}
            </div>

            {/* Status card */}
            <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${
              selectedKycModal.kycStatus === 'verified'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : selectedKycModal.kycStatus === 'rejected'
                ? 'bg-rose-500/10 border-rose-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={
                    selectedKycModal.kycStatus === 'verified'
                      ? faCheckCircle
                      : selectedKycModal.kycStatus === 'rejected'
                      ? faBan
                      : faClock
                  }
                  className={`h-5 w-5 ${
                    selectedKycModal.kycStatus === 'verified'
                      ? 'text-emerald-600'
                      : selectedKycModal.kycStatus === 'rejected'
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {selectedKycModal.kycStatus === 'verified'
                      ? 'Partenaire Certifié Conforme'
                      : selectedKycModal.kycStatus === 'rejected'
                      ? 'Dossier KYC Non Conforme (Rejeté)'
                      : 'Dossier en Attente de Certification'}
                  </p>
                  <p className="text-[11px] text-foreground/60">
                    {selectedKycModal.kycStatus === 'verified'
                      ? 'L’opérateur dispose des pleines autorisations pour publier et recevoir des versements.'
                      : selectedKycModal.kycStatus === 'rejected'
                      ? selectedKycModal.rejectionReason || 'Le dossier a été refusé pour non-conformité réglementaire.'
                      : 'La validation officielle attribue le badge de confiance et active la visibilité de ses annonces.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-foreground/10 pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedKycModal(null)}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
              >
                Fermer
              </button>
              {selectedKycModal.kycStatus !== 'verified' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenRejectKycModal(selectedKycModal)}
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5"
                    title="Refuser le dossier KYC et spécifier le motif"
                  >
                    <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                    <span>Refuser le Dossier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyPartnerKyc(selectedKycModal.id, selectedKycModal.email)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5" />
                    <span>Certifier Conforme (Valider KYC)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : REJET DU DOSSIER KYC DU PARTENAIRE (MOTIF DE NON-CONFORMITÉ) */}
      {/* ========================================================================= */}
      {rejectionKycPartner && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-foreground/15 shadow-2xl p-6 sm:p-7 space-y-5 animate-fadeIn">
            
            <div className="flex items-start justify-between border-b border-foreground/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Audit Réglementaire • Décision de Refus
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Refuser le Dossier KYC
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Partenaire : <strong>{rejectionKycPartner.name || rejectionKycPartner.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectionKycPartner(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-800 flex items-start gap-2.5">
              <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 text-amber-600 shrink-0" />
              <span>
                Le propriétaire sera immédiatement notifié dans son tableau de bord avec ce motif afin qu'il puisse corriger ses pièces justificatives.
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  Motif principal de non-conformité :
                </label>
                <select
                  value={rejectionKycPresetReason}
                  onChange={(e) => setRejectionKycPresetReason(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Numéro IFU invalide ou non conforme DGI Bénin">
                    Numéro IFU invalide ou non conforme DGI Bénin
                  </option>
                  <option value="Pièce d'identité (CIP / CNI / Passeport) expirée, illisible ou non authentique">
                    Pièce d'identité (CIP / CNI / Passeport) expirée, illisible ou non authentique
                  </option>
                  <option value="Registre de commerce RCCM manquant ou non conforme">
                    Registre de commerce RCCM manquant ou non conforme
                  </option>
                  <option value="Incohérence entre les informations du profil et les pièces transmises">
                    Incohérence entre les informations du profil et les pièces transmises
                  </option>
                  <option value="Dossier incomplet / Document scanné inexploitable">
                    Dossier incomplet / Document scanné inexploitable
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  Instructions ou précisions pour le partenaire (optionnel) :
                </label>
                <textarea
                  rows={3}
                  value={rejectionKycCustomNote}
                  onChange={(e) => setRejectionKycCustomNote(e.target.value)}
                  placeholder="Ex : Veuillez retransmettre une photo nette de votre CIP recto-verso valide et confirmer votre IFU personnel..."
                  className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-foreground/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectionKycPartner(null)}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectKyc}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faBan} className="h-3.5 w-3.5" />
                <span>Confirmer le Rejet KYC</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Universelle de Confirmation Pro (Remplace window.confirm) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
