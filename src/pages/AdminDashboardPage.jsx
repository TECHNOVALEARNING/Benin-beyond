import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Car, 
  Users, 
  ShoppingBag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  ArrowUpRight, 
  Eye, 
  Filter 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { getListings, deleteListing } from '../services/listingService';
import { ScrollReveal } from '../components/ScrollReveal';

const INITIAL_RESERVATIONS = [
  {
    id: 'RES-8921',
    client: 'Jean-Marc Dupont',
    itemTitle: 'Villa Cotonou Riviera',
    category: 'stay',
    dates: '20 — 25 Sept 2026',
    amount: 425000,
    status: 'confirmed' // 'confirmed' | 'pending' | 'completed'
  },
  {
    id: 'RES-8922',
    client: 'Nadia Benali',
    itemTitle: 'SUV Toyota Fortuner VIP',
    category: 'drive',
    dates: '22 — 24 Sept 2026',
    amount: 90000,
    status: 'pending'
  },
  {
    id: 'RES-8923',
    client: 'Koffi Mensah',
    itemTitle: 'Pack Cotonou Riviera & 4x4 VIP',
    category: 'pack',
    dates: '28 Sept — 03 Oct 2026',
    amount: 680000,
    status: 'confirmed'
  },
  {
    id: 'RES-8924',
    client: 'Élodie Laurent',
    itemTitle: 'Ganvié — Cité lacustre',
    category: 'discover',
    dates: '26 Sept 2026',
    amount: 56000,
    status: 'completed'
  }
];

const INITIAL_PARTNERS = [
  {
    id: 'part_01',
    name: 'Patrice Hounkpati',
    company: 'Littoral Prestige Assets',
    email: 'proprietaire@beninbeyond.bj',
    listingsCount: 3,
    kycStatus: 'verified',
    joined: 'Août 2026'
  },
  {
    id: 'part_02',
    name: 'Armel Dossou',
    company: 'Cotonou VIP Rental',
    email: 'armel.d@rentcar-benin.com',
    listingsCount: 2,
    kycStatus: 'verified',
    joined: 'Juillet 2026'
  },
  {
    id: 'part_03',
    name: 'Claire Ahouandjinou',
    company: 'Ouidah Heritage Lodges',
    email: 'claire@ouidah-lodges.bj',
    listingsCount: 2,
    kycStatus: 'pending',
    joined: 'Septembre 2026'
  }
];

