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
  faKey,
  faSpinner,
  faCircleInfo,
  faFilePdf,
  faRotateRight,
  faCompass,
  faScissors,
  faUtensils,
  faLandmark,
  faLeaf,
  faPrint
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { getListings, deleteListing, updateListingStatus, addListing, updateListing, getCustomListings, activateOwnerListings, suspendOwnerListings } from '../services/listingService';
import { getOpenListingReports, closeListingReport, REPORT_REASONS } from '../services/reportService';
import { getBookings, updateBookingStatus, deleteBooking } from '../services/bookingService';
import { getReviews, deleteReview, updateReviewStatus } from '../services/reviewService';
import { getPacks, addPack, deletePack } from '../services/packService';
import { getEvents, addEvent, updateEvent, deleteEvent } from '../services/eventService';
import { getDiscoveries, addDiscovery, updateDiscovery, deleteDiscovery, toggleDiscoveryStatus, INITIAL_DISCOVERIES } from '../services/discoveryService';
import { getUsers, updateUser, toggleUserStatus, deleteUser, verifyPartnerKYC, rejectPartnerKYC, resetPartnerKYC, createAssistantAdmin } from '../services/userService';
import { getAllVerificationApplications, reviewIndividualDocument, reviewApplicationOverall, getApplicationAuditTrail } from '../services/ownerVerificationService';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { ScrollReveal } from '../components/ScrollReveal';
import { compressImage, compressImageToBlob } from '../utils/imageOptimizer';
import { uploadMediaFile, parseVideoEmbed } from '../services/mediaStorage';
import { ConfirmModal } from '../components/ConfirmModal';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';
import { getTimeBasedGreeting } from '../utils/dateUtils';
import { BrandLogo } from '../components/BrandLogo';
import { EvolutionAreaChart } from '../components/EvolutionAreaChart';
import { printInvoiceDocument } from '../utils/invoicePrinter';

// ======================================================================
// Utilitaires KYC — Documents requis et badges de statut vérification
// ======================================================================
function getRequiredDocumentsSchema(ownerType, assetCategories = []) {
  const base = [];
  if (ownerType === 'registered_business') {
    base.push(
      { id: 'ifu', label: 'Numéro IFU (Identifiant Fiscal Unique)' },
      { id: 'rccm', label: 'Extrait RCCM' },
      { id: 'id_card', label: 'Pièce d\'identité du représentant (CIP / CNI / Passeport)' }
    );
  } else if (ownerType === 'authorized_manager') {
    base.push(
      { id: 'mandate', label: 'Mandat / Procuration signée' },
      { id: 'id_card', label: 'Pièce d\'identité du gestionnaire' },
      { id: 'owner_id', label: 'Pièce d\'identité du propriétaire mandant' }
    );
  } else {
    // individual
    base.push(
      { id: 'id_card', label: 'Pièce d\'identité (CIP / CNI / Passeport)' },
      { id: 'proof_address', label: 'Justificatif de domicile (facture SBEE / SONEB)' }
    );
  }
  const cats = Array.isArray(assetCategories) ? assetCategories : [];
  if (cats.includes('hotel') || cats.includes('apartment') || cats.includes('villa_house')) {
    base.push({ id: 'property_title', label: 'Titre foncier / Attestation de propriété' });
  }
  if (cats.includes('vehicle')) {
    base.push({ id: 'vehicle_registration', label: 'Carte grise / Certificat d\'immatriculation' });
  }
  if (cats.includes('land')) {
    base.push({ id: 'land_title', label: 'Titre foncier / Plan cadastral' });
  }
  return base;
}

function getVerificationStatusBadge(status) {
  switch (status) {
    case 'approved':
      return { label: 'Certifié Conforme', bgClass: 'bg-emerald-500/15 border border-emerald-500/30', textClass: 'text-emerald-700 dark:text-emerald-300' };
    case 'rejected':
      return { label: 'Rejeté / Non conforme', bgClass: 'bg-rose-500/15 border border-rose-500/30', textClass: 'text-rose-700 dark:text-rose-300' };
    case 'additional_info_required':
      return { label: 'Complément requis', bgClass: 'bg-amber-500/15 border border-amber-500/30', textClass: 'text-amber-700 dark:text-amber-300' };
    case 'under_review':
      return { label: 'En cours d\'examen', bgClass: 'bg-blue-500/15 border border-blue-500/30', textClass: 'text-blue-700 dark:text-blue-300' };
    case 'submitted':
      return { label: 'Soumis — En attente', bgClass: 'bg-sky-500/15 border border-sky-500/30', textClass: 'text-sky-700 dark:text-sky-300' };
    default:
      return { label: 'Brouillon / Non soumis', bgClass: 'bg-muted border border-foreground/10', textClass: 'text-foreground/60' };
  }
}

