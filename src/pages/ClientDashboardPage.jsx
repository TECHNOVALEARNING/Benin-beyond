import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  FileText,
  Printer,
  Compass,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  User,
  LogOut,
  X,
  ExternalLink,
  BedDouble,
  Car,
  UtensilsCrossed,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBagShopping,
  faTicket,
  faUser,
  faCircleCheck,
  faHouse,
  faCar,
  faLayerGroup,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { getBookings } from '../services/bookingService';
import { formatPrice } from '../data/initialListings';
import { ScrollReveal } from '../components/ScrollReveal';

export function ClientDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings' | 'profile' | 'discoveries'
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  // Editable profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+229 97 00 00 00');
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/client' } } });
    } else if (user.role === 'admin') {
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
          if (!user?.email) return true;
          return (
            b.customer_email?.toLowerCase() === user.email.toLowerCase() ||
            b.customer_name?.toLowerCase() === user.name?.toLowerCase()
          );
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

  const totalSpent = userBookings.reduce((sum, b) => sum + (Number(b.total_amount) || Number(b.gross_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-muted/20 text-foreground pb-24">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-heading text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
              Bénin Beyond
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
              <Compass className="h-3.5 w-3.5" />
              <span>Explorer le catalogue</span>
            </Link>

            <div className="flex items-center gap-2 border-l border-foreground/10 pl-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md">
                  {user?.name?.[0]?.toUpperCase() || 'V'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-none">{user?.name || 'Voyageur'}</p>
                  <p className="text-[11px] text-foreground/50 leading-tight truncate max-w-[140px]">{user?.email || 'client@beninbeyond.bj'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Se déconnecter"
                className="ml-2 p-1.5 rounded-lg text-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
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
                  Bonjour, {user?.name || 'Cher Voyageur'}
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
              <User className="h-4 w-4" />
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
              <Compass className="h-4 w-4" />
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
                      <ArrowRight className="h-3.5 w-3.5" />
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
                                {new Date(b.created_at || Date.now()).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1 ${
                                isConfirmed
                                  ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              }`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
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
                                  <MapPin className="h-3 w-3 text-accent shrink-0" />
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
                          <button
                            onClick={() => setSelectedVoucher(b)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 px-4 py-2 text-xs font-semibold text-foreground transition-all"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Voucher & Reçu</span>
                          </button>

                          {b.listing_id && (
                            <Link
                              to={`/listing/${b.listing_id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <span>Détails du bien</span>
                              <ExternalLink className="h-3 w-3" />
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
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
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
                    value={user?.email || 'client@beninbeyond.bj'}
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
                  <Compass className="h-3.5 w-3.5" />
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
              className="absolute right-4 top-4 rounded-full p-2 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Voucher Body (Print-ready) */}
            <div id="printable-voucher" className="border-2 border-dashed border-foreground/20 rounded-2xl p-6 bg-background">
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
                <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Présentez ce bon lors de votre arrivée ou auprès de votre chauffeur / concierge Bénin Beyond. Assistance 24/7 disponible.
                </span>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
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
                <Printer className="h-3.5 w-3.5" />
                <span>Imprimer le voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
