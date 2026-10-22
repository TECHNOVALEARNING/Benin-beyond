import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie,
  faCalendarCheck,
  faHouse,
  faCar,
  faCirclePlus,
  faWallet,
  faChartLine,
  faUsers,
  faArrowUpRightFromSquare,
  faRightFromBracket,
  faBars,
  faXmark,
  faCheckCircle,
  faCircleCheck,
  faClock,
  faFilter,
  faMagnifyingGlass,
  faPhone,
  faEnvelope,
  faEye,
  faMoneyBillWave,
  faPercent,
  faArrowTrendUp,
  faTrash,
  faBuilding,
  faLocationDot,
  faBell,
  faSliders,
  faHandHoldingDollar,
  faShieldHalved,
  faPrint,
  faArrowRight,
  faDownload,
  faCircleExclamation,
  faChevronRight,
  faReceipt,
  faBed,
  faKey,
  faCommentsDollar,
  faCamera,
  faVideo,
  faUpload,
  faTriangleExclamation,
  faImage,
  faPlay,
  faPlus,
  faBan,
  faCheck,
  faPen,
  faSpinner,
  faCircleInfo,
  faHotel,
  faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { formatPriceXOF as formatPrice } from '../data/initialListings';
import { addListing, updateListing, deleteListing, getListings, getCustomListings } from '../services/listingService';
import { getBookings, updateBookingStatus, deleteBooking, blockListingDates, unblockListingDates } from '../services/bookingService';
import { ScrollReveal } from '../components/ScrollReveal';
import { compressImage, compressImageToBlob } from '../utils/imageOptimizer';
import { checkListingQuality, LISTING_RULES } from '../utils/listingQuality';
import { ConfirmModal } from '../components/ConfirmModal';
import { saveMediaBlob, uploadMediaFile, parseVideoEmbed } from '../services/mediaStorage';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient';
import { getTimeBasedGreeting } from '../utils/dateUtils';
import { BrandLogo } from '../components/BrandLogo';
import { EvolutionAreaChart } from '../components/EvolutionAreaChart';
import { printInvoiceDocument } from '../utils/invoicePrinter';
import { getVerificationApplication, getLocalVerificationApplication } from '../services/ownerVerificationService';
import { formatPaymentMethod } from '../utils/paymentMethod';

/** Ligne Supabase « payouts » → format affiché dans le tableau de bord. */
function normalizePayout(p) {
  return {
    ...p,
    method: p.method_label || p.method,
    recipient: p.recipient_phone_or_account || '',
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : ''
  };
}

