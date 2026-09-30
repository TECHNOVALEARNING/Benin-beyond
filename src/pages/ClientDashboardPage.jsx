import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBagShopping,
  faTicket,
  faUser,
  faCircleCheck,
  faHouse,
  faCar,
  faLayerGroup,
  faPhone,
  faCompass,
  faRightFromBracket,
  faArrowRight,
  faLocationDot,
  faPrint,
  faArrowUpRightFromSquare,
  faXmark,
  faShieldHalved,
  faStar,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { getBookings } from '../services/bookingService';
import { submitReview } from '../services/reviewService';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';
import { getTimeBasedGreeting } from '../utils/dateUtils';
import { BrandIcon } from '../components/BrandLogo';

export function ClientDashboardPage() {
  const { user, logout, upgradeToOwner } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'profile' | 'discoveries'
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const getSafeString = (val, fallback = '') => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.name || val.title || val.full_name || fallback;
    }
    return String(val);
  };

  const formatDateSafe = (dateVal) => {
    if (!dateVal) return 'Date récente';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Date récente';
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Date récente';
    }
  };

  // Editable profile state
  const [profileName, setProfileName] = useState(() => getSafeString(user?.name, ''));
  const [profilePhone, setProfilePhone] = useState(() => getSafeString(user?.phone, '+229 97 00 00 00'));
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/client' } } });
    } else if (user.role === 'admin' || user.role === 'subadmin') {
      navigate('/admin', { replace: true });
    } else if (user.role === 'owner' || user.role === 'partner') {
      navigate('/dashboard/partner', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getBookings()
      .then((all) => {
        if (!mounted) return;
        // Filter by user's email or display all user's local orders
        const filtered = all.filter((b) => {
          if (!user?.email) return false;
          const userEmail = user.email.toLowerCase().trim();
          const bookingEmail = (b.customer_email || '').toLowerCase().trim();
          const bookingUserId = b.user_id || b.client_id;
          return bookingEmail === userEmail || (bookingUserId && bookingUserId === user.id);
        });
        setUserBookings(filtered);
      })
      .catch((err) => {
        console.warn('Erreur chargement réservations client:', err);
        if (mounted) setUserBookings([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    booking: null,
    rating: 5,
    comment: '',
    submitted: false,
    submitting: false
  });

  const handleOpenReviewModal = (booking) => {
    setReviewModal({
      isOpen: true,
      booking,
      rating: 5,
      comment: '',
      submitted: false,
      submitting: false
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.booking || !reviewModal.comment.trim()) return;

    setReviewModal((prev) => ({ ...prev, submitting: true }));
    await submitReview({
      booking_id: reviewModal.booking.id || reviewModal.booking.booking_ref,
      listing_id: reviewModal.booking.listing_id,
      author_name: user?.name || reviewModal.booking.customer_name || 'Voyageur Bénin Beyond',
      author_email: user?.email || reviewModal.booking.customer_email || '',
      rating: reviewModal.rating,
      comment: reviewModal.comment.trim()
    });

    setReviewModal((prev) => ({
      ...prev,
      submitting: false,
      submitted: true
    }));

    setTimeout(() => {
      setReviewModal({
        isOpen: false,
        booking: null,
        rating: 5,
        comment: '',
        submitted: false,
        submitting: false
      });
    }, 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-xs text-foreground/60">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  const displayName = getSafeString(user?.name, 'Voyageur');
  const displayEmail = getSafeString(user?.email, 'client@beninbeyond.com');
  const totalSpent = userBookings.reduce((sum, b) => sum + (Number(b.total_amount) || Number(b.gross_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-muted/20 text-foreground pb-24">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
              <BrandIcon size={28} />
              <span>Bénin Beyond</span>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              Espace Voyageur
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/explore"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 transition-all"
            >
              <FontAwesomeIcon icon={faCompass} className="h-3.5 w-3.5" />
              <span>Explorer le catalogue</span>
            </Link>

            <div className="flex items-center gap-2 border-l border-foreground/10 pl-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-none">{displayName}</p>
                  <p className="text-[11px] text-foreground/50 leading-tight truncate max-w-[140px]">{displayEmail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Se déconnecter"
                className="ml-2 px-3 py-1.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Banner & Metrics Overview */}
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <ScrollReveal delay={0} y={15}>
          <div className="relative overflow-hidden rounded-3xl bg-secondary text-secondary-foreground p-6 sm:p-10 shadow-xl">
            <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="caption text-accent font-semibold tracking-widest text-xs uppercase mb-2 inline-block">
                  Tableau de bord personnel
                </span>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {getTimeBasedGreeting()}, {displayName}
                </h1>
                <p className="mt-1 text-sm text-secondary-foreground/75 max-w-xl">
                  Retrouvez l’ensemble de vos réservations, téléchargez vos reçus officiels et préparez vos déplacements au Bénin en toute sérénité.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="rounded-2xl bg-white/10 backdrop-blur-md px-5 py-3 border border-white/10 text-center">
                  <span className="block font-heading text-2xl font-black text-white">
                    {userBookings.length}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-white/70">Réservation(s)</span>
                </div>

                <div className="rounded-2xl bg-white/10 backdrop-blur-md px-5 py-3 border border-white/10 text-center">
                  <span className="block font-heading text-xl sm:text-2xl font-black text-accent">
                    {formatPrice(totalSpent)}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-white/70">Total investi</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* 3. Navigation Tabs */}
        <div className="mt-8 flex border-b border-foreground/10 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faBagShopping} className="h-3.5 w-3.5" />
              <span>Mes Réservations ({userBookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
              <span>Mon Profil</span>
            </button>

            <button
              onClick={() => setActiveTab('discoveries')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'discoveries'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <FontAwesomeIcon icon={faCompass} className="h-4 w-4" />
              <span>Guide & Découvertes</span>
            </button>
          </div>
        </div>

        {/* 4. Tab Content */}
        <div className="mt-6">
          {/* TAB: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-44 rounded-2xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : userBookings.length === 0 ? (
                <div className="rounded-3xl border border-foreground/10 bg-card p-12 text-center shadow-sm">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                    <FontAwesomeIcon icon={faBagShopping} className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-lg font-bold">Aucune réservation pour le moment</h3>
                  <p className="mt-1 text-sm text-foreground/60 max-w-md mx-auto">
                    Vous n'avez pas encore effectué de commande. Explorez notre catalogue d'hébergements de prestige, de véhicules vérifiés ou nos formules packs.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link
                      to="/explore"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                    >
                      <span>Parcourir le catalogue</span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to="/packs"
                      className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-6 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-all"
                    >
                      <FontAwesomeIcon icon={faLayerGroup} className="h-3 w-3 text-accent" />
                      <span>Formules & Packs</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userBookings.map((b) => {
                    const price = b.total_amount || b.gross_amount || 0;
                    const isConfirmed = b.status === 'confirmed';

                    return (
                      <div
                        key={b.id || b.booking_ref}
                        className="rounded-3xl border border-foreground/10 bg-card p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          {/* Header card with status and ref */}
                          <div className="flex items-center justify-between border-b border-foreground/5 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-foreground/80">
                                {b.booking_ref}
                              </span>
                              <span className="text-[11px] text-foreground/40">·</span>
                              <span className="text-[11px] text-foreground/50">
                                {formatDateSafe(b.created_at)}
                              </span>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 ${
                                isConfirmed
                                  ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              }`}
                            >
                              <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                              <span>{isConfirmed ? 'Confirmée' : 'En attente'}</span>
                            </span>
                          </div>

                          {/* Items summary */}
                          <div className="mt-4 flex gap-4 items-center">
                            {b.listing_image || b.items?.[0]?.image ? (
                              <img
                                src={b.listing_image || b.items?.[0]?.image}
                                alt="Item thumbnail"
                                className="h-20 w-20 rounded-2xl object-cover shrink-0 border border-foreground/10"
                              />
                            ) : (
                              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <FontAwesomeIcon icon={faHouse} className="h-8 w-8" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h4 className="font-heading text-sm font-bold text-foreground truncate">
                                {b.listing_title || b.items?.[0]?.title || 'Réservation Bénin Beyond'}
                              </h4>
                              {b.location && (
                                <p className="mt-0.5 text-xs text-foreground/60 flex items-center gap-1 truncate">
                                  <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-accent shrink-0" />
                                  <span>{b.location}</span>
                                </p>
                              )}
                              <p className="mt-1 text-xs text-foreground/60">
                                {b.dates || 'Séjour / Prestation certifiée'}
                              </p>
                              <p className="mt-1 text-sm font-bold text-primary">
                                {formatPrice(price)}
                              </p>
                            </div>
                          </div>

                          {/* Additional items if packed */}
                          {b.items && b.items.length > 1 && (
                            <div className="mt-3 rounded-xl bg-muted/40 p-2 text-xs text-foreground/70">
                              <span className="font-semibold">+ {b.items.length - 1} autre(s) prestation(s) incluse(s)</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-6 pt-4 border-t border-foreground/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedVoucher(b)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 px-4 py-2 text-xs font-semibold text-foreground transition-all"
                            >
                              <FontAwesomeIcon icon={faPrint} className="h-3.5 w-3.5" />
                              <span>Voucher & Reçu</span>
                            </button>
                            <button
                              onClick={() => handleOpenReviewModal(b)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 hover:bg-accent hover:text-black border border-accent/40 px-3.5 py-2 text-xs font-semibold text-accent transition-all shadow-xs"
                              title="Partager votre expérience et laisser un avis vérifié"
                            >
                              <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                              <span>Donner mon avis</span>
                            </button>
                          </div>

                          {b.listing_id && (
                            <Link
                              to={`/listing/${b.listing_id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>Détails du bien</span>
                              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="rounded-3xl border border-foreground/10 bg-card p-6 sm:p-10 shadow-md max-w-2xl">
              <h3 className="font-heading text-lg font-bold">Informations Personnelles</h3>
              <p className="text-xs text-foreground/60 mt-1">
                Gérez vos coordonnées pour simplifier vos futures réservations et vos factures.
              </p>

              {profileSaved && (
                <div className="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
                  <span>Vos informations ont été mises à jour avec succès !</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">
                    Adresse e-mail (liée à vos réservations)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={displayEmail}
                    className="w-full rounded-xl border border-foreground/10 bg-muted/60 px-4 py-2.5 text-sm text-foreground/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-1">
                    Numéro de téléphone (pour confirmation WhatsApp / SMS)
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-7 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: DISCOVERIES */}
          {activeTab === 'discoveries' && (
            <div className="rounded-3xl border border-foreground/10 bg-card p-6 sm:p-10 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-foreground/10 pb-4">
                <div>
                  <h3 className="font-heading text-lg font-bold">Incontournables & Bonnes Tables</h3>
                  <p className="text-xs text-foreground/60 mt-0.5">
                    Explorez les monuments et les restaurants locaux recommandés pour sublimer votre passage au Bénin.
                  </p>
                </div>
                <Link
                  to="/decouvertes"
                  className="inline-flex items-center gap-2 rounded-full bg-accent/20 text-accent font-semibold px-4 py-2 text-xs hover:bg-accent/30 transition-all"
                >
                  <FontAwesomeIcon icon={faCompass} className="h-3.5 w-3.5" />
                  <span>Voir toutes les découvertes</span>
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-foreground/10 overflow-hidden bg-background p-4 hover:shadow-lg transition-all">
                  <div className="h-32 rounded-xl overflow-hidden mb-3">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                      alt="Restaurant Canala"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Gastronomie · Cotonou</span>
                  <h4 className="font-heading text-sm font-bold mt-1">Le Jardin de Canala</h4>
                  <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                    Poissons braisés du jour, cocktails frais et cadre végétal feutré à Haie Vive.
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 overflow-hidden bg-background p-4 hover:shadow-lg transition-all">
                  <div className="h-32 rounded-xl overflow-hidden mb-3">
                    <img
                      src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
                      alt="Ouidah"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Histoire · Ouidah</span>
                  <h4 className="font-heading text-sm font-bold mt-1">La Porte du Non-Retour</h4>
                  <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                    Mémorial face à l'océan Atlantique et balade sur la mythique Route des Esclaves.
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 overflow-hidden bg-background p-4 hover:shadow-lg transition-all">
                  <div className="h-32 rounded-xl overflow-hidden mb-3">
                    <img
                      src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80"
                      alt="Ganvié"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Nature · Lac Nokoué</span>
                  <h4 className="font-heading text-sm font-bold mt-1">Ganvié sur Pilotis</h4>
                  <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
                    Excursion en pirogue à l'aube sur le lac et marché flottant traditionnel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Printable Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-card border border-foreground/10 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedVoucher(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors no-print"
            >
              <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
            </button>

            {/* Voucher Body (Print-ready) */}
            <div id="printable-voucher" className="printable-receipt border-2 border-dashed border-foreground/20 rounded-2xl p-6 bg-background">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-foreground/10 pb-4">
                <div>
                  <h3 className="font-heading text-xl font-black tracking-tight text-foreground">
                    Bénin Beyond
                  </h3>
                  <p className="text-[11px] text-foreground/60">Pass Voyageur & Justificatif Officiel</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-primary block">
                    {selectedVoucher.booking_ref}
                  </span>
                  <span className="inline-block rounded-full bg-emerald-500/15 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold mt-1">
                    RÉSERVATION VALIDÉE
                  </span>
                </div>
              </div>

              {/* Details Table */}
              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Voyageur :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.customer_name || user?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">E-mail / Contact :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.customer_email || user?.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Téléphone :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.customer_phone || '+229 97 00 00 00'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Prestation :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.listing_title || selectedVoucher.items?.[0]?.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Lieu / Destination :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.location || 'Bénin (Littoral)'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Période :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.dates || 'Selon calendrier convenu'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-foreground/60">Mode de règlement :</span>
                  <span className="font-semibold text-foreground">{selectedVoucher.payment_method || 'Paiement Sécurisé'}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-bold text-primary">
                  <span>Montant Total Réglé :</span>
                  <span>{formatPrice(selectedVoucher.total_amount || selectedVoucher.gross_amount || 0)}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 rounded-xl bg-accent/10 border border-accent/20 p-3 text-[11px] text-foreground/80 flex items-start gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Présentez ce bon lors de votre arrivée ou auprès de votre chauffeur / concierge Bénin Beyond. Assistance 24/7 disponible.
                </span>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3 no-print">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="rounded-full px-5 py-2 text-xs font-semibold text-foreground/70 hover:bg-foreground/10"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-xs font-semibold text-white shadow-md hover:bg-primary/90 transition-all"
              >
                <FontAwesomeIcon icon={faPrint} className="h-3.5 w-3.5" />
                <span>Imprimer le voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Rédiger un avis client vérifié */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-card border border-foreground/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                  <FontAwesomeIcon icon={faStar} className="text-base" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Votre avis sur le séjour
                  </h3>
                  <p className="text-[11px] text-foreground/50">
                    Réf. {reviewModal.booking?.booking_ref}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-foreground/70 hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            {reviewModal.submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
                <h4 className="font-heading font-bold text-base text-foreground">
                  Merci pour votre retour d'expérience !
                </h4>
                <p className="text-xs text-foreground/60 max-w-xs mx-auto">
                  Votre avis vérifié a été enregistré avec succès et sera partagé avec la communauté Bénin Beyond.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-foreground/80 mb-1.5">
                    Bien concerné :
                  </p>
                  <p className="text-sm font-bold text-foreground bg-muted/40 p-2.5 rounded-xl border border-foreground/5">
                    {reviewModal.booking?.listing_title || 'Expérience Bénin Beyond'}
                  </p>
                </div>

                {/* Rating selection (1 to 5 stars) */}
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                    Votre note globale (sur 5) :
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewModal((prev) => ({ ...prev, rating: star }))}
                        className="p-1 text-2xl transition-transform hover:scale-110"
                      >
                        <FontAwesomeIcon
                          icon={faStar}
                          className={star <= reviewModal.rating ? 'text-accent' : 'text-foreground/20'}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-foreground ml-2">
                      {reviewModal.rating} / 5
                    </span>
                  </div>
                </div>

                {/* Comment textarea */}
                <div>
                  <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                    Votre commentaire & impressions :
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reviewModal.comment}
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Partagez votre avis sur l'accueil, la propreté, le confort, la localisation ou la ponctualité..."
                    className="w-full rounded-2xl border border-foreground/15 bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                    className="rounded-xl border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={reviewModal.submitting || !reviewModal.comment.trim()}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {reviewModal.submitting ? 'Envoi en cours…' : 'Publier mon avis'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
