import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Building2, 
  Car, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Eye, 
  DollarSign, 
  MapPin, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  X, 
  ShieldCheck, 
  ArrowUpRight, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../data/initialListings';
import { addListing, deleteListing, getListings } from '../services/listingService';
import { ScrollReveal } from '../components/ScrollReveal';

const PRESET_PHOTOS = {
  stay: [
    { label: 'Villa Contemporaine Lagune', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Loft Océan Ouidah', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Appartement Standing Cotonou', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' }
  ],
  drive: [
    { label: 'SUV Toyota Fortuner VIP', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Berline Mercedes Luxe', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80' },
    { label: '4x4 Tout-Terrain Expédition', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80' }
  ]
};

export function PartnerDashboardPage() {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for new listing
  const [formType, setFormType] = useState('stay'); // 'stay' | 'drive'
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('Cotonou, Haie Vive');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceUnit, setFormPriceUnit] = useState('nuit');
  const [formPurpose, setFormPurpose] = useState('location'); // 'location' | 'vente'
  const [formDescription, setFormDescription] = useState('');
  const [formSpecs, setFormSpecs] = useState('4 Chambres, Piscine privée, Climatisation, Wi-Fi Fibre');
  const [selectedImage, setSelectedImage] = useState(PRESET_PHOTOS.stay[0].url);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const all = await getListings();
      setListings(all);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setSuccessNotice('');
  };

  const handleCreateListing = (e) => {
    e.preventDefault();

    const specsArray = formSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newListing = addListing({
      title: formTitle,
      type: formType,
      location: formLocation,
      price: parseInt(formPrice, 10) || 75000,
      price_unit: formPurpose === 'vente' ? 'vente totale' : formPriceUnit,
      description: formDescription || 'Prestation de haut standing vérifiée par Bénin Beyond.',
      badge: formPurpose === 'vente' ? 'À VENDRE • VÉRIFIÉ' : 'NOUVEAU • PROPRIÉTAIRE CERTIFIÉ',
      specs: specsArray.length > 0 ? specsArray : ['Climatisation', 'Sécurité 24/7', 'Standing'],
      gallery: [selectedImage],
      owner_id: user?.id || 'usr_owner_01',
      owner_name: user?.name || 'Propriétaire Certifié',
      status: 'active'
    });

    setSuccessNotice(`L'annonce "${formTitle}" a été enregistrée et mise en ligne avec succès !`);
    setShowModal(false);
    setFormTitle('');
    setFormPrice('');
    setFormDescription('');
    loadListings();
  };

  const handleDelete = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir retirer cette annonce ?')) {
      deleteListing(id);
      loadListings();
    }
  };

  const filteredListings = listings.filter((l) => {
    if (activeTab === 'all') return true;
    return l.type === activeTab;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Header / Profile Bar */}
      <div className="border-b border-foreground/10 bg-secondary/40 backdrop-blur-md px-6 py-6 md:px-12">
        <div className="mx-auto flex max-w-8xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                alt={user?.name || 'Propriétaire'}
                className="h-14 w-14 rounded-2xl border-2 border-accent object-cover shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-black font-bold shadow-sm">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold text-foreground">
                  {user?.name || 'Patrice H. (Espace Partenaire)'}
                </h1>
                <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground border border-accent/30">
                  Propriétaire Certifié
                </span>
              </div>
              <p className="text-xs text-foreground/60 mt-0.5">
                {user?.company || 'Gestion de Patrimoine & Véhicules'} • Cotonou, Bénin
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Déposer une nouvelle annonce</span>
            </button>
            <Link
              to="/explore"
              className="flex items-center gap-1 rounded-full border border-foreground/15 bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span>Voir catalogue</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-8xl px-6 pt-8 md:px-12">
        {/* Success Alert */}
        {successNotice && (
          <div className="mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice('')} className="text-foreground/50 hover:text-foreground">
              ✕
            </button>
          </div>
        )}

        {/* 1. KPIs & Financial Performance */}
        <ScrollReveal delay={0} y={15}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Revenus estimés</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                3 850 000 FCFA
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                +24% vs mois dernier
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Biens & Véhicules en ligne</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                {listings.length}
              </p>
              <p className="text-[11px] text-foreground/60 mt-1">
                100% vérifiés et conformes
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Demandes de réservation</span>
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                14
              </p>
              <p className="text-[11px] text-accent-foreground font-semibold mt-1">
                3 en attente de réponse
              </p>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between text-foreground/60 text-xs mb-2">
                <span>Vues catalogue</span>
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">
                2 450
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">
                +310 cette semaine
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* 2. Listings Management Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Vos Biens & Véhicules référencés
            </h2>
            <p className="text-xs text-foreground/60 mt-0.5">
              Gérez les disponibilités, tarifs et visuels de vos villas, appartements et flottes
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card p-1 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              Tous ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('stay')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all ${
                activeTab === 'stay'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              🏡 Logements
            </button>
            <button
              onClick={() => setActiveTab('drive')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all ${
                activeTab === 'drive'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              🚗 Véhicules
            </button>
          </div>
        </div>

        {/* Listings Table / Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card transition-all duration-300 hover:shadow-xl hover:border-foreground/25"
            >
              {/* Card Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={item.gallery?.[0] || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {item.type === 'stay' ? 'Hébergement' : item.type === 'drive' ? 'Véhicule' : 'Expérience'}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    En ligne
                  </span>
                </div>
              </div>

              {/* Info Body */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-foreground/60">
                    <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span>{item.location}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-3">
                  <div>
                    <span className="font-heading text-base font-bold text-foreground">
                      {formatPrice(item.price)}
                    </span>
                    <span className="text-[10px] text-foreground/60 ml-1">
                      / {item.price_unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/listing/${item.id}`}
                      className="rounded-lg border border-foreground/15 p-2 text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                      title="Voir la fiche"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    {item.id.startsWith('lst_custom_') && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg border border-destructive/20 p-2 text-destructive hover:bg-destructive/10 transition-colors"
                        title="Supprimer l'annonce"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Modal Form: Déposer une annonce */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-foreground/15 bg-card p-6 sm:p-8 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-foreground/60 hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <span className="caption text-xs uppercase tracking-widest text-accent font-semibold">
                Nouveau Référencement
              </span>
              <h2 className="font-heading text-2xl font-bold text-foreground mt-1">
                Déposer un bien ou un véhicule
              </h2>
              <p className="text-xs text-foreground/60 mt-1">
                Remplissez les détails ci-dessous pour publier votre annonce sur Bénin Beyond.
              </p>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-2">
                  Catégorie du bien
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('stay');
                      setSelectedImage(PRESET_PHOTOS.stay[0].url);
                      setFormPriceUnit('nuit');
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                      formType === 'stay'
                        ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary'
                        : 'border-foreground/10 text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Hébergement (Villa / Appartement)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormType('drive');
                      setSelectedImage(PRESET_PHOTOS.drive[0].url);
                      setFormPriceUnit('jour');
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                      formType === 'drive'
                        ? 'border-accent bg-accent/20 text-accent-foreground ring-1 ring-accent'
                        : 'border-foreground/10 text-foreground/70 hover:border-foreground/30'
                    }`}
                  >
                    <Car className="h-4 w-4" />
                    <span>Véhicule (Location ou Vente)</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Titre de l'annonce
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formType === 'stay'
                      ? 'Ex: Villa Contemporaine avec Piscine à Cotonou'
                      : 'Ex: SUV Toyota Land Cruiser V8 (État Neuf)'
                  }
                  className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Location & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                    Localisation / Ville
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Ex: Cotonou, Haie Vive"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                    Objectif
                  </label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="location">Location courte / moyenne durée</option>
                    <option value="vente">Vente (Prix total)</option>
                  </select>
                </div>
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                    Tarif (en FCFA)
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex: 85000"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                    Fréquence tarifaire
                  </label>
                  <input
                    type="text"
                    value={formPurpose === 'vente' ? 'Prix de vente total' : formPriceUnit}
                    disabled={formPurpose === 'vente'}
                    onChange={(e) => setFormPriceUnit(e.target.value)}
                    placeholder="nuit / jour / mois"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground disabled:opacity-60 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Equipments / Specs */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Prestations & Équipements (séparés par une virgule)
                </label>
                <input
                  type="text"
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  placeholder="Piscine, Wi-Fi Fibre, Climatisation, Groupe électrogène..."
                  className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Photo Selector */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-2">
                  Visuel principal de présentation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(PRESET_PHOTOS[formType] || PRESET_PHOTOS.stay).map((preset) => (
                    <div
                      key={preset.url}
                      onClick={() => setSelectedImage(preset.url)}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedImage === preset.url
                          ? 'border-primary ring-2 ring-primary scale-105'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 left-1 right-1 text-[9px] text-white bg-black/60 rounded px-1 truncate text-center">
                        {preset.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  Description détaillée
                </label>
                <textarea
                  rows="3"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Décrivez les atouts majeurs, l'accès, le quartier..."
                  className="w-full rounded-xl border border-foreground/15 bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-foreground/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-5 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-muted"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-primary/95 active:scale-95"
                >
                  Publier l'annonce immédiatement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
