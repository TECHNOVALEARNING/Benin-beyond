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
  faPlay
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { getListings, deleteListing, updateListingStatus } from '../services/listingService';
import { getBookings, updateBookingStatus } from '../services/bookingService';
import { COMBINED_PACKS } from '../data/packsData';
import { ScrollReveal } from '../components/ScrollReveal';

const INITIAL_PARTNERS = [
  {
    id: 'part_01',
    name: 'Patrice Hounkpati',
    company: 'Littoral Prestige Assets',
    email: 'proprietaire@beninbeyond.bj',
    phone: '+229 97 22 45 10',
    listingsCount: 4,
    kycStatus: 'verified', // 'verified' | 'pending' | 'rejected'
    docType: 'Titre Foncier + CNI Béninoise',
    joined: 'Août 2026',
    balance: 850000
  },
  {
    id: 'part_02',
    name: 'Armel Dossou',
    company: 'Cotonou VIP Rental & Fleet',
    email: 'armel.d@rentcar-benin.com',
    phone: '+229 96 11 00 22',
    listingsCount: 3,
    kycStatus: 'verified',
    docType: 'Cartes Grises + RC Commerce',
    joined: 'Juillet 2026',
    balance: 420000
  },
  {
    id: 'part_03',
    name: 'Claire Ahouandjinou',
    company: 'Ouidah Heritage Lodges',
    email: 'claire@ouidah-lodges.bj',
    phone: '+229 95 80 30 15',
    listingsCount: 2,
    kycStatus: 'pending',
    docType: 'Attestation d’Hébergeur Touristique',
    joined: 'Septembre 2026',
    balance: 290000
  },
  {
    id: 'part_04',
    name: 'Désiré Tokpo',
    company: 'Ganvié Ecotour & Pirogues VIP',
    email: 'desire@ganvie-tours.bj',
    phone: '+229 90 40 88 12',
    listingsCount: 2,
    kycStatus: 'verified',
    docType: 'Agrément Ministère du Tourisme',
    joined: 'Août 2026',
    balance: 180000
  }
];

const INITIAL_PAYOUT_REQUESTS = [
  {
    id: 'PO-401',
    partnerName: 'Patrice Hounkpati',
    company: 'Littoral Prestige Assets',
    amount: 550000,
    method: 'MTN Mobile Money',
    recipient: '+229 97 22 45 10',
    date: '15 Sept 2026, 11:20',
    status: 'pending' // 'pending' | 'approved' | 'rejected'
  },
  {
    id: 'PO-402',
    partnerName: 'Armel Dossou',
    company: 'Cotonou VIP Rental',
    amount: 320000,
    method: 'Celtiis Cash',
    recipient: '+229 40 11 22 33',
    date: '14 Sept 2026, 16:45',
    status: 'approved'
  }
];