const isUuidValue = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isSuperAdmin: authIsSuperAdmin, updateSuperAdminPassword } = useAuth();
  const isSuperAdmin = Boolean(
    user && (
      authIsSuperAdmin ||
      user?.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com' ||
      user?.is_super_admin ||
      user?.role === 'superadmin'
    )
  );
  const isSubAdmin = Boolean(user && !isSuperAdmin);

  // Redirection immédiate si non connecté ou rôle non-admin
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    } else if (user.role !== 'admin' && user.role !== 'subadmin' && user.role !== 'superadmin') {
      const fallback =
        user.role === 'owner' || user.role === 'partner'
          ? '/dashboard/partner'
          : '/dashboard/client';
      navigate(fallback, { replace: true });
    }
  }, [user, navigate]);

  const handleAdminLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Erreur déconnexion admin:', e);
    }
    try {
      localStorage.removeItem('benin_beyond_user');
      localStorage.removeItem('benin_beyond_admin_section');
    } catch {}
    window.location.href = '/login';
  };

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

  useEffect(() => {
    if (currentSection === 'users' && isSuperAdmin) {
      getUsers()
        .then((fresh) => {
          if (fresh && fresh.length > 0) {
            setUsersList(fresh);
          }
        })
        .catch((e) => console.warn('Erreur synchronisation utilisateurs:', e));
    }
  }, [currentSection, isSuperAdmin]);

  const handleSetSection = (sec) => {
    setCurrentSection(sec);
    try {
      localStorage.setItem('benin_beyond_admin_section', sec);
    } catch {}
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states (Chargement instantané 0ms depuis le cache + rafraîchissement Supabase en tâche de fond)
  const [listings, setListings] = useState(() => getCustomListings());
  const [listingReports, setListingReports] = useState([]);

  useEffect(() => {
    getOpenListingReports().then(setListingReports);
  }, []);

  const handleCloseReport = async (report, suspend) => {
    if (suspend && report.listing_id) await handleSuspendListing(report.listing_id);
    const ok = await closeListingReport(report.id, suspend ? 'resolved' : 'dismissed');
    if (ok) setListingReports((prev) => prev.filter((r) => r.id !== report.id));
  };
  const [bookings, setBookings] = useState([]);
  const [partners, setPartners] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [packs, setPacks] = useState([]);
  const [events, setEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
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
  const [userFormKycStatus, setUserFormKycStatus] = useState('pending');
  const [userKycFilter, setUserKycFilter] = useState('all'); // 'all' | 'verified' | 'pending' | 'rejected'
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerKycFilter, setPartnerKycFilter] = useState('all'); // 'all' | 'pending' | 'verified' | 'rejected'

  // Owner Verification & Onboarding Applications States (Dynamic KYC/KYB Multi-Pièces)
  const [partnerActiveTab, setPartnerActiveTab] = useState('verifications'); // 'verifications' | 'directory'
  const [verificationApplications, setVerificationApplications] = useState([]);
  const [verificationStatusFilter, setVerificationStatusFilter] = useState('all');
  const [verificationTypeFilter, setVerificationTypeFilter] = useState('all');
  const [verificationCategoryFilter, setVerificationCategoryFilter] = useState('all');
  const [selectedVerifAppModal, setSelectedVerifAppModal] = useState(null);
  const [verifDocDecisionModal, setVerifDocDecisionModal] = useState(null); // { ruleId, docName, decision: 'action_required' | 'rejected', feedback: '' }
  const [verifAppDecisionModal, setVerifAppDecisionModal] = useState(null); // { decision: 'rejected' | 'additional_info_required', notes: '' }
  const [verifAuditTab, setVerifAuditTab] = useState('documents'); // 'documents' | 'history'

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

  // Discoveries & Services (Gastronomie, Autres Services, Monuments, Nature)
  const [discoveriesList, setDiscoveriesList] = useState(() => INITIAL_DISCOVERIES);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [editingDiscovery, setEditingDiscovery] = useState(null);
  const [discCategory, setDiscCategory] = useState('restaurants');
  const [discSubcategory, setDiscSubcategory] = useState('gastronomie');
  const [discTitle, setDiscTitle] = useState('');
  const [discTagline, setDiscTagline] = useState('');
  const [discBadge, setDiscBadge] = useState('Table Recommandée');
  const [discLocation, setDiscLocation] = useState('Cotonou · Quartier Haie Vive');
  const [discDescription, setDiscDescription] = useState('');
  const [discHighlights, setDiscHighlights] = useState('');
  const [discTips, setDiscTips] = useState('');
  const [discPricing, setDiscPricing] = useState('');
  const [discPhone, setDiscPhone] = useState('+229 ');
  const [discWhatsapp, setDiscWhatsapp] = useState('+229 ');
  const [discInHomeService, setDiscInHomeService] = useState(false);
  const [discImage, setDiscImage] = useState('');
  const [discFilterCategory, setDiscFilterCategory] = useState('all');
  const [discSearch, setDiscSearch] = useState('');

  // Modals & Details
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [selectedKycModal, setSelectedKycModal] = useState(null);
  const [mediaAuditModal, setMediaAuditModal] = useState(null);
  const [auditVideoInput, setAuditVideoInput] = useState('');
  const [isSavingAuditVideo, setIsSavingAuditVideo] = useState(false);
  const [auditVideoSuccess, setAuditVideoSuccess] = useState('');
  const [auditVideoError, setAuditVideoError] = useState('');
  const [isUploadingAuditVideo, setIsUploadingAuditVideo] = useState(false);
  const [rejectionModalListing, setRejectionModalListing] = useState(null);
  const [rejectionPresetReason, setRejectionPresetReason] = useState('Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)');
  const [rejectionCustomNote, setRejectionCustomNote] = useState('');

  // Admin Listing Edit Modal State
  const [editingListingModal, setEditingListingModal] = useState(null);
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormPrice, setEditFormPrice] = useState('');
  const [editFormPriceUnit, setEditFormPriceUnit] = useState('nuit');
  const [editFormLocation, setEditFormLocation] = useState('');
  const [editFormDescription, setEditFormDescription] = useState('');
  const [editFormType, setEditFormType] = useState('stay'); // 'stay' | 'drive'
  const [editFormListingType, setEditFormListingType] = useState('rent'); // 'rent' | 'sale'
  const [editFormSpecs, setEditFormSpecs] = useState('');
  const [editFormPhotos, setEditFormPhotos] = useState([]);
  const [editPhotoUrlInput, setEditPhotoUrlInput] = useState('');
  const [editFormRooms, setEditFormRooms] = useState(1);
  const [editFormSeats, setEditFormSeats] = useState(5);
  const [editFormTransmission, setEditFormTransmission] = useState('automatique');
  const [editFormFuel, setEditFormFuel] = useState('essence');
  const [editFormAvailableFrom, setEditFormAvailableFrom] = useState('');
  const [editFormAvailableTo, setEditFormAvailableTo] = useState('');
  const [editFormVideoUrl, setEditFormVideoUrl] = useState('');
  const [editFormBadge, setEditFormBadge] = useState('');
  const [editFormStatus, setEditFormStatus] = useState('active');
  const [editIsSaving, setEditIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccessAlert, setEditSuccessAlert] = useState('');
  const [editIsUploadingPhoto, setEditIsUploadingPhoto] = useState(false);

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
  const [formSpecs, setFormSpecs] = useState('Wi-Fi Fibre, Climatisation, Groupe électrogène, Sécurité 24/7');
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
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allListings, allBookings, allPacks, allEvents, allUsers, allReviews, allVerifications, allDiscoveries] = await Promise.all([
        getListings({ includePending: true }),
        getBookings(),
        getPacks(),
        getEvents(),
        getUsers(),
        getReviews(null, { includeAll: true }),
        getAllVerificationApplications(),
        getDiscoveries()
      ]);
      setListings(allListings || []);
      setBookings(allBookings || []);
      setPacks(allPacks || []);
      setEvents(allEvents || []);
      setUsersList(allUsers || []);
      setReviewsList(allReviews || []);
      setVerificationApplications(allVerifications || []);
      setDiscoveriesList(allDiscoveries || []);

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

      // Demandes de reversement : Supabase uniquement (aucun cache navigateur)
      let fetchedPayouts = [];
      if (isSupabaseConfigured && supabase) {
        const { data: pData, error: pError } = await supabase
          .from('payouts')
          .select('*')
          .order('created_at', { ascending: false });
        if (pError) {
          console.error('[Payouts] Lecture impossible :', pError.message);
        } else {
          fetchedPayouts = (pData || []).map((p) => ({
            ...p,
            method: p.method_label || p.method,
            recipient: p.recipient_phone_or_account || '',
            date: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : ''
          }));
        }
      }
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

  // Discovery Handlers (Gastronomie, Autres Services, Monuments, Nature)
  const handleOpenCreateDiscovery = () => {
    setEditingDiscovery(null);
    setDiscCategory('restaurants');
    setDiscSubcategory('gastronomie');
    setDiscTitle('');
    setDiscTagline('Saveurs & Spécialités Culinaires');
    setDiscBadge('Table Recommandée');
    setDiscLocation('Cotonou · Quartier Haie Vive');
    setDiscDescription('');
    setDiscHighlights('Poissons nobles et grillades au feu de bois\nCadre convivial et accueil chaleureux\nRéservation garantie Bénin Beyond');
    setDiscTips('Réservation conseillée pour les tables en terrasse.');
    setDiscPricing('Plats dès 8 000 FCFA');
    setDiscPhone('+229 ');
    setDiscWhatsapp('+229 ');
    setDiscInHomeService(false);
    setDiscImage('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80');
    setShowDiscoveryModal(true);
  };

  const handleOpenEditDiscovery = (disc) => {
    setEditingDiscovery(disc);
    setDiscCategory(disc.category || 'restaurants');
    setDiscSubcategory(disc.subcategory || 'gastronomie');
    setDiscTitle(disc.title || '');
    setDiscTagline(disc.tagline || '');
    setDiscBadge(disc.badge || '');
    setDiscLocation(disc.location || '');
    setDiscDescription(disc.description || '');
    setDiscHighlights(Array.isArray(disc.highlights) ? disc.highlights.join('\n') : (disc.highlights || ''));
    setDiscTips(disc.tips || '');
    setDiscPricing(disc.pricing || '');
    setDiscPhone(disc.phone || '+229 ');
    setDiscWhatsapp(disc.whatsapp ? `+${disc.whatsapp}` : '+229 ');
    setDiscInHomeService(Boolean(disc.inHomeService));
    setDiscImage(disc.image || '');
    setShowDiscoveryModal(true);
  };

  const handleSaveDiscovery = async (e) => {
    e.preventDefault();
    if (!discTitle.trim()) {
      showToast('Veuillez renseigner le nom de la découverte ou du service.');
      return;
    }

    const highlightsArr = discHighlights
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanWhatsapp = (discWhatsapp || discPhone).replace(/[^0-9]/g, '');

    if (editingDiscovery) {
      await updateDiscovery(editingDiscovery.id, {
        category: discCategory,
        subcategory: discSubcategory,
        title: discTitle.trim(),
        badge: discBadge.trim() || (discInHomeService ? 'Service en Villa' : 'Recommandé'),
        location: discLocation.trim(),
        tagline: discTagline.trim(),
        description: discDescription.trim(),
        highlights: highlightsArr,
        tips: discTips.trim(),
        pricing: discPricing.trim(),
        phone: discPhone.trim(),
        whatsapp: cleanWhatsapp,
        inHomeService: Boolean(discInHomeService),
        image: discImage
      });
      showToast(`Découverte "${discTitle}" mise à jour avec succès !`);
    } else {
      await addDiscovery({
        category: discCategory,
        subcategory: discSubcategory,
        title: discTitle.trim(),
        badge: discBadge.trim() || (discInHomeService ? 'Service en Villa' : 'Recommandé'),
        location: discLocation.trim(),
        tagline: discTagline.trim(),
        description: discDescription.trim(),
        highlights: highlightsArr,
        tips: discTips.trim(),
        pricing: discPricing.trim(),
        phone: discPhone.trim(),
        whatsapp: cleanWhatsapp,
        inHomeService: Boolean(discInHomeService),
        image: discImage,
        creator_role: 'admin',
        payment_status: 'free_admin',
        status: 'active'
      });
      showToast(`Nouvelle découverte "${discTitle}" ajoutée gratuitement par l'Admin !`);
    }

    const updated = await getDiscoveries();
    setDiscoveriesList(updated);
    setShowDiscoveryModal(false);
  };

  const handleDeleteDiscovery = (disc) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer cette découverte ?',
      message: `Êtes-vous sûr de vouloir retirer définitivement "${disc.title}" de l'espace Découvertes ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await deleteDiscovery(disc.id);
        const updated = await getDiscoveries();
        setDiscoveriesList(updated);
        showToast(`"${disc.title}" a été supprimé.`);
      }
    });
  };

  const handleToggleDiscoveryStatus = async (disc) => {
    await toggleDiscoveryStatus(disc.id);
    const updated = await getDiscoveries();
    setDiscoveriesList(updated);
    const newStatus = disc.status === 'active' ? 'suspendue' : 'activée';
    showToast(`La fiche "${disc.title}" est maintenant ${newStatus}.`);
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
    setUserFormKycStatus(targetUser.kyc_status === 'rejected' ? 'rejected' : (targetUser.kyc_status === 'verified' || targetUser.verified ? 'verified' : 'pending'));
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const isVerified = userFormKycStatus === 'verified';
      await updateUser(editingUser.id, {
        email: userFormEmail,
        name: userFormName,
        phone: userFormPhone || 'Non renseigné',
        role: userFormRole,
        company: userFormCompany,
        is_active: userFormIsActive,
        kyc_status: (userFormRole === 'owner' || userFormRole === 'partner') ? userFormKycStatus : ((userFormRole === 'admin' || userFormRole === 'subadmin') ? 'verified' : 'pending'),
        verified: (userFormRole === 'admin' || userFormRole === 'subadmin') ? true : isVerified
      });

      // Si le partenaire est certifié actif, activer automatiquement ses annonces en attente
      if (isVerified && (userFormRole === 'owner' || userFormRole === 'partner')) {
        const { activatedCount, updatedListings } = await activateOwnerListings(editingUser.id, userFormEmail);
        if (activatedCount > 0 && Array.isArray(updatedListings)) {
          setListings(updatedListings);
        }
      }

      showToast(`Utilisateur "${userFormName}" mis à jour avec succès !`);
      const updated = await getUsers();
      setUsersList(updated);

      // Synchroniser également la liste des partenaires
      const ownerUsers = updated.filter((u) => u.role === 'owner' || u.role === 'partner');
      setPartners(ownerUsers.map((p) => ({
        id: p.id,
        name: p.name || p.email.split('@')[0],
        company: p.company || 'Partenaire Bénin Beyond',
        email: p.email,
        phone: p.phone || 'Non renseigné',
        listingsCount: (listings || []).filter((l) => l.owner_id === p.id || l.owner_email === p.email).length,
        kycStatus: p.kyc_status === 'rejected' ? 'rejected' : (p.kyc_status === 'verified' || p.verified ? 'verified' : 'pending'),
        taxId: p.tax_id || 'Non renseigné',
        rccm: p.rccm || '',
        cip: p.cip || '',
        partnerType: p.partner_type || 'stay',
        docType: p.kyc_doc_type || 'Dossier Justificatif',
        docUrl: p.kyc_doc_url || '',
        joined: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Récemment',
        rejectionReason: p.rejection_reason || '',
        isActive: p.is_active !== false,
        balance: 0
      })));

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

  const handleSaveAdminPassword = async (e) => {
    e.preventDefault();
    setAdminPasswordError('');
    const trimmed = (adminPasswordInput || '').trim();
    if (!trimmed) {
      setAdminPasswordError('Veuillez saisir votre nouveau mot de passe.');
      return;
    }
    if (trimmed.length < 8) {
      setAdminPasswordError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (trimmed !== (adminPasswordConfirm || '').trim()) {
      setAdminPasswordError('Les deux mots de passe saisis ne sont pas identiques.');
      return;
    }

    setAdminPasswordSaving(true);
    try {
      const ok = await updateSuperAdminPassword(trimmed);
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

          if (uploadedUrl && (uploadedUrl.startsWith('http') || uploadedUrl.startsWith('data:'))) {
            setUploadedPhotos((prev) => [...prev, uploadedUrl]);
          } else {
            const dataUrl = await compressImage(file, 2048, 1536, 0.90);
            setUploadedPhotos((prev) => [...prev, dataUrl]);
          }
        } catch (err) {
          console.warn('Erreur téléversement image admin:', err);
          const dataUrl = await compressImage(file, 2048, 1536, 0.90).catch(() => null);
          if (dataUrl) {
            setUploadedPhotos((prev) => [...prev, dataUrl]);
          } else {
            const reader = new FileReader();
            reader.onload = (event) => {
              setUploadedPhotos((prev) => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    } finally {
      setCompressingPhotos(false);
      if (e.target) e.target.value = '';
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

  // Video handlers (short tour video, max 50MB ou lien web - Exclusivité Admin)
  const handleVideoUpload = async (e) => {
    setVideoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      setVideoError('Format vidéo non supporté. Veuillez choisir une vidéo MP4, WebM ou QuickTime (.mov).');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50) {
      setVideoError(`Cette vidéo fait ${sizeMB.toFixed(1)} Mo. Pour préserver la fluidité mobile, la taille maximale conseillée est de 50 Mo.`);
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
      const isCloud = Boolean(persistentUrl && (persistentUrl.startsWith('http://') || persistentUrl.startsWith('https://')));
      
      setUploadedVideo({
        url: persistentUrl || objectUrl,
        previewUrl: objectUrl,
        name: file.name,
        sizeMB: sizeMB.toFixed(1),
        isCloud
      });

      if (!isCloud) {
        setVideoError("ℹ️ Note : La vidéo a été chargée avec succès pour prévisualisation. Pour une accessibilité instantanée sur tous les appareils mobiles, vous pouvez également coller un lien direct (YouTube, Google Drive, Vimeo, MP4 public).");
      } else {
        setVideoError('');
        showToast('✓ Vidéo téléversée avec succès sur le serveur Bénin Beyond !');
      }
    } catch (err) {
      console.warn('Erreur téléversement vidéo admin:', err);
      setVideoError('Impossible de traiter ce fichier vidéo. Vous pouvez également coller un lien direct (YouTube, Google Drive, Vimeo, MP4 public).');
    } finally {
      setIsUploadingVideo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddVideoUrl = () => {
    let trimmed = videoUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    const embedInfo = parseVideoEmbed(trimmed);
    setUploadedVideo({
      url: trimmed,
      previewUrl: trimmed,
      name: embedInfo?.serviceName ? `Vidéo ${embedInfo.serviceName}` : 'Vidéo en ligne',
      sizeMB: 'Web',
      isCloud: true
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
      badge: adminInstantPublish ? 'Certifié' : 'En attente de modération',
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
  const paidBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          !b.is_manual_block &&
          b.status !== 'cancelled' &&
          (b.payment_status || 'paid') === 'paid'
      ),
    [bookings]
  );

  const platformMetrics = useMemo(() => {
    const totalGmv = paidBookings.reduce((sum, b) => sum + (Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0), 0);
    const totalCommissions = paidBookings.reduce((sum, b) => sum + (Number(b.commission_amount) || Math.round((Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0) * 0.10)), 0);
    const totalOwedToHosts = totalGmv - totalCommissions;
    const totalDisbursed = payouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;
    const pendingKycCount = partners.filter((p) => p.kycStatus === 'pending' || p.kyc_status === 'pending').length;
    const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;

    return {
      gmv: totalGmv,
      commissions: totalCommissions,
      disbursed: totalDisbursed,
      remainingToHosts: Math.max(totalOwedToHosts - totalDisbursed, 0),
      activeListings: listings.filter((l) => l.status === 'active' || !l.status).length,
      partnersCount: partners.length,
      pendingBookingsCount,
      pendingPayoutsCount,
      pendingKycCount,
      pendingListingsCount
    };
  }, [bookings, paidBookings, listings, partners, payouts]);

  // Évolution financière dynamique (Montée à chaque achat, baisse aux annulations, paliers réels)
  // Une transaction par réservation encaissée (les annulations sont exclues)
  const chartTransactions = useMemo(
    () =>
      paidBookings
        .map((b) => {
          const gmv = Number(b.gross_amount) || Number(b.total_amount) || Number(b.total_price) || 0;
          return {
            date: b.created_at || b.created_date,
            value: gmv,
            secondaryValue: Number(b.commission_amount) || Math.round(gmv * 0.10)
          };
        }),
    [paidBookings]
  );

  // Répartition réelle des canaux de paiement
  const paymentBreakdown = useMemo(() => {
    if (paidBookings.length === 0) return null;
    const totals = { mtn: 0, moov: 0, celtiis: 0, card: 0, other: 0 };
    paidBookings.forEach((b) => {
      const pm = (b.payment_method || '').toLowerCase();
      if (pm.includes('mtn')) totals.mtn += 1;
      else if (pm.includes('moov')) totals.moov += 1;
      else if (pm.includes('celtiis')) totals.celtiis += 1;
      else if (pm.includes('carte') || pm.includes('visa') || pm.includes('card')) totals.card += 1;
      else totals.other += 1;
    });
    const total = paidBookings.length || 1;
    return {
      mtn: Math.round((totals.mtn / total) * 100),
      moov: Math.round((totals.moov / total) * 100),
      celtiis: Math.round((totals.celtiis / total) * 100),
      card: Math.round((totals.card / total) * 100),
      other: Math.round((totals.other / total) * 100)
    };
  }, [paidBookings]);

  // Export CSV des réservations payées (relevé comptable réel)
  const handleExportStatement = () => {
    if (paidBookings.length === 0) {
      showToast('Aucune réservation payée à exporter.', 'error');
      return;
    }
    const header = ['Référence', 'Date', 'Client', 'Bien', 'Canal', 'Montant (FCFA)', 'Commission (FCFA)', 'Net hôte (FCFA)', 'Statut'];
    const rows = paidBookings.map((b) => {
      const gross = Number(b.gross_amount) || Number(b.total_amount) || 0;
      const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
      return [
        b.booking_ref,
        b.created_at ? new Date(b.created_at).toLocaleDateString('fr-FR') : '',
        b.customer_name,
        b.listing_title,
        b.payment_method,
        gross,
        comm,
        gross - comm,
        b.status
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `releve-benin-beyond-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Actions
  const handleOpenMediaAudit = (item) => {
    setMediaAuditModal(item);
    setAuditVideoInput(item?.video_url || '');
    setAuditVideoSuccess('');
    setAuditVideoError('');
  };

  const handleSaveAuditVideo = async (explicitUrl = null) => {
    if (!mediaAuditModal) return;
    setIsSavingAuditVideo(true);
    setAuditVideoError('');
    setAuditVideoSuccess('');
    try {
      const urlToSave = explicitUrl !== null ? explicitUrl : (auditVideoInput.trim() || null);
      await updateListing(mediaAuditModal.id, { video_url: urlToSave });
      setMediaAuditModal((prev) => ({ ...prev, video_url: urlToSave }));
      setListings((prev) =>
        prev.map((l) => (l.id === mediaAuditModal.id ? { ...l, video_url: urlToSave } : l))
      );
      setAuditVideoSuccess(urlToSave ? '✓ Vidéo certifiée enregistrée avec succès sur l’annonce !' : '✓ Vidéo retirée de l’annonce.');
      showToast(urlToSave ? 'Vidéo mise à jour sur l’annonce !' : 'Vidéo retirée de l’annonce.');
    } catch (err) {
      console.error('Erreur mise à jour vidéo:', err);
      setAuditVideoError('Erreur lors de l’enregistrement de la vidéo.');
      showToast('Erreur enregistrement vidéo.', 'error');
    } finally {
      setIsSavingAuditVideo(false);
    }
  };

  const handleAuditVideoUpload = async (e) => {
    setAuditVideoError('');
    setAuditVideoSuccess('');
    const file = e.target.files?.[0];
    if (!file || !mediaAuditModal) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv)$/i)) {
      setAuditVideoError('Format non supporté. Veuillez choisir un fichier MP4, WebM ou QuickTime (.mov).');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50) {
      setAuditVideoError(`Cette vidéo fait ${sizeMB.toFixed(1)} Mo (taille max recommandée 50 Mo).`);
      return;
    }

    setIsUploadingAuditVideo(true);
    try {
      const adminOwnerId = user?.id || 'admin';
      const uploadedUrl = await uploadMediaFile(file, {
        userId: adminOwnerId,
        listingId: mediaAuditModal.id,
        category: 'videos'
      });
      const objectUrl = URL.createObjectURL(file);
      const finalUrl = uploadedUrl || objectUrl;
      setAuditVideoInput(finalUrl);
      await handleSaveAuditVideo(finalUrl);
    } catch (err) {
      console.warn('Erreur téléversement vidéo audit:', err);
      setAuditVideoError('Erreur de téléversement. Vous pouvez coller un lien direct YouTube, Google Drive ou MP4.');
    } finally {
      setIsUploadingAuditVideo(false);
      if (e.target) e.target.value = '';
    }
  };

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

  // Open Admin Listing Edit Modal
  const handleOpenEditListing = (item) => {
    if (!item) return;
    setEditingListingModal(item);
    setEditError('');
    setEditSuccessAlert('');
    setEditPhotoUrlInput('');
    setEditFormTitle(item.title || '');
    setEditFormPrice(item.price ? String(item.price) : '');
    setEditFormPriceUnit(item.price_unit || (item.type === 'drive' ? 'jour' : 'nuit'));
    setEditFormLocation(item.location || '');
    setEditFormDescription(item.description || item.summary || '');
    setEditFormType(item.type || (item.rental_type === 'drive' ? 'drive' : 'stay'));
    setEditFormListingType(
      item.listing_type ||
      (item.price_unit === 'vente totale' || item.purpose === 'vente' ? 'sale' : 'rent')
    );
    setEditFormSpecs(Array.isArray(item.specs) ? item.specs.join(', ') : (item.specs || ''));

    const photos = Array.isArray(item.gallery) && item.gallery.length > 0
      ? [...item.gallery]
      : (item.image ? [item.image] : []);
    setEditFormPhotos(photos);

    setEditFormRooms(item.rooms_count || item.rooms || 1);
    setEditFormSeats(item.vehicle_seats || 5);
    setEditFormTransmission(item.transmission || 'automatique');
    setEditFormFuel(item.fuel_type || 'essence');
    setEditFormAvailableFrom(item.available_from || '');
    setEditFormAvailableTo(item.available_to || '');
    setEditFormVideoUrl(item.video_url || '');
    setEditFormBadge(item.badge || '');
    setEditFormStatus(item.status || 'active');
  };

  const handleEditPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setEditIsUploadingPhoto(true);
    setEditError('');
    try {
      const compressedList = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImage(file, { maxWidth: 1600, quality: 0.82 });
        compressedList.push(compressedBase64);
      }
      if (compressedList.length > 0) {
        setEditFormPhotos((prev) => [...prev, ...compressedList]);
        showToast(`✓ ${compressedList.length} photo(s) ajoutée(s) !`);
      }
    } catch (err) {
      console.warn('Erreur compression photo edit admin:', err);
      setEditError("Impossible de compresser l'image sélectionnée.");
    } finally {
      setEditIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddEditPhotoUrl = () => {
    const trimmed = editPhotoUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setEditError("L'URL de l'image doit commencer par https:// ou http://");
      return;
    }
    setEditFormPhotos((prev) => [...prev, trimmed]);
    setEditPhotoUrlInput('');
    setEditError('');
  };

  const handleRemoveEditPhoto = (idx) => {
    setEditFormPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSetFeaturedEditPhoto = (idx) => {
    if (idx === 0) return;
    setEditFormPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
    showToast('Photo principale mise à jour');
  };

  const handleSaveListingEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingListingModal) return;

    if (!editFormTitle.trim()) {
      setEditError("Le titre / nom du bien est obligatoire.");
      return;
    }
    if (!editFormPrice || isNaN(Number(editFormPrice)) || Number(editFormPrice) <= 0) {
      setEditError("Veuillez indiquer un tarif valide supérieur à 0 FCFA.");
      return;
    }
    if (!editFormLocation.trim()) {
      setEditError("La localisation (ville / quartier) est obligatoire.");
      return;
    }
    if (editFormPhotos.length === 0) {
      setEditError("Le bien doit posséder au moins une photo principale.");
      return;
    }

    setEditIsSaving(true);
    setEditError('');

    try {
      const isDrive = editFormType === 'drive';
      const priceNum = Math.round(Number(editFormPrice));
      const specsArray = editFormSpecs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const effectivePriceUnit = editFormListingType === 'sale'
        ? 'vente totale'
        : editFormPriceUnit;

      const updates = {
        title: editFormTitle.trim(),
        price: priceNum,
        price_unit: effectivePriceUnit,
        location: editFormLocation.trim(),
        description: editFormDescription.trim(),
        summary: editFormDescription.trim().slice(0, 160),
        type: editFormType,
        listing_type: editFormListingType,
        specs: specsArray.length > 0 ? specsArray : ['Standing Exclusif', 'Vérifié'],
        gallery: editFormPhotos,
        image: editFormPhotos[0] || null,
        video_url: editFormVideoUrl.trim() || null,
        rooms_count: isDrive ? 0 : Math.max(1, Number(editFormRooms) || 1),
        vehicle_seats: isDrive ? (Number(editFormSeats) || 5) : 0,
        transmission: isDrive ? editFormTransmission : null,
        fuel_type: isDrive ? editFormFuel : null,
        available_from: isDrive ? null : (editFormAvailableFrom || null),
        available_to: isDrive ? null : (editFormAvailableTo || null),
        badge: editFormBadge.trim() || (editFormStatus === 'active' ? 'Certifié' : null),
        status: editFormStatus
      };

      const res = await updateListing(editingListingModal.id, updates);

      // Mettre à jour l'état local dans AdminDashboardPage
      setListings((prev) =>
        prev.map((l) => (l.id === editingListingModal.id ? { ...l, ...updates, ...(res || {}) } : l))
      );

      // Si l'audit média était ouvert sur cette annonce, synchroniser
      if (mediaAuditModal && mediaAuditModal.id === editingListingModal.id) {
        setMediaAuditModal((prev) => ({ ...prev, ...updates, ...(res || {}) }));
      }

      setEditSuccessAlert(`Le bien "${updates.title}" a été modifié avec succès !`);
      showToast(`✓ Bien "${updates.title}" modifié avec succès !`);

      setTimeout(() => {
        setEditingListingModal(null);
        setEditSuccessAlert('');
        setEditIsSaving(false);
      }, 1000);
    } catch (err) {
      console.error('Erreur enregistrement modification annonce admin:', err);
      setEditError("Une erreur est survenue lors de l'enregistrement des modifications.");
      setEditIsSaving(false);
    }
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

  const handleApproveReview = async (rev) => {
    try {
      setReviewsList((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, status: 'approved' } : r))
      );
      await updateReviewStatus(rev.id, 'approved', rev.booking_id);
      showToast(`Avis de ${rev.author_name || 'ce voyageur'} validé avec succès ! Il est publié sur la plateforme.`);
    } catch (err) {
      console.error('Erreur approbation avis:', err);
      showToast("Impossible d'approuver cet avis.", 'error');
    }
  };

  const handleRejectReview = async (rev) => {
    try {
      setReviewsList((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, status: 'rejected' } : r))
      );
      await updateReviewStatus(rev.id, 'rejected', rev.booking_id);
      showToast(`Avis de ${rev.author_name || 'ce voyageur'} rejeté et masqué de l'affichage public.`);
    } catch (err) {
      console.error('Erreur rejet avis:', err);
      showToast("Impossible de rejeter cet avis.", 'error');
    }
  };

  const handleResetReviewPending = async (rev) => {
    try {
      setReviewsList((prev) =>
        prev.map((r) => (r.id === rev.id ? { ...r, status: 'pending' } : r))
      );
      await updateReviewStatus(rev.id, 'pending', rev.booking_id);
      showToast(`Avis de ${rev.author_name || 'ce voyageur'} replacé en attente de modération.`);
    } catch (err) {
      console.error('Erreur statut avis:', err);
      showToast("Erreur lors de la mise à jour.", 'error');
    }
  };

  // L'administrateur exécute le virement (Mobile Money / banque) puis le marque ici comme payé
  const updatePayoutStatus = async (payoutId, status) => {
    if (!isSupabaseConfigured || !supabase) {
      showToast('Serveur injoignable : statut non enregistré.', 'error');
      return false;
    }
    const { error } = await supabase
      .from('payouts')
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: isUuidValue(user?.id) ? user.id : null
      })
      .eq('id', payoutId);
    if (error) {
      console.error('[Payouts] Mise à jour refusée :', error.message);
      showToast('Mise à jour refusée par le serveur. Reconnectez-vous puis réessayez.', 'error');
      return false;
    }
    setPayouts((prev) => prev.map((p) => (p.id === payoutId ? { ...p, status } : p)));
    return true;
  };

  const handleApprovePayout = async (payoutId) => {
    if (await updatePayoutStatus(payoutId, 'completed')) {
      showToast('Virement marqué comme exécuté.');
    }
  };

  const handleRejectPayout = async (payoutId) => {
    if (await updatePayoutStatus(payoutId, 'rejected')) {
      showToast('Demande de versement refusée.');
    }
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

  const handleResetPartnerKyc = async (partnerId, partnerEmail = '') => {
    try {
      await resetPartnerKYC(partnerId, partnerEmail);

      // Suspension automatique et immédiate de toutes les annonces actives du partenaire
      const { suspendedCount, updatedListings } = await suspendOwnerListings(partnerId, partnerEmail);
      if (suspendedCount > 0 && Array.isArray(updatedListings)) {
        setListings(updatedListings);
      }

      setPartners((prev) =>
        prev.map((p) =>
          p.id === partnerId || (partnerEmail && p.email?.toLowerCase() === partnerEmail.toLowerCase())
            ? { ...p, kycStatus: 'pending', rejectionReason: '' }
            : p
        )
      );
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === partnerId || (partnerEmail && u.email?.toLowerCase() === partnerEmail.toLowerCase())
            ? { ...u, verified: false, kyc_status: 'pending', rejection_reason: '' }
            : u
        )
      );
      if (selectedKycModal && (selectedKycModal.id === partnerId || selectedKycModal.email === partnerEmail)) {
        setSelectedKycModal((prev) => ({ ...prev, kycStatus: 'pending', rejectionReason: '' }));
      }
      showToast(
        suspendedCount > 0
          ? `Partenaire remis en attente (Pending) : ${suspendedCount} annonce(s) retirée(s) de la marketplace.`
          : 'Partenaire remis en statut d\'audit en attente (Pending).'
      );
    } catch (err) {
      console.error('Erreur réinitialisation statut:', err);
      showToast('Erreur lors de la réinitialisation du statut.');
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

      // Retirer immédiatement les annonces actives de la mise en ligne
      const { suspendedCount, updatedListings } = await suspendOwnerListings(rejectionKycPartner.id, rejectionKycPartner.email);
      if (suspendedCount > 0 && Array.isArray(updatedListings)) {
        setListings(updatedListings);
      }

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
      showToast(
        suspendedCount > 0
          ? `Dossier KYC rejeté : motif notifié et ${suspendedCount} annonce(s) retirée(s) de la marketplace.`
          : 'Dossier KYC rejeté : motif de non-conformité notifié au partenaire.'
      );
      setRejectionKycPartner(null);
    } catch (err) {
      console.error('Erreur rejet KYC:', err);
      showToast('Erreur lors du rejet du dossier KYC.');
    }
  };

  // Handlers for Multi-Document Verification Reviews
  const handleReviewIndividualDoc = async (appId, ruleId, decision, feedback = '') => {
    try {
      const res = await reviewIndividualDocument(appId, ruleId, decision, feedback, user);
      if (res.success && res.application) {
        setVerificationApplications((prev) =>
          prev.map((app) => (app.id === appId ? res.application : app))
        );
        setSelectedVerifAppModal(res.application);
        showToast(
          decision === 'approved'
            ? 'Pièce justificative validée conforme.'
            : decision === 'action_required'
            ? 'Demande de remplacement de pièce enregistrée.'
            : 'Pièce justificative rejetée.'
        );
      }
      setVerifDocDecisionModal(null);
    } catch (err) {
      console.error('Erreur audit pièce:', err);
      showToast('Erreur lors de l’évaluation de la pièce.');
    }
  };

  const handleReviewOverallApp = async (appId, decision, notes = '') => {
    try {
      const res = await reviewApplicationOverall(appId, decision, notes, user);
      if (res.success && res.application) {
        setVerificationApplications((prev) =>
          prev.map((app) => (app.id === appId ? res.application : app))
        );
        setSelectedVerifAppModal(res.application);

        const targetUserId = res.application.user_id;
        const targetEmail = res.application.owner_email;

        if (decision === 'approved') {
          await verifyPartnerKYC(targetUserId, targetEmail);
          const { activatedCount, updatedListings } = await activateOwnerListings(targetUserId, targetEmail);
          if (activatedCount > 0 && Array.isArray(updatedListings)) {
            setListings(updatedListings);
          }
          setPartners((prev) =>
            prev.map((p) =>
              p.id === targetUserId || (targetEmail && p.email?.toLowerCase() === targetEmail.toLowerCase())
                ? { ...p, kycStatus: 'verified', rejectionReason: '' }
                : p
            )
          );
          setUsersList((prev) =>
            prev.map((u) =>
              u.id === targetUserId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())
                ? { ...u, verified: true, kyc_status: 'verified', rejection_reason: '' }
                : u
            )
          );
          showToast(
            activatedCount > 0
              ? `Propriétaire certifié conforme ! ${activatedCount} annonce(s) mise(s) en ligne automatiquement.`
              : 'Dossier de vérification approuvé et propriétaire certifié avec succès.'
          );
        } else if (decision === 'rejected') {
          await rejectPartnerKYC(targetUserId, targetEmail, notes);
          const { suspendedCount, updatedListings } = await suspendOwnerListings(targetUserId, targetEmail);
          if (suspendedCount > 0 && Array.isArray(updatedListings)) {
            setListings(updatedListings);
          }
          setPartners((prev) =>
            prev.map((p) =>
              p.id === targetUserId || (targetEmail && p.email?.toLowerCase() === targetEmail.toLowerCase())
                ? { ...p, kycStatus: 'rejected', rejectionReason: notes }
                : p
            )
          );
          setUsersList((prev) =>
            prev.map((u) =>
              u.id === targetUserId || (targetEmail && u.email?.toLowerCase() === targetEmail.toLowerCase())
                ? { ...u, verified: false, kyc_status: 'rejected', rejection_reason: notes }
                : u
            )
          );
          showToast(`Dossier rejeté : ${notes || 'Non conforme'}`);
        } else if (decision === 'additional_info_required') {
          showToast('Demande de complément d’information transmise au propriétaire.');
        }
      }
      setVerifAppDecisionModal(null);
    } catch (err) {
      console.error('Erreur décision globale vérification:', err);
      showToast('Erreur lors de la décision sur le dossier.');
    }
  };

  // Filtered Verification Applications
  const filteredVerifications = useMemo(() => {
    return verificationApplications.filter((app) => {
      // Status filter
      if (verificationStatusFilter !== 'all') {
        if (verificationStatusFilter === 'pending') {
          if (app.status !== 'submitted' && app.status !== 'under_review') return false;
        } else if (app.status !== verificationStatusFilter) {
          return false;
        }
      }
      // Owner type filter
      if (verificationTypeFilter !== 'all' && app.owner_type !== verificationTypeFilter) {
        return false;
      }
      // Asset category filter
      if (verificationCategoryFilter !== 'all') {
        const cats = Array.isArray(app.asset_categories) ? app.asset_categories : [];
        if (!cats.includes(verificationCategoryFilter)) return false;
      }
      // Search
      const q = partnerSearch.toLowerCase().trim();
      if (q) {
        const name = (app.owner_full_name || '').toLowerCase();
        const email = (app.owner_email || '').toLowerCase();
        const comp = (app.company_name || '').toLowerCase();
        const ifu = (app.tax_id || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !comp.includes(q) && !ifu.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [verificationApplications, verificationStatusFilter, verificationTypeFilter, verificationCategoryFilter, partnerSearch]);
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

      const isVerified = Boolean(u.kyc_status === 'verified' || u.verified);
      const isPending = !isVerified && u.kyc_status !== 'rejected';
      const isRejected = u.kyc_status === 'rejected';

      const matchKyc =
        userKycFilter === 'all' ||
        (userKycFilter === 'verified' && isVerified) ||
        (userKycFilter === 'pending' && isPending) ||
        (userKycFilter === 'rejected' && isRejected);

      return matchSearch && matchRole && matchStatus && matchKyc;
    });
  }, [usersList, userSearch, userRoleFilter, userStatusFilter, userKycFilter]);

  const userMetrics = useMemo(() => {
    const total = usersList.length;
    const clients = usersList.filter((u) => u.role === 'client' && u.is_active !== false).length;
    const owners = usersList.filter((u) => (u.role === 'owner' || u.role === 'partner') && u.is_active !== false).length;
    const subadmins = usersList.filter((u) => u.role === 'subadmin' && u.is_active !== false).length;
    const suspended = usersList.filter((u) => u.is_active === false).length;
    const pendingOwners = usersList.filter((u) => (u.role === 'owner' || u.role === 'partner') && u.kyc_status !== 'verified' && !u.verified && u.kyc_status !== 'rejected').length;
    const verifiedOwners = usersList.filter((u) => (u.role === 'owner' || u.role === 'partner') && (u.kyc_status === 'verified' || u.verified)).length;
    return { total, clients, owners, subadmins, suspended, pendingOwners, verifiedOwners };
  }, [usersList]);

  // Filtered partners & counts
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const q = (partnerSearch || '').toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.taxId?.toLowerCase().includes(q);

      const status = p.kycStatus === 'rejected' ? 'rejected' : (p.kycStatus === 'verified' ? 'verified' : 'pending');
      const matchStatus =
        partnerKycFilter === 'all' ||
        (partnerKycFilter === 'pending' && status === 'pending') ||
        (partnerKycFilter === 'verified' && status === 'verified') ||
        (partnerKycFilter === 'rejected' && status === 'rejected');

      return matchSearch && matchStatus;
    });
  }, [partners, partnerSearch, partnerKycFilter]);

  const partnerMetrics = useMemo(() => {
    const total = partners.length;
    const pending = partners.filter((p) => (p.kycStatus || 'pending') === 'pending').length;
    const verified = partners.filter((p) => p.kycStatus === 'verified').length;
    const rejected = partners.filter((p) => p.kycStatus === 'rejected').length;
    return { total, pending, verified, rejected };
  }, [partners]);

  const verifMetrics = useMemo(() => {
    const total = verificationApplications.length;
    const pending = verificationApplications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
    const additionalInfo = verificationApplications.filter((a) => a.status === 'additional_info_required').length;
    const approved = verificationApplications.filter((a) => a.status === 'approved').length;
    const rejected = verificationApplications.filter((a) => a.status === 'rejected').length;
    return { total, pending, additionalInfo, approved, rejected };
  }, [verificationApplications]);

  const filteredReviews = useMemo(() => {
    return reviewsList.filter((rev) => {
      const matchSearch =
        !reviewSearch ||
        rev.author_name?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.author_email?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        rev.comment?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (rev.listing_title && rev.listing_title.toLowerCase().includes(reviewSearch.toLowerCase()));
      const matchRating =
        reviewRatingFilter === 'all' || String(rev.rating) === String(reviewRatingFilter);
      const revStatus = rev.status || 'approved';
      const matchStatus =
        reviewStatusFilter === 'all' || revStatus === reviewStatusFilter;
      return matchSearch && matchRating && matchStatus;
    });
  }, [reviewsList, reviewSearch, reviewRatingFilter, reviewStatusFilter]);

  const featuredHomepageReviewIds = useMemo(() => {
    const approved = reviewsList.filter((r) => !r.is_seed && !String(r.id || '').startsWith('rev_curated_') && (r.status || 'approved') === 'approved');
    const sorted = [...approved].sort((a, b) => {
      const ratingA = Number(a.rating) || 5;
      const ratingB = Number(b.rating) || 5;
      if (ratingB !== ratingA) return ratingB - ratingA;
      const aIsReal = Boolean(a.booking_id && !a.is_seed);
      const bIsReal = Boolean(b.booking_id && !b.is_seed);
      if (aIsReal !== bIsReal) return aIsReal ? -1 : 1;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
    return new Set(sorted.slice(0, 10).map((r) => r.id));
  }, [reviewsList]);

  // Navigation épurée : 3 groupes, libellés courts, badge uniquement pour les actions en attente
  const pendingReviewsCount = reviewsList.filter((r) => r.status === 'pending').length;
  const navGroups = [
    {
      title: 'Pilotage',
      items: [
        { key: 'cockpit', label: "Vue d'ensemble", icon: faChartPie },
        { key: 'reservations', label: 'Réservations', icon: faCalendarCheck, badge: platformMetrics.pendingBookingsCount },
        { key: 'finances', label: 'Finances', icon: faWallet }
      ]
    },
    {
      title: 'Catalogue',
      items: [
        { key: 'moderation', label: 'Modération', icon: faShieldHalved, badge: platformMetrics.pendingListingsCount + listingReports.length },
        { key: 'catalog_inventory', label: 'Biens', icon: faHouse },
        { key: 'publish', label: 'Publier une annonce', icon: faCirclePlus },
        { key: 'packs', label: 'Packs', icon: faLayerGroup },
        { key: 'events', label: 'Événements', icon: faLandmark },
        { key: 'discoveries', label: 'Découvertes', icon: faCompass }
      ]
    },
    {
      title: 'Communauté',
      items: [
        { key: 'partners', label: 'Partenaires', icon: faBuilding, badge: platformMetrics.pendingKycCount },
        ...(isSuperAdmin ? [{ key: 'users', label: 'Utilisateurs', icon: faUsers }] : []),
        { key: 'reviews', label: 'Avis', icon: faStar, badge: pendingReviewsCount }
      ]
    }
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  if (!user || (!['admin', 'subadmin', 'superadmin'].includes(user.role))) {
    return null;
  }

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
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-64 max-w-[85vw] shrink-0 flex-col border-r border-foreground/10 bg-card text-foreground transition-transform duration-300 ease-in-out md:static md:h-screen md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link to="/" title="Retour au site" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-foreground/50 hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Fermer le menu"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-medium text-foreground/40">{group.title}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentSection === item.key;
                  return (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => {
                          handleSetSection(item.key);
                          setSidebarOpen(false);
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                          isActive
                            ? 'bg-muted font-semibold text-foreground'
                            : 'text-foreground/65 hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={item.icon}
                          className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-foreground/40'}`}
                        />
                        <span className="flex-1 truncate text-left">{item.label}</span>
                        {item.badge > 0 && (
                          <span className="min-w-[20px] rounded-full bg-accent/20 px-1.5 py-0.5 text-center text-[10.5px] font-semibold tabular-nums text-foreground/80">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-foreground/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {(user?.name || 'A').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{user?.name || 'Administrateur'}</p>
              <p className="truncate text-[11px] text-foreground/45">{isSuperAdmin ? 'Administrateur' : 'Assistant'}</p>
            </div>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="rounded-md p-2 text-foreground/45 hover:bg-muted hover:text-rose-600"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-1 px-1">
            <Link to="/" className="rounded-md px-2 py-1.5 text-[12px] text-foreground/55 hover:bg-muted hover:text-foreground">
              Voir le site
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
                className="rounded-md px-2 py-1.5 text-[12px] text-foreground/55 hover:bg-muted hover:text-foreground"
              >
                Mot de passe
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER - INDEPENDENT FLUID SCROLL */}
      {/* ========================================================================= */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 flex flex-col scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-foreground/10 bg-background/90 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-foreground/60 hover:bg-muted md:hidden"
              aria-label="Ouvrir le menu"
            >
              <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">
                {allNavItems.find((n) => n.key === currentSection)?.label || 'Administration'}
              </h1>
              <p className="hidden truncate text-xs text-foreground/50 sm:block">
                {getTimeBasedGreeting()}, {(user?.name || '').split(' ')[0] || 'Administrateur'}
              </p>
            </div>
          </div>

          {currentSection !== 'publish' && (
            <button
              type="button"
              onClick={() => setCurrentSection('publish')}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              <span className="hidden sm:inline">Publier un bien</span>
            </button>
          )}
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
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  { label: 'Volume encaissé', value: formatPrice(platformMetrics.gmv), hint: `${paidBookings.length} réservation${paidBookings.length > 1 ? 's' : ''} payée${paidBookings.length > 1 ? 's' : ''}` },
                  { label: 'Commissions', value: formatPrice(platformMetrics.commissions), hint: '10 % du volume' },
                  { label: 'Biens actifs', value: platformMetrics.activeListings, hint: 'Logements et véhicules' },
                  { label: 'Partenaires', value: platformMetrics.partnersCount, hint: 'Propriétaires certifiés' }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <EvolutionAreaChart
                title="Revenus de la plateforme"
                transactions={chartTransactions}
                valueLabel="Volume encaissé"
                secondaryLabel="Commissions (10 %)"
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Actions en attente */}
                <section className="rounded-2xl border border-foreground/10 bg-card lg:col-span-2">
                  <h3 className="border-b border-foreground/10 px-5 py-4 text-sm font-semibold text-foreground">À traiter</h3>
                  <ul className="divide-y divide-foreground/[0.07]">
                    {[
                      { key: 'moderation', label: 'Annonces à modérer', count: platformMetrics.pendingListingsCount },
                      { key: 'reservations', label: 'Réservations à valider', count: platformMetrics.pendingBookingsCount },
                      { key: 'partners', label: 'Dossiers KYC à vérifier', count: platformMetrics.pendingKycCount },
                      { key: 'reviews', label: 'Avis à modérer', count: pendingReviewsCount }
                    ].map((task) => (
                      <li key={task.key}>
                        <button
                          type="button"
                          onClick={() => handleSetSection(task.key)}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm text-foreground/75 transition-colors hover:bg-muted/50 hover:text-foreground"
                        >
                          <span>{task.label}</span>
                          <span className={`min-w-[28px] rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums ${
                            task.count > 0 ? 'bg-accent/20 text-foreground' : 'text-foreground/35'
                          }`}>
                            {task.count || 0}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Dernières annonces */}
                <section className="rounded-2xl border border-foreground/10 bg-card lg:col-span-3">
                  <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground">Dernières annonces</h3>
                    <button
                      type="button"
                      onClick={() => handleSetSection('catalog_inventory')}
                      className="text-xs font-medium text-foreground/55 hover:text-foreground"
                    >
                      Tout voir ({listings.length})
                    </button>
                  </div>

                  {listings.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-foreground/50">Aucune annonce pour le moment.</p>
                  ) : (
                    <ul className="divide-y divide-foreground/[0.07]">
                      {listings.slice(0, 5).map((item) => {
                        const isVehicle = item.type === 'drive' || item.subcategory === 'car';
                        const isOnline = item.status === 'active' || item.status === 'approved' || !item.status;
                        return (
                          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {item.gallery?.[0] && (
                                <img
                                  src={item.gallery[0]}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/listing/${item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm font-medium text-foreground hover:text-primary"
                              >
                                {item.title}
                              </Link>
                              <p className="truncate text-xs text-foreground/45">
                                {isVehicle ? 'Véhicule' : 'Logement'} · {item.location || 'Bénin'}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium tabular-nums text-foreground">{formatPrice(item.price)}</p>
                              <p className={`text-xs ${isOnline ? 'text-emerald-600' : item.status === 'pending' ? 'text-amber-600' : 'text-rose-600'}`}>
                                {isOnline ? 'En ligne' : item.status === 'pending' ? 'En attente' : 'Suspendu'}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: MODÉRATION DU CATALOGUE */}
          {/* ========================================================================= */}
          {currentSection === 'moderation' && (
            <div className="space-y-6">
              {listingReports.length > 0 && (
                <section className="rounded-2xl border border-rose-500/30 bg-card">
                  <h3 className="border-b border-foreground/10 px-5 py-4 text-sm font-semibold text-rose-600">
                    Signalements des voyageurs ({listingReports.length})
                  </h3>
                  <ul className="divide-y divide-foreground/[0.07]">
                    {listingReports.map((report) => (
                      <li key={report.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-medium text-foreground">{report.listing_title || report.listing_id}</p>
                          <p className="text-xs text-foreground/55">
                            {REPORT_REASONS.find((r) => r.id === report.reason)?.label || report.reason}
                            {' · '}
                            {new Date(report.created_at).toLocaleDateString('fr-FR')}
                            {report.reporter_email ? ` · ${report.reporter_email}` : ''}
                          </p>
                          {report.message && <p className="mt-1 text-xs text-foreground/70">« {report.message} »</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            to={`/listing/${report.listing_id}`}
                            target="_blank"
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground/60 hover:bg-muted"
                          >
                            Voir
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCloseReport(report, false)}
                            className="rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            Classer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloseReport(report, true)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Suspendre l'annonce
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Recherche et filtres */}
                <div className="space-y-3 border-b border-foreground/10 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35"
                      />
                      <input
                        type="text"
                        value={listingSearch}
                        onChange={(e) => setListingSearch(e.target.value)}
                        placeholder="Rechercher par titre, ville ou hôte..."
                        className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { key: 'all', label: `Tous (${listings.length})` },
                        { key: 'stay', label: 'Séjours' },
                        { key: 'drive', label: 'Véhicules' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setListingTypeFilter(tab.key)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            listingTypeFilter === tab.key
                              ? 'bg-foreground text-background'
                              : 'text-foreground/55 hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: 'all', label: 'Tous', count: listings.length },
                      { key: 'pending', label: 'En attente', count: listings.filter((l) => l.status === 'pending').length },
                      { key: 'active', label: 'En ligne', count: listings.filter((l) => l.status === 'active' || !l.status).length },
                      { key: 'refused', label: 'Refusées', count: listings.filter((l) => l.status === 'refused').length },
                      { key: 'suspended', label: 'Suspendues', count: listings.filter((l) => l.status === 'suspended').length }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setListingStatusFilter(tab.key)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          listingStatusFilter === tab.key
                            ? 'bg-muted text-foreground'
                            : 'text-foreground/50 hover:text-foreground'
                        }`}
                      >
                        {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Liste des annonces */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                      <tr>
                        <th className="px-5 py-3 font-medium">Annonce</th>
                        <th className="px-5 py-3 font-medium">Médias</th>
                        <th className="px-5 py-3 font-medium">Localisation</th>
                        <th className="px-5 py-3 font-medium">Prix</th>
                        <th className="px-5 py-3 font-medium">Hôte</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.07]">
                      {filteredListings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-sm text-foreground/50">
                            Aucune annonce ne correspond aux filtres sélectionnés.
                          </td>
                        </tr>
                      ) : (
                        filteredListings.map((item) => (
                          <tr key={item.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=120&q=80'}
                                  alt={item.title}
                                  className="h-10 w-12 shrink-0 cursor-pointer rounded-md object-cover hover:opacity-80"
                                  onClick={() => handleOpenMediaAudit(item)}
                                  title="Cliquer pour inspecter les photos & gérer la vidéo"
                                />
                                <div className="min-w-0">
                                  <p className="line-clamp-1 font-medium text-foreground">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-foreground/45">
                                    {item.type === 'stay' ? 'Hébergement' : 'Véhicule'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-5 py-3">
                              <button
                                type="button"
                                onClick={() => handleOpenMediaAudit(item)}
                                className="text-xs text-foreground/60 hover:text-foreground"
                                title="Inspecter la galerie et la visite vidéo"
                              >
                                {item.gallery?.length || 1} photo{(item.gallery?.length || 1) > 1 ? 's' : ''}
                                {' · '}
                                {item.video_url ? <span className="text-emerald-600">vidéo</span> : <span className="text-foreground/40">sans vidéo</span>}
                              </button>
                            </td>

                            <td className="px-5 py-3 text-foreground/60">
                              {item.location}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">
                              {formatPrice(item.price)}
                              <span className="text-xs text-foreground/45">
                                {' '}/{item.price_unit || 'nuit'}
                              </span>
                            </td>

                            <td className="px-5 py-3 text-foreground/70">
                              {item.owner_name || 'Hôte Partenaire'}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 text-xs font-medium">
                              {item.status === 'pending' ? (
                                <span className="text-amber-600">À contrôler</span>
                              ) : item.status === 'refused' ? (
                                <button
                                  type="button"
                                  className="text-rose-600 hover:underline"
                                  title={item.rejection_reason || 'Non conforme'}
                                  onClick={() => handleOpenRejectionModal(item)}
                                >
                                  Refusée
                                </button>
                              ) : item.status === 'suspended' ? (
                                <span className="text-foreground/50">Suspendue</span>
                              ) : (
                                <span className="text-emerald-600">En ligne</span>
                              )}
                            </td>

                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => handleOpenMediaAudit(item)}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                  title="Gérer les photos et la vidéo (Exclusivité Super-Admin)"
                                >
                                  <FontAwesomeIcon icon={faVideo} className="h-3 w-3" />
                                </button>

                                {item.status !== 'active' && item.status && (
                                  <button
                                    onClick={() => handleApproveListing(item.id)}
                                    className="rounded-md p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10"
                                    title="Approuver et mettre en ligne"
                                  >
                                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                  </button>
                                )}

                                {item.status !== 'refused' && (
                                  <button
                                    onClick={() => handleOpenRejectionModal(item)}
                                    className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                                    title="Refuser l'annonce (Photos/vidéo non conformes)"
                                  >
                                    <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleOpenEditListing(item)}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                  title="Modifier cette annonce (Nom, Prix, Photos, Détails)"
                                >
                                  <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                                </button>

                                <Link
                                  to={`/listing/${item.id}`}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                  title="Voir fiche publique"
                                >
                                  <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                                </Link>

                                <button
                                  onClick={() => handleDeleteListingItem(item.id, item.title)}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
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
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: RÉSERVATIONS GLOBALES */}
          {/* ========================================================================= */}
          {currentSection === 'reservations' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Recherche et filtres */}
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-sm">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35"
                    />
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Rechercher par client, référence ou bien..."
                      className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: 'all', label: `Toutes (${bookings.length})` },
                      { key: 'confirmed', label: 'Confirmées' },
                      { key: 'pending', label: 'En attente' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setBookingFilter(tab.key)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          bookingFilter === tab.key
                            ? 'bg-foreground text-background'
                            : 'text-foreground/55 hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                      <tr>
                        <th className="px-5 py-3 font-medium">Voyageur</th>
                        <th className="px-5 py-3 font-medium">Prestation</th>
                        <th className="px-5 py-3 font-medium">Dates</th>
                        <th className="px-5 py-3 font-medium">Montant</th>
                        <th className="px-5 py-3 font-medium">Commission</th>
                        <th className="px-5 py-3 font-medium">Net hôte</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.07]">
                      {filteredBookings.map((b) => {
                        const gross = Number(b.gross_amount) || 0;
                        const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
                        const net = gross - comm;

                        return (
                          <tr key={b.id || b.booking_ref} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3">
                              <p className="font-medium text-foreground">
                                {b.customer_name}
                              </p>
                              <p className="text-xs text-foreground/45">
                                {b.customer_phone}{b.customer_phone && b.booking_ref ? ' · ' : ''}<span className="font-mono">{b.booking_ref}</span>
                              </p>
                            </td>
                            <td className="px-5 py-3 text-foreground/75">
                              {b.listing_title}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-foreground/60">
                              {b.dates || 'Séjour à venir'}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">
                              {formatPrice(gross)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground/60">
                              {formatPrice(comm)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground/60">
                              {formatPrice(net)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-xs font-medium">
                              {b.status === 'confirmed' ? (
                                <span className="text-emerald-600">Confirmée</span>
                              ) : (
                                <span className="text-amber-600">En attente</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                {b.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateBooking(b.id || b.booking_ref, 'confirmed')}
                                    className="mr-1 rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                  >
                                    Valider
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedBookingModal(b)}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                  title="Voir le reçu détaillé"
                                >
                                  <FontAwesomeIcon icon={faReceipt} className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBookingItem(b.id || b.booking_ref, b.booking_ref)}
                                  className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                                  title="Supprimer la réservation"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredBookings.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-foreground/50">Aucune réservation.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: HÔTES, PARTENAIRES & VÉRIFICATION KYC */}
          {/* ========================================================================= */}
          {currentSection === 'partners' && (
            <div className="space-y-6">
              <p className="text-xs leading-relaxed text-foreground/50">
                Dès qu'un propriétaire est certifié, ses annonces en attente sont publiées automatiquement, et ses nouvelles annonces sont mises en ligne sans approbation manuelle.
              </p>

              {/* Onglets */}
              <div className="flex items-center gap-5 border-b border-foreground/10">
                {[
                  { key: 'verifications', label: 'Dossiers KYC', count: verifMetrics.pending },
                  { key: 'directory', label: 'Annuaire', count: null }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPartnerActiveTab(tab.key)}
                    className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                      partnerActiveTab === tab.key
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.key === 'directory' ? (
                      <span className="text-xs tabular-nums text-foreground/40">{partnerMetrics.total}</span>
                    ) : tab.count > 0 ? (
                      <span className="min-w-[22px] rounded-full bg-accent/20 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-foreground">
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* VUE 1 : DOSSIERS DE VÉRIFICATION (KYC/KYB) */}
              {partnerActiveTab === 'verifications' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                    {[
                      { label: 'Demandes', value: verifMetrics.total, hint: 'Dossiers enregistrés' },
                      { label: "En attente d'audit", value: verifMetrics.pending, hint: 'À traiter' },
                      { label: 'Complément requis', value: verifMetrics.additionalInfo, hint: 'Pièces à remplacer' },
                      { label: 'Approuvés', value: verifMetrics.approved, hint: 'Partenaires vérifiés' }
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-card p-5">
                        <p className="text-xs text-foreground/50">{kpi.label}</p>
                        <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                        <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                      </div>
                    ))}
                  </div>

                  <section className="rounded-2xl border border-foreground/10 bg-card">
                    <div className="space-y-3 border-b border-foreground/10 px-5 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Dossiers d'onboarding</h3>
                          <p className="mt-0.5 text-xs text-foreground/50">RCCM, IFU, titre foncier, cartes grises et mandats.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                          <input
                            type="text"
                            value={partnerSearch}
                            onChange={(e) => setPartnerSearch(e.target.value)}
                            placeholder="Rechercher nom, email, société, IFU..."
                            className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { key: 'all', label: 'Tous', count: verifMetrics.total },
                            { key: 'pending', label: 'En attente', count: verifMetrics.pending },
                            { key: 'additional_info_required', label: 'Complément', count: verifMetrics.additionalInfo },
                            { key: 'approved', label: 'Certifiés', count: verifMetrics.approved },
                            { key: 'rejected', label: 'Rejetés', count: verifMetrics.rejected }
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setVerificationStatusFilter(tab.key)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                verificationStatusFilter === tab.key
                                  ? 'bg-muted text-foreground'
                                  : 'text-foreground/50 hover:text-foreground'
                              }`}
                            >
                              {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={verificationTypeFilter}
                            onChange={(e) => setVerificationTypeFilter(e.target.value)}
                            className="rounded-lg border border-foreground/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="all">Tous profils</option>
                            <option value="individual">Particulier</option>
                            <option value="registered_business">Entreprise / Société</option>
                            <option value="authorized_manager">Gestionnaire Mandaté</option>
                          </select>

                          <select
                            value={verificationCategoryFilter}
                            onChange={(e) => setVerificationCategoryFilter(e.target.value)}
                            className="rounded-lg border border-foreground/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="all">Toutes catégories</option>
                            <option value="hotel">Hôtels</option>
                            <option value="apartment">Appartements</option>
                            <option value="villa_house">Villas</option>
                            <option value="vehicle">Véhicules</option>
                            <option value="land">Terrains</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                          <tr>
                            <th className="px-5 py-3 font-medium">Demandeur</th>
                            <th className="px-5 py-3 font-medium">Cadre juridique</th>
                            <th className="px-5 py-3 font-medium">Actifs déclarés</th>
                            <th className="px-5 py-3 font-medium">Documents</th>
                            <th className="px-5 py-3 font-medium">Statut</th>
                            <th className="px-5 py-3 font-medium">Dépôt</th>
                            <th className="px-5 py-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/[0.07]">
                          {filteredVerifications.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-10 text-center">
                                <p className="text-sm text-foreground/50">Aucun dossier de vérification trouvé.</p>
                                <p className="mt-1 text-xs text-foreground/40">
                                  Les demandes soumises par les propriétaires s'afficheront ici pour examen.
                                </p>
                              </td>
                            </tr>
                          ) : (
                            filteredVerifications.map((app) => {
                              const docsCount = Object.keys(app.documents || {}).length;
                              const requiredSchema = getRequiredDocumentsSchema(app.owner_type, app.asset_categories);
                              const requiredCount = requiredSchema.length;

                              const typeLabel =
                                app.owner_type === 'registered_business'
                                  ? 'Société / Entreprise'
                                  : app.owner_type === 'authorized_manager'
                                  ? 'Gestionnaire Mandaté'
                                  : 'Particulier';

                              const statusInfo = getVerificationStatusBadge(app.status);

                              return (
                                <tr key={app.id} className="transition-colors hover:bg-muted/40">
                                  <td className="px-5 py-3">
                                    <p className="font-medium text-foreground">{app.owner_full_name}</p>
                                    <p className="text-xs text-foreground/45">{app.owner_email}</p>
                                    {app.owner_phone && <p className="text-xs text-foreground/40">{app.owner_phone}</p>}
                                  </td>

                                  <td className="px-5 py-3">
                                    <p className="text-foreground/75">{typeLabel}</p>
                                    {app.company_name && (
                                      <p className="text-xs text-foreground/60">{app.company_name}</p>
                                    )}
                                    <div className="space-y-0.5 font-mono text-xs text-foreground/45">
                                      {app.tax_id && <p>IFU : {app.tax_id}</p>}
                                      {app.rccm_number && <p>RCCM : {app.rccm_number}</p>}
                                      {app.id_number && <p>ID : {app.id_number}</p>}
                                    </div>
                                  </td>

                                  <td className="max-w-[200px] px-5 py-3 text-xs text-foreground/60">
                                    {(app.asset_categories || []).map((cat) =>
                                      cat === 'hotel'
                                        ? 'Hôtel'
                                        : cat === 'apartment'
                                        ? 'Appartement'
                                        : cat === 'villa_house'
                                        ? 'Villa'
                                        : cat === 'vehicle'
                                        ? 'Véhicule'
                                        : 'Terrain'
                                    ).join(', ')}
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-3">
                                    <p className={`text-xs font-medium tabular-nums ${docsCount >= requiredCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {docsCount} / {requiredCount} pièces
                                    </p>
                                    <p className="text-xs text-foreground/40">
                                      {docsCount >= requiredCount ? 'Complet' : 'Partiel'}
                                    </p>
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-3">
                                    <span className={`text-xs font-medium ${statusInfo.textClass}`}>
                                      {statusInfo.label}
                                    </span>
                                  </td>

                                  <td className="whitespace-nowrap px-5 py-3 text-xs text-foreground/50">
                                    {app.submitted_at
                                      ? new Date(app.submitted_at).toLocaleDateString('fr-FR', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })
                                      : 'Non soumis'}
                                  </td>

                                  <td className="px-5 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedVerifAppModal(app);
                                        setVerifAuditTab('documents');
                                      }}
                                      className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                      title="Examiner les pièces et statuer sur le dossier"
                                    >
                                      Examiner
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {/* VUE 2 : ANNUAIRE DES PARTENAIRES */}
              {partnerActiveTab === 'directory' && (
                <>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                    {[
                      { label: 'Partenaires', value: partnerMetrics.total, hint: 'Propriétaires enregistrés' },
                      { label: "En attente d'audit", value: partnerMetrics.pending, hint: 'Dossiers à valider' },
                      { label: 'Certifiés', value: partnerMetrics.verified, hint: 'Publication directe' },
                      { label: 'Versements en attente', value: payouts.filter((p) => p.status === 'pending').length, hint: 'Demandes de retrait' }
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-card p-5">
                        <p className="text-xs text-foreground/50">{kpi.label}</p>
                        <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                        <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                      </div>
                    ))}
                  </div>

                  <section className="rounded-2xl border border-foreground/10 bg-card">
                    <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Annuaire des hôtes</h3>
                        <p className="mt-0.5 text-xs text-foreground/50">Titres fonciers, cartes grises et pièces d'identité.</p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-60">
                          <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                          <input
                            type="text"
                            value={partnerSearch}
                            onChange={(e) => setPartnerSearch(e.target.value)}
                            placeholder="Rechercher nom, enseigne, IFU..."
                            className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { key: 'all', label: 'Tous', count: partnerMetrics.total },
                            { key: 'pending', label: 'En attente', count: partnerMetrics.pending },
                            { key: 'verified', label: 'Certifiés', count: partnerMetrics.verified },
                            { key: 'rejected', label: 'Rejetés', count: partnerMetrics.rejected }
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setPartnerKycFilter(tab.key)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                partnerKycFilter === tab.key
                                  ? 'bg-muted text-foreground'
                                  : 'text-foreground/50 hover:text-foreground'
                              }`}
                            >
                              {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                          <tr>
                            <th className="px-5 py-3 font-medium">Hôte</th>
                            <th className="px-5 py-3 font-medium">Enseigne</th>
                            <th className="px-5 py-3 font-medium">Contact</th>
                            <th className="px-5 py-3 font-medium">Conformité</th>
                            <th className="px-5 py-3 font-medium">Statut KYC</th>
                            <th className="px-5 py-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/[0.07]">
                          {filteredPartners.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-10 text-center text-sm text-foreground/50">
                                Aucun partenaire trouvé avec ces filtres.
                              </td>
                            </tr>
                          ) : (
                            filteredPartners.map((p) => (
                              <tr key={p.id} className="transition-colors hover:bg-muted/40">
                                <td className="px-5 py-3">
                                  <p className="font-medium text-foreground">{p.name}</p>
                                  <p className="text-xs text-foreground/45">
                                    {p.partnerType === 'stay' ? 'Hébergements' : p.partnerType === 'drive' ? 'Mobilité' : 'Stay & Drive'}
                                  </p>
                                </td>
                                <td className="px-5 py-3 text-foreground/70">
                                  {p.company}
                                </td>
                                <td className="px-5 py-3">
                                  <p className="text-xs text-foreground/70">{p.phone}</p>
                                  <p className="text-xs text-foreground/45">{p.email}</p>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex flex-col gap-0.5 font-mono text-xs">
                                    <span className="text-foreground/75">IFU : {p.taxId || 'Non renseigné'}</span>
                                    {p.rccm && <span className="text-foreground/45">RCCM : {p.rccm}</span>}
                                    {p.cip && <span className="text-foreground/45">CIP : {p.cip}</span>}
                                    <span className="max-w-[180px] truncate font-sans text-foreground/40">{p.docType}</span>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-xs font-medium">
                                  {p.kycStatus === 'verified' ? (
                                    <span className="text-emerald-600">Certifié</span>
                                  ) : p.kycStatus === 'rejected' ? (
                                    <span className="cursor-help text-rose-600" title={p.rejectionReason || 'Dossier non conforme'}>
                                      Rejeté
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">En attente</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedKycModal(p)}
                                      className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                      title="Inspecter le dossier KYC complet"
                                    >
                                      Dossier
                                    </button>
                                    {p.kycStatus === 'verified' ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleResetPartnerKyc(p.id, p.email)}
                                          className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                          title="Suspendre ce partenaire et le remettre en attente (retire ses annonces de la marketplace)"
                                        >
                                          Suspendre
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenRejectKycModal(p)}
                                          className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
                                          title="Refuser ou révoquer le dossier KYC avec motif"
                                        >
                                          Refuser
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleVerifyPartnerKyc(p.id, p.email)}
                                          className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                          title="Valider la conformité et passer en actif (active automatiquement toutes les annonces)"
                                        >
                                          Activer
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenRejectKycModal(p)}
                                          className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
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
                  </section>
                </>
              )}

              {/* Demandes de versement */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Demandes de versement</h3>
                  <span className="text-xs text-foreground/50">
                    {payouts.filter((p) => p.status === 'pending').length} en attente
                  </span>
                </div>

                {payouts.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-foreground/50">
                    Aucune demande de reversement en attente.
                  </p>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {payouts.map((po) => (
                      <li
                        key={po.id}
                        className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {po.partnerName || po.partner_name || 'Partenaire'}
                            <span className="font-normal text-foreground/45"> · {po.company || 'Hôte / Loueur'}</span>
                          </p>
                          <p className="mt-0.5 break-words text-xs text-foreground/50">
                            {po.method} · <span className="font-mono">{po.recipient}</span> · {po.date || (po.created_at ? new Date(po.created_at).toLocaleDateString('fr-FR') : 'Récemment')}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium tabular-nums text-foreground">
                              {formatPrice(po.amount)}
                            </p>
                            <p className={`text-xs ${
                              po.status === 'completed' ? 'text-emerald-600' : po.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                            }`}>
                              {po.status === 'completed' ? 'Virement exécuté' : po.status === 'rejected' ? 'Refusé' : 'En attente'}
                            </p>
                          </div>

                          {po.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApprovePayout(po.id)}
                                className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                              >
                                Marquer payé
                              </button>
                              <button
                                onClick={() => handleRejectPayout(po.id)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
                              >
                                Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: GESTION DES UTILISATEURS & HABILITATIONS (SUPER-ADMIN ONLY) */}
          {/* ========================================================================= */}
          {currentSection === 'users' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground/50">
                  Voyageurs, partenaires, assistants et administrateurs de la plateforme.
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const fresh = await getUsers();
                        setUsersList(fresh);
                        showToast(`Synchronisation réussie : ${fresh.length} profils chargés depuis la base de données.`);
                      } catch {
                        showToast('Erreur lors de la synchronisation.');
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    title="Synchroniser immédiatement avec la base de données Supabase"
                  >
                    <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />
                    <span>Actualiser</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewAssistantName('');
                      setNewAssistantEmail('');
                      setNewAssistantPhone('');
                      setShowAddAssistantModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    <span>Ajouter un assistant</span>
                  </button>
                </div>
              </div>

              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-5">
                {[
                  { label: 'Utilisateurs', value: userMetrics.total, hint: 'Comptes enregistrés' },
                  { label: 'Voyageurs', value: userMetrics.clients, hint: 'Comptes clients' },
                  { label: 'Hôtes', value: userMetrics.owners, hint: "Gestionnaires d'annonces" },
                  { label: 'Assistants', value: userMetrics.subadmins, hint: 'Opérations & modération' },
                  { label: 'Suspendus', value: userMetrics.suspended, hint: 'Accès désactivé' }
                ].map((kpi, i) => (
                  <div key={kpi.label} className={`bg-card p-5 ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}>
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Recherche et filtres */}
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:w-72">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Rechercher par nom, email, société..."
                      className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { key: 'all', label: 'Tous' },
                        { key: 'client', label: 'Clients' },
                        { key: 'owner', label: 'Propriétaires' },
                        { key: 'subadmin', label: 'Assistants' },
                        { key: 'admin', label: 'Super-admin' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setUserRoleFilter(tab.key)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            userRoleFilter === tab.key ? 'bg-muted text-foreground' : 'text-foreground/50 hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none sm:flex-none"
                      >
                        <option value="all">Tous les accès</option>
                        <option value="active">Actifs uniquement</option>
                        <option value="suspended">Suspendus uniquement</option>
                      </select>

                      <select
                        value={userKycFilter}
                        onChange={(e) => setUserKycFilter(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none sm:flex-none"
                      >
                        <option value="all">Tous statuts KYC</option>
                        <option value="verified">Hôtes certifiés</option>
                        <option value="pending">Hôtes en attente</option>
                        <option value="rejected">Hôtes rejetés</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                      <tr>
                        <th className="px-5 py-3 font-medium">Utilisateur</th>
                        <th className="px-5 py-3 font-medium">Rôle</th>
                        <th className="px-5 py-3 font-medium">Société</th>
                        <th className="px-5 py-3 font-medium">Téléphone</th>
                        <th className="px-5 py-3 font-medium">Compte</th>
                        <th className="px-5 py-3 font-medium">KYC</th>
                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.07]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-sm text-foreground/50">
                            Aucun utilisateur trouvé avec ces critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isRowSuperAdmin = u.email?.toLowerCase().trim() === 'isidoretoudonou@gmail.com';
                          const isRowSubAdmin = u.role === 'subadmin';
                          const isActive = u.is_active !== false;

                          return (
                            <tr key={u.id} className="transition-colors hover:bg-muted/40">
                              <td className="px-5 py-3">
                                <p className="font-medium text-foreground">{u.name}</p>
                                <p className="text-xs text-foreground/45">{u.email}</p>
                              </td>

                              <td className="whitespace-nowrap px-5 py-3 text-foreground/70">
                                {isRowSuperAdmin
                                  ? 'Super-admin'
                                  : isRowSubAdmin || u.role === 'admin' || u.role === 'subadmin'
                                  ? 'Assistant admin'
                                  : u.role === 'owner' || u.role === 'partner'
                                  ? 'Propriétaire'
                                  : 'Voyageur'}
                              </td>

                              <td className="px-5 py-3 text-foreground/70">
                                {u.company || <span className="text-foreground/40">Particulier</span>}
                              </td>

                              <td className="whitespace-nowrap px-5 py-3 text-foreground/60">
                                {u.phone}
                              </td>

                              <td className="whitespace-nowrap px-5 py-3 text-xs font-medium">
                                {isActive ? (
                                  <span className="text-emerald-600">Actif</span>
                                ) : (
                                  <span className="text-rose-600">Suspendu</span>
                                )}
                              </td>

                              <td className="px-5 py-3">
                                {u.role === 'owner' || u.role === 'partner' ? (
                                  u.kyc_status === 'verified' || u.verified ? (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="mr-1 text-xs font-medium text-emerald-600">Certifié</span>
                                      <button
                                        type="button"
                                        onClick={() => handleResetPartnerKyc(u.id, u.email)}
                                        className="rounded-md px-2 py-0.5 text-xs text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
                                        title="Suspendre ce partenaire et le remettre en attente (retire ses annonces de la mise en ligne)"
                                      >
                                        Suspendre
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenRejectKycModal(u)}
                                        className="rounded-md px-2 py-0.5 text-xs text-rose-600 transition-colors hover:bg-rose-500/10"
                                        title="Refuser ou révoquer le dossier KYC de ce partenaire"
                                      >
                                        Refuser
                                      </button>
                                    </div>
                                  ) : u.kyc_status === 'rejected' ? (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="mr-1 text-xs font-medium text-rose-600">Rejeté</span>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyPartnerKyc(u.id, u.email)}
                                        className="rounded-md px-2 py-0.5 text-xs text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
                                        title="Réhabiliter et certifier ce propriétaire (publie ses annonces)"
                                      >
                                        Activer
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span className="mr-1 text-xs font-medium text-amber-600">En attente</span>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyPartnerKyc(u.id, u.email)}
                                        className="rounded-md px-2 py-0.5 text-xs text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
                                        title="Activer et certifier immédiatement ce propriétaire (publie ses annonces)"
                                      >
                                        Valider
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenRejectKycModal(u)}
                                        className="rounded-md px-2 py-0.5 text-xs text-rose-600 transition-colors hover:bg-rose-500/10"
                                        title="Refuser le dossier KYC"
                                      >
                                        Refuser
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-xs text-foreground/35">—</span>
                                )}
                              </td>

                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  {!isRowSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserActive(u)}
                                      className="mr-1 rounded-md px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                      title={isActive ? 'Suspendre l\'accès de cet utilisateur' : 'Réactiver l\'accès'}
                                    >
                                      {isActive ? 'Désactiver' : 'Réactiver'}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(u)}
                                    className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                    title="Modifier les informations ou changer le rôle"
                                  >
                                    <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                                  </button>

                                  {!isRowSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUserRecord(u)}
                                      className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
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
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: TRÉSORERIE & COMMISSIONS */}
          {/* ========================================================================= */}
          {currentSection === 'finances' && (
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  { label: 'Total encaissé', value: formatPrice(platformMetrics.gmv), hint: 'Réservations payées' },
                  { label: 'Commissions (10 %)', value: formatPrice(platformMetrics.commissions), hint: "Chiffre d'affaires net" },
                  { label: 'Reversé aux hôtes', value: formatPrice(platformMetrics.disbursed), hint: 'Virements exécutés' },
                  { label: 'Reste à reverser', value: formatPrice(platformMetrics.remainingToHosts), hint: 'Dû aux propriétaires' }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              {/* Canaux de paiement */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Canaux de paiement</h3>
                    <p className="mt-0.5 text-xs text-foreground/50">Réservations payées uniquement</p>
                  </div>
                  <button
                    onClick={handleExportStatement}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-3 w-3" />
                    <span>Exporter (CSV)</span>
                  </button>
                </div>

                {!paymentBreakdown ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucun flux de réservation enregistré pour l'instant.</p>
                    <p className="mx-auto mt-1 max-w-md text-xs text-foreground/40">
                      La répartition par canal (MTN MoMo, Moov Money, Celtiis Cash, carte bancaire) se calculera à mesure des réservations.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {[
                      { label: 'MTN Mobile Money', value: paymentBreakdown.mtn },
                      { label: 'Carte Visa / Mastercard', value: paymentBreakdown.card },
                      { label: 'Celtiis Cash', value: paymentBreakdown.celtiis },
                      { label: 'Moov Money', value: paymentBreakdown.moov },
                      { label: 'Nyole (canal non précisé)', value: paymentBreakdown.other }
                    ].map((row) => (
                      <li key={row.label} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="w-28 shrink-0 text-sm text-foreground/75 sm:w-52">{row.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(Number(row.value) || 0, 100)}%` }} />
                        </div>
                        <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">{row.value}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: FORMULES & PACKS SIGNATURE (EXCLUSIVITÉ SUPER-ADMIN) */}
          {/* ========================================================================= */}
          {currentSection === 'packs' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Packs signature <span className="font-normal tabular-nums text-foreground/40">{packs.length}</span>
                    </h3>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      Offres tout-en-un réunissant villa, véhicule et chauffeur. Réservé au super-administrateur.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewPackModal(true)}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:self-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    <span>Nouveau pack</span>
                  </button>
                </div>

                {packs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucun pack pour le moment.</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/40">
                      Composez une première offre combinant résidence privée et mobilité.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {packs.map((pk) => (
                      <li key={pk.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={pk.included?.[0]?.image || pk.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80'}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {pk.title}
                            {pk.badge && <span className="font-normal text-foreground/40"> · {pk.badge}</span>}
                          </p>
                          <p className="truncate text-xs text-foreground/45">
                            {[pk.location, ...(pk.included || []).map((it) => it.title)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <p className="hidden shrink-0 text-right text-sm font-medium tabular-nums text-foreground sm:block">
                          {formatPrice(pk.price)} <span className="text-xs font-normal text-foreground/45">/ {pk.priceUnit || 'jour'}</span>
                        </p>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Link
                            to={`/pack/${pk.id}`}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                            title="Voir le pack"
                          >
                            <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                          </Link>
                          <button
                            onClick={() => handleDeletePack(pk.id, pk.title)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                            title="Supprimer ce pack"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Modal de création de pack */}
              {showNewPackModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/50 p-0 sm:items-center sm:p-4">
                  <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-foreground/10 bg-card sm:max-h-[88vh] sm:rounded-2xl">
                    <div className="z-10 flex shrink-0 items-center justify-between border-b border-foreground/10 bg-card px-5 py-4">
                      <h3 className="text-sm font-semibold text-foreground">Nouveau pack signature</h3>
                      <button
                        onClick={() => setShowNewPackModal(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                        title="Fermer"
                        aria-label="Fermer"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={handleCreatePack} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Titre du pack *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ex: Pack Riviera & Évasion 4x4"
                            value={packTitle}
                            onChange={(e) => setPackTitle(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Accroche commerciale
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Villa d'exception + SUV 7 places tout terrain"
                            value={packTagline}
                            onChange={(e) => setPackTagline(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Tarif remisé (FCFA) *
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="115000"
                            value={packPrice}
                            onChange={(e) => setPackPrice(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Tarif normal barré (FCFA)
                          </label>
                          <input
                            type="number"
                            placeholder="130000"
                            value={packRegularPrice}
                            onChange={(e) => setPackRegularPrice(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Unité de tarification
                          </label>
                          <select
                            value={packPriceUnit}
                            onChange={(e) => setPackPriceUnit(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          >
                            <option value="jour">Par jour</option>
                            <option value="forfait">Forfait total</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Localisation
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Cotonou & Littoral"
                            value={packLocation}
                            onChange={(e) => setPackLocation(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Badge
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Offre Privilège, Coup de Cœur..."
                            value={packBadge}
                            onChange={(e) => setPackBadge(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-foreground/10 pt-4">
                        <p className="text-sm font-semibold text-foreground">Hébergement inclus</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">Titre de la villa ou suite</label>
                            <input
                              type="text"
                              placeholder="ex: Villa Cotonou Riviera (4 Chambres)"
                              value={packStayTitle}
                              onChange={(e) => setPackStayTitle(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">URL photo de l'hébergement</label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/photo-..."
                              value={packStayImage}
                              onChange={(e) => setPackStayImage(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-foreground/10 pt-4">
                        <p className="text-sm font-semibold text-foreground">Véhicule inclus</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">Modèle du véhicule</label>
                            <input
                              type="text"
                              placeholder="ex: SUV Toyota Fortuner 7 Places VIP"
                              value={packDriveTitle}
                              onChange={(e) => setPackDriveTitle(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">URL photo du véhicule</label>
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/photo-..."
                              value={packDriveImage}
                              onChange={(e) => setPackDriveImage(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-foreground/10 pt-4">
                        <label className="mb-1 block text-xs text-foreground/60">
                          Avantages clés (un par ligne)
                        </label>
                        <textarea
                          rows={3}
                          value={packAdvantages}
                          onChange={(e) => setPackAdvantages(e.target.value)}
                          placeholder="Prise en charge aéroport VIP&#10;Plein de carburant offert&#10;Conciergerie 24/7"
                          className="w-full rounded-lg border border-foreground/10 bg-background p-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-foreground/60">
                          Description détaillée
                        </label>
                        <textarea
                          rows={3}
                          value={packDescription}
                          onChange={(e) => setPackDescription(e.target.value)}
                          placeholder="Décrivez l'expérience unique proposée aux voyageurs..."
                          className="w-full rounded-lg border border-foreground/10 bg-background p-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        />
                      </div>

                      </div>

                      <div className="z-10 flex shrink-0 items-center justify-end gap-2 border-t border-foreground/10 bg-card px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                        <button
                          type="button"
                          onClick={() => setShowNewPackModal(false)}
                          className="rounded-lg px-3.5 py-2 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Publier le pack
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
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Événements en ligne <span className="font-normal tabular-nums text-foreground/40">{events.length}</span>
                    </h3>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {events.length > 3
                        ? 'Carrousel automatique actif sur la page d\'accueil.'
                        : "Grille statique sur la page d'accueil ; le carrousel s'active au-delà de 3 événements."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateEvent}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:self-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    Ajouter un événement
                  </button>
                </div>

                {events.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucun événement configuré.</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/40">
                      Mettez en avant le Vodun Days, la Gani, le Festival Masques ou d'autres temps forts du Bénin.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {events.map((evt) => (
                      <li key={evt.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {evt.image && (
                            <img
                              src={evt.image}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {evt.title}
                            <span className="font-normal text-foreground/40"> · {evt.badge || 'Événement'}</span>
                          </p>
                          <p className="truncate text-xs text-foreground/45">
                            {[evt.period, evt.location, evt.tag || 'Culture'].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvent(evt)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                            title="Modifier l'événement"
                          >
                            <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                            title="Supprimer l'événement"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: DÉCOUVERTES, GASTRONOMIE & SERVICES À DOMICILE */}
          {/* ========================================================================= */}
          {currentSection === 'discoveries' && (
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10">
                {[
                  { label: 'Fiches', value: discoveriesList.length, hint: 'Référencées' },
                  { label: 'Gastronomie', value: discoveriesList.filter(d => d.category === 'restaurants').length, hint: 'Tables' },
                  { label: 'Services', value: discoveriesList.filter(d => d.category === 'services').length, hint: 'Prestataires à domicile' }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="space-y-3 border-b border-foreground/10 px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Découvertes et services</h3>
                      <p className="mt-0.5 text-xs text-foreground/50">
                        Tables, prestataires à domicile et sites touristiques. Référencement gratuit pour l'admin.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenCreateDiscovery}
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:self-auto"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                      <span>Ajouter une fiche</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { key: 'all', label: 'Toutes' },
                        { key: 'restaurants', label: 'Gastronomie' },
                        { key: 'services', label: 'Services à domicile' }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setDiscFilterCategory(tab.key)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            discFilterCategory === tab.key
                              ? 'bg-muted text-foreground'
                              : 'text-foreground/50 hover:text-foreground'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-60">
                      <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom ou ville..."
                        value={discSearch}
                        onChange={(e) => setDiscSearch(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {discoveriesList.filter(d => {
                  if (discFilterCategory !== 'all' && d.category !== discFilterCategory) return false;
                  if (discSearch) {
                    const q = discSearch.toLowerCase();
                    return d.title?.toLowerCase().includes(q) || d.location?.toLowerCase().includes(q);
                  }
                  return true;
                }).length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucune fiche trouvée.</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/40">
                      Ajoutez une table, un prestataire de service à domicile ou un monument.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {discoveriesList
                      .filter(d => {
                        if (discFilterCategory !== 'all' && d.category !== discFilterCategory) return false;
                        if (discSearch) {
                          const q = discSearch.toLowerCase();
                          return d.title?.toLowerCase().includes(q) || d.location?.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map((disc) => (
                        <li key={disc.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            {disc.image && (
                              <img
                                src={disc.image}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {disc.title}
                              {disc.badge && <span className="font-normal text-foreground/40"> · {disc.badge}</span>}
                            </p>
                            <p className="truncate text-xs text-foreground/45">
                              <button type="button" onClick={() => handleToggleDiscoveryStatus(disc)} className={`sm:hidden ${disc.status === 'active' ? 'text-emerald-600' : disc.status === 'pending' ? 'text-amber-600' : 'text-rose-600'}`}>
                                {disc.status === 'active' ? 'En ligne' : disc.status === 'pending' ? 'À valider' : 'Suspendu'} ·{' '}
                              </button>
                              {disc.category === 'restaurants' ? 'Gastronomie' : 'Service en villa'}
                              {disc.location ? ` · ${disc.location}` : ''}
                              {' · '}
                              {disc.creator_role === 'provider'
                                ? 'Prestataire (500 F)'
                                : disc.creator_role === 'restaurant_partner'
                                ? 'Restaurateur (offert)'
                                : 'Admin'}
                              {disc.phone ? ` · ${disc.phone}` : ''}
                              {disc.pricing ? ` · ${disc.pricing}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleDiscoveryStatus(disc)}
                            className={`hidden shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted sm:block ${
                              disc.status === 'active' ? 'text-emerald-600' : disc.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                            }`}
                            title={disc.status === 'active' ? 'Suspendre cette fiche' : disc.status === 'pending' ? 'Valider et publier cette fiche' : 'Activer cette fiche'}
                          >
                            {disc.status === 'active' ? 'En ligne' : disc.status === 'pending' ? 'À valider' : 'Suspendu'}
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDiscovery(disc)}
                              className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                              title="Modifier cette fiche"
                            >
                              <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDiscovery(disc)}
                              className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                              title="Supprimer définitivement"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 7: PUBLIER UNE NOUVELLE ANNONCE (SUPER-ADMIN & PROPRIÉTAIRE) */}
          {/* ========================================================================= */}
          {currentSection === 'publish' && (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground/50">
                  Ajoutez un hébergement ou un véhicule directement au catalogue.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentSection('catalog_inventory')}
                  className="self-start text-xs font-medium text-foreground/55 hover:text-foreground sm:self-auto"
                >
                  Voir l'inventaire ({listings.length})
                </button>
              </div>

              {/* Mode de publication */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">Publication instantanée</h3>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {adminInstantPublish
                        ? 'L\'annonce sera directement réservable dès l\'enregistrement.'
                        : 'L\'annonce sera enregistrée « En attente » pour un audit ultérieur.'}
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={adminInstantPublish}
                      onChange={(e) => setAdminInstantPublish(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-foreground/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  </label>
                </div>
                <div className="border-t border-foreground/10 px-5 py-3 text-xs text-foreground/50">
                  Photos nettes et horizontales (1080p, en plein jour) · vidéo d'aperçu de 15 à 45 secondes (25 Mo max).
                </div>
              </section>

              {publishSuccess && (
                <p className="rounded-2xl border border-foreground/10 bg-card px-5 py-3.5 text-sm text-emerald-600">
                  {publishSuccess}
                </p>
              )}

              <form onSubmit={handleAdminPublishSubmit} className="rounded-2xl border border-foreground/10 bg-card">
                {/* Catégorie */}
                <div className="space-y-4 px-5 py-5">
                  <h3 className="text-sm font-semibold text-foreground">Catégorie</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('stay');
                        setFormPriceUnit('nuit');
                        setFormSubcategory('villa');
                        setRoomsCount(1);
                        setFormSpecs('Wi-Fi Fibre, Climatisation, Groupe électrogène, Sécurité 24/7');
                      }}
                      className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
                        formType === 'stay'
                          ? 'border-foreground/60 bg-muted/40'
                          : 'border-foreground/10 hover:border-foreground/25'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">Hébergement</p>
                      <p className="mt-0.5 text-xs text-foreground/50">Villa, appartement, loft</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormType('drive');
                        setFormPriceUnit('jour');
                        setFormSubcategory('car');
                        setRoomsCount(0);
                        setFormSpecs('Climatisation, Boîte automatique, Bluetooth, Caméra de recul, GPS');
                      }}
                      className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
                        formType === 'drive'
                          ? 'border-foreground/60 bg-muted/40'
                          : 'border-foreground/10 hover:border-foreground/25'
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">Véhicule</p>
                      <p className="mt-0.5 text-xs text-foreground/50">SUV, berline ou vente</p>
                    </button>
                  </div>

                  {formType === 'stay' && (
                    <div className="space-y-3">
                      <p className="text-xs text-foreground/60">Type d'établissement</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormSubcategory('villa')}
                          className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                            formSubcategory === 'villa'
                              ? 'border-foreground/60 bg-muted/40'
                              : 'border-foreground/10 hover:border-foreground/25'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">Villa / loft privé</p>
                          <p className="mt-0.5 text-xs text-foreground/50">Bien entier</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormSubcategory('hotel')}
                          className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                            formSubcategory === 'hotel'
                              ? 'border-foreground/60 bg-muted/40'
                              : 'border-foreground/10 hover:border-foreground/25'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">Chambre d'hôtel</p>
                          <p className="mt-0.5 text-xs text-foreground/50">Chambres et disponibilités</p>
                        </button>
                      </div>

                      {formSubcategory === 'hotel' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Stock de chambres
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={roomsCount}
                              onChange={(e) => setRoomsCount(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Disponible à partir du
                            </label>
                            <input
                              type="date"
                              value={availableFrom}
                              onChange={(e) => setAvailableFrom(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Disponible jusqu'au
                            </label>
                            <input
                              type="date"
                              value={availableTo}
                              onChange={(e) => setAvailableTo(e.target.value)}
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="space-y-4 border-t border-foreground/10 px-5 py-5">
                  <h3 className="text-sm font-semibold text-foreground">Informations</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-foreground/60">
                        Titre de l'annonce *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={formType === 'stay' ? 'ex: Villa Royale Cotonou Lagune' : 'ex: SUV Toyota Fortuner 7 Places VIP'}
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-foreground/60">
                        Ville et quartier *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Cotonou, Haie Vive ou Ouidah Plage"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Caractéristiques clés (séparées par des virgules)
                    </label>
                    <input
                      type="text"
                      value={formSpecs}
                      onChange={(e) => setFormSpecs(e.target.value)}
                      placeholder={
                        formType === 'stay'
                          ? 'Wi-Fi Fibre, Climatisation, Groupe électrogène, Sécurité 24/7'
                          : 'Climatisation, Boîte automatique, GPS, Bluetooth, Caméra de recul'
                      }
                      className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Décrivez les atouts majeurs, les finitions, l'accès sécurisé et le niveau de confort..."
                      className="w-full resize-none rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tarification */}
                <div className="space-y-4 border-t border-foreground/10 px-5 py-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Tarification</h3>
                    <span className="text-xs text-foreground/50">Commission 10 %</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-foreground/60">
                        Tarif public (FCFA) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder={formType === 'stay' ? '85000' : '45000'}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-foreground/60">
                        Modalité
                      </label>
                      <select
                        value={formPriceUnit}
                        onChange={(e) => setFormPriceUnit(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
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

                    <div>
                      <p className="mb-1 text-xs text-foreground/60">Marge plateforme</p>
                      <p className="py-2 text-sm font-medium tabular-nums text-foreground">
                        {formPrice ? formatPrice(Math.round(parseInt(formPrice, 10) * 0.10)) : '0 FCFA'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-3 border-t border-foreground/10 px-5 py-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Photos *</h3>
                    <p className="mt-0.5 text-xs text-foreground/50">Au moins une photo.</p>
                  </div>

                  {photoError && (
                    <p className="text-xs text-rose-600">{photoError}</p>
                  )}

                  <div className={`relative rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                    compressingPhotos
                      ? 'cursor-wait border-foreground/30 bg-muted/30'
                      : 'border-foreground/15 hover:border-foreground/35'
                  }`}>
                    <input
                      type="file"
                      id="admin-photo-upload"
                      multiple
                      disabled={compressingPhotos}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-1.5">
                      <FontAwesomeIcon icon={compressingPhotos ? faSpinner : faUpload} className={`h-4 w-4 text-foreground/40 ${compressingPhotos ? 'animate-spin' : ''}`} />
                      <p className="text-sm text-foreground/75">
                        {compressingPhotos ? 'Optimisation des photos en cours…' : 'Sélectionnez ou glissez-déposez vos photos'}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {compressingPhotos ? 'Compression automatique (2048x1536)' : 'JPG, PNG, WebP · 1920x1080 recommandé'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Ou collez un lien d'image..."
                      value={photoUrlInput}
                      onChange={(e) => setPhotoUrlInput(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoUrl}
                      className="shrink-0 rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      Ajouter
                    </button>
                  </div>

                  {uploadedPhotos.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-foreground/50">
                        {uploadedPhotos.length} photo{uploadedPhotos.length > 1 ? 's' : ''} · la photo encadrée sert de couverture
                      </p>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {uploadedPhotos.map((photo, index) => (
                          <div
                            key={index}
                            className={`group relative aspect-[16/10] overflow-hidden rounded-lg border-2 transition-colors ${
                              featuredPhotoIndex === index
                                ? 'border-foreground/70'
                                : 'border-transparent hover:border-foreground/20'
                            }`}
                          >
                            <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />

                            {featuredPhotoIndex === index ? (
                              <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                                Couverture
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setFeaturedPhotoIndex(index)}
                                className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                Définir couverture
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-black/70 text-xs text-white hover:bg-black"
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

                {/* Vidéo */}
                <div className="space-y-3 border-t border-foreground/10 px-5 py-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Visite vidéo</h3>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      Réservée aux admins. Fichier MP4/WebM jusqu'à 50 Mo, ou lien Google Drive, YouTube, Vimeo, MP4 public.
                    </p>
                  </div>

                  {videoError && (
                    <p className={`text-xs ${
                      videoError.includes('Note :') || videoError.includes('ℹ️')
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}>
                      {videoError}
                    </p>
                  )}

                  {!uploadedVideo ? (
                    <div className="space-y-3">
                      <div className="relative rounded-lg border border-dashed border-foreground/15 px-4 py-5 text-center transition-colors hover:border-foreground/35">
                        <input
                          type="file"
                          id="admin-video-upload"
                          accept="video/mp4,video/webm,video/quicktime,.mov,.mkv"
                          disabled={isUploadingVideo}
                          onChange={handleVideoUpload}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        />
                        <div className="pointer-events-none flex flex-col items-center gap-1.5">
                          <FontAwesomeIcon icon={isUploadingVideo ? faSpinner : faVideo} className={`h-4 w-4 text-foreground/40 ${isUploadingVideo ? 'animate-spin' : ''}`} />
                          <p className="text-sm text-foreground/75">
                            {isUploadingVideo ? 'Téléversement de la vidéo…' : 'Sélectionner une vidéo (.mp4, .webm, .mov)'}
                          </p>
                          <p className="text-xs text-foreground/40">
                            {isUploadingVideo ? 'Veuillez patienter pendant l\'envoi...' : '50 Mo maximum'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Ou collez un lien vidéo..."
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddVideoUrl}
                          className="shrink-0 rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm text-foreground">
                          {uploadedVideo.name}
                          <span className="text-xs text-foreground/45"> · {uploadedVideo.sizeMB} Mo</span>
                          {uploadedVideo.isCloud && <span className="text-xs text-emerald-600"> · en ligne</span>}
                        </p>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="shrink-0 text-xs font-medium text-rose-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-lg bg-black">
                        <ListingVideoPlayer videoUrl={uploadedVideo.url} compact={true} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation */}
                <div className="flex flex-col-reverse gap-2 border-t border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('catalog_inventory')}
                    className="rounded-lg px-3.5 py-2 text-xs font-medium text-foreground/60 hover:bg-muted hover:text-foreground"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {adminInstantPublish ? 'Mettre en ligne' : 'Enregistrer en attente'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 8: INVENTAIRE GLOBAL DES BIENS & PROPRIÉTÉS */}
          {/* ========================================================================= */}
          {currentSection === 'catalog_inventory' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Filtres et recherche */}
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      {
                        label: 'Tous',
                        count: listings.length,
                        active: listingTypeFilter === 'all' && listingStatusFilter === 'all',
                        onClick: () => { setListingTypeFilter('all'); setListingStatusFilter('all'); }
                      },
                      {
                        label: 'Hébergements',
                        count: listings.filter((l) => l.type === 'stay').length,
                        active: listingTypeFilter === 'stay' && listingStatusFilter === 'all',
                        onClick: () => { setListingTypeFilter('stay'); setListingStatusFilter('all'); }
                      },
                      {
                        label: 'Véhicules',
                        count: listings.filter((l) => l.type === 'drive').length,
                        active: listingTypeFilter === 'drive' && listingStatusFilter === 'all',
                        onClick: () => { setListingTypeFilter('drive'); setListingStatusFilter('all'); }
                      },
                      {
                        label: 'En ligne',
                        count: listings.filter((l) => l.status === 'active' || !l.status).length,
                        active: listingStatusFilter === 'active',
                        onClick: () => { setListingTypeFilter('all'); setListingStatusFilter('active'); }
                      },
                      {
                        label: 'En attente',
                        count: listings.filter((l) => l.status === 'pending').length,
                        active: listingStatusFilter === 'pending',
                        onClick: () => { setListingTypeFilter('all'); setListingStatusFilter('pending'); }
                      }
                    ].map((tab) => (
                      <button
                        key={tab.label}
                        onClick={tab.onClick}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          tab.active ? 'bg-muted text-foreground' : 'text-foreground/50 hover:text-foreground'
                        }`}
                      >
                        {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full lg:w-60">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre ou ville..."
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                    />
                  </div>
                </div>

                {filteredListings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucun bien ne correspond aux critères.</p>
                    <button
                      onClick={() => setCurrentSection('publish')}
                      className="mt-2 text-xs font-medium text-foreground/55 hover:text-foreground"
                    >
                      Publier un bien
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {filteredListings.map((item) => {
                      const isOnline = !item.status || item.status === 'active';
                      return (
                        <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 sm:flex-nowrap">
                          <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            {(item.gallery?.[0] || item.image) && (
                              <img
                                src={item.gallery?.[0] || item.image}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 basis-[calc(100%-60px)] sm:basis-auto">
                            <Link
                              to={`/listing/${item.id}`}
                              className="block truncate text-sm font-medium text-foreground hover:text-primary"
                            >
                              {item.title}
                            </Link>
                            <p className="truncate text-xs text-foreground/45">
                              {item.type === 'stay' ? 'Hébergement' : 'Véhicule'} · {item.location}
                              {item.owner_name ? ` · ${item.owner_name}` : ''}
                              {item.video_url ? ' · vidéo' : ''}
                            </p>
                          </div>
                          <div className="shrink-0 pl-[60px] text-left sm:pl-0 sm:text-right">
                            <p className="text-sm font-medium tabular-nums text-foreground">
                              {formatPrice(item.price)}
                              <span className="text-xs font-normal text-foreground/45"> / {item.price_unit || (item.type === 'stay' ? 'nuit' : 'jour')}</span>
                            </p>
                            <p className={`text-xs ${
                              isOnline ? 'text-emerald-600' : item.status === 'pending' ? 'text-amber-600' : item.status === 'refused' ? 'text-rose-600' : 'text-foreground/50'
                            }`}>
                              {isOnline ? 'En ligne' : item.status === 'pending' ? 'En attente' : item.status === 'refused' ? 'Refusé' : item.status === 'suspended' ? 'Suspendu' : item.status}
                            </p>
                          </div>
                          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0">
                            {item.status === 'pending' || item.status === 'suspended' || item.status === 'refused' ? (
                              <button
                                onClick={() => {
                                  handleApproveListing(item.id);
                                  showToast(`Bien "${item.title}" activé et mis en ligne !`);
                                }}
                                className="rounded-md p-2 text-emerald-600 transition-colors hover:bg-emerald-500/10"
                                title="Mettre en ligne"
                              >
                                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleSuspendListing(item.id);
                                  showToast(`Bien "${item.title}" suspendu.`);
                                }}
                                className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                                title="Suspendre"
                              >
                                <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEditListing(item)}
                              className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                              title="Modifier le nom, prix, photos et informations du bien"
                            >
                              <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                            </button>

                            <button
                              onClick={() => handleDeleteListingItem(item.id)}
                              className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                              title="Supprimer définitivement"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: AVIS & RETOURS CLIENTS (AUTHENTIQUES ET MODÉRABLES) */}
          {/* ========================================================================= */}
          {currentSection === 'reviews' && (
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  { label: 'Avis reçus', value: reviewsList.length, hint: 'Base globale' },
                  { label: 'À modérer', value: reviewsList.filter(r => r.status === 'pending').length, hint: 'En attente de validation' },
                  { label: "En vedette sur l'accueil", value: `${featuredHomepageReviewIds.size} / 10`, hint: 'Meilleures notes' },
                  {
                    label: 'Note moyenne',
                    value: reviewsList.length > 0
                      ? `${(reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewsList.length).toFixed(1)} / 5`
                      : '—',
                    hint: reviewsList.length > 0
                      ? `${Math.round((reviewsList.filter(r => (Number(r.rating) || 0) >= 4).length / reviewsList.length) * 100)} % de satisfaction`
                      : 'Calcul en temps réel'
                  }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Recherche et filtres */}
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35" />
                    <input
                      type="text"
                      placeholder="Rechercher par voyageur, email, annonce ou commentaire..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={reviewStatusFilter}
                      onChange={(e) => setReviewStatusFilter(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none md:flex-none"
                    >
                      <option value="all">Tous les statuts ({reviewsList.length})</option>
                      <option value="pending">En attente ({reviewsList.filter(r => r.status === 'pending').length})</option>
                      <option value="approved">Publiés ({reviewsList.filter(r => (r.status || 'approved') === 'approved').length})</option>
                      <option value="rejected">Rejetés ({reviewsList.filter(r => r.status === 'rejected').length})</option>
                    </select>

                    <select
                      value={reviewRatingFilter}
                      onChange={(e) => setReviewRatingFilter(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-foreground/10 bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none md:flex-none"
                    >
                      <option value="all">Toutes les notes</option>
                      <option value="5">5 étoiles</option>
                      <option value="4">4 étoiles</option>
                      <option value="3">3 étoiles</option>
                      <option value="2">2 étoiles</option>
                      <option value="1">1 étoile</option>
                    </select>
                  </div>
                </div>

                {filteredReviews.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucun avis ne correspond aux filtres.</p>
                    {(reviewSearch || reviewStatusFilter !== 'all' || reviewRatingFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setReviewSearch('');
                          setReviewStatusFilter('all');
                          setReviewRatingFilter('all');
                        }}
                        className="mt-2 text-xs font-medium text-foreground/55 hover:text-foreground"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {filteredReviews.map((rev) => {
                      const status = rev.status || 'approved';
                      const isPending = status === 'pending';
                      const isRejected = status === 'rejected';
                      const isApproved = status === 'approved';
                      const isFeaturedOnHome = isApproved && featuredHomepageReviewIds.has(rev.id);

                      return (
                        <li key={rev.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className={`min-w-0 flex-1 space-y-1.5 ${isRejected ? 'opacity-60' : ''}`}>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                              <p className="min-w-0 truncate text-sm font-medium text-foreground">
                                {rev.author_name || 'Voyageur Bénin Beyond'}
                                <span className="font-normal text-foreground/45"> · {rev.author_email || 'Email non renseigné'}</span>
                              </p>
                              <span className={`shrink-0 text-xs font-medium ${
                                isPending ? 'text-amber-600' : isRejected ? 'text-rose-600' : 'text-emerald-600'
                              }`}>
                                {isPending ? 'À modérer' : isRejected ? 'Rejeté' : isFeaturedOnHome ? 'Publié · en vedette sur l\'accueil' : 'Publié'}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 text-xs">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FontAwesomeIcon
                                  key={star}
                                  icon={faStar}
                                  className={`h-3 w-3 ${star <= (Number(rev.rating) || 5) ? 'text-amber-400' : 'text-foreground/15'}`}
                                />
                              ))}
                              <span className="ml-1.5 tabular-nums text-foreground/50">{rev.rating} / 5</span>
                            </div>

                            <p className="break-words text-sm leading-relaxed text-foreground/75">
                              {rev.comment || 'Aucun commentaire écrit'}
                            </p>

                            <p className="break-words text-xs text-foreground/45">
                              {rev.created_at ? new Date(rev.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Récemment'}
                              {rev.listing_title && ` · ${rev.listing_title}`}
                              {rev.listing_id && !rev.listing_title && <span className="font-mono"> · Bien {rev.listing_id}</span>}
                              {rev.booking_id && <span className="font-mono"> · Résa {rev.booking_id}</span>}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-1 lg:justify-end">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApproveReview(rev)}
                                  className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                  title="Valider cet avis et le rendre public"
                                >
                                  Publier
                                </button>
                                <button
                                  onClick={() => handleRejectReview(rev)}
                                  className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
                                  title="Rejeter et masquer cet avis"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                onClick={() => handleRejectReview(rev)}
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                title="Masquer cet avis de la plateforme"
                              >
                                Masquer
                              </button>
                            )}

                            {isRejected && (
                              <button
                                onClick={() => handleApproveReview(rev)}
                                className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                title="Réactiver et valider cet avis"
                              >
                                Republier
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteReviewItem(rev.id, rev.author_name, rev.booking_id)}
                              className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                              title="Supprimer définitivement cet avis de la base"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
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

            {/* Short Tour Video Inspection & Admin Video Control */}
            <div className="space-y-3 pt-3 border-t border-foreground/10">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faVideo} className="text-accent" />
                  <span>Visite Vidéo d'Aperçu (Exclusivité Direction Bénin Beyond)</span>
                </span>
                {mediaAuditModal.video_url ? (
                  <span className="text-emerald-700 font-bold text-[11px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    ✓ Vidéo Active
                  </span>
                ) : (
                  <span className="text-foreground/50 italic text-[11px] bg-muted px-2.5 py-0.5 rounded-full">
                    Sans vidéo attachée
                  </span>
                )}
              </div>

              {/* Player if video exists */}
              {mediaAuditModal.video_url && (
                <div className="rounded-2xl overflow-hidden shadow">
                  <ListingVideoPlayer
                    videoUrl={mediaAuditModal.video_url}
                    poster={mediaAuditModal.gallery?.[0]}
                    title={mediaAuditModal.title}
                  />
                </div>
              )}

              {/* Admin Video Action Box */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faVideo} className="text-accent text-[11px]" />
                    <span>{mediaAuditModal.video_url ? 'Modifier ou remplacer la vidéo' : 'Ajouter une visite vidéo certifiée'}</span>
                  </p>
                  <span className="text-[10px] text-foreground/50">
                    Privilège Administrateur exclusif
                  </span>
                </div>

                {auditVideoSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={faCircleCheck} />
                    <span>{auditVideoSuccess}</span>
                  </div>
                )}

                {auditVideoError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    <span>{auditVideoError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="Lien vidéo web (YouTube, Google Drive, Vimeo, MP4 public)..."
                      value={auditVideoInput}
                      onChange={(e) => setAuditVideoInput(e.target.value)}
                      className="flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingAuditVideo}
                        onClick={() => handleSaveAuditVideo()}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSavingAuditVideo ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faCheck} />
                        )}
                        <span>Enregistrer</span>
                      </button>

                      {mediaAuditModal.video_url && (
                        <button
                          type="button"
                          disabled={isSavingAuditVideo}
                          onClick={() => {
                            setAuditVideoInput('');
                            handleSaveAuditVideo('');
                          }}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-500/20 transition-all"
                          title="Supprimer la vidéo de cette annonce"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-foreground/60 pt-1">
                    <span>Téléversement direct depuis l'appareil :</span>
                    <label className="cursor-pointer font-bold text-accent hover:underline flex items-center gap-1.5">
                      <FontAwesomeIcon icon={isUploadingAuditVideo ? faSpinner : faUpload} className={isUploadingAuditVideo ? 'animate-spin' : ''} />
                      <span>{isUploadingAuditVideo ? 'Téléversement en cours…' : 'Choisir un fichier vidéo'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mov"
                        disabled={isUploadingAuditVideo}
                        onChange={handleAuditVideoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
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
                  onClick={() => {
                    handleOpenEditListing(mediaAuditModal);
                  }}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-colors flex items-center gap-1.5"
                  title="Modifier le nom, tarif, photos et détails du bien"
                >
                  <FontAwesomeIcon icon={faPen} />
                  <span>Modifier l'annonce</span>
                </button>

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
      {/* MODAL CRÉATION / MODIFICATION DÉCOUVERTE & SERVICE */}
      {/* ========================================================================= */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="relative w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-3xl bg-card border border-foreground/15 shadow-2xl overflow-hidden animate-slide-up sm:animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b border-foreground/10 shrink-0 bg-card z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {editingDiscovery ? 'Mise à jour Fiche' : 'Nouvelle Découverte / Service'}
                </span>
                <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                  {editingDiscovery ? `Modifier "${editingDiscovery.title}"` : 'Ajouter une Découverte ou Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscoveryModal(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
                title="Fermer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscovery} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
                
                {/* Admin Free Notice */}
                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
                    <span>Privilège Administrateur : Gratuit 0 FCFA</span>
                  </div>
                  <span className="text-[11px] text-foreground/65">
                    Aucuns frais d'activation requis pour l'équipe administrative.
                  </span>
                </div>

                {/* Catégorie */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Catégorie Principale *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscCategory('restaurants');
                        setDiscInHomeService(false);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                        discCategory === 'restaurants'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-foreground/15 bg-card text-foreground/70 hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                          discCategory === 'restaurants' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-muted text-foreground/70'
                        }`}>
                          <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-foreground">Gastronomie & Tables</p>
                          <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide">
                            <FontAwesomeIcon icon={faCheck} className="h-2 w-2" />
                            <span>0 FCFA · Gratuit</span>
                          </span>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                        discCategory === 'restaurants' ? 'bg-emerald-600 text-white shadow-xs' : 'border border-foreground/30 text-transparent'
                      }`}>
                        <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDiscCategory('services');
                        setDiscInHomeService(true);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                        discCategory === 'services'
                          ? 'border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30'
                          : 'border-foreground/15 bg-card text-foreground/70 hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                          discCategory === 'services' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-muted text-foreground/70'
                        }`}>
                          <FontAwesomeIcon icon={faScissors} className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-foreground">Services en Villa VIP</p>
                          <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tracking-wide">
                            <FontAwesomeIcon icon={faCheck} className="h-2 w-2 stroke-[3]" />
                            <span>Tarif public : 500 FCFA</span>
                          </span>
                        </div>
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                        discCategory === 'services' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'border border-foreground/30 text-transparent'
                      }`}>
                        <FontAwesomeIcon icon={faCheck} className="h-3 w-3 stroke-[3]" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Sous-catégorie pour Services */}
                {discCategory === 'services' && (
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">
                      Spécialité du Service
                    </label>
                    <select
                      value={discSubcategory}
                      onChange={(e) => setDiscSubcategory(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="coiffure">Coiffure, Tresses & Barbiers</option>
                      <option value="onglerie">Onglerie & Pédicure Spa</option>
                      <option value="soins">Massages, Spa & Soins Bien-Être</option>
                      <option value="chef">Chef Privé & Cuisine en Villa</option>
                      <option value="pressing">Blanchisserie & Pressing Express</option>
                      <option value="autre">Autre Service Spécialisé</option>
                    </select>
                  </div>
                )}

                {/* Titre & Slogan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Nom / Titre *
                    </label>
                    <input
                      type="text"
                      required
                      value={discTitle}
                      onChange={(e) => setDiscTitle(e.target.value)}
                      placeholder="Ex : Atelier Glamour, Le Jardin de Canala..."
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Slogan / Accroche
                    </label>
                    <input
                      type="text"
                      value={discTagline}
                      onChange={(e) => setDiscTagline(e.target.value)}
                      placeholder="Ex : Coiffure VIP en Villa, Saveurs du terroir..."
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Badge & Localisation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Badge d'accroche
                    </label>
                    <input
                      type="text"
                      value={discBadge}
                      onChange={(e) => setDiscBadge(e.target.value)}
                      placeholder="Ex : Table Recommandée, Prestation en Villa..."
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Localisation / Zone couverte
                    </label>
                    <input
                      type="text"
                      value={discLocation}
                      onChange={(e) => setDiscLocation(e.target.value)}
                      placeholder="Ex : Cotonou · Haie Vive, Littoral..."
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Option Déplacement en Villa */}
                {discCategory === 'services' && (
                  <div className="rounded-xl border border-foreground/15 bg-muted/40 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Déplacement en villa ou appartement</p>
                      <p className="text-[11px] text-foreground/60">Affiche le badge officiel « Déplacement en Villa »</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={discInHomeService}
                        onChange={(e) => setDiscInHomeService(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Description détaillée *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={discDescription}
                    onChange={(e) => setDiscDescription(e.target.value)}
                    placeholder="Présentez les spécialités, les soins proposés, le savoir-faire..."
                    className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                {/* Points forts & Tarifs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Points Forts (1 par ligne)
                    </label>
                    <textarea
                      rows={2}
                      value={discHighlights}
                      onChange={(e) => setDiscHighlights(e.target.value)}
                      placeholder="Déplacement en villa&#10;Matériel professionnel stérilisé&#10;Disponibilité 7j/7"
                      className="w-full rounded-xl border border-foreground/15 bg-background p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Tarifs indicatifs
                    </label>
                    <input
                      type="text"
                      value={discPricing}
                      onChange={(e) => setDiscPricing(e.target.value)}
                      placeholder="Ex : Prestations dès 10 000 FCFA"
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none mb-2"
                    />

                    <label className="text-xs font-bold text-foreground block mb-1">
                      Conseil / Modalités de réservation
                    </label>
                    <input
                      type="text"
                      value={discTips}
                      onChange={(e) => setDiscTips(e.target.value)}
                      placeholder="Ex : Réservation 24h à l'avance conseillée"
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contacts Téléphone & WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-primary" />
                      <span>Téléphone d'appel</span>
                    </label>
                    <input
                      type="tel"
                      value={discPhone}
                      onChange={(e) => setDiscPhone(e.target.value)}
                      placeholder="+229 97 00 00 00"
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faWhatsapp} className="h-3.5 w-3.5 text-emerald-500" />
                      <span>WhatsApp pour commandes</span>
                    </label>
                    <input
                      type="tel"
                      value={discWhatsapp}
                      onChange={(e) => setDiscWhatsapp(e.target.value)}
                      placeholder="+229 97 00 00 00"
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Photo de Présentation */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    URL ou Photo de Présentation
                  </label>
                  <input
                    type="url"
                    value={discImage}
                    onChange={(e) => setDiscImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {discImage && (
                    <div className="mt-2 h-24 w-36 rounded-xl overflow-hidden border border-foreground/15 bg-muted">
                      <img src={discImage} alt="Aperçu" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

              </div>

              <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-foreground/10 flex items-center justify-end gap-3 bg-card/95 backdrop-blur-sm z-10 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all"
                >
                  {editingDiscovery ? 'Enregistrer les Modifications' : 'Publier Gratuitement (Admin)'}
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
                <>
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

                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-primary" />
                        Certification & Statut KYC Partenaire
                      </label>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Validation Admin
                      </span>
                    </div>
                    <select
                      value={userFormKycStatus}
                      onChange={(e) => setUserFormKycStatus(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="pending">⏳ En attente de vérification (Pending)</option>
                      <option value="verified">✓ Certifié conforme / Actif (Publication directe activée)</option>
                      <option value="rejected">✕ Rejeté / Non conforme</option>
                    </select>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">
                      💡 <strong>Règle de publication :</strong> Dès qu'un hôte est <strong>« Certifié conforme / Actif »</strong>, toutes ses annonces en attente sont automatiquement activées, et ses futures créations d'annonces sont publiées en direct sans exiger de validation manuelle de l'admin.
                    </p>
                  </div>
                </>
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
            <div className="border-t border-foreground/10 pt-4 flex items-center justify-between gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedKycModal(null)}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedKycModal.kycStatus === 'verified' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleResetPartnerKyc(selectedKycModal.id, selectedKycModal.email)}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-700 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Suspendre ce partenaire et le remettre en attente (ses annonces seront suspendues)"
                    >
                      <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                      <span>Suspendre (Remettre en attente)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectKycModal(selectedKycModal)}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5"
                      title="Refuser ou révoquer le dossier KYC avec motif"
                    >
                      <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                      <span>Refuser / Révoquer</span>
                    </button>
                  </>
                ) : (
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

      {/* Modal Universelle d'Édition d'Annonce Administrateur */}
      {editingListingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-card w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-foreground/15 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-base shrink-0 border border-amber-500/20">
                  <FontAwesomeIcon icon={faPen} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Édition Administrateur
                    </span>
                    <span className="text-[10px] font-mono text-foreground/50">
                      #{editingListingModal.id?.slice(0, 12)}
                    </span>
                  </div>
                  <h3 className="font-heading text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {editFormTitle || editingListingModal.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingListingModal(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors"
                title="Fermer"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveListingEdit} className="p-6 space-y-6 flex-1">
              {/* Feedback messages */}
              {editSuccessAlert && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600 text-base shrink-0" />
                  <span>{editSuccessAlert}</span>
                </div>
              )}

              {editError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* 1. Catégorie & Type */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  1. Catégorie & Type de Bien
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormType('stay');
                      if (editFormPriceUnit === 'jour') setEditFormPriceUnit('nuit');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      editFormType === 'stay'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 text-primary'
                        : 'border-foreground/15 bg-background text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <FontAwesomeIcon icon={faHouse} className="text-primary text-lg shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Hébergement / Résidence</p>
                      <p className="text-[10px] text-foreground/60">Villa, Appartement, Suite, Hôtel</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditFormType('drive');
                      if (editFormPriceUnit === 'nuit') setEditFormPriceUnit('jour');
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      editFormType === 'drive'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 text-primary'
                        : 'border-foreground/15 bg-background text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCar} className="text-primary text-lg shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Véhicule de Prestige</p>
                      <p className="text-[10px] text-foreground/60">SUV, Berline, Minibus, Luxe</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Nom du bien & Tarification */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  2. Nom du Bien & Tarification
                </label>

                <div>
                  <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                    Nom / Titre officiel de l'annonce *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormTitle}
                    onChange={(e) => setEditFormTitle(e.target.value)}
                    placeholder="Ex: Villa Privée Azure Palm — Haie Vive"
                    className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      Tarif (en FCFA) * <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">(Exclusivité Admin : tests dès 10 FCFA autorisés)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editFormPrice}
                      onChange={(e) => setEditFormPrice(e.target.value)}
                      placeholder="Ex: 85000"
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      Unité de facturation
                    </label>
                    <select
                      value={editFormPriceUnit}
                      onChange={(e) => setEditFormPriceUnit(e.target.value)}
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="nuit">Par nuit (Hébergement)</option>
                      <option value="jour">Par jour (Véhicule / Prestation)</option>
                      <option value="mois">Par mois</option>
                      <option value="vente totale">Vente totale (Achat définitif)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Localisation & Statut */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  3. Localisation & Statut de publication
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      Localisation (Ville, Quartier) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormLocation}
                      onChange={(e) => setEditFormLocation(e.target.value)}
                      placeholder="Ex: Cotonou, Haie Vive"
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      Statut de modération
                    </label>
                    <select
                      value={editFormStatus}
                      onChange={(e) => setEditFormStatus(e.target.value)}
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="active">Active (En ligne sur le catalogue public)</option>
                      <option value="pending">En attente de validation</option>
                      <option value="suspended">Suspendue (Masquée du catalogue)</option>
                      <option value="refused">Refusée (Non conforme)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      Badge marketing (optionnel)
                    </label>
                    <input
                      type="text"
                      value={editFormBadge}
                      onChange={(e) => setEditFormBadge(e.target.value)}
                      placeholder="Ex: Coup de Cœur, Exclusivité, Vérifié"
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                      {editFormType === 'drive' ? 'Nombre de places' : 'Nombre de chambres'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editFormType === 'drive' ? editFormSeats : editFormRooms}
                      onChange={(e) => {
                        if (editFormType === 'drive') setEditFormSeats(e.target.value);
                        else setEditFormRooms(e.target.value);
                      }}
                      className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Caractéristiques & Équipements */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  4. Caractéristiques & Équipements (séparés par virgules)
                </label>
                <input
                  type="text"
                  value={editFormSpecs}
                  onChange={(e) => setEditFormSpecs(e.target.value)}
                  placeholder="Ex: Climatisation, Wi-Fi Fibre, Piscine privée, Groupe électrogène, Sécurité 24/7"
                  className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {editFormType === 'drive' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                        Boîte de transmission
                      </label>
                      <select
                        value={editFormTransmission}
                        onChange={(e) => setEditFormTransmission(e.target.value)}
                        className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="automatique">Automatique</option>
                        <option value="manuelle">Manuelle</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-foreground/70 mb-1.5 block font-semibold">
                        Carburant
                      </label>
                      <select
                        value={editFormFuel}
                        onChange={(e) => setEditFormFuel(e.target.value)}
                        className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="essence">Essence</option>
                        <option value="diesel">Diesel</option>
                        <option value="hybride">Hybride</option>
                        <option value="électrique">Électrique</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  5. Description Détaillée
                </label>
                <textarea
                  rows={4}
                  value={editFormDescription}
                  onChange={(e) => setEditFormDescription(e.target.value)}
                  placeholder="Description complète du bien, cadre, services inclus..."
                  className="w-full rounded-2xl border border-foreground/15 bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>

              {/* 6. Vidéo (Lien direct YouTube / Vimeo / MP4) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  6. Vidéo Officielle (Optionnelle)
                </label>
                <input
                  type="url"
                  value={editFormVideoUrl}
                  onChange={(e) => setEditFormVideoUrl(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=... ou lien MP4 direct"
                  className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 7. Gestion de la Galerie Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                    7. Galerie Photos ({editFormPhotos.length})
                  </label>
                  <label className="cursor-pointer rounded-xl bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faUpload} />
                    <span>{editIsUploadingPhoto ? 'Compression...' : 'Ajouter des photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      disabled={editIsUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Add Photo by URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editPhotoUrlInput}
                    onChange={(e) => setEditPhotoUrlInput(e.target.value)}
                    placeholder="Ou coller une URL d'image (https://...)"
                    className="flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditPhotoUrl}
                    className="rounded-xl border border-foreground/20 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Ajouter URL
                  </button>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {editFormPhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative group rounded-2xl overflow-hidden border aspect-video bg-muted ${
                        idx === 0 ? 'ring-2 ring-primary border-primary' : 'border-foreground/15'
                      }`}
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-bold shadow">
                          Principale
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetFeaturedEditPhoto(idx)}
                            className="h-7 w-7 rounded-full bg-white/20 text-white hover:bg-primary flex items-center justify-center text-xs transition-colors"
                            title="Définir comme photo principale"
                          >
                            <FontAwesomeIcon icon={faStar} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveEditPhoto(idx)}
                          className="h-7 w-7 rounded-full bg-rose-600/80 text-white hover:bg-rose-600 flex items-center justify-center text-xs transition-colors"
                          title="Supprimer cette photo"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-foreground/10 flex items-center justify-end gap-3 sticky bottom-0 bg-card/95 backdrop-blur-md py-3">
                <button
                  type="button"
                  onClick={() => setEditingListingModal(null)}
                  disabled={editIsSaving}
                  className="rounded-xl border border-foreground/20 px-5 py-2.5 text-xs font-semibold text-foreground/75 hover:bg-muted transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={editIsSaving}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 text-xs font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                  {editIsSaving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INSPECTION DU DOSSIER DE VÉRIFICATION PROPRIÉTAIRE (KYC/KYB MULTI-PIÈCES) */}
      {/* ========================================================================= */}
      {selectedVerifAppModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-card border border-foreground/15 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-foreground/10 bg-muted/40 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-start gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg uppercase shrink-0">
                  {(selectedVerifAppModal.owner_full_name || 'P')[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading text-lg font-black text-foreground">
                      {selectedVerifAppModal.owner_full_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-foreground/15">
                      {selectedVerifAppModal.owner_type === 'registered_business'
                        ? '🏢 Entreprise / Société'
                        : selectedVerifAppModal.owner_type === 'authorized_manager'
                        ? '👔 Gestionnaire Mandaté'
                        : '👤 Particulier'}
                    </span>
                    {(() => {
                      const badge = getVerificationStatusBadge(selectedVerifAppModal.status);
                      return (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.bgClass} ${badge.textClass}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    {selectedVerifAppModal.owner_email} • {selectedVerifAppModal.owner_phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVerifAppModal(null)}
                className="h-8 w-8 rounded-full border border-foreground/15 text-foreground/60 hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-header Warning: Subscription vs Verification Separation */}
            <div className="px-6 py-3 bg-primary/5 border-b border-primary/15 flex items-center gap-2.5 text-[11.5px] text-foreground/80">
              <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                La validation de ce dossier certifie le propriétaire et publie automatiquement ses annonces.
              </span>
            </div>

            {/* Audit Tabs */}
            <div className="px-6 pt-3 border-b border-foreground/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVerifAuditTab('documents')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  verifAuditTab === 'documents'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/60 hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={faFileContract} className="mr-2" />
                Pièces Justificatives & Audit
              </button>
              <button
                type="button"
                onClick={() => setVerifAuditTab('history')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  verifAuditTab === 'history'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-foreground/60 hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                Historique & Journal d'Audit ({getApplicationAuditTrail(selectedVerifAppModal.id).length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {verifAuditTab === 'documents' ? (
                <>
                  {/* Identity & Legal Information Card */}
                  <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                      Renseignements Déclaratifs du Propriétaire
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-foreground/50 block">Nom complet / Raison sociale</span>
                        <span className="font-semibold text-foreground">{selectedVerifAppModal.owner_full_name || 'Non renseigné'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-foreground/50 block">Adresse légale</span>
                        <span className="font-semibold text-foreground">{selectedVerifAppModal.owner_address || 'Non renseignée'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-foreground/50 block">Pièce d'identité</span>
                        <span className="font-semibold text-foreground">
                          {selectedVerifAppModal.id_type || 'N/A'} : {selectedVerifAppModal.id_number || 'Non renseigné'}
                        </span>
                        {selectedVerifAppModal.id_expiration_date && (
                          <span className="text-[10px] text-foreground/50 block">
                            Expire le : {selectedVerifAppModal.id_expiration_date}
                          </span>
                        )}
                      </div>
                      {selectedVerifAppModal.company_name && (
                        <div>
                          <span className="text-[10px] text-foreground/50 block">Nom Entreprise</span>
                          <span className="font-semibold text-primary">{selectedVerifAppModal.company_name}</span>
                        </div>
                      )}
                      {selectedVerifAppModal.tax_id && (
                        <div>
                          <span className="text-[10px] text-foreground/50 block">Numéro IFU (Bénin)</span>
                          <span className="font-mono font-bold text-foreground">{selectedVerifAppModal.tax_id}</span>
                        </div>
                      )}
                      {selectedVerifAppModal.rccm_number && (
                        <div>
                          <span className="text-[10px] text-foreground/50 block">Numéro RCCM</span>
                          <span className="font-mono font-bold text-foreground">{selectedVerifAppModal.rccm_number}</span>
                        </div>
                      )}
                      <div className="sm:col-span-2 md:col-span-3">
                        <span className="text-[10px] text-foreground/50 block mb-1">Catégories d'actifs gérées</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedVerifAppModal.asset_categories || []).map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-semibold"
                            >
                              {cat === 'hotel'
                                ? '🏨 Hôtels & Auberges'
                                : cat === 'apartment'
                                ? '🏡 Appartements'
                                : cat === 'villa_house'
                                ? '🏰 Villas & Résidences'
                                : cat === 'vehicle'
                                ? '🚗 Véhicules & Chauffeurs'
                                : '📐 Terrains'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Required Documents Review List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                        Contrôle Pièce par Pièce (Dynamic Rule Engine)
                      </h4>
                      <span className="text-[11px] text-foreground/60 font-semibold">
                        {Object.keys(selectedVerifAppModal.documents || {}).length} document(s) téléversé(s)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {getRequiredDocumentsSchema(selectedVerifAppModal.owner_type, selectedVerifAppModal.asset_categories).map((rule) => {
                        const doc = (selectedVerifAppModal.documents || {})[rule.id];
                        const docStatus = doc?.status || 'pending';

                        return (
                          <div
                            key={rule.id}
                            className={`rounded-2xl border p-4 transition-all ${
                              docStatus === 'approved'
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : docStatus === 'action_required'
                                ? 'border-orange-500/40 bg-orange-500/5'
                                : docStatus === 'rejected'
                                ? 'border-rose-500/40 bg-rose-500/5'
                                : doc
                                ? 'border-foreground/15 bg-card'
                                : 'border-dashed border-foreground/20 bg-muted/20 opacity-70'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-bold text-foreground text-xs">{rule.label}</h5>
                                  <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-muted text-foreground/70">
                                    {rule.category}
                                  </span>
                                  {rule.required ? (
                                    <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                      Obligatoire
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] px-2 py-0.5 rounded-full font-semibold bg-muted text-foreground/50">
                                      Optionnel
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-foreground/60">{rule.description}</p>
                              </div>

                              {/* Document Status Badge */}
                              <div>
                                {doc ? (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      docStatus === 'approved'
                                        ? 'bg-emerald-500/20 text-emerald-700'
                                        : docStatus === 'action_required'
                                        ? 'bg-orange-500/20 text-orange-700'
                                        : docStatus === 'rejected'
                                        ? 'bg-rose-500/20 text-rose-700'
                                        : 'bg-amber-500/20 text-amber-700'
                                    }`}
                                  >
                                    <FontAwesomeIcon
                                      icon={
                                        docStatus === 'approved'
                                          ? faCheckCircle
                                          : docStatus === 'action_required'
                                          ? faRotateRight
                                          : docStatus === 'rejected'
                                          ? faBan
                                          : faClock
                                      }
                                      className="h-3 w-3"
                                    />
                                    <span>
                                      {docStatus === 'approved'
                                        ? 'Validé conforme'
                                        : docStatus === 'action_required'
                                        ? 'Remplacement demandé'
                                        : docStatus === 'rejected'
                                        ? 'Pièce refusée'
                                        : 'À vérifier'}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-foreground/40">
                                    Non transmis
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Uploaded File Details & Actions */}
                            {doc && (
                              <div className="mt-3 pt-3 border-t border-foreground/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="text-[11px] text-foreground/70 flex items-center gap-2">
                                  <FontAwesomeIcon icon={faFilePdf} className="h-4 w-4 text-primary" />
                                  <span className="font-semibold text-foreground truncate max-w-[220px]">
                                    {doc.file_name}
                                  </span>
                                  {doc.file_size && (
                                    <span className="text-[10px] text-foreground/50">
                                      ({Math.round(doc.file_size / 1024)} Ko)
                                    </span>
                                  )}
                                  {doc.uploaded_at && (
                                    <span className="text-[10px] text-foreground/40">
                                      • {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </div>

                                {/* Rejection / Action required reason note */}
                                {doc.review_notes && (
                                  <p className="text-[11px] text-orange-700 dark:text-orange-300 bg-orange-500/10 px-2.5 py-1 rounded-lg">
                                    <strong>Motif transmis :</strong> {doc.review_notes}
                                  </p>
                                )}

                                {/* Per-Document Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {doc.file_url && (
                                    <a
                                      href={doc.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg border border-foreground/20 text-[11px] font-bold text-foreground hover:bg-muted flex items-center gap-1 transition-colors"
                                      title="Ouvrir le document dans un nouvel onglet"
                                    >
                                      <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                                      <span>Voir</span>
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleReviewIndividualDoc(selectedVerifAppModal.id, rule.id, 'approved')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                                    title="Valider cette pièce comme conforme"
                                  >
                                    <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                                    <span>Valider</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVerifDocDecisionModal({
                                        applicationId: selectedVerifAppModal.id,
                                        documentId: rule.id,
                                        documentLabel: rule.label,
                                        decision: 'action_required',
                                        reason: ''
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 text-[11px] font-bold border border-orange-500/30 flex items-center gap-1 transition-colors"
                                    title="Demander au propriétaire de remplacer cette pièce"
                                  >
                                    <FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />
                                    <span>Remplacer</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVerifDocDecisionModal({
                                        applicationId: selectedVerifAppModal.id,
                                        documentId: rule.id,
                                        documentLabel: rule.label,
                                        decision: 'rejected',
                                        reason: ''
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 text-[11px] font-bold border border-rose-500/30 flex items-center gap-1 transition-colors"
                                    title="Rejeter définitivement cette pièce"
                                  >
                                    <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                                    <span>Rejeter</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* History / Audit Log Tab */
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                    Traçabilité & Historique des Décisions Administratives
                  </h4>
                  {getApplicationAuditTrail(selectedVerifAppModal.id).length === 0 ? (
                    <p className="text-xs text-foreground/50 py-8 text-center border border-dashed border-foreground/10 rounded-2xl">
                      Aucun événement d'audit enregistré pour l'instant.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {getApplicationAuditTrail(selectedVerifAppModal.id).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-foreground/10 bg-background/50 p-4 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{entry.actor_role} ({entry.actor_email || 'Admin'})</span>
                            <span className="text-[10px] text-foreground/50">
                              {new Date(entry.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80 font-semibold">{entry.action}</p>
                          {entry.notes && (
                            <p className="text-[11px] text-foreground/60 bg-muted/40 p-2 rounded-xl italic">
                              "{entry.notes}"
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-foreground/50 font-mono">
                            <span>Statut précédent : {entry.old_status || 'Initial'}</span>
                            <span>→</span>
                            <span className="font-bold text-foreground">Nouveau statut : {entry.new_status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Overall Decision Footer */}
            <div className="p-4 sm:p-5 border-t border-foreground/10 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-foreground/60">
                Statut actuel du dossier : <strong>{selectedVerifAppModal.status}</strong>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVerifAppModal(null)}
                  className="px-4 py-2 rounded-xl border border-foreground/20 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifAppDecisionModal({
                      applicationId: selectedVerifAppModal.id,
                      decision: 'additional_info_required',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-800 dark:text-orange-200 border border-orange-500/30 text-xs font-bold hover:bg-orange-500/30 transition-colors flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  <span>Demander un complément</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifAppDecisionModal({
                      applicationId: selectedVerifAppModal.id,
                      decision: 'rejected',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-colors flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faBan} />
                  <span>Rejeter le dossier</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewOverallApp(selectedVerifAppModal.id, 'approved', 'Dossier complet et certifié conforme par l\'administration Bénin Beyond.')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <FontAwesomeIcon icon={faCheck} />
                  <span>Approuver & Certifier Conforme</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DÉCISION SPÉCIFIQUE SUR UNE PIÈCE (DEMANDE DE REMPLACEMENT / REJET) */}
      {/* ========================================================================= */}
      {verifDocDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-card border border-foreground/15 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  {verifDocDecisionModal.decision === 'action_required'
                    ? 'Demander le remplacement de la pièce'
                    : 'Rejeter cette pièce justificative'}
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Document concerné : <strong>{verifDocDecisionModal.documentLabel}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifDocDecisionModal(null)}
                className="h-7 w-7 rounded-full text-foreground/50 hover:text-foreground flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Quick Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground/70 uppercase">
                Motifs fréquents (cliquez pour insérer) :
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Document flou ou illisible',
                  'Date de validité dépassée / expiré',
                  'Manque le verso de la pièce d\'identité',
                  'Document tronqué / signature absente',
                  'Attestation au nom d\'un tiers sans mandat'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setVerifDocDecisionModal((prev) => ({ ...prev, reason: chip }))}
                    className="px-2.5 py-1 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary text-[10px] font-semibold text-foreground/70 border border-foreground/10 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                Instruction détaillée pour le propriétaire <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={verifDocDecisionModal.reason}
                onChange={(e) => setVerifDocDecisionModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Expliquez clairement ce qui manque ou comment reprendre le document..."
                className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifDocDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-foreground/20 text-xs font-bold text-foreground hover:bg-muted"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={!verifDocDecisionModal.reason.trim()}
                onClick={() => {
                  handleReviewIndividualDoc(
                    verifDocDecisionModal.applicationId,
                    verifDocDecisionModal.documentId,
                    verifDocDecisionModal.decision,
                    verifDocDecisionModal.reason.trim()
                  );
                  setVerifDocDecisionModal(null);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  verifDocDecisionModal.decision === 'action_required'
                    ? 'bg-orange-600 hover:bg-orange-700 disabled:opacity-50'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                }`}
              >
                Confirmer l'instruction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DÉCISION GLOBALE SUR LE DOSSIER D'ONBOARDING */}
      {/* ========================================================================= */}
      {verifAppDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-card border border-foreground/15 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  {verifAppDecisionModal.decision === 'additional_info_required'
                    ? 'Demander des compléments d\'information'
                    : 'Rejeter la demande d\'onboarding'}
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Une notification sera envoyée au propriétaire sur son espace partenaire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifAppDecisionModal(null)}
                className="h-7 w-7 rounded-full text-foreground/50 hover:text-foreground flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                Motif ou directives administratives <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={verifAppDecisionModal.notes}
                onChange={(e) => setVerifAppDecisionModal((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Précisez les exigences réglementaires non remplies ou les informations manquantes..."
                className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifAppDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-foreground/20 text-xs font-bold text-foreground hover:bg-muted"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={!verifAppDecisionModal.notes.trim()}
                onClick={() => {
                  handleReviewOverallApp(
                    verifAppDecisionModal.applicationId,
                    verifAppDecisionModal.decision,
                    verifAppDecisionModal.notes.trim()
                  );
                  setVerifAppDecisionModal(null);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  verifAppDecisionModal.decision === 'additional_info_required'
                    ? 'bg-orange-600 hover:bg-orange-700 disabled:opacity-50'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                }`}
              >
                Enregistrer la décision
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