export function AdminDashboardPage() {
  const { user, isDemoMode, loginAsDemo } = useAuth();

  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'reservations' | 'partners'
  const [listings, setListings] = useState([]);
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [partners, setPartners] = useState(INITIAL_PARTNERS);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await getListings();
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const toggleListingStatus = (id) => {
    setListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newStatus = item.status === 'suspended' ? 'active' : 'suspended';
          return { ...item, status: newStatus };
        }
        return item;
      })
    );
    showToast('Statut de l’annonce mis à jour avec succès.');
  };

  const handleDeleteListing = (id, title) => {
    if (window.confirm(`Supprimer l'annonce "${title}" de la plateforme ?`)) {
      deleteListing(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
      showToast(`Annonce "${title}" supprimée.`);
    }
  };

  const updateReservationStatus = (resId, newStatus) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );
    showToast(`Réservation ${resId} marquée comme "${newStatus}".`);
  };

  const handleSimulateNewBooking = () => {
    const randomRes = {
      id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
      client: 'Marc V. (Client Test Démo)',
      itemTitle: 'Villa Contemporaine & Chauffeur Privé',
      category: 'stay',
      dates: '02 — 06 Octobre 2026',
      amount: 390000,
      status: 'confirmed'
    };
    setReservations((prev) => [randomRes, ...prev]);
    showToast('Nouvelle réservation démo simulée (+390 000 FCFA) !');
  };

  const totalRevenue = reservations.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 1. Admin Demo Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary text-white px-6 py-3 md:px-12 shadow-md">
        <div className="mx-auto flex max-w-8xl flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-accent">
              Mode Démo Administrateur Actif
            </span>
            <span className="hidden sm:inline text-white/70">
              • Vous disposez des droits complets de supervision, modération et test en direct.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateNewBooking}
              className="flex items-center gap-1 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-[11px] font-semibold text-white transition-all backdrop-blur-md active:scale-95"
            >
              <Sparkles className="h-3 w-3 text-accent" />
              <span>Simuler une réservation VIP</span>
            </button>
            <Link
              to="/"
              className="rounded-full bg-black/30 hover:bg-black/50 px-3 py-1 text-[11px] font-medium text-white/90 transition-colors"
            >
              Retour au site client
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Header */}
      <div className="border-b border-foreground/10 bg-card/60 backdrop-blur-md px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-8xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Portail Administration & Modération
              </h1>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-mono font-bold text-primary">
                v2.4 Live
              </span>
            </div>
            <p className="text-xs text-foreground/60 mt-1">
              Supervision des annonces, réservations clients et partenaires du Bénin
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/partner"
              className="flex items-center gap-1.5 rounded-full border border-foreground/15 bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Building2 className="h-4 w-4 text-accent" />
              <span>Vue Propriétaire</span>
            </Link>

            <Link
              to="/explore"
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/95 shadow-md transition-colors"
            >
              <span>Catalogue Client</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-8xl px-6 pt-8 md:px-12">
        {/* Toast alert */}
        {toastMessage && (
          <div className="mb-6 rounded-2xl bg-primary/15 border border-primary/30 p-4 text-xs font-semibold text-primary flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 3. Platform Metric KPIs */}
        <ScrollReveal delay={0} y={15}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Volume d'affaires global</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {formatPrice(totalRevenue)}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                +38% vs trimestre précédent
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Réservations gérées</span>
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {reservations.length}
              </p>
              <p className="text-[11px] text-foreground/60 mt-1">
                {reservations.filter((r) => r.status === 'pending').length} en attente de confirmation
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Biens & Flottes en ligne</span>
                <Building2 className="h-4 w-4 text-accent" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {listings.length}
              </p>
              <p className="text-[11px] text-foreground/60 mt-1">
                Villas, voitures et découvertes
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Propriétaires certifiés</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {partners.length}
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">
                100% audités par nos soins
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* 4. Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-foreground/10 pb-4 mb-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === 'moderation'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Modération des Annonces ({listings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === 'reservations'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Réservations Clients ({reservations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${
              activeTab === 'partners'
                ? 'bg-primary text-white shadow-sm'
                : 'text-foreground/70 hover:bg-muted hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Partenaires & Hôtes ({partners.length})</span>
          </button>
        </div>

        {/* 5. TAB CONTENT: Modération des Annonces */}
        {activeTab === 'moderation' && (
          <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-foreground">
                Toutes les annonces soumises sur la plateforme
              </h3>
              <button
                onClick={loadListings}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Actualiser la liste</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Visuel & Titre</th>
                    <th className="p-4">Catégorie</th>
                    <th className="p-4">Localisation</th>
                    <th className="p-4">Tarif</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {listings.map((item) => {
                    const isSuspended = item.status === 'suspended';
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=150&q=80'}
                              alt={item.title}
                              className="h-12 w-14 rounded-xl object-cover border border-foreground/10 shrink-0"
                            />
                            <div>
                              <span className="font-heading text-sm font-bold text-foreground line-clamp-1">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-foreground/50 font-mono">
                                ID: {item.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                            {item.type === 'stay' ? 'Villa / Séjour' : item.type === 'drive' ? 'Véhicule' : 'Expérience'}
                          </span>
                        </td>

                        <td className="p-4 text-foreground/80">
                          {item.location}
                        </td>

                        <td className="p-4 font-bold text-foreground">
                          {formatPrice(item.price)}
                          <span className="text-[10px] font-normal text-foreground/60 ml-1">
                            / {item.price_unit}
                          </span>
                        </td>

                        <td className="p-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold text-destructive">
                              <XCircle className="h-3 w-3" />
                              Suspendue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Approuvée & En Ligne
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleListingStatus(item.id)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                isSuspended
                                  ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                                  : 'border-amber-600/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
                              }`}
                            >
                              {isSuspended ? 'Réactiver' : 'Suspendre'}
                            </button>
                            <button
                              onClick={() => handleDeleteListing(item.id, item.title)}
                              className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition-colors"
                              title="Supprimer définitivement"
                            >
                              <XCircle className="h-3.5 w-3.5" />
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
        )}

        {/* 6. TAB CONTENT: Réservations Clients */}
        {activeTab === 'reservations' && (
          <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-foreground">
                Suivi des commandes & réservations en direct
              </h3>
              <button
                onClick={handleSimulateNewBooking}
                className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Simuler réservation client</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Réf. Commande</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Prestation réservée</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Montant total</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Modifier statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-foreground">
                        {res.id}
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        {res.client}
                      </td>
                      <td className="p-4">
                        <span className="font-heading text-xs font-bold text-foreground">
                          {res.itemTitle}
                        </span>
                      </td>
                      <td className="p-4 text-foreground/70">
                        {res.dates}
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        {formatPrice(res.amount)}
                      </td>
                      <td className="p-4">
                        {res.status === 'confirmed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            Confirmée & Payée
                          </span>
                        )}
                        {res.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                            En attente de virement
                          </span>
                        )}
                        {res.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-bold text-foreground/70">
                            Séjour terminé
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={res.status}
                          onChange={(e) => updateReservationStatus(res.id, e.target.value)}
                          className="rounded-lg border border-foreground/15 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="confirmed">Confirmée</option>
                          <option value="pending">En attente</option>
                          <option value="completed">Terminée</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. TAB CONTENT: Partenaires & Propriétaires */}
        {activeTab === 'partners' && (
          <div className="rounded-2xl border border-foreground/10 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-foreground/10">
              <h3 className="font-heading text-base font-bold text-foreground">
                Annuaire des Propriétaires & Fournisseurs agréés
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-foreground/70 border-b border-foreground/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Nom du Partenaire</th>
                    <th className="p-4">Société / Enseigne</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Biens actifs</th>
                    <th className="p-4">Vérification KYC</th>
                    <th className="p-4">Date d'inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        {p.name}
                      </td>
                      <td className="p-4 text-foreground/80">
                        {p.company}
                      </td>
                      <td className="p-4 text-foreground/60 font-mono">
                        {p.email}
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                          {p.listingsCount} annonces
                        </span>
                      </td>
                      <td className="p-4">
                        {p.kycStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            Certifié conforme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                            <Clock className="h-4 w-4" />
                            Dossier en révision
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-foreground/60">
                        {p.joined}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
