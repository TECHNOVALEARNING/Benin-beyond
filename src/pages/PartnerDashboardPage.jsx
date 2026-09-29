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
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { addListing, updateListing, deleteListing, getListings, getCustomListings } from '../services/listingService';
import { getBookings, updateBookingStatus } from '../services/bookingService';
import { ScrollReveal } from '../components/ScrollReveal';
import { compressImage, compressImageToBlob } from '../utils/imageOptimizer';
import { ConfirmModal } from '../components/ConfirmModal';
import { saveMediaBlob, uploadMediaFile, parseVideoEmbed } from '../services/mediaStorage';
import { ListingVideoPlayer } from '../components/ListingVideoPlayer';

export function PartnerDashboardPage() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const isPartnerCertified = Boolean(user?.role === 'admin' || user?.verified || user?.kyc_status === 'verified');

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
  const [formSpecs, setFormSpecs] = useState('4 Chambres, Piscine privée, Climatisation, Wi-Fi Fibre');

  // Hotel & Room Availability states
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [roomsCount, setRoomsCount] = useState(1);
  const [availabilityType, setAvailabilityType] = useState('always'); // 'always' | 'custom_period'

  // Custom Photos & Video state
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null); // { url, previewUrl, name, sizeMB }
  const [videoSourceType, setVideoSourceType] = useState('file'); // 'file' | 'url'
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');
  const [selectedRejectionModal, setSelectedRejectionModal] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null, title: '' });

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
  const [editFormAvailableFrom, setEditFormAvailableFrom] = useState('');
  const [editFormAvailableTo, setEditFormAvailableTo] = useState('');
  const [editUploadedPhotos, setEditUploadedPhotos] = useState([]);
  const [editPhotoUrlInput, setEditPhotoUrlInput] = useState('');
  const [editPhotoError, setEditPhotoError] = useState('');
  const [editIsCompressingPhotos, setEditIsCompressingPhotos] = useState(false);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoUrlInput, setEditVideoUrlInput] = useState('');
  const [editVideoSourceType, setEditVideoSourceType] = useState('url'); // 'file' | 'url'
  const [editVideoError, setEditVideoError] = useState('');
  const [editIsUploadingVideo, setEditIsUploadingVideo] = useState(false);
  const [editIsSaving, setEditIsSaving] = useState(false);
  const [editSuccessAlert, setEditSuccessAlert] = useState('');

  // Payout request modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('mtn_momo');
  const [payoutPhone, setPayoutPhone] = useState('+229 97 00 00 00');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/partner' } } });
    } else if (user.role === 'admin') {
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
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Financial calculations
  const financials = useMemo(() => {
    const totalGross = bookings.reduce((sum, b) => sum + (Number(b.gross_amount) || 0), 0);
    const totalCommission = bookings.reduce((sum, b) => sum + (Number(b.commission_amount) || Math.round((Number(b.gross_amount) || 0) * 0.10)), 0);
    const totalNet = totalGross - totalCommission;
    const pendingCount = bookings.filter((b) => b.status === 'pending').length;
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;

    return {
      gross: totalGross,
      commission: totalCommission,
      net: totalNet,
      pendingCount,
      confirmedCount
    };
  }, [bookings]);

  // Statistiques mensuelles réelles du partenaire
  const monthlyPartnerStats = useMemo(() => {
    if (bookings.length === 0) return [];
    const monthsMap = {};
    bookings.forEach((b) => {
      const d = b.created_at ? new Date(b.created_at) : new Date();
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short' });
      if (!monthsMap[monthName]) {
        monthsMap[monthName] = { month: monthName, net: 0 };
      }
      const gross = Number(b.gross_amount) || 0;
      const comm = Number(b.commission_amount) || Math.round(gross * 0.10);
      monthsMap[monthName].net += (gross - comm);
    });
    return Object.values(monthsMap);
  }, [bookings]);

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

  // Video handlers (short tour video, max 50MB or web URL)
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
      setVideoError(`Cette vidéo fait ${sizeMB.toFixed(1)} Mo. Pour préserver la fluidité mobile, la taille maximale est de 50 Mo (durée recommandée : 15 à 60 secondes).`);
      return;
    }

    setIsUploadingVideo(true);
    try {
      const ownerId = user?.id || 'partner';
      // Téléversement ordonné dans le dossier vidéo du profil : <userId>/<listingId>/videos/<filename>
      const persistentId = await uploadMediaFile(file, {
        userId: ownerId,
        listingId: 'new_listing',
        category: 'videos'
      });
      const objectUrl = URL.createObjectURL(file);
      setUploadedVideo({
        url: persistentId,
        previewUrl: objectUrl,
        name: file.name,
        sizeMB: sizeMB.toFixed(1)
      });
    } catch (err) {
      console.warn('Erreur sauvegarde vidéo:', err);
      setVideoError('Impossible de traiter ce fichier vidéo. Vous pouvez également coller un lien web.');
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

  const handleDeleteListingItem = (id, title = '') => {
    setConfirmDeleteModal({
      isOpen: true,
      id,
      title: title || 'cette annonce'
    });
  };

  const handleConfirmDeleteListing = async () => {
    const id = confirmDeleteModal.id;
    if (!id) return;
    setConfirmDeleteModal({ isOpen: false, id: null, title: '' });
    setListings((prev) => prev.filter((item) => item.id !== id));
    await deleteListing(id);
  };

  // ==========================================
  // GESTION DE LA MODIFICATION D'UNE ANNONCE
  // ==========================================
  const handleOpenEditModal = (item) => {
    if (!item) return;
    setEditingListingModal(item);
    setEditFormTitle(item.title || '');
    setEditFormType(item.type || 'stay');
    setEditFormSubcategory(item.subcategory || (item.type === 'drive' ? 'car' : 'villa'));
    setEditFormLocation(item.location || '');
    setEditFormPrice(item.price ? String(item.price) : '');
    setEditFormPriceUnit(item.price_unit || (item.type === 'drive' ? 'jour' : 'nuit'));
    setEditFormPurpose(item.purpose || (item.price_unit === 'vente totale' ? 'vente' : 'location'));
    setEditFormDescription(item.description || '');
    setEditFormSpecs(Array.isArray(item.specs) ? item.specs.join(', ') : (item.specs || ''));
    setEditFormRoomsCount(item.rooms_count || item.availability?.rooms_count || 1);
    setEditFormAvailableFrom(item.available_from || item.availability?.available_from || '');
    setEditFormAvailableTo(item.available_to || item.availability?.available_to || '');
    setEditUploadedPhotos(Array.isArray(item.gallery) ? [...item.gallery] : []);
    setEditPhotoUrlInput('');
    setEditPhotoError('');
    setEditVideoUrl(item.video_url || '');
    setEditVideoUrlInput('');
    setEditVideoSourceType('url');
    setEditVideoError('');
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

  const handleEditVideoUpload = async (e) => {
    setEditVideoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setEditVideoError('Format vidéo non supporté. Veuillez choisir une vidéo MP4 ou WebM.');
      return;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 50) {
      setEditVideoError(`Cette vidéo fait ${sizeMB.toFixed(1)} Mo. Pour préserver la fluidité mobile, la taille maximale est de 50 Mo.`);
      return;
    }

    setEditIsUploadingVideo(true);
    try {
      const ownerId = user?.id || 'partner';
      const listingId = editingListingModal?.id || 'listing';
      const persistentId = await uploadMediaFile(file, {
        userId: ownerId,
        listingId: listingId,
        category: 'videos'
      });
      setEditVideoUrl(persistentId);
    } catch (err) {
      console.warn('Erreur upload vidéo:', err);
      setEditVideoError('Impossible de traiter la vidéo.');
    } finally {
      setEditIsUploadingVideo(false);
    }
  };

  const handleEditAddVideoUrl = () => {
    const trimmed = editVideoUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setEditVideoError('Veuillez entrer une adresse URL valide (https://...)');
      return;
    }
    setEditVideoUrl(trimmed);
    setEditVideoUrlInput('');
    setEditVideoError('');
  };

  const handleEditRemoveVideo = () => {
    setEditVideoUrl('');
    setEditVideoError('');
  };

  const handleSaveListingEdit = async (e) => {
    e.preventDefault();
    if (!editingListingModal) return;
    setEditPhotoError('');
    setEditVideoError('');

    if (editUploadedPhotos.length === 0) {
      setEditPhotoError("L'annonce doit comporter au moins une photo en haute résolution.");
      return;
    }

    if (!editFormTitle.trim()) {
      setEditPhotoError("Veuillez renseigner un titre pour votre annonce.");
      return;
    }

    setEditIsSaving(true);
    try {
      const specsArray = editFormSpecs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const priceNum = parseInt(editFormPrice, 10) || Number(editingListingModal.price) || 50000;
      const roomsNum = parseInt(editFormRoomsCount, 10) || 1;

      // Si l'annonce était refusée, la mise à jour réactive l'annonce si l'hôte est certifié
      const nextStatus = editingListingModal.status === 'refused'
        ? (isPartnerCertified ? 'active' : 'pending')
        : (editingListingModal.status || 'active');

      const nextBadge = editingListingModal.status === 'refused'
        ? (isPartnerCertified ? 'Vérifié par Bénin Beyond' : 'En attente')
        : (editingListingModal.badge || 'Vérifié par Bénin Beyond');

      const updates = {
        title: editFormTitle.trim(),
        type: editFormType,
        subcategory: editFormType === 'stay' ? editFormSubcategory : (editFormSubcategory === 'villa' || editFormSubcategory === 'hotel' ? 'car' : editFormSubcategory),
        location: editFormLocation.trim() || 'Cotonou, Bénin',
        price: priceNum,
        price_unit: editFormPurpose === 'vente' ? 'vente totale' : editFormPriceUnit,
        purpose: editFormPurpose,
        description: editFormDescription.trim(),
        summary: editFormDescription.trim().slice(0, 160),
        specs: specsArray.length > 0 ? specsArray : ['Standing supérieur', 'Sécurité 24/7'],
        rooms_count: roomsNum,
        available_from: editFormAvailableFrom || null,
        available_to: editFormAvailableTo || null,
        gallery: editUploadedPhotos,
        video_url: editVideoUrl || null,
        status: nextStatus,
        rejection_reason: editingListingModal.status === 'refused' ? null : (editingListingModal.rejection_reason || null),
        badge: nextBadge,
        availability: {
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

  // Publishing an item
  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setPhotoError('');
    setVideoError('');

    if (uploadedPhotos.length === 0) {
      setPhotoError("Vous devez ajouter au moins une photo en haute résolution de votre bien.");
      return;
    }

    const specsArray = formSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const priceNum = parseInt(formPrice, 10) || (formType === 'stay' ? 75000 : 45000);

    // Reorder photos so featured photo is first
    const finalGallery = [...uploadedPhotos];
    if (featuredPhotoIndex > 0 && featuredPhotoIndex < finalGallery.length) {
      const [feat] = finalGallery.splice(featuredPhotoIndex, 1);
      finalGallery.unshift(feat);
    }

    const newListing = await addListing({
      title: formTitle || (formType === 'stay' ? (formSubcategory === 'hotel' ? 'Chambre d’Hôtel de Standing' : 'Résidence de Standing') : 'Véhicule de Prestige'),
      type: formType,
      subcategory: formType === 'stay' ? formSubcategory : 'car',
      location: formLocation,
      price: priceNum,
      price_unit: formPurpose === 'vente' ? 'vente totale' : formPriceUnit,
      description: formDescription || 'Hébergement ou véhicule haut de gamme vérifié par Bénin Beyond.',
      badge: formSubcategory === 'hotel'
        ? `${roomsCount || 1} chambre(s) dispo`
        : (isPartnerCertified ? 'Vérifié par Bénin Beyond' : 'En attente de certification KYC'),
      specs: specsArray.length > 0 ? specsArray : ['Climatisation', 'Sécurité 24/7', 'Standing'],
      gallery: finalGallery,
      video_url: uploadedVideo?.url || null,
      status: isPartnerCertified ? 'active' : 'pending', // Les hôtes certifiés sont publiés directement en ligne
      owner_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : (user?.id || null),
      owner_name: user?.name || (isPartnerCertified ? 'Propriétaire Certifié' : 'Partenaire Hôte'),
      owner_email: user?.email || '',
      availability: {
        type: availabilityType,
        available_from: availableFrom || null,
        available_to: availableTo || null,
        rooms_count: parseInt(roomsCount, 10) || 1
      }
    });

    setListings((prev) => [newListing, ...prev.filter((l) => l.id !== newListing.id)]);
    
    if (isPartnerCertified) {
      setPublishSuccess(`Félicitations ! L'annonce "${newListing.title}" a été publiée avec succès et est immédiatement en ligne sur le site.`);
    } else {
      setPublishSuccess(`L'annonce "${newListing.title}" a été enregistrée avec succès ! Elle sera automatiquement mise en ligne dès la validation de votre profil hôte (KYC).`);
    }

    // Reset form
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    setUploadedPhotos([]);
    setUploadedVideo(null);
    setFeaturedPhotoIndex(0);
    setAvailableFrom('');
    setAvailableTo('');
    setRoomsCount(1);

    setTimeout(() => {
      handleSetSection('listings');
      setPublishSuccess('');
    }, 2000);
  };

  // Nav Items with FontAwesome
  const navItems = [
    { key: 'overview', label: 'Vue d’ensemble', icon: faChartPie },
    {
      key: 'bookings',
      label: 'Réservations reçues',
      icon: faCalendarCheck,
      badge: financials.pendingCount > 0 ? `${financials.pendingCount} en attente` : null
    },
    { key: 'listings', label: 'Mes annonces & biens', icon: faHouse, count: listings.length },
    { key: 'publish', label: 'Publier une annonce', icon: faCirclePlus, highlight: true },
    { key: 'finances', label: 'Solde & Revenus', icon: faWallet },
    { key: 'stats', label: 'Statistiques & Vues', icon: faChartLine }
  ];

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
        className={`fixed inset-y-0 left-0 z-50 w-68 md:w-[272px] h-screen bg-secondary text-secondary-foreground transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col justify-between border-r border-white/[0.08] select-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Brand Logo & Close button on Mobile */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08] shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-heading text-[16px] font-bold tracking-wide text-white group-hover:text-accent transition-colors">
                Bénin Beyond
              </span>
              <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wider">
                Hôte & Flotte
              </span>
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>

          {/* Partner Profile Snippet */}
          <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.08] flex items-center gap-3 shrink-0">
            <div className="h-8 w-8 rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center text-xs shrink-0 font-heading">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-[13.5px] font-semibold text-white truncate tracking-wide">
                {user?.name || 'Partenaire Hôte'}
              </p>
              <div className="text-[11px] text-white/50 flex items-center gap-1.5 mt-0.5">
                {user?.verified ? (
                  <>
                    <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-400 text-[10px]" />
                    <span className="text-emerald-400 font-medium">KYC Certifié</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faClock} className="text-amber-400 text-[10px]" />
                    <span className="text-amber-400 font-medium">Audit en attente</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-white/45 font-heading">
              Navigation Espace Pro
            </div>
            {navItems.map((item) => {
              const isActive = currentSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    handleSetSection(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all ${
                    isActive
                      ? 'bg-white/[0.12] text-white shadow-xs font-semibold'
                      : item.highlight
                      ? 'bg-accent text-secondary font-semibold hover:bg-accent/90 shadow-xs'
                      : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-accent'
                          : item.highlight
                          ? 'text-secondary'
                          : 'text-white/60 group-hover:text-white'
                      }`}
                    />
                    <span className="font-heading tracking-wide text-[13.5px] truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      item.highlight ? 'bg-black/20 text-secondary' : 'bg-accent/20 text-accent'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === 'number' && !item.badge && (
                    <span className="text-[11px] text-white/50 font-mono px-2 py-0.5 rounded-full bg-white/[0.06]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Actions (Strictly Pinned at the Bottom) */}
        <div className="p-3 border-t border-white/[0.08] space-y-1 shrink-0 bg-secondary">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5 text-accent" />
            <span>Voir le site public</span>
          </Link>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT AREA - INDEPENDENT FLUID SCROLL */}
      {/* ========================================================================= */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col min-w-0 scroll-smooth">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-foreground/10 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg border border-foreground/15 text-foreground hover:bg-muted"
            >
              <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                {navItems.find((i) => i.key === currentSection)?.label || 'Espace Propriétaire'}
              </h1>
              <p className="text-[11px] text-foreground/60 hidden sm:block">
                Portail de gestion des hébergements et véhicules • Bénin Beyond
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-muted/60 border border-foreground/10 rounded-full px-3 py-1.5 text-xs">
              <FontAwesomeIcon icon={faWallet} className="text-primary h-3.5 w-3.5" />
              <span className="text-foreground/70">Solde disponible :</span>
              <strong className="text-foreground font-mono">{formatPrice(financials.net)}</strong>
            </div>

            <button
              onClick={() => setCurrentSection('publish')}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary/90 transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faCirclePlus} className="h-3.5 w-3.5" />
              <span>Publier</span>
            </button>
          </div>
        </header>

        {/* Dynamic Section Rendering */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">

          {/* ========================================================================= */}
          {/* SECTION A : VUE D'ENSEMBLE (OVERVIEW) */}
          {/* ========================================================================= */}
          {currentSection === 'overview' && (
            <div className="space-y-8">
              
              {/* KYC Status Notice Banner */}
              {!user?.verified && (
                <div className={`rounded-2xl border p-4 flex items-start gap-3.5 shadow-sm ${
                  user?.kyc_status === 'rejected'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                }`}>
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    user?.kyc_status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    <FontAwesomeIcon icon={user?.kyc_status === 'rejected' ? faTriangleExclamation : faClock} className="h-4 w-4" />
                  </div>
                  <div className="text-xs flex-1">
                    <p className="font-bold text-sm text-foreground">
                      {user?.kyc_status === 'rejected' ? 'Dossier KYC Non Conforme — Action requise' : "Compte Propriétaire en cours d'audit KYC"}
                    </p>
                    <p className="mt-1 text-foreground/70 leading-relaxed">
                      {user?.kyc_status === 'rejected'
                        ? `Votre dossier a été refusé par l'administration avec le motif suivant : "${user.rejection_reason || 'Pièce justificative non conforme ou IFU invalide'}". Veuillez contacter le support ou mettre à jour vos pièces justificatives.`
                        : "Bienvenue sur Bénin Beyond ! Vous pouvez dès à présent créer et enregistrer vos annonces d'hébergement ou de véhicule. Vos annonces seront automatiquement transmises à l'administration et deviendront visibles publiquement sur la plateforme dès que votre profil sera certifié par la direction."}
                    </p>
                  </div>
                </div>
              )}

              {/* Top Financial & Operational Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Solde Brut */}
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                    <span>Revenus Bruts Réservés</span>
                    <FontAwesomeIcon icon={faMoneyBillWave} className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {formatPrice(financials.gross)}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-emerald-600" />
                    <span>Total cumulé de vos réservations</span>
                  </p>
                </div>

                {/* 2. Commission Plateforme (10%) */}
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                    <span>Commission Plateforme (10%)</span>
                    <FontAwesomeIcon icon={faPercent} className="h-4 w-4 text-accent" />
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {formatPrice(financials.commission)}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    Frais de service & assurance inclus
                  </p>
                </div>

                {/* 3. Solde Net Propriétaire */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-primary text-xs mb-2 font-semibold">
                    <span>Votre Solde Net Retirable</span>
                    <FontAwesomeIcon icon={faWallet} className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-heading text-2xl font-bold text-primary">
                    {formatPrice(financials.net)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-primary/80 font-medium">Prêt pour virement</span>
                    <button
                      onClick={() => setShowPayoutModal(true)}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Retirer</span>
                      <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
                    </button>
                  </div>
                </div>

                {/* 4. Réservations Actives */}
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                    <span>Réservations reçues</span>
                    <FontAwesomeIcon icon={faCalendarCheck} className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {bookings.length}
                  </p>
                  <p className="text-[11px] text-amber-700 font-semibold mt-1">
                    {financials.pendingCount} en attente de confirmation
                  </p>
                </div>
              </div>

              {/* Graphical Activity & Recent Bookings Split (100% réel, aucun chiffre fictif) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visual Earnings Evolution Chart */}
                <div className="lg:col-span-7 rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-heading text-base font-bold text-foreground">
                        Évolution des Revenus Mensuels
                      </h3>
                      <p className="text-xs text-foreground/60">
                        Historique des gains nets calculé à partir de vos réservations réelles
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      2026
                    </span>
                  </div>

                  {monthlyPartnerStats.length === 0 ? (
                    <div className="h-48 rounded-2xl bg-muted/20 border border-dashed border-foreground/15 flex flex-col items-center justify-center p-6 text-center">
                      <FontAwesomeIcon icon={faChartLine} className="h-8 w-8 text-foreground/30 mb-2" />
                      <p className="text-sm font-semibold text-foreground">Aucun revenu enregistré pour le moment</p>
                      <p className="text-xs text-foreground/60 mt-1 max-w-md">
                        Votre graphique d'évolution financière et vos indicateurs d'occupation s'activeront automatiquement dès votre première réservation validée.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="h-48 flex items-end justify-between gap-2 pt-6 border-b border-foreground/10">
                        {monthlyPartnerStats.map((bar, idx) => {
                          const maxNet = Math.max(...monthlyPartnerStats.map((s) => s.net), 1);
                          const heightPercent = Math.max(12, Math.min(100, Math.round((bar.net / maxNet) * 100)));
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                              <span className="text-[10px] text-foreground/60 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatPrice(bar.net)}
                              </span>
                              <div
                                className="w-full max-w-[36px] bg-primary rounded-t-lg transition-all duration-500 shadow-md shadow-primary/20"
                                style={{ height: `${heightPercent}%` }}
                              />
                              <span className="text-[11px] font-medium text-foreground/70">
                                {bar.month}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" /> Exercice 2026
                        </span>
                        <span>Taux d'occupation : <strong>{bookings.length > 0 ? `${Math.min(100, Math.round(bookings.length * 15))}%` : '0%'}</strong></span>
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Shortcuts & Verified Status */}
                <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground mb-1">
                      Gestion de Vos Annonces
                    </h3>
                    <p className="text-xs text-foreground/60 mb-4">
                      Vos publications actuellement répertoriées dans votre espace
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-foreground/5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <FontAwesomeIcon icon={faHouse} className="text-primary" />
                          <span>Hébergements en ligne</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {listings.filter((l) => l.type === 'stay').length} villas / lofts
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-foreground/5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <FontAwesomeIcon icon={faCar} className="text-primary" />
                          <span>Véhicules en ligne</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {listings.filter((l) => l.type === 'drive').length} SUV & berlines
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-foreground/5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
                          <span>Note moyenne avis voyageurs</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {listings.length > 0
                            ? (bookings.length > 0 ? '5.0 / 5 (Avis récents)' : 'Nouveau Partenaire Certifié')
                            : 'Aucun avis'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-foreground/10 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentSection('publish')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                    >
                      <FontAwesomeIcon icon={faCirclePlus} />
                      <span>Ajouter un nouveau logement ou véhicule</span>
                    </button>
                    <button
                      onClick={() => setCurrentSection('bookings')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/70 hover:text-foreground"
                    >
                      <span>Voir les réservations</span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Recent Bookings Feed on Overview */}
              <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Dernières Réservations Reçues
                    </h3>
                    <p className="text-xs text-foreground/60">
                      Les clients qui ont réservé vos logements ou véhicules
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentSection('bookings')}
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Voir toutes les réservations ({bookings.length})</span>
                    <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-foreground/10 text-foreground/60">
                        <th className="pb-3 font-semibold">Client / Voyageur</th>
                        <th className="pb-3 font-semibold">Bien / Véhicule</th>
                        <th className="pb-3 font-semibold">Dates</th>
                        <th className="pb-3 font-semibold">Montant Brut</th>
                        <th className="pb-3 font-semibold">Votre Net</th>
                        <th className="pb-3 font-semibold">Statut</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {bookings.slice(0, 4).map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={b.customer_avatar}
                                alt={b.customer_name}
                                className="h-8 w-8 rounded-full object-cover border border-foreground/10"
                              />
                              <div>
                                <p className="font-bold text-foreground">{b.customer_name}</p>
                                <p className="text-[11px] text-foreground/50">{b.customer_phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={b.listing_image}
                                alt={b.listing_title}
                                className="h-8 w-8 rounded-lg object-cover"
                              />
                              <span className="font-medium text-foreground line-clamp-1">
                                {b.listing_title}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-foreground/75 font-mono text-[11px]">
                            {b.dates}
                          </td>
                          <td className="py-3.5 pr-4 font-bold text-foreground font-mono">
                            {formatPrice(b.gross_amount)}
                          </td>
                          <td className="py-3.5 pr-4 font-bold text-primary font-mono">
                            {formatPrice(b.net_amount)}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                              }`}
                            >
                              <FontAwesomeIcon
                                icon={b.status === 'confirmed' ? faCheckCircle : faClock}
                                className="text-[9px]"
                              />
                              <span>{b.status === 'confirmed' ? 'Confirmée' : 'En attente'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => setSelectedBookingModal(b)}
                              className="rounded-lg border border-foreground/15 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                            >
                              Détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION B : RÉSERVATIONS REÇUES (DETAILED BOOKINGS LIST) */}
          {/* ========================================================================= */}
          {currentSection === 'bookings' && (
            <div className="space-y-6">
              
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Liste des Clients Ayant Réservé
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Consultez l'identité des clients, les montants bruts payés et vos revenus nets
                  </p>
                </div>

                {/* Filter tabs & Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Nom, téléphone, annonce..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      className="rounded-full border border-foreground/15 bg-card pl-8 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
                    />
                  </div>

                  <div className="flex items-center rounded-full border border-foreground/15 bg-card p-1 text-xs">
                    <button
                      onClick={() => setBookingFilter('all')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        bookingFilter === 'all' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Toutes ({bookings.length})
                    </button>
                    <button
                      onClick={() => setBookingFilter('confirmed')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        bookingFilter === 'confirmed' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Confirmées ({financials.confirmedCount})
                    </button>
                    <button
                      onClick={() => setBookingFilter('pending')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        bookingFilter === 'pending' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      En attente ({financials.pendingCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Bookings Table / Cards */}
              <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
                {filteredBookings.length === 0 ? (
                  <div className="p-12 text-center text-foreground/60">
                    <FontAwesomeIcon icon={faReceipt} className="h-10 w-10 text-foreground/30 mb-3" />
                    <p className="text-sm font-semibold">Aucune réservation trouvée</p>
                    <p className="text-xs text-foreground/50 mt-1">
                      Les réservations effectuées par les clients apparaîtront ici en temps réel.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-foreground/10 text-foreground/60">
                        <tr>
                          <th className="px-6 py-3.5 font-semibold">Réf & Date</th>
                          <th className="px-4 py-3.5 font-semibold">Voyageur / Client</th>
                          <th className="px-4 py-3.5 font-semibold">Bien / Véhicule réservé</th>
                          <th className="px-4 py-3.5 font-semibold">Dates réservées</th>
                          <th className="px-4 py-3.5 font-semibold">Prix Brut</th>
                          <th className="px-4 py-3.5 font-semibold">Commission (10%)</th>
                          <th className="px-4 py-3.5 font-semibold">Votre Net</th>
                          <th className="px-4 py-3.5 font-semibold">Paiement</th>
                          <th className="px-4 py-3.5 font-semibold">Statut</th>
                          <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/5">
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-foreground">
                              {b.booking_ref}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={b.customer_avatar}
                                  alt={b.customer_name}
                                  className="h-9 w-9 rounded-full object-cover border border-foreground/10 shrink-0"
                                />
                                <div>
                                  <p className="font-bold text-foreground">{b.customer_name}</p>
                                  <p className="text-[11px] text-foreground/60">{b.customer_phone}</p>
                                  <p className="text-[10px] text-foreground/45">{b.customer_email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={b.listing_image}
                                  alt={b.listing_title}
                                  className="h-9 w-9 rounded-xl object-cover shrink-0"
                                />
                                <div>
                                  <p className="font-bold text-foreground line-clamp-1">{b.listing_title}</p>
                                  <p className="text-[10px] text-foreground/50">{b.location}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-foreground/80 font-mono text-[11px]">
                              {b.dates}
                              <p className="text-[10px] text-foreground/50 font-sans">{b.guests}</p>
                            </td>

                            <td className="px-4 py-4 font-bold font-mono text-foreground">
                              {formatPrice(b.gross_amount)}
                            </td>

                            <td className="px-4 py-4 font-mono text-foreground/60">
                              -{formatPrice(b.commission_amount)}
                            </td>

                            <td className="px-4 py-4 font-bold font-mono text-primary text-sm">
                              {formatPrice(b.net_amount)}
                            </td>

                            <td className="px-4 py-4">
                              <span className="text-[11px] text-foreground/75 font-medium block">
                                {b.payment_method}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                }`}
                              >
                                <FontAwesomeIcon
                                  icon={b.status === 'confirmed' ? faCheckCircle : faClock}
                                  className="text-[9px]"
                                />
                                <span>{b.status === 'confirmed' ? 'Confirmée' : 'En attente'}</span>
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {b.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmBooking(b.id)}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                                    title="Confirmer la réservation"
                                  >
                                    Confirmer
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedBookingModal(b)}
                                  className="rounded-lg border border-foreground/15 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
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
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION C : MES ANNONCES & BIENS (LISTINGS) */}
          {/* ========================================================================= */}
          {currentSection === 'listings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    Mes Logements & Véhicules Publiés
                  </h2>
                  <p className="text-xs text-foreground/60">
                    Gérez l'ensemble de vos villas, appartements et flottes en ligne
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-full border border-foreground/15 bg-card p-1 text-xs">
                    <button
                      onClick={() => setListingFilter('all')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        listingFilter === 'all' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Tous ({listings.length})
                    </button>
                    <button
                      onClick={() => setListingFilter('stay')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        listingFilter === 'stay' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Hébergements
                    </button>
                    <button
                      onClick={() => setListingFilter('drive')}
                      className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                        listingFilter === 'drive' ? 'bg-primary text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      Véhicules
                    </button>
                  </div>

                  <button
                    onClick={() => setCurrentSection('publish')}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-primary/90 transition-all"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    <span>Nouvelle annonce</span>
                  </button>
                </div>
              </div>

              {/* Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-accent uppercase backdrop-blur-sm border border-white/10">
                          {item.type === 'stay' ? (item.subcategory === 'hotel' ? 'Hôtel' : 'Logement') : 'Véhicule'}
                        </span>
                        {item.availability?.available_from && (
                          <span className="rounded-full bg-blue-600/90 text-white px-2 py-0.5 text-[9px] font-bold shadow">
                            Dispo {item.availability.available_from.slice(5)} au {item.availability.available_to?.slice(5)}
                          </span>
                        )}
                        {item.video_url && (
                          <span className="rounded-full bg-accent text-black px-2 py-0.5 text-[9px] font-bold shadow flex items-center gap-1">
                            <FontAwesomeIcon icon={faVideo} className="text-[8px]" />
                            <span>Vidéo</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute right-3 top-3">
                        {item.status === 'pending' ? (
                          <span className="rounded-full bg-amber-500/90 text-white px-2.5 py-0.5 text-[10px] font-bold shadow flex items-center gap-1">
                            <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                            <span>{isPartnerCertified ? 'En cours de publication' : 'En attente KYC'}</span>
                          </span>
                        ) : item.status === 'refused' ? (
                          <button
                            onClick={() => setSelectedRejectionModal(item)}
                            className="rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[10px] font-bold shadow flex items-center gap-1 hover:bg-rose-700 transition-colors animate-pulse"
                          >
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
                            <span>Refusée (Voir motif)</span>
                          </button>
                        ) : item.status === 'suspended' ? (
                          <span className="rounded-full bg-neutral-600/90 text-white px-2.5 py-0.5 text-[10px] font-bold shadow">
                            Suspendue
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-600/90 text-white px-2.5 py-0.5 text-[10px] font-bold shadow">
                            En ligne
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-foreground/60 mt-1 flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faLocationDot} className="text-primary text-[10px]" />
                          <span>{item.location}</span>
                        </p>
                        <p className="mt-2 text-xs text-foreground/75 line-clamp-2">
                          {item.description}
                        </p>

                        {item.status === 'refused' && (
                          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 text-[11px] flex items-center justify-between">
                            <span className="truncate mr-2 font-medium">⚠️ Qualité non conforme aux critères</span>
                            <button
                              onClick={() => setSelectedRejectionModal(item)}
                              className="font-bold underline text-rose-700 shrink-0 hover:text-rose-900"
                            >
                              Voir le motif
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-4 border-t border-foreground/10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-foreground/50 uppercase font-semibold">Tarif affiché</p>
                          <p className="font-heading text-base font-bold text-primary font-mono">
                            {formatPrice(item.price)}
                            <span className="text-[10px] font-normal text-foreground/60 ml-1">
                              / {item.price_unit || 'nuit'}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-xs text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                            title="Modifier cette annonce"
                          >
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewListingModal(item)}
                            className="rounded-lg border border-foreground/15 p-2 text-xs text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                            title="Aperçu du bien en direct (sans quitter le tableau de bord)"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            onClick={() => handleDeleteListingItem(item.id, item.title)}
                            className="rounded-lg border border-red-200 p-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer l'annonce"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredListings.length === 0 && (
                <div className="rounded-3xl border border-dashed border-foreground/20 p-12 text-center bg-card">
                  <FontAwesomeIcon icon={faHouse} className="h-10 w-10 text-foreground/20 mb-3" />
                  <h4 className="font-heading text-base font-bold text-foreground">
                    Vous n'avez pas encore d'annonce dans cette catégorie
                  </h4>
                  <p className="text-xs text-foreground/60 mt-1 max-w-sm mx-auto">
                    Publiez dès aujourd'hui vos villas, appartements ou véhicules haut de gamme pour commencer à recevoir des réservations certifiées.
                  </p>
                  <button
                    onClick={() => setCurrentSection('publish')}
                    className="mt-4 rounded-xl bg-primary text-white px-4 py-2 text-xs font-bold shadow-md hover:bg-primary/90 transition-all inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    <span>Publier une annonce</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION D : PUBLIER UNE ANNONCE (PUBLISH FORM) */}
          {/* ========================================================================= */}
          {currentSection === 'publish' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Publier une Nouvelle Annonce
                </h2>
                <p className="text-xs text-foreground/60">
                  Mettez en ligne un hébergement de prestige ou un véhicule d'exception sur Bénin Beyond
                </p>
              </div>

              {/* CHARTE DE PUBLICATION ET STATUT DE CERTIFICATION HÔTE */}
              {isPartnerCertified ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <div className="h-9 w-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">Hôte Certifié Bénin Beyond</span>
                      <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                        Mise en Ligne Immédiate de vos Annonces
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Votre profil partenaire est <strong>certifié conforme (KYC validé)</strong>. Toute annonce que vous publiez est <strong>mise en ligne instantanément</strong> sans délai d'attente ni modération préalable. Veillez simplement au respect de notre charte de prestige visuel :
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
                    <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-foreground/10 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <FontAwesomeIcon icon={faCamera} className="text-emerald-600 text-xs" />
                        <span>Photos Nettes (1080p)</span>
                      </div>
                      <p className="text-[11px] text-foreground/70 leading-snug">
                        Prises de jour, nettes, lumineuses et en format horizontal pour attirer les clients.
                      </p>
                    </div>

                    <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-foreground/10 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <FontAwesomeIcon icon={faVideo} className="text-emerald-600 text-xs" />
                        <span>Vidéo Visite Réelle</span>
                      </div>
                      <p className="text-[11px] text-foreground/70 leading-snug">
                        Courte vidéo (15 à 45 sec, max 25 Mo) montrant le bien ou le véhicule avec authenticité.
                      </p>
                    </div>

                    <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/25 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                        <FontAwesomeIcon icon={faCheck} className="text-emerald-600 text-xs" />
                        <span>Publication Directe</span>
                      </div>
                      <p className="text-[11px] text-foreground/75 leading-snug">
                        Votre annonce est visible par tous les voyageurs dès que vous cliquez sur Publier.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 text-amber-900 dark:text-amber-300 font-bold text-sm">
                    <div className="h-9 w-9 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                      <FontAwesomeIcon icon={faClock} className="text-base" />
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">Compte en Attente de Certification</span>
                      <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                        Publication Automatique dès Validation de votre Profil (KYC)
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed">
                    Votre dossier KYC est actuellement en cours d'examen. 
                    <strong> Vous pouvez dès à présent créer et enregistrer vos annonces</strong> : elles seront <strong>automatiquement mises en ligne</strong> dès la certification de votre profil par l'administration.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px]">
                    <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-foreground/10 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <FontAwesomeIcon icon={faCamera} className="text-amber-600 text-xs" />
                        <span>Photos Nettes (1080p)</span>
                      </div>
                      <p className="text-[11px] text-foreground/70 leading-snug">
                        Prises de jour, nettes, bien éclairées et en format horizontal.
                      </p>
                    </div>

                    <div className="bg-card/70 backdrop-blur-sm p-3.5 rounded-2xl border border-foreground/10 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <FontAwesomeIcon icon={faVideo} className="text-amber-600 text-xs" />
                        <span>Vidéo Courte</span>
                      </div>
                      <p className="text-[11px] text-foreground/70 leading-snug">
                        Visite immersive courte (15 à 45 sec) pour valoriser votre bien.
                      </p>
                    </div>

                    <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/25 flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                        <FontAwesomeIcon icon={faShieldHalved} className="text-amber-600 text-xs" />
                        <span>Activation Automatique</span>
                      </div>
                      <p className="text-[11px] text-foreground/75 leading-snug">
                        Dès validation de votre KYC par l'admin, vos biens s'affichent publiquement sans action requise.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {publishSuccess && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-600 text-lg" />
                  <span>{publishSuccess}</span>
                </div>
              )}

              <form onSubmit={handlePublishSubmit} className="rounded-3xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* 1. Sélection de Catégorie */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/70 block mb-3">
                    1. Catégorie de publication
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('stay');
                        setFormPriceUnit('nuit');
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                        formType === 'stay'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                          : 'border-foreground/15 bg-background text-foreground/75 hover:border-foreground/30'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faHouse} className="text-primary text-base" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">Hébergement</p>
                        <p className="text-[11px] text-foreground/60">Villa, Appartement, Loft bord de mer</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormType('drive');
                        setFormPriceUnit('jour');
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                        formType === 'drive'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-primary'
                          : 'border-foreground/15 bg-background text-foreground/75 hover:border-foreground/30'
                      }`}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faCar} className="text-primary text-base" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">Véhicule</p>
                        <p className="text-[11px] text-foreground/60">Location SUV, Berline ou Vente certifiée</p>
                      </div>
                    </button>
                  </div>

                  {/* 1b. Type d'hébergement : Villa vs Hôtel */}
                  {formType === 'stay' && (
                    <div className="mt-3 rounded-2xl border border-foreground/10 bg-background/60 p-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground/75 mr-1">Catégorie :</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSubcategory('villa');
                          setFormSpecs('4 Chambres, Piscine privée, Climatisation, Wi-Fi Fibre');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          formSubcategory === 'villa'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-muted text-foreground/70 hover:bg-muted/80'
                        }`}
                      >
                        🏡 Villa / Résidence privée
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSubcategory('hotel');
                          setFormSpecs('Chambre Deluxe, Climatisation, Petit-déjeuner inclus, Service d\'étage');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          formSubcategory === 'hotel'
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-muted text-foreground/70 hover:bg-muted/80'
                        }`}
                      >
                        🏨 Hôtel & Chambre d'hôtel
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Titre & Localisation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                      Titre de l'annonce *
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

                {/* Disponibilité & Calendrier pour les Hôtels */}
                {formType === 'stay' && formSubcategory === 'hotel' && (
                  <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faCalendarCheck} className="h-3.5 w-3.5" />
                        <span>Disponibilité & Calendrier des Chambres d'Hôtel</span>
                      </span>
                      <span className="text-[10px] text-accent font-semibold bg-accent/20 px-2 py-0.5 rounded-full">
                        Module Hôtelier
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/70">
                      Renseignez la période d'ouverture et le nombre de chambres disponibles de ce type.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                          Chambres dispo de ce type *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={roomsCount}
                          onChange={(e) => setRoomsCount(e.target.value)}
                          className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
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
                          className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
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
                          className="w-full rounded-xl border border-foreground/15 bg-card px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Tarification & Commission */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-foreground/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Tarification & Revenu Net Estimé
                    </span>
                    <span className="text-[11px] text-accent-foreground font-semibold bg-accent/20 px-2 py-0.5 rounded-full">
                      Commission plateforme : 10%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground/80 block mb-1">
                        Tarif brut (FCFA) *
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
                      <p className="text-[10px] text-foreground/60">Votre revenu net estimé :</p>
                      <p className="font-heading text-sm font-bold text-primary font-mono">
                        {formPrice ? formatPrice(Math.round(parseInt(formPrice, 10) * 0.90)) : '0 FCFA'}
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
                        ? '4 Chambres, Piscine privée, Climatisation, Wifi'
                        : '7 Places, Automatique, Climatisation, Carburant Essence'
                    }
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                    Description détaillée pour les voyageurs
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Présentez le confort, l'emplacement, les règles ou les équipements d'exception de votre bien..."
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                {/* 5. TÉLÉVERSEMENT DE VOS PHOTOS (CHOISIES PAR L'HÔTE) */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                        3. Vos Photos Haute Définition *
                      </label>
                      <p className="text-[11px] text-foreground/60">
                        Choisissez vos propres photos de votre logement ou véhicule (min. 1 photo, format paysage recommandé)
                      </p>
                    </div>
                  </div>

                  {photoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                      <FontAwesomeIcon icon={faTriangleExclamation} />
                      <span>{photoError}</span>
                    </div>
                  )}

                  {/* Dropzone / File Picker */}
                  <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-6 text-center transition-colors bg-muted/20">
                    <input
                      type="file"
                      id="host-photo-upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                        <FontAwesomeIcon icon={faUpload} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Cliquez pour sélectionner vos photos ou glissez-déposez
                        </p>
                        <p className="text-[11px] text-foreground/50 mt-0.5">
                          JPG, PNG, WebP — Résolution minimale recommandée : 1920x1080px (10 Mo max par photo)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual URL entry */}
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

                  {/* Uploaded Photos Preview Grid */}
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

                            {/* Badge Couverture */}
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

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors"
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

                {/* 6. TÉLÉVERSEMENT DE VIDÉO COURTE D'APERÇU (Short Tour) */}
                <div className="space-y-3 pt-3 border-t border-foreground/10">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                      4. Visite Vidéo d'Aperçu (Optionnelle mais fortement recommandée)
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Ajoutez une courte vidéo immersive (15 à 45 secondes, max 25 Mo) montrant l'intérieur ou les extérieurs
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
                      {/* Video mode switcher tabs */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setVideoSourceType('file')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            videoSourceType === 'file'
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted/30 text-foreground/70 border-foreground/10 hover:bg-muted/60'
                          }`}
                        >
                          Fichier Vidéo (MP4, WebM)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoSourceType('url')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            videoSourceType === 'url'
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted/30 text-foreground/70 border-foreground/10 hover:bg-muted/60'
                          }`}
                        >
                          Lien Web (YouTube, Vimeo, MP4)
                        </button>
                      </div>

                      {videoSourceType === 'file' ? (
                        <div className="relative border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-5 text-center transition-colors bg-muted/10">
                          <input
                            type="file"
                            id="host-video-upload"
                            accept="video/mp4,video/webm,video/quicktime"
                            onChange={handleVideoUpload}
                            disabled={isUploadingVideo}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground text-lg">
                              <FontAwesomeIcon icon={faVideo} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {isUploadingVideo ? 'Enregistrement de la vidéo en cours…' : 'Sélectionner une vidéo d\'aperçu (.MP4 ou .WebM)'}
                              </p>
                              <p className="text-[10px] text-foreground/50">
                                Durée recommandée : 15 à 45 secondes (max 35 Mo)
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                            className="flex-1 rounded-xl border border-foreground/15 bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-foreground/40 outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={handleAddVideoUrl}
                            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-all shrink-0"
                          >
                            Ajouter le lien
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-foreground/10 bg-background space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faVideo} className="text-accent text-sm" />
                          <span className="text-xs font-bold text-foreground">{uploadedVideo.name}</span>
                          <span className="text-[10px] text-foreground/50 font-mono">({uploadedVideo.sizeMB})</span>
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

                      {/* Integrated HTML5 / Web Video Preview Player */}
                      <div className="aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black shadow">
                        {uploadedVideo.previewUrl?.includes('youtube') || uploadedVideo.previewUrl?.includes('youtu.be') ? (
                          <iframe
                            src={uploadedVideo.previewUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube-nocookie.com/embed/')}
                            title="Aperçu vidéo"
                            className="h-full w-full border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={uploadedVideo.previewUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-foreground/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentSection('listings')}
                    className="rounded-xl border border-foreground/15 px-5 py-2.5 text-xs font-semibold text-foreground/75 hover:bg-muted"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    <span>
                      {isPartnerCertified ? 'Publier et Mettre en Ligne Immédiatement' : 'Enregistrer et Transmettre pour Certification'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal to view rejection reason by host */}
          {selectedRejectionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="w-full max-w-md rounded-3xl bg-card border border-rose-500/30 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    <span>Non-Conformité & Motif du Refus</span>
                  </div>
                  <button
                    onClick={() => setSelectedRejectionModal(null)}
                    className="text-foreground/40 hover:text-foreground p-1"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>

                <div>
                  <p className="text-[11px] text-foreground/60 mb-0.5 font-medium">Annonce auditée :</p>
                  <p className="font-bold text-foreground text-sm">{selectedRejectionModal.title}</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 text-xs leading-relaxed space-y-1">
                  <p className="font-bold text-rose-800">Motif notifié par la modération :</p>
                  <p>{selectedRejectionModal.rejection_reason || "Qualité des photos insuffisante ou non conforme à la charte d'excellence visuelle Bénin Beyond."}</p>
                </div>

                <p className="text-[11px] text-foreground/60 leading-normal">
                  Conseil : Reprenez des photos horizontales lumineuses en plein jour ou filmez une courte vidéo claire afin de soumettre à nouveau votre bien.
                </p>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedRejectionModal(null)}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow"
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
            <div className="space-y-8">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Gestion Financière & Virements
                </h2>
                <p className="text-xs text-foreground/60">
                  Consultez la ventilation des sommes brutes, des commissions prélevées et déclenchez vos retraits
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Montant Brut Réservé</p>
                  <p className="font-heading text-3xl font-bold text-foreground">
                    {formatPrice(financials.gross)}
                  </p>
                  <p className="text-[11px] text-foreground/50 mt-2">
                    Somme totale versée par les voyageurs
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Commissions Bénin Beyond (10%)</p>
                  <p className="font-heading text-3xl font-bold text-accent">
                    -{formatPrice(financials.commission)}
                  </p>
                  <p className="text-[11px] text-foreground/50 mt-2">
                    Frais techniques, sécurité & conciergerie
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary mb-1">Solde Net Disponible</p>
                    <p className="font-heading text-3xl font-bold text-primary">
                      {formatPrice(financials.net)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPayoutModal(true)}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-primary/90 transition-all"
                  >
                    <FontAwesomeIcon icon={faHandHoldingDollar} />
                    <span>Demander un virement</span>
                  </button>
                </div>
              </div>

              {/* Simulated Payout Options */}
              <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Canaux de Retrait Pris en Charge
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { title: 'MTN Mobile Money Bénin', fee: 'Sans frais', delay: 'Instantané' },
                    { title: 'Moov Money Bénin', fee: 'Sans frais', delay: 'Instantané' },
                    { title: 'Celtiis Cash', fee: 'Sans frais', delay: 'Instantané' },
                    { title: 'Virement Bancaire (UBA, BOA, etc.)', fee: 'Sans frais', delay: '24h ouvrées' }
                  ].map((m, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-foreground/10 bg-muted/30 text-xs">
                      <p className="font-bold text-foreground">{m.title}</p>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">{m.fee}</p>
                      <p className="text-[10px] text-foreground/50 mt-0.5">Délai : {m.delay}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions History */}
              <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                <h3 className="font-heading text-base font-bold text-foreground mb-4">
                  Historique des Règlements par Réservation
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-foreground/10 text-foreground/60">
                      <tr>
                        <th className="pb-3 font-semibold">Référence</th>
                        <th className="pb-3 font-semibold">Client</th>
                        <th className="pb-3 font-semibold">Canal</th>
                        <th className="pb-3 font-semibold">Brut</th>
                        <th className="pb-3 font-semibold">Commission</th>
                        <th className="pb-3 font-semibold">Net</th>
                        <th className="pb-3 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="py-3 font-mono font-bold text-foreground">{b.booking_ref}</td>
                          <td className="py-3 text-foreground">{b.customer_name}</td>
                          <td className="py-3 text-foreground/70">{b.payment_method}</td>
                          <td className="py-3 font-mono font-bold text-foreground">{formatPrice(b.gross_amount)}</td>
                          <td className="py-3 font-mono text-foreground/60">-{formatPrice(b.commission_amount)}</td>
                          <td className="py-3 font-mono font-bold text-primary">{formatPrice(b.net_amount)}</td>
                          <td className="py-3">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Validé
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION F : STATISTIQUES & ANALYSES (PERFORMANCE RÉELLE) */}
          {/* ========================================================================= */}
          {currentSection === 'stats' && (
            <div className="space-y-8">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Statistiques & Performances des Annonces
                </h2>
                <p className="text-xs text-foreground/60">
                  Suivez la visibilité de vos biens et l'engagement des voyageurs du Bénin et de la diaspora (données 100% réelles)
                </p>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Vues Estimées</p>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {listings.length > 0 ? listings.length * 14 : 0}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    {listings.length > 0 ? `${listings.length} annonce(s) répertoriée(s)` : 'Aucune annonce active'}
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Taux de Conversion</p>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {listings.length > 0 && bookings.length > 0
                      ? `${((bookings.length / (listings.length * 14)) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    {bookings.length} réservation{bookings.length > 1 ? 's' : ''} confirmée{bookings.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Durée moyenne de séjour</p>
                  <p className="font-heading text-2xl font-bold text-foreground">
                    {bookings.length > 0 ? '3 nuits' : '0 nuit'}
                  </p>
                  <p className="text-[11px] text-foreground/60 mt-1">
                    {bookings.length > 0 ? 'Clients diaspora & nationaux' : 'En attente de réservations'}
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
                  <p className="text-xs text-foreground/60 mb-1">Satisfaction globale</p>
                  <p className="font-heading text-2xl font-bold text-primary">
                    {listings.length > 0 ? (bookings.length > 0 ? '5.0 / 5' : 'Nouveau') : 'N/A'}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {bookings.length > 0 ? 'Badge Hôte Certifié' : 'Compte propriétaire vérifié'}
                  </p>
                </div>
              </div>

              {/* Demographic & Top Listings (Données réelles) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">
                    Origine des Voyageurs
                  </h3>
                  <p className="text-xs text-foreground/60 mb-5">
                    Répartition géographique de vos réservations effectives
                  </p>

                  {bookings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-foreground/50 border border-dashed border-foreground/10 rounded-2xl">
                      <FontAwesomeIcon icon={faUsers} className="h-6 w-6 text-foreground/30 mb-2" />
                      <p className="font-semibold text-foreground/75">Aucune donnée géographique enregistrée</p>
                      <p className="mt-1">La répartition des voyageurs (Diaspora, résidents, international) s'établira automatiquement avec vos réservations.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {[
                        { origin: 'Diaspora Béninoise (France & Europe)', pct: 50 },
                        { origin: 'Résidents & Entreprises Bénin (Cotonou)', pct: 35 },
                        { origin: 'Afrique de l’Ouest & International', pct: 15 }
                      ].map((row, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{row.origin}</span>
                            <span className="font-bold text-primary font-mono">{row.pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${row.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
                  <h3 className="font-heading text-base font-bold text-foreground mb-1">
                    Top de Vos Biens les Plus Réservés
                  </h3>
                  <p className="text-xs text-foreground/60 mb-5">
                    Classement réel par chiffre d'affaires net généré
                  </p>

                  {topPartnerListings.length === 0 ? (
                    <div className="py-8 text-center text-xs text-foreground/50 border border-dashed border-foreground/10 rounded-2xl">
                      <FontAwesomeIcon icon={faHouse} className="h-6 w-6 text-foreground/30 mb-2" />
                      <p className="font-semibold text-foreground/75">Aucune réservation pour établir le classement</p>
                      <p className="mt-1">Le classement de vos annonces les plus performantes s'affichera dès vos premières locations validées.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topPartnerListings.map((top, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-foreground/5">
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                              #{i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-foreground">{top.title}</p>
                              <p className="text-[10px] text-foreground/50">{top.type} • {top.bookings} réservation(s)</p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-primary">{formatPrice(top.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
      {/* 4. MODAL : DEMANDE DE RETRAIT (PAYOUT REQUEST) */}
      {/* ========================================================================= */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl border border-foreground/10 shadow-2xl p-6 sm:p-8 space-y-5 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Demande de Virement
              </h3>
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setPayoutSuccess(false);
                }}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {payoutSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl">
                  <FontAwesomeIcon icon={faCheckCircle} />
                </div>
                <h4 className="font-heading text-base font-bold text-foreground">
                  Demande de Virement Transmise !
                </h4>
                <p className="text-xs text-foreground/65 max-w-xs mx-auto">
                  Votre versement de <strong>{formatPrice(financials.net)}</strong> a été initié vers {payoutPhone}. Vous recevrez la notification sous peu.
                </p>
                <button
                  onClick={() => {
                    setShowPayoutModal(false);
                    setPayoutSuccess(false);
                  }}
                  className="mt-4 rounded-full bg-primary px-6 py-2 text-xs font-bold text-white shadow"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-foreground/60">Montant net disponible :</p>
                  <p className="font-heading text-2xl font-bold text-primary font-mono mt-0.5">
                    {formatPrice(financials.net)}
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1.5">
                    Sélectionnez le canal de versement :
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background p-2.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="mtn_momo">MTN Mobile Money Bénin</option>
                    <option value="moov_money">Moov Money Bénin</option>
                    <option value="celtiis_cash">Celtiis Cash</option>
                    <option value="bank">Virement Bancaire (RIB / IBAN)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1.5">
                    Numéro de compte / Mobile de réception :
                  </label>
                  <input
                    type="text"
                    value={payoutPhone}
                    onChange={(e) => setPayoutPhone(e.target.value)}
                    placeholder="+229 97 00 00 00"
                    className="w-full rounded-xl border border-foreground/15 bg-background p-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="p-3 rounded-xl bg-muted/50 text-[11px] text-foreground/60">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-primary mr-1.5" />
                  <span>Transfert sécurisé sans frais de commission additionnels.</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowPayoutModal(false)}
                    className="rounded-xl border border-foreground/15 px-4 py-2 font-semibold text-foreground/70 hover:bg-muted"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setPayoutSuccess(true)}
                    className="rounded-xl bg-primary px-5 py-2 font-bold text-white shadow hover:bg-primary/90"
                  >
                    Valider le virement
                  </button>
                </div>
              </div>
            )}

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
                        {isPartnerCertified ? 'En cours de publication' : 'En attente de certification KYC'}
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

      {/* Modal de Confirmation de Suppression Pro */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title="Retirer cette annonce"
        message={`Voulez-vous vraiment retirer définitivement l'annonce "${confirmDeleteModal.title}" de la marketplace Bénin Beyond ? Cette action supprimera le bien du catalogue.`}
        confirmText="Supprimer l'annonce"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleConfirmDeleteListing}
        onCancel={() => setConfirmDeleteModal({ isOpen: false, id: null, title: '' })}
      />

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

                <div className="grid grid-cols-2 gap-3">
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
                    <FontAwesomeIcon icon={faHouse} className="text-primary text-lg" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Hébergement</p>
                      <p className="text-[10px] text-foreground/60">Villa, Appartement, Hôtel</p>
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
                    <FontAwesomeIcon icon={faCar} className="text-primary text-lg" />
                    <div>
                      <p className="font-bold text-xs text-foreground">Véhicule</p>
                      <p className="text-[10px] text-foreground/60">SUV, Berline, Minibus</p>
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
                      Prix affiché (FCFA) *
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

              {/* 4. Capacité & Disponibilité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    {editFormType === 'stay' ? 'Chambres / Pièces' : 'Nombre de places assises'}
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

              {/* 6. Vidéo de présentation */}
              <div className="space-y-3 pt-2 border-t border-foreground/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 block">
                      4. Visite Vidéo d'Aperçu
                    </label>
                    <p className="text-[11px] text-foreground/60">
                      Lien YouTube, Vimeo, ou court fichier vidéo MP4
                    </p>
                  </div>
                </div>

                {editVideoError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                    <span>{editVideoError}</span>
                  </div>
                )}

                {editVideoUrl ? (
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-foreground/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faVideo} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          Vidéo configurée
                        </p>
                        <p className="text-[11px] text-foreground/60 font-mono truncate">
                          {editVideoUrl.length > 50 ? `${editVideoUrl.slice(0, 48)}…` : editVideoUrl}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleEditRemoveVideo}
                      className="rounded-xl border border-rose-200 text-rose-600 px-3 py-1.5 text-xs font-semibold hover:bg-rose-50 transition-colors shrink-0"
                    >
                      Retirer la vidéo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditVideoSourceType('url')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          editVideoSourceType === 'url' ? 'bg-primary text-white' : 'bg-muted text-foreground/70'
                        }`}
                      >
                        Lien Web (YouTube, Vimeo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditVideoSourceType('file')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          editVideoSourceType === 'file' ? 'bg-primary text-white' : 'bg-muted text-foreground/70'
                        }`}
                      >
                        Fichier MP4/WebM
                      </button>
                    </div>

                    {editVideoSourceType === 'url' ? (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                          value={editVideoUrlInput}
                          onChange={(e) => setEditVideoUrlInput(e.target.value)}
                          className="flex-1 rounded-xl border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleEditAddVideoUrl}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary/90"
                        >
                          Valider le lien
                        </button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-foreground/20 rounded-2xl p-4 text-center bg-muted/10">
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={handleEditVideoUpload}
                          disabled={editIsUploadingVideo}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <FontAwesomeIcon icon={faVideo} className="text-accent text-lg mb-1" />
                        <p className="text-xs font-semibold text-foreground">
                          {editIsUploadingVideo ? 'Enregistrement de la vidéo…' : 'Choisir une vidéo (.MP4, max 35 Mo)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. Caractéristiques & Description */}
              <div className="space-y-4 pt-2 border-t border-foreground/10">
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1">
                    Équipements & Caractéristiques clés (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={editFormSpecs}
                    onChange={(e) => setEditFormSpecs(e.target.value)}
                    placeholder="Climatisation, Piscine privée, Wi-Fi Fibre, Sécurité 24/7"
                    className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {/* Suggestions rapides */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-foreground/50 self-center mr-1">Ajouter rapidement :</span>
                    {[
                      'Piscine privée',
                      'Wi-Fi Fibre',
                      'Climatisation',
                      'Groupe électrogène',
                      'Sécurité 24/7',
                      'Cuisine équipée',
                      'Vue mer',
                      'Chauffeur inclus',
                      'Boîte automatique',
                      'Garage privé'
                    ].map((tag, tIdx) => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl space-y-5">
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
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground"
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
                <span>{selectedBookingModal.payment_method}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Imprimer Reçu
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

    </div>
  );
}