const MONTHLY_STATS = [
  { month: 'Mai', gmv: 4200000, commission: 630000 },
  { month: 'Juin', gmv: 6800000, commission: 1020000 },
  { month: 'Juillet', gmv: 9400000, commission: 1410000 },
  { month: 'Août', gmv: 12500000, commission: 1875000 },
  { month: 'Septembre', gmv: 14850000, commission: 2227500 }
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation State
  const [currentSection, setCurrentSection] = useState('cockpit'); // 'cockpit' | 'moderation' | 'reservations' | 'partners' | 'finances' | 'packs'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [partners, setPartners] = useState(INITIAL_PARTNERS);
  const [payouts, setPayouts] = useState(INITIAL_PAYOUT_REQUESTS);
  const [packs, setPacks] = useState(COMBINED_PACKS);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Modals & Details
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [selectedKycModal, setSelectedKycModal] = useState(null);
  const [mediaAuditModal, setMediaAuditModal] = useState(null);
  const [rejectionModalListing, setRejectionModalListing] = useState(null);
  const [rejectionPresetReason, setRejectionPresetReason] = useState('Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)');
  const [rejectionCustomNote, setRejectionCustomNote] = useState('');

  // Filters & Searches
  const [listingSearch, setListingSearch] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all' | 'stay' | 'drive'
  const [listingStatusFilter, setListingStatusFilter] = useState('all'); // 'all' | 'pending' | 'active' | 'refused' | 'suspended'
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'confirmed' | 'pending'
  const [bookingSearch, setBookingSearch] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allListings, allBookings] = await Promise.all([
        getListings(),
        getBookings()
      ]);
      setListings(allListings);
      setBookings(allBookings);
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Financial calculations
  const platformMetrics = useMemo(() => {
    const totalGmv = bookings.reduce((sum, b) => sum + (Number(b.gross_amount) || 0), 0) || 14850000;
    const totalCommissions = bookings.reduce((sum, b) => sum + (Number(b.commission_amount) || Math.round((Number(b.gross_amount) || 0) * 0.15)), 0) || 2227500;
    const totalDisbursed = totalGmv - totalCommissions;
    const pendingBookingsCount = bookings.filter((b) => b.status === 'pending').length;
    const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;
    const pendingKycCount = partners.filter((p) => p.kycStatus === 'pending').length;
    const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;

    return {
      gmv: totalGmv,
      commissions: totalCommissions,
      disbursed: totalDisbursed,
      activeListings: listings.length,
      partnersCount: partners.length,
      pendingBookingsCount,
      pendingPayoutsCount,
      pendingKycCount,
      pendingListingsCount
    };
  }, [bookings, listings, partners, payouts]);

  // Actions
  const handleToggleListingStatus = (id) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === 'suspended' ? 'active' : 'suspended';
          updateListingStatus(id, newStatus);
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
    showToast('Statut de l’annonce mis à jour sur la marketplace.');
  };

  const handleApproveListing = (id) => {
    updateListingStatus(id, 'active');
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'active', rejection_reason: '' } : item))
    );
    showToast("L'annonce a été approuvée et mise en ligne avec succès !");
    if (mediaAuditModal && mediaAuditModal.id === id) {
      setMediaAuditModal((prev) => ({ ...prev, status: 'active', rejection_reason: '' }));
    }
  };

  const handleOpenRejectionModal = (listing) => {
    setRejectionModalListing(listing);
    setRejectionPresetReason('Photos floues, sombres ou résolution insuffisante (Non conforme 1080p)');
    setRejectionCustomNote('');
  };

  const handleConfirmRejection = () => {
    if (!rejectionModalListing) return;
    const finalReason = rejectionCustomNote.trim()
      ? `${rejectionPresetReason} — ${rejectionCustomNote.trim()}`
      : rejectionPresetReason;

    updateListingStatus(rejectionModalListing.id, 'refused', finalReason);
    setListings((prev) =>
      prev.map((item) =>
        item.id === rejectionModalListing.id
          ? { ...item, status: 'refused', rejection_reason: finalReason }
          : item
      )
    );
    showToast(`Annonce refusée : motif de non-conformité notifié.`);
    setRejectionModalListing(null);
    if (mediaAuditModal && mediaAuditModal.id === rejectionModalListing.id) {
      setMediaAuditModal((prev) => ({ ...prev, status: 'refused', rejection_reason: finalReason }));
    }
  };

  const handleDeleteListingItem = (id, title) => {
    if (window.confirm(`Retirer définitivement l'annonce "${title}" de Bénin Beyond ?`)) {
      deleteListing(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
      showToast(`L'annonce "${title}" a été supprimée.`);
      if (mediaAuditModal && mediaAuditModal.id === id) {
        setMediaAuditModal(null);
      }
    }
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

  const handleApprovePayout = (payoutId) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'approved' } : p))
    );
    showToast(`Virement Mobile Money validé pour le partenaire !`);
  };

  const handleRejectPayout = (payoutId) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: 'rejected' } : p))
    );
    showToast(`Demande de versement rejetée.`);
  };

  const handleVerifyPartnerKyc = (partnerId) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, kycStatus: 'verified' } : p))
    );
    if (selectedKycModal && selectedKycModal.id === partnerId) {
      setSelectedKycModal((prev) => ({ ...prev, kycStatus: 'verified' }));
    }
    showToast('Partenaire certifié conforme (KYC validé).');
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

  const navItems = [
    { key: 'cockpit', label: 'Tour de Contrôle', icon: faCrown },
    {
      key: 'moderation',
      label: 'Modération Catalogue',
      icon: faShieldHalved,
      badge: platformMetrics.pendingListingsCount > 0 ? `${platformMetrics.pendingListingsCount} en attente` : `${listings.length} biens`
    },
    {
      key: 'reservations',
      label: 'Réservations Globales',
      icon: faCalendarCheck,
      badge: platformMetrics.pendingBookingsCount > 0 ? `${platformMetrics.pendingBookingsCount} à valider` : null
    },
    {
      key: 'partners',
      label: 'Hôtes & Partenaires',
      icon: faUsers,
      badge: platformMetrics.pendingKycCount > 0 ? `${platformMetrics.pendingKycCount} audit KYC` : null
    },
    { key: 'finances', label: 'Trésorerie & Commissions', icon: faWallet },
    { key: 'packs', label: 'Formules & Packs', icon: faLayerGroup }
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
      {/* 1. SIDEBAR NAVIGATION (Dark Luxury Green - STRICTLY PINNED) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 h-screen bg-secondary text-secondary-foreground transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0 flex flex-col justify-between border-r border-foreground/10 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Logo & Close button on Mobile */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-secondary-foreground/10 shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                Bénin Beyond
              </span>
              <span className="rounded-full bg-accent/20 border border-accent/40 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                Admin Cockpit
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-secondary-foreground/60 hover:text-white"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>
          </div>

          {/* Admin Profile Card */}
          <div className="p-4 mx-4 my-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 shrink-0">
            <div className="h-10 w-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-heading font-bold text-accent">
              <FontAwesomeIcon icon={faCrown} className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.name || 'Direction Plateforme'}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Superviseur Général</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = currentSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setCurrentSection(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg font-semibold'
                      : 'text-secondary-foreground/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon
                      icon={item.icon}
                      className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-secondary-foreground/60'}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-black/30 text-white'
                          : 'bg-accent/20 text-accent border border-accent/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Links (Strictly Pinned at the Bottom) */}
        <div className="p-4 border-t border-secondary-foreground/10 space-y-2 shrink-0 bg-secondary">
          <Link
            to="/dashboard/partner"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-secondary-foreground/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBuilding} className="h-3.5 w-3.5 text-accent" />
              <span>Espace Propriétaire</span>
            </div>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 text-secondary-foreground/40" />
          </Link>

          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-secondary-foreground/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5 text-accent" />
              <span>Voir le site public</span>
            </div>
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 text-secondary-foreground/40" />
          </Link>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER - INDEPENDENT FLUID SCROLL */}
      {/* ========================================================================= */}
      <main className="flex-1 h-screen overflow-y-auto min-w-0 flex flex-col scroll-smooth">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-foreground/10 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg border border-foreground/10 text-foreground hover:bg-muted"
            >
              <FontAwesomeIcon icon={faBars} className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">
                {navItems.find((n) => n.key === currentSection)?.label || 'Administration'}
              </h1>
              <p className="text-[11px] text-foreground/60">
                Portail de gouvernance opérationnelle & financière Bénin Beyond
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {platformMetrics.pendingBookingsCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-800">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>{platformMetrics.pendingBookingsCount} réservation(s) à modérer</span>
              </span>
            )}
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 rounded-xl border border-foreground/15 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary transition-colors"
            >
              <span>Catalogue</span>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3 text-foreground/40" />
            </Link>
          </div>
        </header>

        {/* Feedback Toast */}
        {toastMessage && (
          <div className="m-6 mb-0 rounded-2xl bg-primary/15 border border-primary/30 p-4 text-xs font-semibold text-primary flex items-center gap-2 animate-fadeIn">
            <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Section Content */}
        <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">

          {/* ========================================================================= */}
          {/* SECTION 1: COCKPIT MACRO (TOUR DE CONTRÔLE) */}
          {/* ========================================================================= */}
          {currentSection === 'cockpit' && (
            <div className="space-y-8">
              {/* Macro KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
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
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <FontAwesomeIcon icon={faArrowTrendUp} className="h-3 w-3" />
                    <span>+24.5% vs mois précédent</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="caption text-[11px] uppercase tracking-wider text-foreground/75 font-semibold">
                      Commissions Bénin Beyond (15%)
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

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
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

                <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
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

              {/* Monthly Trend Visual Bar Chart */}
              <div className="rounded-3xl border border-foreground/10 bg-card p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Croissance Mensuelle du Volume d'Affaires & Commissions
                    </h3>
                    <p className="text-xs text-foreground/60 mt-0.5">
                      Progression continue des transactions sur le littoral béninois
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-primary" />
                      <span className="text-foreground/70 font-medium">GMV Total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-md bg-accent" />
                      <span className="text-foreground/70 font-medium">Commission 15%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3 sm:gap-6 items-end pt-8 pb-2 border-b border-foreground/10 h-64">
                  {MONTHLY_STATS.map((stat, idx) => {
                    const heightPercent = Math.min(100, Math.round((stat.gmv / 15000000) * 100));
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] font-bold text-foreground/60 hidden sm:block">
                          {Math.round(stat.gmv / 1000000 * 10) / 10}M
                        </span>
                        <div className="w-full max-w-[50px] bg-muted/60 rounded-xl overflow-hidden flex flex-col justify-end p-1 relative h-full">
                          <div
                            className="w-full bg-primary rounded-lg transition-all duration-500"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground/80">
                          {stat.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Action Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => setCurrentSection('moderation')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group"
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
                  onClick={() => setCurrentSection('reservations')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group"
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
                  onClick={() => setCurrentSection('partners')}
                  className="cursor-pointer rounded-2xl border border-foreground/10 bg-card p-5 hover:border-primary/50 transition-all group"
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: MODÉRATION DU CATALOGUE */}
          {/* ========================================================================= */}
          {currentSection === 'moderation' && (
            <div className="space-y-6">
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
            <div className="space-y-6">
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
                        <th className="p-4">Com. Bénin Beyond (15%)</th>
                        <th className="p-4">Net Hôte (85%)</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {filteredBookings.map((b) => {
                        const gross = Number(b.gross_amount) || 0;
                        const comm = Number(b.commission_amount) || Math.round(gross * 0.15);
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
            <div className="space-y-8">
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
                  {payouts.map((po) => (
                    <div
                      key={po.id}
                      className="rounded-2xl border border-foreground/10 bg-background/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{po.partnerName}</span>
                          <span className="text-xs text-foreground/60">({po.company})</span>
                        </div>
                        <p className="text-xs text-foreground/70 mt-1">
                          Canal : <strong className="text-primary">{po.method}</strong> • Bénéficiaire : <span className="font-mono">{po.recipient}</span>
                        </p>
                        <p className="text-[11px] text-foreground/40 mt-0.5">
                          Date demande : {po.date}
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
                  ))}
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
                        <th className="p-4">Pièces Fournies</th>
                        <th className="p-4">Statut KYC</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {partners.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-bold text-foreground">
                            {p.name}
                          </td>
                          <td className="p-4 text-foreground/80">
                            {p.company}
                          </td>
                          <td className="p-4">
                            <p className="text-foreground/80">{p.phone}</p>
                            <p className="text-[11px] text-foreground/50">{p.email}</p>
                          </td>
                          <td className="p-4 text-foreground/70 font-medium">
                            {p.docType}
                          </td>
                          <td className="p-4">
                            {p.kycStatus === 'verified' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                                <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
                                Certifié Conforme
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">
                                <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                                Audit en attente
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {p.kycStatus === 'pending' ? (
                              <button
                                onClick={() => handleVerifyPartnerKyc(p.id)}
                                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90 transition-colors shadow-sm"
                              >
                                Valider KYC
                              </button>
                            ) : (
                              <span className="text-[11px] text-foreground/40 font-semibold">
                                Validé
                              </span>
                            )}
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
          {/* SECTION 5: TRÉSORERIE & COMMISSIONS */}
          {/* ========================================================================= */}
          {currentSection === 'finances' && (
            <div className="space-y-8">
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
                    <span className="text-xs font-bold uppercase tracking-wider">Commissions Bénin Beyond (15%)</span>
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
                    <span className="text-xs font-bold uppercase tracking-wider">Reversements Hôtes (85%)</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <span className="text-xs font-bold text-amber-500">MTN Mobile Money</span>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">54%</p>
                    <p className="text-[11px] text-foreground/50">Canal N°1 au Bénin</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <span className="text-xs font-bold text-blue-600">Carte Visa / Mastercard</span>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">26%</p>
                    <p className="text-[11px] text-foreground/50">Diaspora & Touristes</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <span className="text-xs font-bold text-emerald-600">Celtiis Cash</span>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">12%</p>
                    <p className="text-[11px] text-foreground/50">Réseau national</p>
                  </div>
                  <div className="rounded-2xl border border-foreground/10 bg-background/50 p-4">
                    <span className="text-xs font-bold text-blue-400">Moov Money</span>
                    <p className="font-heading text-xl font-bold text-foreground mt-1">8%</p>
                    <p className="text-[11px] text-foreground/50">Opérateur Flooz</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-foreground/10 flex items-center justify-between">
                  <span className="text-xs text-foreground/60">
                    Exportation comptable certifiée conforme au droit Ohada / République du Bénin
                  </span>
                  <button
                    onClick={() => showToast('Relevé comptable mensuel (PDF/CSV) généré avec succès.')}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/95 transition-all"
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                    <span>Télécharger Relevé Comptable</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 6: FORMULES & PACKS SIGNATURE */}
          {/* ========================================================================= */}
          {currentSection === 'packs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Gestion des Formules & Packs Signature
                  </h3>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    Offres combinées réunissant hébergement, véhicule avec chauffeur et expériences
                  </p>
                </div>
                <button
                  onClick={() => showToast('Création de pack bientôt disponible dans la prochaine version.')}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                >
                  + Créer un nouveau Pack
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packs.map((pk) => (
                  <div
                    key={pk.id}
                    className="rounded-3xl border border-foreground/10 bg-card overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 w-full overflow-hidden">
                        <img
                          src={pk.included?.[0]?.image || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80'}
                          alt={pk.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-accent uppercase">
                          {pk.location}
                        </div>
                      </div>

                      <div className="p-5">
                        <h4 className="font-heading text-base font-bold text-foreground">
                          {pk.title}
                        </h4>
                        <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                          {pk.tagline}
                        </p>

                        <div className="mt-4 pt-4 border-t border-foreground/10 space-y-1.5 text-xs text-foreground/80">
                          {pk.included?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-accent shrink-0" />
                              <span className="line-clamp-1">{it.type} : {it.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-foreground/10 mt-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-foreground/50 uppercase">Tarif combiné</span>
                        <p className="font-heading text-base font-black text-primary">
                          {formatPrice(pk.price)} <span className="text-xs font-normal text-foreground/60">/ {pk.priceUnit}</span>
                        </p>
                      </div>

                      <Link
                        to={`/pack/${pk.id}`}
                        className="rounded-xl border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary transition-colors"
                      >
                        Voir la fiche
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MODAL REÇU / CONCIERGERIE OFFICIEL */}
      {/* ========================================================================= */}
      {selectedBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedBookingModal(null)}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground"
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
                <span>Commission Bénin Beyond (15%) :</span>
                <span>+{formatPrice(selectedBookingModal.commission_amount || Math.round(selectedBookingModal.gross_amount * 0.15))}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-sm pt-1 border-t border-foreground/10">
                <span>Net Partenaire à reverser (85%) :</span>
                <span>{formatPrice(selectedBookingModal.net_amount || (selectedBookingModal.gross_amount - Math.round(selectedBookingModal.gross_amount * 0.15)))}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Imprimer le Reçu
              </button>
              <button
                onClick={() => setSelectedBookingModal(null)}
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/95 transition-all shadow-md"
              >
                Fermer
              </button>
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
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow border border-foreground/10">
                  <video
                    src={mediaAuditModal.video_url}
                    controls
                    className="w-full h-full object-contain"
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

    </div>
  );
}