export function PartnerDashboardPage() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  
  // Lecture synchrone immédiate du cache local pour éviter tout flash ou faux rebond
  const [verificationApp, setVerificationApp] = useState(() => {
    try {
      return getLocalVerificationApplication(user?.id, user?.email);
    } catch {
      return null;
    }
  });
  
  const [loadingVerification, setLoadingVerification] = useState(() => {
    if (user?.role === 'admin' || user?.role === 'subadmin' || user?.verified || user?.kyc_status === 'verified') {
      return false;
    }
    const local = getLocalVerificationApplication(user?.id, user?.email);
    return !local;
  });

  const handlePartnerLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Erreur déconnexion partenaire:', e);
    }
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let isMounted = true;
    if (user) {
      getVerificationApplication(user.id, user.email)
        .then((app) => {
          if (isMounted && app) {
            setVerificationApp(app);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoadingVerification(false);
          }
        });
    } else {
      setLoadingVerification(false);
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  const verifStatus = verificationApp?.status || (user?.kyc_status === 'verified' ? 'approved' : (user?.kyc_status || 'draft'));
  const isPartnerCertified = Boolean(user?.role === 'admin' || user?.role === 'subadmin' || user?.verified || user?.kyc_status === 'verified' || verifStatus === 'approved');

  // Sidebar navigation state
  const [currentSection, setCurrentSection] = useState(() => {
    try {
      return localStorage.getItem('benin_beyond_partner_section') || 'overview';
    } catch {
      return 'overview';
    }
  });

  const handleSetSection = (sec) => {
    setCurrentSection(sec);
    try {
      localStorage.setItem('benin_beyond_partner_section', sec);
    } catch {}
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [listings, setListings] = useState(() => {
    try {
      return getCustomListings();
    } catch {
      return [];
    }
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // In-dashboard Live Preview Modal state
  const [previewListingModal, setPreviewListingModal] = useState(null);

  // Booking search & filter
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'confirmed' | 'pending'
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);

  // Listings filter
  const [listingFilter, setListingFilter] = useState('all'); // 'all' | 'stay' | 'drive'

  // Publishing form state
  const [formType, setFormType] = useState('stay'); // 'stay' | 'drive'
  const [formSubcategory, setFormSubcategory] = useState('villa'); // 'villa' | 'hotel'
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('Cotonou, Haie Vive');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceUnit, setFormPriceUnit] = useState('nuit');
  const [formPurpose, setFormPurpose] = useState('location'); // 'location' | 'vente'
  const [formDescription, setFormDescription] = useState('');
  const [formSpecs, setFormSpecs] = useState('Wi-Fi Fibre, Climatisation, Groupe électrogène, Sécurité 24/7');

  // Hotel & Room Availability states
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [availabilityType, setAvailabilityType] = useState('always'); // 'always' | 'custom_period'

  // Vehicle-specific states (Strictement dissocié des chambres)
  const [seatsCount, setSeatsCount] = useState(5);
  const [transmission, setTransmission] = useState('automatique'); // 'automatique' | 'manuelle'
  const [fuelType, setFuelType] = useState('essence'); // 'essence' | 'diesel' | 'hybride' | 'electrique'
  const [withDriver, setWithDriver] = useState(false);

  // Custom Photos & Video state
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [publishErrors, setPublishErrors] = useState([]);
  const [isCheckingListing, setIsCheckingListing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');
  const [selectedRejectionModal, setSelectedRejectionModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'danger',
    onConfirm: null
  });

  // Edit Listing Modal state
  const [editingListingModal, setEditingListingModal] = useState(null);
  const [editFormTitle, setEditFormTitle] = useState('');
  const [editFormType, setEditFormType] = useState('stay');
  const [editFormSubcategory, setEditFormSubcategory] = useState('villa');
  const [editFormLocation, setEditFormLocation] = useState('');
  const [editFormPrice, setEditFormPrice] = useState('');
  const [editFormPriceUnit, setEditFormPriceUnit] = useState('nuit');
  const [editFormPurpose, setEditFormPurpose] = useState('location');
  const [editFormDescription, setEditFormDescription] = useState('');
  const [editFormSpecs, setEditFormSpecs] = useState('');
  const [editFormRoomsCount, setEditFormRoomsCount] = useState(1);
  const [editFormSeatsCount, setEditFormSeatsCount] = useState(5);
  const [editFormTransmission, setEditFormTransmission] = useState('automatique');
  const [editFormFuelType, setEditFormFuelType] = useState('essence');
  const [editFormWithDriver, setEditFormWithDriver] = useState(false);
  const [editFormAvailableFrom, setEditFormAvailableFrom] = useState('');
  const [editFormAvailableTo, setEditFormAvailableTo] = useState('');
  const [editUploadedPhotos, setEditUploadedPhotos] = useState([]);
  const [editPhotoUrlInput, setEditPhotoUrlInput] = useState('');
  const [editPhotoError, setEditPhotoError] = useState('');
  const [editIsCompressingPhotos, setEditIsCompressingPhotos] = useState(false);
  const [editIsSaving, setEditIsSaving] = useState(false);
  const [editSuccessAlert, setEditSuccessAlert] = useState('');

  // Payout request integrated in-page state
  const [payoutViewMode, setPayoutViewMode] = useState('summary'); // 'summary' | 'form'
  const [payoutChannel, setPayoutChannel] = useState('mobile_money'); // 'mobile_money' | 'bank_transfer'
  const [momoOperator, setMomoOperator] = useState('mtn'); // 'mtn' | 'moov' | 'celtiis'
  const [momoPhone, setMomoPhone] = useState(user?.phone || '+229 ');
  const [momoRecipientName, setMomoRecipientName] = useState(user?.name || '');
  const [bankName, setBankName] = useState('Bank of Africa (BOA Bénin)');
  const [bankCustomName, setBankCustomName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState(user?.company || user?.name || '');
  const [bankSwift, setBankSwift] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [partnerPayouts, setPartnerPayouts] = useState([]);

  // Availability & Physical Booking state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockListingId, setBlockListingId] = useState('');
  const [blockStartDate, setBlockStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [blockEndDate, setBlockEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [blockCustomerName, setBlockCustomerName] = useState('');
  const [blockCustomerPhone, setBlockCustomerPhone] = useState('');
  const [blockCustomerEmail, setBlockCustomerEmail] = useState('');
  const [blockReason, setBlockReason] = useState('Réservation physique / Client en direct');
  const [blockNotes, setBlockNotes] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [blockFilterListing, setBlockFilterListing] = useState('all');
  const [blockSearch, setBlockSearch] = useState('');
  const [blockSuccessToast, setBlockSuccessToast] = useState('');
  const [blockErrorAlert, setBlockErrorAlert] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/partner' } } });
    } else if (user.role === 'admin' || user.role === 'subadmin') {
      navigate('/admin', { replace: true });
    } else if (user.role === 'client') {
      navigate('/dashboard/client', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allListings, allBookings] = await Promise.all([
        getListings({ includePending: true }),
        getBookings()
      ]);

      // Isolation stricte des données : Seuls les biens de ce propriétaire sont affichés
      const myPartnerListings = allListings.filter((l) => {
        if (!user) return false;
        const matchesId = Boolean(user.id && l.owner_id && String(l.owner_id) === String(user.id));
        const matchesEmail = Boolean(user.email && l.owner_email && l.owner_email.toLowerCase() === user.email.toLowerCase());
        return matchesId || matchesEmail;
      });

      const myListingIds = new Set(myPartnerListings.map((l) => l.id));

      // Seules les réservations associées aux biens de ce partenaire sont prises en compte
      const myPartnerBookings = allBookings.filter((b) => {
        if (!user) return false;

        // 1. Correspondance directe par ID ou Email de l'hôte
        const matchesOwnerId = Boolean(b.owner_id && user.id && String(b.owner_id) === String(user.id));
        const matchesOwnerEmail = Boolean(b.owner_email && user.email && b.owner_email.toLowerCase() === user.email.toLowerCase());

        // 2. Correspondance directe par ID de l'annonce
        const matchesListingId = Boolean(b.listing_id && myListingIds.has(b.listing_id));

        // 3. Inspection approfondie des articles du panier de la réservation
        const matchesInItems = Array.isArray(b.items) && b.items.some((item) => {
          const itemListingId = item.listing_id || item.listingId || item.id;
          const itemOwnerId = item.owner_id;
          const itemOwnerEmail = item.owner_email;

          const isMyListing = itemListingId && myListingIds.has(itemListingId);
          const isMyOwnerId = itemOwnerId && user.id && String(itemOwnerId) === String(user.id);
          const isMyOwnerEmail = itemOwnerEmail && user.email && itemOwnerEmail.toLowerCase() === user.email.toLowerCase();

          return isMyListing || isMyOwnerId || isMyOwnerEmail;
        });

        return matchesOwnerId || matchesOwnerEmail || matchesListingId || matchesInItems;
      });

      setListings(myPartnerListings);
      setBookings(myPartnerBookings);

      // Demandes de reversement : Supabase fait foi (RLS : le propriétaire ne lit que les siennes)
      let myPayouts = [];
      if (isSupabaseConfigured && supabase) {
        const { data: pData, error: pError } = await supabase
          .from('payouts')
          .select('*')
          .eq('partner_id', user.id)
          .order('created_at', { ascending: false });
        if (pError) {
          console.error('[Payouts] Lecture impossible :', pError.message);
        } else {
          myPayouts = (pData || []).map(normalizePayout);
        }
      }
      setPartnerPayouts(myPayouts);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccessMessage('');

    const maxAvailable = financials.available;
    const requestedAmount = payoutAmount ? parseInt(payoutAmount, 10) : maxAvailable;

    if (!requestedAmount || requestedAmount <= 0) {
      setPayoutError('Veuillez spécifier un montant de retrait supérieur à 0 FCFA.');
      return;
    }

    if (requestedAmount > maxAvailable) {
      setPayoutError(`Le montant demandé (${formatPrice(requestedAmount)}) dépasse votre solde disponible (${formatPrice(maxAvailable)}).`);
      return;
    }

    let methodLabel = '';
    let methodCode = '';
    let recipientInfo = '';

    if (payoutChannel === 'mobile_money') {
      const operatorName = momoOperator === 'mtn' ? 'MTN Mobile Money' : momoOperator === 'moov' ? 'Moov Money Bénin' : 'Celtiis Cash';
      if (!momoPhone || momoPhone.trim().length < 8) {
        setPayoutError('Veuillez saisir un numéro de téléphone mobile Bénin valide (ex: +229 97 00 00 00).');
        return;
      }
      methodLabel = operatorName;
      methodCode = momoOperator === 'mtn' ? 'mtn_momo' : momoOperator === 'moov' ? 'moov_money' : 'celtiis_cash';
      recipientInfo = `${momoPhone.trim()} — Titulaire : ${momoRecipientName.trim() || user?.name || 'Propriétaire'}`;
    } else {
      const finalBank = bankName === 'Autre banque' ? (bankCustomName.trim() || 'Banque UEMOA') : bankName;
      if (!bankIban || bankIban.trim().length < 6) {
        setPayoutError('Veuillez renseigner le numéro de compte bancaire, IBAN ou RIB.');
        return;
      }
      if (!bankAccountHolder || bankAccountHolder.trim().length < 2) {
        setPayoutError('Veuillez renseigner le nom complet ou la raison sociale du titulaire du compte bancaire.');
        return;
      }
      methodLabel = `Virement Bancaire (${finalBank})`;
      methodCode = 'bank_transfer';
      recipientInfo = `${finalBank} • RIB/IBAN : ${bankIban.trim()} (Titulaire : ${bankAccountHolder.trim()}${bankSwift ? ` | BIC: ${bankSwift.trim()}` : ''})`;
    }

    if (!isSupabaseConfigured || !supabase) {
      setPayoutError('Le serveur n’est pas joignable : la demande ne peut pas être transmise pour le moment.');
      return;
    }

    setPayoutSubmitting(true);
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('payouts')
        .insert({
          partner_id: user.id,
          partner_name: user?.name || null,
          partner_email: user?.email || null,
          company: user?.company || null,
          method: methodCode,
          method_label: methodLabel,
          recipient_phone_or_account: recipientInfo,
          amount: requestedAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Payouts] Demande refusée :', insertError.message);
        setPayoutError(
          /solde disponible/i.test(insertError.message)
            ? 'Le montant demandé dépasse votre solde disponible.'
            : /row-level security|permission/i.test(insertError.message)
            ? 'Votre session a expiré : reconnectez-vous puis renouvelez la demande.'
            : 'La demande n’a pas pu être enregistrée. Réessayez dans un instant.'
        );
        return;
      }

      setPartnerPayouts((prev) => [normalizePayout(inserted), ...prev]);
      setPayoutSuccessMessage(`Votre demande de versement de ${formatPrice(requestedAmount)} via ${methodLabel} a été transmise à l'équipe Bénin Beyond. Vous serez payé après validation.`);
      setPayoutViewMode('summary');
      setPayoutAmount('');
    } catch (err) {
      setPayoutError(err.message || 'Erreur lors de la transmission de la demande.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // Financial calculations
  // Seules les réservations confirmées ET payées génèrent un gain reversable
  const financials = useMemo(() => {
    const earnedBookings = bookings.filter(
      (b) =>
        !b.is_manual_block &&
        (b.status === 'confirmed' || b.status === 'completed') &&
        (b.payment_status || 'paid') === 'paid'
    );
    const totalGross = earnedBookings.reduce((sum, b) => sum + (Number(b.gross_amount) || 0), 0);
    const totalCommission = earnedBookings.reduce((sum, b) => sum + (Number(b.commission_amount) || Math.round((Number(b.gross_amount) || 0) * 0.10)), 0);
    const totalNet = totalGross - totalCommission;
    const paidOut = partnerPayouts
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const inProgress = partnerPayouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pendingCount = bookings.filter((b) => b.status === 'pending').length;
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

    return {
      gross: totalGross,
      commission: totalCommission,
      net: totalNet,
      paidOut,
      inProgress,
      available: Math.max(totalNet - paidOut - inProgress, 0),
      pendingCount,
      confirmedCount
    };
  }, [bookings, partnerPayouts]);

  // Durée moyenne réelle de séjour calculée sur les réservations effectives
  const avgStayDuration = useMemo(() => {
    if (bookings.length === 0) return 0;
    const totalDays = bookings.reduce((sum, b) => {
      const items = Array.isArray(b.items) ? b.items : [];
      const first = items[0] || {};
      const count = Number(first.nights || first.days || first.qty || 1);
      return sum + count;
    }, 0);
    return Math.round((totalDays / bookings.length) * 10) / 10;
  }, [bookings]);

  // Évolution financière dynamique des gains réels de l'hôte (Montée aux réservations, baisse aux annulations)
  // Une transaction par réservation du partenaire (gains nets / commission déduite)
  const partnerChartTransactions = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'cancelled' && !b.is_manual_block)
        .map((b) => {
          const gross = Number(b.gross_amount) || 0;
          const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
          return { date: b.created_at || b.created_date, value: gross - comm, secondaryValue: comm };
        }),
    [bookings]
  );

  // Statistiques mensuelles réelles du partenaire
  // Top biens réservés réels du partenaire
  const topPartnerListings = useMemo(() => {
    if (bookings.length === 0 || listings.length === 0) return [];
    const revMap = {};
    bookings.forEach((b) => {
      const lid = b.listing_id || b.listing_title;
      if (!revMap[lid]) {
        revMap[lid] = {
          title: b.listing_title || 'Annonce',
          type: b.listing_type === 'drive' ? 'Véhicule' : 'Hébergement',
          revenue: 0,
          bookings: 0
        };
      }
      const gross = Number(b.gross_amount) || 0;
      const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
      revMap[lid].revenue += (gross - comm);
      revMap[lid].bookings += 1;
    });
    return Object.values(revMap).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  }, [bookings, listings]);

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

  // Filtered listings
  const filteredListings = useMemo(() => {
    if (listingFilter === 'all') return listings;
    return listings.filter((item) => item.type === listingFilter);
  }, [listings, listingFilter]);

  // Status updates
  const handleConfirmBooking = async (bookingId) => {
    await updateBookingStatus(bookingId, 'confirmed');
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId || b.booking_ref === bookingId ? { ...b, status: 'confirmed' } : b))
    );
    if (selectedBookingModal && (selectedBookingModal.id === bookingId || selectedBookingModal.booking_ref === bookingId)) {
      setSelectedBookingModal((prev) => ({ ...prev, status: 'confirmed' }));
    }
  };


  const handleDeleteListingItem = (listingId, listingTitle) => {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer l'annonce",
      message: `Voulez-vous supprimer définitivement l'annonce "${listingTitle || listingId}" ? Cette action est irréversible.`,
      confirmText: "Supprimer définitivement",
      cancelText: "Annuler",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await deleteListing(listingId);
        setListings((prev) => prev.filter((item) => item.id !== listingId));
      }
    });
  };

  // Photo handlers (with automated client-side compression)
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const handlePhotoUpload = async (e) => {
    setPhotoError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsCompressingPhotos(true);
    try {
      const ownerId = user?.id || 'partner';
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
          // 1. Compression haute fidélité (2048x1536 max, qualité 90% pour une netteté Full HD absolue)
          const optimizedFile = await compressImageToBlob(file, 2048, 1536, 0.90);
          
          // 2. Téléversement dans Supabase Storage dans le dossier structuré de l'hôte
          // Chemin : <userId>/<listingId>/photos/<filename>
          const uploadedUrl = await uploadMediaFile(optimizedFile, {
            userId: ownerId,
            listingId: 'new_listing',
            category: 'photos'
          });

          if (uploadedUrl) {
            setUploadedPhotos((prev) => [...prev, uploadedUrl]);
          } else {
            const dataUrl = await compressImage(file, 2048, 1536, 0.90);
            setUploadedPhotos((prev) => [...prev, dataUrl]);
          }
        } catch (err) {
          console.warn('Fallback FileReader for image:', err);
          const reader = new FileReader();
          reader.onload = (event) => {
            setUploadedPhotos((prev) => [...prev, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      }
    } finally {
      setIsCompressingPhotos(false);
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

  // ==========================================
  // GESTION DE LA MODIFICATION D'UNE ANNONCE
  // ==========================================
  const handleOpenEditModal = (item) => {
    const isVeh = item.type === 'drive' || item.subcategory === 'car';
    setEditingListingModal(item);
    setEditFormTitle(item.title || '');
    setEditFormType(item.type || 'stay');
    setEditFormSubcategory(item.subcategory || (item.type === 'drive' ? 'car' : 'villa'));
    setEditFormLocation(item.location || '');
    setEditFormPrice(item.price ? String(item.price) : '');
    setEditFormPriceUnit(item.price_unit || (item.type === 'drive' ? 'jour' : 'nuit'));
    setEditFormPurpose(item.purpose || (item.price_unit === 'vente totale' ? 'vente' : 'location'));
    setEditFormDescription(item.description || '');
    const rawSpecsList = Array.isArray(item.specs) ? item.specs : (item.specs || '').split(',');
    const sanitizedSpecs = isVeh
      ? rawSpecsList.filter(s => !/chambre|piscine|cuisine|lit|suite/i.test(String(s).trim()))
      : rawSpecsList.filter(s => !/boîte|boite|vitesse|carburant|cylindrée/i.test(String(s).trim()));
    setEditFormSpecs(sanitizedSpecs.map(s => String(s).trim()).filter(Boolean).join(', '));
    setEditFormRoomsCount(isVeh ? 0 : (item.rooms_count || item.availability?.rooms_count || 1));
    setEditFormSeatsCount(item.vehicle_seats || (isVeh ? (item.rooms_count || 5) : 5));
    setEditFormTransmission(item.transmission || 'automatique');
    setEditFormFuelType(item.fuel_type || 'essence');
    setEditFormWithDriver(Boolean(item.with_driver));
    setEditFormAvailableFrom(item.available_from || item.availability?.available_from || '');
    setEditFormAvailableTo(item.available_to || item.availability?.available_to || '');
    setEditUploadedPhotos(Array.isArray(item.gallery) ? [...item.gallery] : []);
    setEditPhotoUrlInput('');
    setEditPhotoError('');
    setEditSuccessAlert('');
  };

  const handleEditPhotoUpload = async (e) => {
    setEditPhotoError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setEditIsCompressingPhotos(true);
    try {
      const ownerId = user?.id || 'partner';
      const listingId = editingListingModal?.id || 'listing';
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setEditPhotoError('Format non supporté. Veuillez choisir des photos JPG, PNG ou WebP.');
          continue;
        }
        if (file.size > 25 * 1024 * 1024) {
          setEditPhotoError(`L'image "${file.name}" dépasse 25 Mo.`);
          continue;
        }

        try {
          // Compression haute résolution 2048x1536 qualité 90% pour un rendu Full HD net
          const optimizedBlob = await compressImageToBlob(file, 2048, 1536, 0.90);
          const uploadedUrl = await uploadMediaFile(optimizedBlob, {
            userId: ownerId,
            listingId: listingId,
            category: 'photos'
          });

          if (uploadedUrl) {
            setEditUploadedPhotos((prev) => [...prev, uploadedUrl]);
          } else {
            const dataUrl = await compressImage(file, 2048, 1536, 0.90);
            setEditUploadedPhotos((prev) => [...prev, dataUrl]);
          }
        } catch (err) {
          console.warn('Fallback FileReader for image:', err);
          const reader = new FileReader();
          reader.onload = (event) => {
            setEditUploadedPhotos((prev) => [...prev, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      }
    } finally {
      setEditIsCompressingPhotos(false);
    }
  };

  const handleEditAddPhotoUrl = () => {
    const trimmed = editPhotoUrlInput.trim();
    if (!trimmed) return;
    setEditUploadedPhotos((prev) => [...prev, trimmed]);
    setEditPhotoUrlInput('');
    setEditPhotoError('');
  };

  const handleEditRemovePhoto = (idx) => {
    setEditUploadedPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSetFeaturedPhoto = (idx) => {
    if (idx <= 0) return;
    setEditUploadedPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      return [item, ...copy];
    });
  };

  const handleSaveListingEdit = async (e) => {
    e.preventDefault();
    if (!editingListingModal) return;
    setEditPhotoError('');

    if (editUploadedPhotos.length === 0) {
      setEditPhotoError("L'annonce doit comporter au moins une photo en haute résolution.");
      return;
    }

    if (!editFormTitle.trim()) {
      setEditPhotoError("Veuillez renseigner un titre pour votre annonce.");
      return;
    }

    const rawEditPrice = parseInt(editFormPrice, 10);
    if (!editFormPrice || isNaN(rawEditPrice) || rawEditPrice < 1000) {
      setEditPhotoError("Le tarif minimum autorisé pour les propriétaires est de 1 000 FCFA.");
      return;
    }

    setEditIsSaving(true);
    try {
      const specsArray = editFormSpecs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const isVeh = editFormType === 'drive' || editFormSubcategory === 'car';
      const priceNum = rawEditPrice;
      const roomsNum = isVeh ? 0 : (parseInt(editFormRoomsCount, 10) || 1);
      const seatsNum = isVeh ? (parseInt(editFormSeatsCount, 10) || 5) : 0;

      // Si l'annonce était refusée, la mise à jour réactive l'annonce si l'hôte est certifié
      const nextStatus = editingListingModal.status === 'refused'
        ? (isPartnerCertified ? 'active' : 'pending')
        : (editingListingModal.status || 'active');

      const nextBadge = editingListingModal.status === 'refused'
        ? (isPartnerCertified ? 'Certifié' : 'En attente')
        : (editingListingModal.badge || 'Certifié');

      const updates = {
        title: editFormTitle.trim(),
        type: editFormType,
        subcategory: editFormType === 'stay' ? editFormSubcategory : 'car',
        location: editFormLocation.trim() || 'Cotonou, Bénin',
        price: priceNum,
        price_unit: editFormPurpose === 'vente' ? 'vente totale' : (isVeh ? 'jour' : editFormPriceUnit),
        purpose: editFormPurpose,
        description: editFormDescription.trim(),
        summary: editFormDescription.trim().slice(0, 160),
        specs: specsArray.length > 0 ? specsArray : (isVeh ? ['Climatisation', `${seatsNum} places`, editFormTransmission === 'automatique' ? 'Boîte Automatique' : 'Boîte Manuelle'] : ['Standing supérieur', 'Sécurité 24/7']),
        rooms_count: roomsNum,
        vehicle_seats: seatsNum,
        transmission: isVeh ? editFormTransmission : null,
        fuel_type: isVeh ? editFormFuelType : null,
        with_driver: isVeh ? editFormWithDriver : false,
        available_from: isVeh ? null : (editFormAvailableFrom || null),
        available_to: isVeh ? null : (editFormAvailableTo || null),
        gallery: editUploadedPhotos,
        video_url: editingListingModal.video_url || null,
        status: nextStatus,
        rejection_reason: editingListingModal.status === 'refused' ? null : (editingListingModal.rejection_reason || null),
        badge: nextBadge,
        availability: isVeh ? {
          type: 'always',
          available_from: null,
          available_to: null,
          rooms_count: 0
        } : {
          type: editFormAvailableFrom || editFormAvailableTo ? 'custom_period' : 'always',
          available_from: editFormAvailableFrom || null,
          available_to: editFormAvailableTo || null,
          rooms_count: roomsNum
        }
      };

      const updated = await updateListing(editingListingModal.id, updates);

      // Mettre à jour l'état local des annonces
      setListings((prev) =>
        prev.map((item) => (item.id === editingListingModal.id ? { ...item, ...updates, ...updated } : item))
      );

      // Synchroniser l'aperçu si ouvert
      if (previewListingModal && previewListingModal.id === editingListingModal.id) {
        setPreviewListingModal((prev) => ({ ...prev, ...updates, ...updated }));
      }

      setEditSuccessAlert(`L'annonce "${updates.title}" a été modifiée avec succès !`);

      setTimeout(() => {
        setEditingListingModal(null);
        setEditSuccessAlert('');
      }, 1200);
    } catch (err) {
      console.error('Erreur lors de la modification de l\'annonce:', err);
      setEditPhotoError("Une erreur est survenue lors de l'enregistrement des modifications.");
    } finally {
      setEditIsSaving(false);
    }
  };

  // Availability / Manual Block Handlers
  const handleOpenBlockModal = (targetListing = null) => {
    if (targetListing?.id) {
      setBlockListingId(targetListing.id);
    } else if (!blockListingId && listings.length > 0) {
      setBlockListingId(listings[0].id);
    }
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    const d2 = new Date();
    d2.setDate(d2.getDate() + 4);
    setBlockStartDate(d1.toISOString().split('T')[0]);
    setBlockEndDate(d2.toISOString().split('T')[0]);
    setBlockCustomerName('');
    setBlockCustomerPhone('');
    setBlockCustomerEmail('');
    setBlockNotes('');
    setBlockErrorAlert('');
    setBlockReason('Réservation physique / Client en direct');
    setShowBlockModal(true);
  };

  const handleSubmitBlockDates = async (e) => {
    e?.preventDefault?.();
    setBlockErrorAlert('');

    if (!blockListingId) {
      setBlockErrorAlert('Veuillez sélectionner le bien ou véhicule concerné.');
      return;
    }
    if (!blockStartDate || !blockEndDate) {
      setBlockErrorAlert('Veuillez renseigner les dates de début et de fin.');
      return;
    }
    if (new Date(blockEndDate) < new Date(blockStartDate)) {
      setBlockErrorAlert('La date de fin ne peut pas précéder la date de début.');
      return;
    }

    const selectedListing = listings.find((l) => String(l.id) === String(blockListingId));
    setIsSubmittingBlock(true);

    try {
      const res = await blockListingDates({
        listingId: blockListingId,
        listingTitle: selectedListing?.title || 'Bien partenaire',
        listingImage: selectedListing?.image || selectedListing?.gallery?.[0] || '',
        listingLocation: selectedListing?.location || '',
        listingType: selectedListing?.type || 'stay',
        startDate: blockStartDate,
        endDate: blockEndDate,
        customerName: blockCustomerName.trim() || 'Client Réservation Directe',
        customerPhone: blockCustomerPhone.trim(),
        customerEmail: blockCustomerEmail.trim(),
        notes: blockNotes.trim(),
        reason: blockReason,
        ownerId: user?.id,
        ownerEmail: user?.email,
        ownerName: user?.name
      });

      if (res?.success) {
        setShowBlockModal(false);
        setBlockSuccessToast(`Période du ${blockStartDate} au ${blockEndDate} verrouillée avec succès ! Ce bien est désormais inaccessible aux réservations en ligne pour ces dates.`);
        setTimeout(() => setBlockSuccessToast(''), 5000);
        await loadAllData();
      } else {
        setBlockErrorAlert('Une erreur est survenue lors du blocage. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Erreur blocage dates:', err);
      setBlockErrorAlert('Erreur inattendue : ' + (err.message || 'Échec'));
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblockPeriod = (booking) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Libérer / Débloquer ces dates ?',
      message: `Souhaitez-vous débloquer la période du ${booking.start_date || booking.dates || 'sélectionnée'} pour "${booking.items?.[0]?.title || 'ce bien'}" ? Ces dates redeviendront immédiatement disponibles pour les voyageurs sur le site Bénin Beyond.`,
      confirmText: 'Débloquer & Ré-ouvrir',
      cancelText: 'Conserver bloqué',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await unblockListingDates(booking.id, booking.booking_ref);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          setBlockSuccessToast('Dates libérées avec succès ! Le bien est de nouveau ouvert à la réservation en ligne.');
          setTimeout(() => setBlockSuccessToast(''), 5000);
          await loadAllData();
        } catch (err) {
          console.error('Erreur déblocage dates:', err);
        }
      }
    });
  };

  // Publishing an item
  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setPhotoError('');
    setPublishErrors([]);

    const rawPublishPrice = parseInt(formPrice, 10);

    // Contrôles qualité automatiques : une annonce conforme est publiée immédiatement
    setIsCheckingListing(true);
    const qualityErrors = await checkListingQuality({
      type: formType,
      title: formTitle,
      description: formDescription,
      location: formLocation,
      price: rawPublishPrice,
      isSale: formPurpose === 'vente',
      photos: uploadedPhotos
    });
    setIsCheckingListing(false);
    if (qualityErrors.length > 0) {
      setPublishErrors(qualityErrors);
      return;
    }

    const specsArray = formSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const priceNum = rawPublishPrice;

    // Reorder photos so featured photo is first
    const finalGallery = [...uploadedPhotos];
    if (featuredPhotoIndex > 0 && featuredPhotoIndex < finalGallery.length) {
      const [feat] = finalGallery.splice(featuredPhotoIndex, 1);
      finalGallery.unshift(feat);
    }

    const isVeh = formType === 'drive';
    const roomsNum = isVeh ? 0 : (formSubcategory === 'hotel' ? (parseInt(roomsCount, 10) || 1) : Math.max(1, parseInt(roomsCount, 10) || 1));
    const seatsNum = isVeh ? (parseInt(seatsCount, 10) || 5) : 0;

    const newListing = await addListing({
      title: formTitle.trim(),
      type: formType,
      subcategory: formType === 'stay' ? formSubcategory : 'car',
      location: formLocation,
      price: priceNum,
      price_unit: formPurpose === 'vente' ? 'vente totale' : (isVeh ? 'jour' : formPriceUnit),
      rooms_count: roomsNum,
      vehicle_seats: seatsNum,
      transmission: isVeh ? transmission : null,
      fuel_type: isVeh ? fuelType : null,
      with_driver: isVeh ? withDriver : false,
      description: formDescription.trim(),
      badge: isVeh
        ? `${seatsNum} places · ${transmission === 'automatique' ? 'Auto' : 'Manuelle'}`
        : (formSubcategory === 'hotel'
          ? `${roomsNum} chambre(s) dispo`
          : 'Vérifié'),
      specs: specsArray.length > 0 ? specsArray : (isVeh ? ['Climatisation', `${seatsNum} places`, transmission === 'automatique' ? 'Boîte Automatique' : 'Boîte Manuelle'] : ['Climatisation', 'Sécurité 24/7', 'Standing']),
      gallery: finalGallery,
      video_url: null,
      status: 'active', // Contrôles qualité réussis : mise en ligne immédiate (l'admin peut suspendre après coup)
      owner_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : (user?.id || null),
      owner_name: user?.name || (isPartnerCertified ? 'Propriétaire Certifié' : 'Partenaire Hôte'),
      owner_email: user?.email || '',
      availability: isVeh ? {
        type: 'always',
        available_from: null,
        available_to: null,
        rooms_count: 0
      } : {
        type: availabilityType,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        rooms_count: roomsNum
      }
    });

    setListings((prev) => [newListing, ...prev.filter((l) => l.id !== newListing.id)]);
    
    setPublishSuccess(`Félicitations ! L'annonce "${newListing.title}" a passé les contrôles qualité et est en ligne sur le site.`);

    // Reset form
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    setUploadedPhotos([]);
    setFeaturedPhotoIndex(0);
    setAvailableFrom('');
    setAvailableTo('');
    setRoomsCount(1);

    setTimeout(() => {
      handleSetSection('listings');
      setPublishSuccess('');
    }, 2000);
  };

  const blockedBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.is_manual_block ||
        b.block_reason ||
        (b.payment_method && b.payment_method.toLowerCase().includes('physique'))
    );
  }, [bookings]);

  const filteredBlockedBookings = useMemo(() => {
    return blockedBookings.filter((b) => {
      if (blockFilterListing !== 'all') {
        const targetId = String(blockFilterListing);
        const matchesDirect = String(b.listing_id || '') === targetId;
        const matchesItem = Array.isArray(b.items) && b.items.some((it) => String(it.listing_id || it.id || '') === targetId);
        if (!matchesDirect && !matchesItem) return false;
      }
      if (blockSearch.trim()) {
        const q = blockSearch.toLowerCase();
        const matchName = (b.customer_name || '').toLowerCase().includes(q);
        const matchRef = (b.booking_ref || '').toLowerCase().includes(q);
        const matchReason = (b.block_reason || '').toLowerCase().includes(q);
        const matchItem = Array.isArray(b.items) && b.items.some((it) => (it.title || '').toLowerCase().includes(q));
        if (!matchName && !matchRef && !matchReason && !matchItem) return false;
      }
      return true;
    });
  }, [blockedBookings, blockFilterListing, blockSearch]);

  // Navigation groupée (même structure que l'espace admin)
  const navGroups = [
    {
      title: 'Pilotage',
      items: [
        { key: 'overview', label: 'Vue d’ensemble', icon: faChartPie },
        { key: 'bookings', label: 'Réservations', icon: faCalendarCheck, badge: financials.pendingCount },
        { key: 'availability', label: 'Disponibilités', icon: faCalendarDays, badge: blockedBookings.length },
        { key: 'finances', label: 'Revenus', icon: faWallet }
      ]
    },
    {
      title: 'Mes biens',
      items: [
        { key: 'listings', label: 'Annonces', icon: faHouse },
        { key: 'publish', label: 'Publier une annonce', icon: faCirclePlus },
        { key: 'stats', label: 'Statistiques', icon: faChartLine }
      ]
    }
  ];

  const navItems = navGroups.flatMap((g) => g.items);

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
      {/* 1. SIDEBAR PRO MARKETPLACE (FONTAWESOME ICONS ONLY) - STRICTLY PINNED */}
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
                          if (item.action) {
                            item.action();
                          } else {
                            handleSetSection(item.key);
                          }
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
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{user?.name || 'Partenaire Hôte'}</p>
              <p className={`truncate text-[11px] ${user?.verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {user?.verified ? 'Compte certifié' : 'Vérification en attente'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
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
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT AREA - INDEPENDENT FLUID SCROLL */}
      {/* ========================================================================= */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

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
                {navItems.find((i) => i.key === currentSection)?.label || 'Espace propriétaire'}
              </h1>
              <p className="hidden truncate text-xs text-foreground/50 sm:block">
                {getTimeBasedGreeting()}, {(user?.name || '').split(' ')[0] || 'Partenaire'}
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

        {/* Dynamic Section Rendering */}
        <main key={currentSection} className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 animate-section-enter">

          {/* ========================================================================= */}
          {/* SECTION A : VUE D'ENSEMBLE (OVERVIEW) */}
          {/* ========================================================================= */}
          {currentSection === 'overview' && (
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  { label: 'Revenus bruts', value: formatPrice(financials.gross), hint: 'Total de vos réservations' },
                  { label: 'Commission (10 %)', value: formatPrice(financials.commission), hint: 'Frais de service inclus' },
                  { label: 'Solde disponible', value: formatPrice(financials.available), hint: 'Retirable dès maintenant' },
                  { label: 'Réservations', value: bookings.length, hint: `${financials.pendingCount} en attente` }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <EvolutionAreaChart
                title="Vos revenus"
                transactions={partnerChartTransactions}
                valueLabel="Gains nets"
                secondaryLabel="Commission déduite (10 %)"
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Compte */}
                <section className="rounded-2xl border border-foreground/10 bg-card lg:col-span-2">
                  <h3 className="border-b border-foreground/10 px-5 py-4 text-sm font-semibold text-foreground">Mon compte</h3>
                  <ul className="divide-y divide-foreground/[0.07] text-sm">
                    <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <span className="text-foreground/75">Hébergements</span>
                      <span className="tabular-nums text-foreground">{listings.filter((l) => l.type === 'stay').length}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <span className="text-foreground/75">Véhicules</span>
                      <span className="tabular-nums text-foreground">{listings.filter((l) => l.type === 'drive').length}</span>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          handleSetSection('finances');
                          setPayoutViewMode('form');
                        }}
                        className="flex w-full items-center justify-between px-5 py-3.5 text-left text-foreground/75 transition-colors hover:bg-muted/50 hover:text-foreground"
                      >
                        <span>Demander un virement</span>
                        <FontAwesomeIcon icon={faChevronRight} className="h-2.5 w-2.5 text-foreground/35" />
                      </button>
                    </li>
                  </ul>
                </section>

                {/* Dernières réservations */}
                <section className="rounded-2xl border border-foreground/10 bg-card lg:col-span-3">
                  <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground">Dernières réservations</h3>
                    <button
                      type="button"
                      onClick={() => setCurrentSection('bookings')}
                      className="text-xs font-medium text-foreground/55 hover:text-foreground"
                    >
                      Tout voir ({bookings.length})
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-foreground/50">Aucune réservation pour le moment.</p>
                  ) : (
                    <ul className="divide-y divide-foreground/[0.07]">
                      {bookings.slice(0, 5).map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedBookingModal(b)}
                            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                          >
                            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {b.listing_image && (
                                <img
                                  src={b.listing_image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{b.customer_name}</p>
                              <p className="truncate text-xs text-foreground/45">{b.listing_title} · {b.dates}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium tabular-nums text-foreground">{formatPrice(b.net_amount)}</p>
                              <p className={`text-xs ${b.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {b.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B : RÉSERVATIONS REÇUES (DETAILED BOOKINGS LIST) */}
          {/* ========================================================================= */}
          {currentSection === 'bookings' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                {/* Recherche et filtres */}
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative w-full lg:max-w-xs">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35"
                    />
                    <input
                      type="text"
                      placeholder="Nom, téléphone, annonce..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { key: 'all', label: 'Toutes', count: bookings.length },
                        { key: 'confirmed', label: 'Confirmées', count: financials.confirmedCount },
                        { key: 'pending', label: 'En attente', count: financials.pendingCount }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setBookingFilter(tab.key)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            bookingFilter === tab.key ? 'bg-muted text-foreground' : 'text-foreground/50 hover:text-foreground'
                          }`}
                        >
                          {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenBlockModal()}
                      className="inline-flex items-center gap-2 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      title="Enregistrer une réservation directe (hors plateforme) ou bloquer des dates"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                      <span>Réservation directe</span>
                    </button>
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucune réservation trouvée.</p>
                    <p className="mt-1 text-xs text-foreground/40">
                      Les réservations de vos clients apparaîtront ici en temps réel.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                        <tr>
                          <th className="px-5 py-3 font-medium">Client</th>
                          <th className="px-5 py-3 font-medium">Bien</th>
                          <th className="px-5 py-3 font-medium">Dates</th>
                          <th className="px-5 py-3 font-medium">Montant</th>
                          <th className="px-5 py-3 font-medium">Commission</th>
                          <th className="px-5 py-3 font-medium">Votre net</th>
                          <th className="px-5 py-3 font-medium">Paiement</th>
                          <th className="px-5 py-3 font-medium">Statut</th>
                          <th className="px-5 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/[0.07]">
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3">
                              <p className="font-medium text-foreground">{b.customer_name}</p>
                              <p className="text-xs text-foreground/45">
                                {b.customer_phone}{b.customer_phone && b.booking_ref ? ' · ' : ''}<span className="font-mono">{b.booking_ref}</span>
                              </p>
                              {b.customer_email && <p className="text-xs text-foreground/40">{b.customer_email}</p>}
                            </td>

                            <td className="px-5 py-3">
                              <p className="line-clamp-1 text-foreground/75">{b.listing_title}</p>
                              <p className="text-xs text-foreground/45">{b.location}</p>
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 text-foreground/60">
                              {b.dates}
                              {b.guests && <p className="text-xs text-foreground/40">{b.guests}</p>}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">
                              {formatPrice(b.gross_amount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground/60">
                              −{formatPrice(b.commission_amount)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-foreground">
                              {formatPrice(b.net_amount)}
                            </td>

                            <td className="px-5 py-3 text-xs text-foreground/60">
                              {formatPaymentMethod(b.payment_method)}
                            </td>

                            <td className="whitespace-nowrap px-5 py-3 text-xs font-medium">
                              <span className={b.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}>
                                {b.status === 'confirmed' ? 'Confirmée' : 'En attente'}
                              </span>
                            </td>

                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {b.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmBooking(b.id)}
                                    className="rounded-md border border-foreground/15 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                    title="Confirmer la réservation"
                                  >
                                    Confirmer
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedBookingModal(b)}
                                  className="rounded-md px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  Détails
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION DISPONIBILITÉS & BLOCAGES CALENDRIER PAR LE PROPRIÉTAIRE */}
          {/* ========================================================================= */}
          {currentSection === 'availability' && (
            <div className="space-y-6">
              <p className="text-xs leading-relaxed text-foreground/50">
                Bloquez les dates d’une réservation conclue en direct : elles deviennent indisponibles en ligne, les autres dates restent réservables.
              </p>

              {blockSuccessToast && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-card px-5 py-3.5">
                  <span className="text-sm text-emerald-600">{blockSuccessToast}</span>
                  <button
                    type="button"
                    onClick={() => setBlockSuccessToast('')}
                    className="shrink-0 rounded-md p-1.5 text-foreground/45 hover:bg-muted hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Chiffres clés */}
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10">
                {[
                  { label: 'Biens', value: listings.length, hint: 'Sous gestion' },
                  { label: 'Périodes bloquées', value: blockedBookings.length, hint: 'Réservations directes' },
                  { label: 'Réservations en ligne', value: bookings.filter((b) => !b.is_manual_block && !b.block_reason).length, hint: 'Via Bénin Beyond' }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-60">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground/35"
                      />
                      <input
                        type="text"
                        placeholder="Rechercher par client, note, réf..."
                        value={blockSearch}
                        onChange={(e) => setBlockSearch(e.target.value)}
                        className="w-full rounded-lg border border-foreground/10 bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/30 focus:outline-none"
                      />
                    </div>

                    <select
                      value={blockFilterListing}
                      onChange={(e) => setBlockFilterListing(e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-foreground/10 bg-background px-2.5 py-2 text-xs text-foreground focus:outline-none sm:w-auto sm:max-w-[220px]"
                    >
                      <option value="all">Tous mes biens ({listings.length})</option>
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBlockModal()}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted lg:self-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    <span>Bloquer des dates</span>
                  </button>
                </div>

                {filteredBlockedBookings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucune période bloquée.</p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-foreground/40">
                      Vos biens sont ouverts aux réservations en ligne selon leurs disponibilités habituelles.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {filteredBlockedBookings.map((b) => {
                      const it = b.items?.[0] || {};
                      const start = b.start_date || b.check_in || it.startDate || '';
                      const end = b.end_date || b.check_out || it.endDate || '';
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isCurrent = start <= todayStr && end >= todayStr;
                      const isUpcoming = start > todayStr;

                      return (
                        <li key={b.id || b.booking_ref} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {it.image && (
                                <img
                                  src={it.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {it.title || b.title || 'Bien partenaire'}
                              </p>
                              <p className="truncate text-xs text-foreground/45">
                                Du {start} au {end}
                                {b.duration_days ? ` · ${b.duration_days} nuit${b.duration_days > 1 ? 's' : ''}` : ''}
                                {' · '}{b.block_reason || 'Réservation directe'}
                                {b.customer_name ? ` · ${b.customer_name}` : ''}
                              </p>
                              {(b.customer_phone || b.notes) && (
                                <p className="truncate text-xs text-foreground/40">
                                  {b.customer_phone && (
                                    <a href={`tel:${b.customer_phone}`} className="hover:text-foreground hover:underline">
                                      {b.customer_phone}
                                    </a>
                                  )}
                                  {b.customer_phone && b.notes ? ' · ' : ''}
                                  {b.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 pl-[60px] sm:pl-0">
                            <span className={`text-xs font-medium ${
                              isCurrent ? 'text-emerald-600' : isUpcoming ? 'text-amber-600' : 'text-foreground/45'
                            }`}>
                              {isCurrent ? 'En cours' : isUpcoming ? 'À venir' : 'Terminé'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnblockPeriod(b)}
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
                            >
                              Débloquer
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
          {/* SECTION C : MES ANNONCES & BIENS (LISTINGS) */}
          {/* ========================================================================= */}
          {currentSection === 'listings' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex flex-col gap-3 border-b border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: 'all', label: 'Tous', count: listings.length },
                      { key: 'stay', label: 'Hébergements', count: listings.filter((l) => l.type === 'stay').length },
                      { key: 'drive', label: 'Véhicules', count: listings.filter((l) => l.type === 'drive').length }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setListingFilter(tab.key)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          listingFilter === tab.key ? 'bg-muted text-foreground' : 'text-foreground/50 hover:text-foreground'
                        }`}
                      >
                        {tab.label} <span className="tabular-nums text-foreground/40">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentSection('publish')}
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-foreground/15 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:self-auto"
                  >
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                    <span>Nouvelle annonce</span>
                  </button>
                </div>

                {filteredListings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucune annonce dans cette catégorie.</p>
                    <button
                      onClick={() => setCurrentSection('publish')}
                      className="mt-2 text-xs font-medium text-foreground/55 hover:text-foreground"
                    >
                      Publier une annonce
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {filteredListings.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 sm:flex-nowrap">
                        <div className="h-10 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        <div className="min-w-0 flex-1 basis-[calc(100%-60px)] sm:basis-auto">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <p className="truncate text-xs text-foreground/45">
                            {item.type === 'stay' ? (item.subcategory === 'hotel' ? 'Hôtel' : 'Logement') : 'Véhicule'}
                            {item.location ? ` · ${item.location}` : ''}
                            {item.availability?.available_from ? ` · dispo ${item.availability.available_from.slice(5)} au ${item.availability.available_to?.slice(5)}` : ''}
                            {item.video_url ? ' · vidéo' : ''}
                          </p>
                        </div>
                        <div className="shrink-0 pl-[60px] text-left sm:pl-0 sm:text-right">
                          <p className="text-sm font-medium tabular-nums text-foreground">
                            {formatPrice(item.price)}
                            <span className="text-xs font-normal text-foreground/45"> / {item.price_unit || 'nuit'}</span>
                          </p>
                          {item.status === 'pending' ? (
                            <p className="text-xs text-amber-600">{isPartnerCertified ? 'Publication en cours' : 'En attente de validation'}</p>
                          ) : item.status === 'refused' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRejectionModal(item)}
                              className="text-xs text-rose-600 hover:underline"
                            >
                              Refusée · voir le motif
                            </button>
                          ) : item.status === 'suspended' ? (
                            <p className="text-xs text-foreground/50">Suspendue</p>
                          ) : (
                            <p className="text-xs text-emerald-600">En ligne</p>
                          )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0">
                          <button
                            type="button"
                            onClick={() => handleOpenBlockModal(item)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                            title="Gérer les disponibilités / Bloquer des dates (réservation physique)"
                          >
                            <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                            title="Modifier cette annonce"
                          >
                            <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewListingModal(item)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-muted hover:text-foreground"
                            title="Aperçu du bien en direct (sans quitter le tableau de bord)"
                          >
                            <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteListingItem(item.id, item.title)}
                            className="rounded-md p-2 text-foreground/45 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                            title="Supprimer l'annonce"
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
          {/* SECTION D : PUBLIER UNE ANNONCE (PUBLISH FORM) */}
          {/* ========================================================================= */}
          {currentSection === 'publish' && (
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Charte de publication : contrôles qualité automatiques */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Publication immédiate si l'annonce respecte la charte</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/50">
                    Les contrôles sont automatiques. Notre équipe peut suspendre à tout moment une annonce non conforme ou signalée.
                  </p>
                </div>
                <ul className="list-disc space-y-1 border-t border-foreground/10 py-3 pl-9 pr-5 text-xs text-foreground/60">
                  <li>Au moins {LISTING_RULES.minPhotos.stay} photos (logement) ou {LISTING_RULES.minPhotos.drive} (véhicule), nettes, {LISTING_RULES.minPhotoSide} px minimum</li>
                  <li>Un titre de {LISTING_RULES.titleLength[0]} à {LISTING_RULES.titleLength[1]} caractères et une description d'au moins {LISTING_RULES.minDescriptionLength} caractères</li>
                  <li>Un tarif réaliste, à partir de {LISTING_RULES.priceMin.toLocaleString('fr-FR')} FCFA, et la ville ou le quartier</li>
                  <li>Aucun numéro, e-mail ou lien dans le texte</li>
                </ul>
              </section>

              {publishSuccess && (
                <p className="rounded-2xl border border-foreground/10 bg-card px-5 py-3.5 text-sm text-emerald-600">
                  {publishSuccess}
                </p>
              )}

              <form onSubmit={handlePublishSubmit} className="rounded-2xl border border-foreground/10 bg-card">
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
                      <p className="mt-0.5 text-xs text-foreground/50">Location ou vente</p>
                    </button>
                  </div>

                  {formType === 'stay' && (
                    <div className="space-y-3">
                      <p className="text-xs text-foreground/60">Type d’établissement</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormSubcategory('villa');
                            setFormSpecs('Wi-Fi Fibre, Climatisation, Piscine privée, Sécurité 24/7');
                          }}
                          className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                            formSubcategory === 'villa'
                              ? 'border-foreground/60 bg-muted/40'
                              : 'border-foreground/10 hover:border-foreground/25'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">Villa / résidence</p>
                          <p className="mt-0.5 text-xs text-foreground/50">Bien entier</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormSubcategory('hotel');
                            setFormSpecs('Chambre Deluxe, Climatisation, Petit-déjeuner inclus, Service d\'étage');
                          }}
                          className={`rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                            formSubcategory === 'hotel'
                              ? 'border-foreground/60 bg-muted/40'
                              : 'border-foreground/10 hover:border-foreground/25'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">Chambre d’hôtel</p>
                          <p className="mt-0.5 text-xs text-foreground/50">Chambres et disponibilités</p>
                        </button>
                      </div>

                      {formSubcategory === 'hotel' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Chambres de ce type *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="200"
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
                              className="w-full cursor-pointer rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Disponible jusqu’au
                            </label>
                            <input
                              type="date"
                              value={availableTo}
                              onChange={(e) => setAvailableTo(e.target.value)}
                              className="w-full cursor-pointer rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formType === 'drive' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-foreground/60">
                          Places assises *
                        </label>
                        <select
                          value={seatsCount}
                          onChange={(e) => setSeatsCount(Number(e.target.value))}
                          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        >
                          <option value={2}>2 places (Sport / Coupé)</option>
                          <option value={4}>4 places (Berline compacte)</option>
                          <option value={5}>5 places (Berline / SUV standard)</option>
                          <option value={7}>7 places (Grand SUV / Familial)</option>
                          <option value={9}>9 places (Van VIP / Minibus)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-foreground/60">
                          Boîte de vitesse
                        </label>
                        <select
                          value={transmission}
                          onChange={(e) => setTransmission(e.target.value)}
                          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        >
                          <option value="automatique">Automatique</option>
                          <option value="manuelle">Manuelle</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-foreground/60">
                          Carburant
                        </label>
                        <select
                          value={fuelType}
                          onChange={(e) => setFuelType(e.target.value)}
                          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        >
                          <option value="essence">Essence</option>
                          <option value="diesel">Diesel</option>
                          <option value="hybride">Hybride</option>
                          <option value="electrique">100% Électrique</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-foreground/60">
                          Chauffeur
                        </label>
                        <select
                          value={withDriver ? 'yes' : 'no'}
                          onChange={(e) => setWithDriver(e.target.value === 'yes')}
                          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                        >
                          <option value="no">Sans chauffeur</option>
                          <option value="yes">Avec chauffeur</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="space-y-4 border-t border-foreground/10 px-5 py-5">
                  <h3 className="text-sm font-semibold text-foreground">Informations</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-foreground/60">
                        Titre de l’annonce *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          formType === 'stay'
                            ? formSubcategory === 'hotel'
                              ? 'ex: Chambre Deluxe Vue Lagune — Hôtel Riviera'
                              : 'ex: Villa Royale Cotonou Lagune'
                            : 'ex: SUV Toyota Fortuner 7 Places VIP'
                        }
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
                          ? '4 Chambres, Piscine privée, Climatisation, Wifi'
                          : '7 Places, Automatique, Climatisation, Carburant Essence'
                      }
                      className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-foreground/60">
                      Description pour les voyageurs
                    </label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Présentez le confort, l'emplacement, les règles ou les équipements d'exception de votre bien..."
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
                        Tarif (FCFA, min. 1 000) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1000"
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
                      <p className="mb-1 text-xs text-foreground/60">Votre revenu net</p>
                      <p className="py-2 text-sm font-medium tabular-nums text-foreground">
                        {formPrice ? formatPrice(Math.round(parseInt(formPrice, 10) * 0.90)) : '0 FCFA'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-3 border-t border-foreground/10 px-5 py-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Photos *</h3>
                    <p className="mt-0.5 text-xs text-foreground/50">Au moins une photo, format paysage recommandé.</p>
                  </div>

                  {photoError && (
                    <p className="text-xs text-rose-600">{photoError}</p>
                  )}

                  <div className="relative rounded-lg border border-dashed border-foreground/15 px-4 py-6 text-center transition-colors hover:border-foreground/35">
                    <input
                      type="file"
                      id="host-photo-upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="pointer-events-none flex flex-col items-center gap-1.5">
                      <FontAwesomeIcon icon={faUpload} className="h-4 w-4 text-foreground/40" />
                      <p className="text-sm text-foreground/75">Sélectionnez ou glissez-déposez vos photos</p>
                      <p className="text-xs text-foreground/40">JPG, PNG, WebP · 1920x1080 recommandé · 10 Mo max</p>
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
                              title="Supprimer cette photo"
                            >
                              <FontAwesomeIcon icon={faXmark} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {publishErrors.length > 0 && (
                  <div className="mx-5 mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                    <p className="font-semibold">Votre annonce n'est pas encore publiable. À corriger :</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {publishErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Validation */}
                <div className="flex flex-col-reverse gap-2 border-t border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('listings')}
                    className="rounded-lg px-3.5 py-2 text-xs font-medium text-foreground/60 hover:bg-muted hover:text-foreground"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={isCheckingListing}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isCheckingListing ? 'Vérification de la qualité…' : 'Publier l’annonce'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Motif du refus d'une annonce */}
          {selectedRejectionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-card">
                <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Motif du refus</h3>
                  <button
                    onClick={() => setSelectedRejectionModal(null)}
                    className="rounded-md p-1.5 text-foreground/45 hover:bg-muted hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3 px-5 py-4">
                  <p className="text-sm font-medium text-foreground">{selectedRejectionModal.title}</p>
                  <p className="text-sm leading-relaxed text-rose-600">
                    {selectedRejectionModal.rejection_reason || "Qualité des photos insuffisante ou non conforme à la charte d'excellence visuelle Bénin Beyond."}
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/50">
                    Reprenez des photos horizontales et lumineuses, en plein jour et sous plusieurs angles, puis soumettez à nouveau votre bien.
                  </p>
                </div>

                <div className="flex justify-end border-t border-foreground/10 px-5 py-3.5">
                  <button
                    onClick={() => setSelectedRejectionModal(null)}
                    className="rounded-lg border border-foreground/15 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION E : SOLDE & FINANCES (FINANCIALS & PAYOUTS) */}
          {/* ========================================================================= */}
          {currentSection === 'finances' && (
            <div className="space-y-6">
              {/* Onglets */}
              <div className="flex items-center gap-5 border-b border-foreground/10">
                {[
                  {
                    key: 'summary',
                    label: 'Synthèse',
                    onClick: () => {
                      setPayoutViewMode('summary');
                      setPayoutSuccessMessage('');
                      setPayoutError('');
                    }
                  },
                  {
                    key: 'form',
                    label: 'Demander un virement',
                    onClick: () => {
                      setPayoutViewMode('form');
                      setPayoutSuccessMessage('');
                      setPayoutError('');
                      if (!payoutAmount) setPayoutAmount(String(financials.available));
                    }
                  }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                      payoutViewMode === tab.key
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-foreground/50 hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {payoutSuccessMessage && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-foreground/10 bg-card px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Demande enregistrée</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">{payoutSuccessMessage}</p>
                  </div>
                  <button
                    onClick={() => setPayoutSuccessMessage('')}
                    className="shrink-0 rounded-md p-1.5 text-foreground/45 hover:bg-muted hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </div>
              )}

              {payoutError && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-foreground/10 bg-card px-5 py-3.5">
                  <p className="text-sm text-rose-600">{payoutError}</p>
                  <button
                    onClick={() => setPayoutError('')}
                    className="shrink-0 rounded-md p-1.5 text-foreground/45 hover:bg-muted hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Formulaire de demande de versement */}
              {payoutViewMode === 'form' && (
                <form onSubmit={handleRequestPayout} className="rounded-2xl border border-foreground/10 bg-card">
                  <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Nouvelle demande de versement</h3>
                      <p className="mt-0.5 text-xs text-foreground/50">Payée par l’équipe après vérification.</p>
                    </div>
                    <p className="text-sm text-foreground/60">
                      Disponible : <span className="font-semibold tabular-nums text-foreground">{formatPrice(financials.available)}</span>
                    </p>
                  </div>

                  {/* Canal */}
                  <div className="space-y-3 border-t border-foreground/10 px-5 py-5">
                    <h3 className="text-sm font-semibold text-foreground">Canal</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { key: 'mobile_money', label: 'Mobile Money', hint: 'MTN, Moov ou Celtiis' },
                        { key: 'bank_transfer', label: 'Virement bancaire', hint: 'IBAN / RIB' }
                      ].map((ch) => (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() => setPayoutChannel(ch.key)}
                          className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
                            payoutChannel === ch.key
                              ? 'border-foreground/60 bg-muted/40'
                              : 'border-foreground/10 hover:border-foreground/25'
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground">{ch.label}</p>
                          <p className="mt-0.5 text-xs text-foreground/50">{ch.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coordonnées */}
                  {payoutChannel === 'mobile_money' ? (
                    <div className="space-y-4 border-t border-foreground/10 px-5 py-5">
                      <h3 className="text-sm font-semibold text-foreground">Coordonnées Mobile Money</h3>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'mtn', label: 'MTN MoMo' },
                          { key: 'moov', label: 'Moov Money' },
                          { key: 'celtiis', label: 'Celtiis Cash' }
                        ].map((op) => (
                          <button
                            key={op.key}
                            type="button"
                            onClick={() => setMomoOperator(op.key)}
                            className={`rounded-lg border px-2 py-2.5 text-center text-xs transition-colors ${
                              momoOperator === op.key
                                ? 'border-foreground/60 bg-muted/40 font-medium text-foreground'
                                : 'border-foreground/10 text-foreground/60 hover:border-foreground/25'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Numéro (+229) *
                          </label>
                          <input
                            type="tel"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value)}
                            placeholder="+229 97 00 00 00"
                            required
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Titulaire de la ligne *
                          </label>
                          <input
                            type="text"
                            value={momoRecipientName}
                            onChange={(e) => setMomoRecipientName(e.target.value)}
                            placeholder="ex: Jean Dossou"
                            required
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                          <p className="mt-1 text-xs text-foreground/40">Nom enregistré sur la carte SIM</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 border-t border-foreground/10 px-5 py-5">
                      <h3 className="text-sm font-semibold text-foreground">Coordonnées bancaires</h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Banque *
                          </label>
                          <select
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          >
                            <option value="Bank of Africa (BOA Bénin)">Bank of Africa (BOA Bénin)</option>
                            <option value="Ecobank Bénin">Ecobank Bénin</option>
                            <option value="Coris Bank International Bénin">Coris Bank International Bénin</option>
                            <option value="BGFI Bank Bénin">BGFI Bank Bénin</option>
                            <option value="United Bank for Africa (UBA Bénin)">United Bank for Africa (UBA Bénin)</option>
                            <option value="Société Générale Bénin (SGB)">Société Générale Bénin (SGB)</option>
                            <option value="NSIA Banque Bénin">NSIA Banque Bénin</option>
                            <option value="Orabank Bénin">Orabank Bénin</option>
                            <option value="BIIC (Banque Internationale pour l'Industrie et le Commerce)">BIIC Bénin</option>
                            <option value="Autre banque">Autre banque UEMOA</option>
                          </select>
                        </div>

                        {bankName === 'Autre banque' && (
                          <div>
                            <label className="mb-1 block text-xs text-foreground/60">
                              Nom de la banque *
                            </label>
                            <input
                              type="text"
                              value={bankCustomName}
                              onChange={(e) => setBankCustomName(e.target.value)}
                              placeholder="Nom officiel de votre établissement"
                              required
                              className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                            />
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Titulaire du compte *
                          </label>
                          <input
                            type="text"
                            value={bankAccountHolder}
                            onChange={(e) => setBankAccountHolder(e.target.value)}
                            placeholder="ex: Jean Dossou ou SARL Prestige"
                            required
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Numéro de compte / IBAN / RIB *
                          </label>
                          <input
                            type="text"
                            value={bankIban}
                            onChange={(e) => setBankIban(e.target.value)}
                            placeholder="ex: BJ061 01001 00123456789 01"
                            required
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-foreground/60">
                            Code SWIFT / BIC (optionnel)
                          </label>
                          <input
                            type="text"
                            value={bankSwift}
                            onChange={(e) => setBankSwift(e.target.value)}
                            placeholder="ex: AFRIRJBJ"
                            className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-foreground/30 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Montant */}
                  <div className="space-y-3 border-t border-foreground/10 px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Montant (FCFA)</h3>
                      <div className="flex items-center gap-1">
                        {[
                          { label: 'Tout', value: financials.available },
                          { label: '50 %', value: Math.round(financials.available * 0.5) },
                          { label: '25 %', value: Math.round(financials.available * 0.25) }
                        ].map((q) => (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => setPayoutAmount(String(q.value))}
                            className="rounded-md px-2 py-1 text-xs font-medium text-foreground/55 transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder={String(financials.available || 100000)}
                      max={financials.available > 0 ? financials.available : undefined}
                      min={1000}
                      className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm tabular-nums text-foreground focus:border-foreground/30 focus:outline-none"
                    />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/60">Net viré sur votre compte</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatPrice(payoutAmount ? parseInt(payoutAmount, 10) : financials.available)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-2 border-t border-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setPayoutViewMode('summary')}
                      className="rounded-lg px-3.5 py-2 text-xs font-medium text-foreground/60 hover:bg-muted hover:text-foreground"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={payoutSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {payoutSubmitting && <FontAwesomeIcon icon={faSpinner} className="h-3 w-3 animate-spin" />}
                      <span>{payoutSubmitting ? 'Transmission…' : 'Valider la demande'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  { label: 'Encaissé (payé)', value: formatPrice(financials.gross), hint: 'Réservations payées par les voyageurs' },
                  { label: 'Commission (10 %)', value: financials.commission > 0 ? `−${formatPrice(financials.commission)}` : formatPrice(0), hint: 'Retenue Bénin Beyond' },
                  { label: 'Déjà versé', value: formatPrice(financials.paidOut), hint: financials.inProgress > 0 ? `${formatPrice(financials.inProgress)} en cours` : 'Virements exécutés' },
                  { label: 'Solde disponible', value: formatPrice(financials.available), hint: 'Retirable dès maintenant' }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              {/* Demandes de retrait */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Demandes de retrait</h3>
                  <span className="text-xs text-foreground/50">{partnerPayouts.length}</span>
                </div>

                {partnerPayouts.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-foreground/50">
                    Aucune demande de retrait pour le moment.
                  </p>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {partnerPayouts.map((po) => (
                      <li key={po.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{po.method}</p>
                          <p className="truncate text-xs text-foreground/45">
                            <span className="font-mono">{po.recipient}</span> · {po.date || (po.created_at ? new Date(po.created_at).toLocaleDateString('fr-FR') : 'Récemment')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums text-foreground">{formatPrice(po.amount)}</p>
                          <p className={`text-xs ${
                            po.status === 'completed' ? 'text-emerald-600' : po.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {po.status === 'completed' ? 'Virement exécuté' : po.status === 'rejected' ? 'Refusé' : po.status === 'processing' ? 'En cours de virement' : 'En attente'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Règlements par réservation */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <h3 className="border-b border-foreground/10 px-5 py-4 text-sm font-semibold text-foreground">Règlements par réservation</h3>
                {bookings.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-foreground/50">Aucun règlement pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-foreground/10 text-xs text-foreground/50">
                        <tr>
                          <th className="px-5 py-3 font-medium">Référence</th>
                          <th className="px-5 py-3 font-medium">Client</th>
                          <th className="px-5 py-3 font-medium">Canal</th>
                          <th className="px-5 py-3 font-medium">Brut</th>
                          <th className="px-5 py-3 font-medium">Commission</th>
                          <th className="px-5 py-3 font-medium">Net</th>
                          <th className="px-5 py-3 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/[0.07]">
                        {bookings.map((b) => (
                          <tr key={b.id}>
                            <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-foreground/70">{b.booking_ref}</td>
                            <td className="px-5 py-3 text-foreground">{b.customer_name}</td>
                            <td className="px-5 py-3 text-foreground/60">{formatPaymentMethod(b.payment_method)}</td>
                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground">{formatPrice(b.gross_amount)}</td>
                            <td className="whitespace-nowrap px-5 py-3 tabular-nums text-foreground/60">−{formatPrice(b.commission_amount)}</td>
                            <td className="whitespace-nowrap px-5 py-3 font-medium tabular-nums text-foreground">{formatPrice(b.net_amount)}</td>
                            <td className={`px-5 py-3 text-xs font-medium ${(b.payment_status || 'paid') === 'paid' && b.status !== 'cancelled' ? 'text-emerald-600' : 'text-amber-600'}`}>{b.status === 'cancelled' ? 'Annulée' : (b.payment_status || 'paid') === 'paid' ? 'Payée' : 'Non payée'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="text-xs text-foreground/45">
                Chaque demande est vérifiée puis payée manuellement par l'équipe Bénin Beyond (Mobile Money ou virement). Seules les réservations confirmées et payées sont comptées dans votre solde.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION F : STATISTIQUES & ANALYSES (PERFORMANCE RÉELLE) */}
          {/* ========================================================================= */}
          {currentSection === 'stats' && (
            <div className="space-y-6">
              {/* Chiffres clés */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 lg:grid-cols-4">
                {[
                  {
                    label: 'Annonces en ligne',
                    value: listings.filter((l) => !l.status || l.status === 'active').length,
                    hint: `${listings.length} au total`
                  },
                  {
                    label: 'Réservations payées',
                    value: bookings.filter((b) => !b.is_manual_block && (b.payment_status || 'paid') === 'paid' && b.status !== 'cancelled').length,
                    hint: `${bookings.filter((b) => !b.is_manual_block).length} reçue${bookings.filter((b) => !b.is_manual_block).length > 1 ? 's' : ''} au total`
                  },
                  {
                    label: 'Durée moyenne',
                    value: bookings.length > 0 ? `${avgStayDuration} j` : '0 j',
                    hint: bookings.length > 0 ? 'Sur vos réservations réelles' : 'En attente de réservations'
                  },
                  {
                    label: 'Revenu net',
                    value: formatPrice(financials.net),
                    hint: 'Réservations payées, commission déduite'
                  }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card p-5">
                    <p className="text-xs text-foreground/50">{kpi.label}</p>
                    <p className="mt-2 font-heading text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{kpi.value}</p>
                    <p className="mt-1 text-xs text-foreground/40">{kpi.hint}</p>
                  </div>
                ))}
              </div>

              {/* Biens les plus réservés */}
              <section className="rounded-2xl border border-foreground/10 bg-card">
                <div className="border-b border-foreground/10 px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Biens les plus réservés</h3>
                  <p className="mt-0.5 text-xs text-foreground/50">Classés selon le revenu net réellement généré.</p>
                </div>

                {topPartnerListings.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-foreground/50">Aucune réservation pour établir le classement.</p>
                    <p className="mx-auto mt-1 max-w-md text-xs text-foreground/40">
                      Le classement s’affichera dès vos premières réservations confirmées.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-foreground/[0.07]">
                    {topPartnerListings.map((top, i) => (
                      <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="w-5 shrink-0 text-sm tabular-nums text-foreground/35">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{top.title}</p>
                          <p className="text-xs text-foreground/45">
                            {top.type === 'stay' ? 'Hébergement' : 'Véhicule'} · {top.bookings} réservation{top.bookings > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatPrice(top.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL : DÉTAILS D'UNE RÉSERVATION CLIENT */}
      {/* ========================================================================= */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-foreground/10 shadow-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {selectedBookingModal.booking_ref}
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground mt-1">
                  Détail de la Réservation
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingModal(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Customer Contact Box */}
            <div className="p-4 rounded-2xl bg-muted/50 border border-foreground/5 flex items-center gap-4">
              <img
                src={selectedBookingModal.customer_avatar}
                alt={selectedBookingModal.customer_name}
                className="h-12 w-12 rounded-full object-cover border border-foreground/15"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{selectedBookingModal.customer_name}</p>
                <p className="text-xs text-foreground/60 flex items-center gap-1.5 mt-0.5">
                  <FontAwesomeIcon icon={faPhone} className="text-primary text-[10px]" />
                  <span>{selectedBookingModal.customer_phone}</span>
                </p>
                <p className="text-xs text-foreground/60 flex items-center gap-1.5 mt-0.5">
                  <FontAwesomeIcon icon={faEnvelope} className="text-primary text-[10px]" />
                  <span>{selectedBookingModal.customer_email}</span>
                </p>
              </div>
            </div>

            {/* Booked Listing Box */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-foreground/10 bg-background">
              <img
                src={selectedBookingModal.listing_image}
                alt={selectedBookingModal.listing_title}
                className="h-12 w-12 rounded-xl object-cover"
              />
              <div>
                <p className="font-bold text-xs text-foreground">{selectedBookingModal.listing_title}</p>
                <p className="text-[11px] text-foreground/60">{selectedBookingModal.location}</p>
                <p className="text-[11px] font-mono text-primary font-semibold mt-0.5">{selectedBookingModal.dates}</p>
              </div>
            </div>

            {/* Breakdown Price calculation */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-foreground/75">
                <span>Prix total brut payé par le client :</span>
                <span className="font-mono font-bold text-foreground">{formatPrice(selectedBookingModal.gross_amount)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground/60">
                <span>Commission plateforme (10%) :</span>
                <span className="font-mono text-accent">-{formatPrice(selectedBookingModal.commission_amount)}</span>
              </div>
              <div className="pt-2 border-t border-foreground/10 flex items-center justify-between text-sm font-bold text-primary">
                <span>Votre revenu net :</span>
                <span className="font-mono">{formatPrice(selectedBookingModal.net_amount)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://wa.me/${selectedBookingModal.customer_phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 transition-colors"
              >
                <FontAwesomeIcon icon={faPhone} />
                <span>WhatsApp Voyageur</span>
              </a>

              {selectedBookingModal.status === 'pending' ? (
                <button
                  onClick={() => handleConfirmBooking(selectedBookingModal.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Confirmer la réservation</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  Réservation confirmée
                </span>
              )}
            </div>

          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* 5. MODAL : APERÇU DU BIEN EN DIRECT (LIVE PREVIEW SANS QUITTER LE DASHBOARD) */}
      {/* ========================================================================= */}
      {previewListingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-card w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-foreground/15 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Aperçu Propriétaire
                </span>
                <h3 className="font-heading text-lg font-bold text-foreground truncate max-w-md">
                  {previewListingModal.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/listing/${previewListingModal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
                  title="Ouvrir dans un nouvel onglet"
                >
                  <span>Page publique</span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewListingModal(null)}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Media Gallery / Main Photo */}
              <div className="space-y-3">
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-neutral-900 shadow-md">
                  <img
                    src={previewListingModal.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80'}
                    alt={previewListingModal.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <span className="rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-accent uppercase border border-white/10">
                      {previewListingModal.type === 'stay' ? (previewListingModal.subcategory === 'hotel' ? 'Hôtel' : 'Hébergement') : 'Véhicule'}
                    </span>
                    {previewListingModal.status === 'pending' ? (
                      <span className="rounded-full bg-amber-500/90 text-white px-3 py-1 text-[11px] font-bold shadow">
                        {isPartnerCertified ? 'En cours de publication' : 'En attente de validation'}
                      </span>
                    ) : previewListingModal.status === 'refused' ? (
                      <span className="rounded-full bg-rose-600 text-white px-3 py-1 text-[11px] font-bold shadow">
                        Refusée
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-600/90 text-white px-3 py-1 text-[11px] font-bold shadow">
                        En ligne
                      </span>
                    )}
                  </div>

                  <div className="absolute right-4 bottom-4 rounded-xl bg-black/80 backdrop-blur-md px-3.5 py-1.5 text-right border border-white/10">
                    <p className="text-[10px] text-white/60 uppercase">Tarif par nuit / jour</p>
                    <p className="font-mono text-base font-bold text-accent">
                      {formatPrice(previewListingModal.price)}
                      <span className="text-xs font-normal text-white/70 ml-1">/ {previewListingModal.price_unit || 'nuit'}</span>
                    </p>
                  </div>
                </div>

                {/* Additional gallery thumbnails */}
                {previewListingModal.gallery && previewListingModal.gallery.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {previewListingModal.gallery.map((imgUrl, idx) => (
                      <img
                        key={idx}
                        src={imgUrl}
                        alt={`Photo ${idx + 1}`}
                        className="h-16 w-24 object-cover rounded-xl border border-foreground/10 shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Details & Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="font-heading text-lg font-bold text-foreground">
                      {previewListingModal.title}
                    </h4>
                    <p className="text-xs text-foreground/60 mt-1 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLocationDot} className="text-primary" />
                      <span>{previewListingModal.location}</span>
                    </p>
                  </div>

                  {previewListingModal.specs && (
                    <div className="rounded-2xl bg-muted/40 p-3.5 border border-foreground/5">
                      <p className="text-[11px] font-bold text-foreground/75 uppercase tracking-wider mb-1">
                        Caractéristiques & Équipements
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {previewListingModal.specs}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-bold text-foreground/75 uppercase tracking-wider mb-1">
                      Description du bien
                    </p>
                    <p className="text-xs text-foreground/75 whitespace-pre-line leading-relaxed">
                      {previewListingModal.description || 'Aucune description rédigée.'}
                    </p>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-4 space-y-3.5 text-xs">
                  <div>
                    <span className="text-foreground/50 block text-[10px] uppercase font-semibold">Identifiant</span>
                    <span className="font-mono text-[11px] text-foreground font-semibold truncate block">
                      {previewListingModal.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-foreground/50 block text-[10px] uppercase font-semibold">Mode d'annonce</span>
                    <span className="font-semibold text-foreground capitalize">
                      {previewListingModal.purpose === 'vente' ? 'Vente immobilière' : 'Location courte/moyenne durée'}
                    </span>
                  </div>

                  {previewListingModal.availability?.available_from && (
                    <div>
                      <span className="text-foreground/50 block text-[10px] uppercase font-semibold">Période de disponibilité</span>
                      <span className="font-medium text-foreground">
                        Du {previewListingModal.availability.available_from} au {previewListingModal.availability.available_to || 'Indéfini'}
                      </span>
                    </div>
                  )}

                  {previewListingModal.video_url && (
                    <div className="pt-3 border-t border-foreground/10">
                      <ListingVideoPlayer
                        videoUrl={previewListingModal.video_url}
                        poster={previewListingModal.gallery?.[0]}
                        title={previewListingModal.title}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm px-6 py-4 border-t border-foreground/10 flex items-center justify-between">
              <span className="text-[11px] text-foreground/50 hidden sm:inline">
                Aperçu instantané • Vos modifications sont sauvegardées dans votre espace
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const target = previewListingModal;
                    setPreviewListingModal(null);
                    handleOpenEditModal(target);
                  }}
                  className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  <FontAwesomeIcon icon={faPen} />
                  <span>Modifier l'annonce</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewListingModal(null)}
                  className="rounded-xl bg-muted px-4 py-2 text-xs font-bold text-foreground/80 hover:bg-muted/80 transition-colors"
                >
                  Fermer l'aperçu
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL : MOTIF DE REFUS D'UNE ANNONCE */}
      {/* ========================================================================= */}
      {selectedRejectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card w-full max-w-md rounded-3xl border border-rose-500/20 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600 font-bold text-sm">
                <div className="h-8 w-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                </div>
                <span>Motif de Refus de l'Annonce</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRejectionModal(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div>
              <h4 className="font-heading font-bold text-foreground text-sm">
                {selectedRejectionModal.title}
              </h4>
              <p className="text-xs text-foreground/60 mt-0.5">
                {selectedRejectionModal.location}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs space-y-2">
              <p className="font-semibold uppercase tracking-wider text-[10px] text-rose-600 dark:text-rose-400">
                Remarque transmise par les modérateurs :
              </p>
              <p className="leading-relaxed whitespace-pre-line font-medium">
                {selectedRejectionModal.rejection_reason ||
                  "Les photos transmises ne respectent pas le niveau de résolution requis ou les informations du bien nécessitent des précisions complémentaires."}
              </p>
            </div>

            <p className="text-[11px] text-foreground/65 leading-snug">
              Vous pouvez rectifier immédiatement votre annonce en modifiant le texte ou en ajoutant de nouvelles photos de qualité pour la remettre en ligne.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRejectionModal(null)}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedRejectionModal;
                  setSelectedRejectionModal(null);
                  handleOpenEditModal(target);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary/90 inline-flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPen} />
                <span>Modifier et corriger l'annonce</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL : MODIFIER UNE ANNONCE EXISTANTE (EDIT LISTING MODAL) */}
      {/* ========================================================================= */}
      {editingListingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-card w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-foreground/15 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-base shrink-0">
                  <FontAwesomeIcon icon={faPen} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Modification Propriétaire
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
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveListingEdit} className="p-6 space-y-6 flex-1">
              
              {/* Notifications / Alerts */}
              {editSuccessAlert && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-base" />
                  <span>{editSuccessAlert}</span>
                </div>
              )}

              {editPhotoError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  <span>{editPhotoError}</span>
                </div>
              )}

              {/* 1. Catégorie & Type */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block">
                  1. Catégorie & Mode de Transaction
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
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                        : 'border-foreground/15 bg-background text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <FontAwesomeIcon icon={faHouse} className="text-primary text-lg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground">Hébergement</p>
                      <p className="text-[10px] text-foreground/60 leading-snug">Villa, Appartement, Hôtel</p>
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
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                        : 'border-foreground/15 bg-background text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCar} className="text-primary text-lg shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground">Véhicule</p>
                      <p className="text-[10px] text-foreground/60 leading-snug">SUV, Berline, Minibus</p>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                      Sous-catégorie
                    </label>
                    <select
                      value={editFormSubcategory}
                      onChange={(e) => setEditFormSubcategory(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      {editFormType === 'stay' ? (
                        <>
                          <option value="villa">Villa de prestige</option>
                          <option value="hotel">Chambre d’Hôtel / Suite</option>
                          <option value="apartment">Appartement meublé</option>
                          <option value="penthouse">Penthouse avec vue</option>
                          <option value="guesthouse">Maison d’hôtes</option>
                          <option value="residence">Résidence privée</option>
                        </>
                      ) : (
                        <>
                          <option value="car">SUV & 4x4 de Luxe</option>
                          <option value="berline">Berline VIP</option>
                          <option value="van">Minibus Touristique</option>
                          <option value="pickup">Pick-up Premium</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                      Mode de mise à disposition
                    </label>
                    <select
                      value={editFormPurpose}
                      onChange={(e) => {
                        setEditFormPurpose(e.target.value);
                        if (e.target.value === 'vente') {
                          setEditFormPriceUnit('vente totale');
                        } else if (editFormPriceUnit === 'vente totale') {
                          setEditFormPriceUnit(editFormType === 'drive' ? 'jour' : 'nuit');
                        }
                      }}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="location">Location courte ou moyenne durée</option>
                      <option value="vente">Vente définitive du bien</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Titre & Emplacement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    Titre de l'annonce *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormTitle}
                    onChange={(e) => setEditFormTitle(e.target.value)}
                    placeholder="ex: Villa Royale Cotonou Haie Vive"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    Ville, Quartier ou Adresse *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormLocation}
                    onChange={(e) => setEditFormLocation(e.target.value)}
                    placeholder="ex: Cotonou, Haie Vive"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Tarification & Revenus */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Tarification
                  </span>
                  <span className="text-[11px] text-accent font-semibold bg-accent/15 px-2 py-0.5 rounded-full">
                    Commission plateforme : 10%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                      Prix affiché (FCFA) * <span className="text-[10px] text-foreground/50 font-normal">(Min. 1 000 FCFA)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={editFormPrice}
                      onChange={(e) => setEditFormPrice(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                      Unité tarifaire
                    </label>
                    <select
                      value={editFormPriceUnit}
                      onChange={(e) => setEditFormPriceUnit(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      {editFormPurpose === 'vente' ? (
                        <option value="vente totale">Vente totale</option>
                      ) : editFormType === 'stay' ? (
                        <>
                          <option value="nuit">Par nuit</option>
                          <option value="semaine">Par semaine</option>
                          <option value="mois">Par mois</option>
                        </>
                      ) : (
                        <>
                          <option value="jour">Par jour</option>
                          <option value="semaine">Par semaine</option>
                          <option value="mois">Par mois</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="bg-card p-2 rounded-xl border border-foreground/10 flex flex-col justify-center">
                    <p className="text-[10px] text-foreground/60">Votre revenu net :</p>
                    <p className="font-heading text-sm font-bold text-primary font-mono">
                      {editFormPrice ? formatPrice(Math.round(parseInt(editFormPrice, 10) * 0.90)) : '0 FCFA'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Capacité & Spécifications */}
              {editFormType === 'stay' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Chambres / Pièces *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editFormRoomsCount}
                      onChange={(e) => setEditFormRoomsCount(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Disponible à partir du
                    </label>
                    <input
                      type="date"
                      value={editFormAvailableFrom}
                      onChange={(e) => setEditFormAvailableFrom(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Disponible jusqu'au
                    </label>
                    <input
                      type="date"
                      value={editFormAvailableTo}
                      onChange={(e) => setEditFormAvailableTo(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-primary/5 p-3 rounded-2xl border border-primary/20">
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Places assises *
                    </label>
                    <select
                      value={editFormSeatsCount}
                      onChange={(e) => setEditFormSeatsCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value={2}>2 places</option>
                      <option value={4}>4 places</option>
                      <option value={5}>5 places</option>
                      <option value={7}>7 places</option>
                      <option value={9}>9 places</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Boîte de vitesse
                    </label>
                    <select
                      value={editFormTransmission}
                      onChange={(e) => setEditFormTransmission(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="automatique">Automatique</option>
                      <option value="manuelle">Manuelle</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Carburant
                    </label>
                    <select
                      value={editFormFuelType}
                      onChange={(e) => setEditFormFuelType(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="essence">Essence</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybride">Hybride</option>
                      <option value="electrique">100% Électrique</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Chauffeur VIP
                    </label>
                    <select
                      value={editFormWithDriver ? 'yes' : 'no'}
                      onChange={(e) => setEditFormWithDriver(e.target.value === 'yes')}
                      className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="no">Sans chauffeur</option>
                      <option value="yes">Avec chauffeur</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. Galerie Photos */}
              <div className="space-y-3 pt-2 border-t border-foreground/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                      3. Photos Haute Définition ({editUploadedPhotos.length})
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Gérez les photos de votre bien. La première photo est la photo de couverture principale.
                    </p>
                  </div>
                </div>

                {/* Grille des photos existantes */}
                {editUploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {editUploadedPhotos.map((photo, index) => (
                      <div
                        key={index}
                        className={`group relative aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all ${
                          index === 0
                            ? 'border-accent ring-2 ring-accent/40'
                            : 'border-foreground/10 hover:border-foreground/30'
                        }`}
                      >
                        <img src={photo} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />

                        {index === 0 ? (
                          <span className="absolute top-1.5 left-1.5 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
                            ★ Couverture
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditSetFeaturedPhoto(index)}
                            className="absolute top-1.5 left-1.5 bg-black/70 hover:bg-black text-white text-[9px] font-semibold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Mettre couverture
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEditRemovePhoto(index)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors"
                          title="Supprimer cette photo"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload de nouvelles photos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-4 text-center transition-colors bg-muted/10 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      id="edit-photo-upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditPhotoUpload}
                      disabled={editIsCompressingPhotos}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <FontAwesomeIcon icon={faUpload} className="text-primary text-base mb-1" />
                    <span className="text-xs font-semibold text-foreground">
                      {editIsCompressingPhotos ? 'Compression en cours…' : 'Ajouter des photos'}
                    </span>
                    <span className="text-[10px] text-foreground/50">Depuis votre appareil (JPG, PNG, WebP)</span>
                  </div>

                  <div className="flex flex-col justify-center space-y-2">
                    <label className="text-[11px] font-semibold text-foreground/70">Ou ajouter via un lien web direct :</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={editPhotoUrlInput}
                        onChange={(e) => setEditPhotoUrlInput(e.target.value)}
                        className="flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleEditAddPhotoUrl}
                        className="rounded-xl bg-muted px-3 py-2 text-xs font-bold text-foreground hover:bg-muted/80"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Caractéristiques & Description */}
              <div className="space-y-4 pt-2 border-t border-foreground/10">
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    {editFormType === 'drive'
                      ? 'Caractéristiques & Options du Véhicule (séparées par des virgules)'
                      : 'Équipements & Prestations de l\'Hébergement (séparés par des virgules)'}
                  </label>
                  <input
                    type="text"
                    value={editFormSpecs}
                    onChange={(e) => setEditFormSpecs(e.target.value)}
                    placeholder={
                      editFormType === 'drive'
                        ? 'Climatisation, Boîte automatique, GPS, Bluetooth, Caméra de recul'
                        : 'Wi-Fi Fibre, Climatisation, Groupe électrogène, Sécurité 24/7'
                    }
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {/* Suggestions rapides */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-foreground/50 self-center mr-1">Ajouter rapidement :</span>
                    {(editFormType === 'drive'
                      ? [
                          'Boîte automatique',
                          'Climatisation',
                          'GPS Intégré',
                          'Bluetooth',
                          'Caméra de recul',
                          'Sièges en cuir',
                          '4x4 / Tout-terrain',
                          'Chauffeur inclus',
                          'Régulateur de vitesse',
                          'Toit panoramique'
                        ]
                      : [
                          'Piscine privée',
                          'Wi-Fi Fibre',
                          'Climatisation',
                          'Groupe électrogène',
                          'Sécurité 24/7',
                          'Cuisine équipée',
                          'Vue mer',
                          'Parking privé',
                          'Terrasse aménagée'
                        ]
                    ).map((tag, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => {
                          const current = editFormSpecs ? editFormSpecs.split(',').map((s) => s.trim()).filter(Boolean) : [];
                          if (!current.includes(tag)) {
                            setEditFormSpecs([...current, tag].join(', '));
                          }
                        }}
                        className="rounded-full border border-foreground/10 bg-muted/40 hover:bg-primary/10 hover:border-primary/30 px-2.5 py-0.5 text-[10px] font-medium text-foreground/75 hover:text-primary transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    Description détaillée du bien
                  </label>
                  <textarea
                    rows={4}
                    value={editFormDescription}
                    onChange={(e) => setEditFormDescription(e.target.value)}
                    placeholder="Décrivez avec précision votre hébergement ou véhicule..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer (Sticky in form) */}
              <div className="sticky bottom-0 -mx-6 -mb-6 bg-card/95 backdrop-blur-md px-6 py-4 border-t border-foreground/10 flex items-center justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setEditingListingModal(null)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-muted transition-colors"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={editIsSaving}
                  className="rounded-xl bg-primary px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {editIsSaving ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                      <span>Enregistrement en cours…</span>
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
      {/* 8. MODAL DÉTAILS DE LA RÉSERVATION CLIENT */}
      {/* ========================================================================= */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn print-friendly">
          <div className="printable-receipt relative w-full max-w-lg rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FontAwesomeIcon icon={faReceipt} className="text-base" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Détails de la Réservation
                  </h3>
                  <p className="text-[11px] font-mono text-primary font-bold">
                    Réf. {selectedBookingModal.booking_ref}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingModal(null)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground no-print"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {/* Client Identity Card */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-foreground/10 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                Informations du Voyageur
              </p>
              <div className="flex items-center gap-3">
                <img
                  src={selectedBookingModal.customer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBookingModal.customer_name || 'Client')}&background=0D8ABC&color=fff`}
                  alt={selectedBookingModal.customer_name}
                  className="h-12 w-12 rounded-full object-cover border border-foreground/10 shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">
                    {selectedBookingModal.customer_name}
                  </p>
                  <p className="text-xs text-foreground/70 flex items-center gap-1.5 mt-0.5">
                    <FontAwesomeIcon icon={faPhone} className="text-[10px] text-primary" />
                    <span>{selectedBookingModal.customer_phone || 'Non renseigné'}</span>
                  </p>
                  <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                    <FontAwesomeIcon icon={faEnvelope} className="text-[10px] text-primary" />
                    <span className="truncate">{selectedBookingModal.customer_email || 'Non renseigné'}</span>
                  </p>
                </div>
              </div>

              {selectedBookingModal.customer_phone && (
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`tel:${selectedBookingModal.customer_phone}`}
                    className="flex-1 text-center rounded-xl bg-primary/10 hover:bg-primary/20 text-primary py-2 text-xs font-semibold transition-colors"
                  >
                    <FontAwesomeIcon icon={faPhone} className="mr-1.5" />
                    Appeler le client
                  </a>
                  <a
                    href={`https://wa.me/${selectedBookingModal.customer_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 py-2 text-xs font-semibold transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </div>

            {/* Listing & Stay Details */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-foreground/10 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/50">
                Bien Réservé & Période
              </p>
              <div className="flex items-center gap-3">
                {selectedBookingModal.listing_image && (
                  <img
                    src={selectedBookingModal.listing_image}
                    alt={selectedBookingModal.listing_title}
                    className="h-12 w-16 rounded-xl object-cover border border-foreground/10 shrink-0"
                  />
                )}
                <div>
                  <p className="font-bold text-foreground text-xs line-clamp-1">
                    {selectedBookingModal.listing_title}
                  </p>
                  <p className="text-[11px] text-foreground/60 flex items-center gap-1">
                    <FontAwesomeIcon icon={faLocationDot} className="text-[10px] text-primary" />
                    <span>{selectedBookingModal.location}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-foreground/10 text-xs">
                <div>
                  <span className="text-[10px] text-foreground/50 block">Période réservée</span>
                  <span className="font-semibold text-foreground">{selectedBookingModal.dates}</span>
                </div>
                <div>
                  <span className="text-[10px] text-foreground/50 block">Nombre de voyageurs</span>
                  <span className="font-semibold text-foreground">{selectedBookingModal.guests}</span>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="p-4 rounded-2xl bg-card border border-foreground/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground/60">Prix Brut Payé par le Voyageur :</span>
                <span className="font-bold text-foreground font-mono">{formatPrice(selectedBookingModal.gross_amount)}</span>
              </div>
              <div className="flex justify-between text-foreground/60">
                <span>Commission Plateforme (10%) :</span>
                <span className="font-mono">-{formatPrice(selectedBookingModal.commission_amount)}</span>
              </div>
              <div className="flex justify-between text-primary font-bold text-sm pt-2 border-t border-foreground/10">
                <span>Votre Revenu Net (90%) :</span>
                <span className="font-mono text-base">{formatPrice(selectedBookingModal.net_amount)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-foreground/50 pt-1">
                <span>Mode de Paiement :</span>
                <span>{formatPaymentMethod(selectedBookingModal.payment_method)}</span>
              </div>
            </div>

            {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 no-print">
                <button
                  type="button"
                  onClick={() => printInvoiceDocument(selectedBookingModal, { name: selectedBookingModal.customer_name, email: selectedBookingModal.customer_email, phone: selectedBookingModal.customer_phone }, { role: 'partner' })}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <FontAwesomeIcon icon={faPrint} className="h-3 w-3" />
                  <span>Imprimer Reçu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBookingModal(null)}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow"
                >
                  Fermer
                </button>
              </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : BLOQUER DES DATES / RÉSERVATION PHYSIQUE EN DIRECT */}
      {/* ========================================================================= */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-card w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-foreground/15 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faCalendarDays} className="text-primary" />
                  <span>Bloquer des dates / Réservation physique</span>
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  Verrouillez l'accès pour un client direct ou une indisponibilité
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-foreground/50 hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBlockDates} className="p-6 space-y-4">
              {blockErrorAlert && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleExclamation} className="shrink-0" />
                  <span>{blockErrorAlert}</span>
                </div>
              )}

              {/* Bien concerné */}
              <div>
                <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                  Sélectionner le bien ou véhicule concerné *
                </label>
                <select
                  value={blockListingId}
                  onChange={(e) => setBlockListingId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                >
                  <option value="">-- Choisissez un bien --</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} — {l.location} ({formatPrice(l.price)}/{l.price_unit || 'j'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Motif du blocage */}
              <div>
                <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                  Motif du blocage *
                </label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                >
                  <option value="Réservation physique / Client en direct">
                    Réservation physique / Client en direct (hors plateforme)
                  </option>
                  <option value="Indisponibilité temporaire (Travaux / Rénovation)">
                    Indisponibilité temporaire (Travaux, rénovation ou entretien)
                  </option>
                  <option value="Usage personnel du propriétaire">
                    Usage personnel du propriétaire
                  </option>
                  <option value="Autre indisponibilité">
                    Autre motif d'indisponibilité
                  </option>
                </select>
              </div>

              {/* Dates début et fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                    Date de début (Arrivée) *
                  </label>
                  <input
                    type="date"
                    value={blockStartDate}
                    onChange={(e) => setBlockStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                    Date de fin (Départ) *
                  </label>
                  <input
                    type="date"
                    value={blockEndDate}
                    min={blockStartDate}
                    onChange={(e) => setBlockEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              {/* Client physique infos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                    Nom du client physique
                  </label>
                  <input
                    type="text"
                    placeholder="ex: M. Roland Koffi"
                    value={blockCustomerName}
                    onChange={(e) => setBlockCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                    Téléphone du client (optionnel)
                  </label>
                  <input
                    type="tel"
                    placeholder="ex: +229 97 00 00 00"
                    value={blockCustomerPhone}
                    onChange={(e) => setBlockCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Note / Commentaire */}
              <div>
                <label className="caption text-foreground/70 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                  Notes ou observations (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Acompte remis en espèces, remise des clés effectuée en main propre..."
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* Reassurance Info Banner */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-amber-600" />
                  <span>Verrouillage anti-doublon en ligne</span>
                </div>
                <p className="text-[11px] leading-relaxed text-foreground/80">
                  Dès l'enregistrement, ce bien sera marqué comme <strong>déjà réservé</strong> du <strong>{blockStartDate}</strong> au <strong>{blockEndDate}</strong>. Les voyageurs sur le site ne pourront pas réserver cet intervalle, mais pourront continuer à réserver librement pour toute date ultérieure.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-foreground/10">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                >
                  {isSubmittingBlock ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                      <span>Verrouillage en cours...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faBan} className="text-xs" />
                      <span>Bloquer l'accès pour ces dates</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
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
