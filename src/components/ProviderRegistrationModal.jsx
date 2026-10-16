import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faCheck,
  faSpinner,
  faShieldHalved,
  faCreditCard,
  faMobileScreenButton,
  faScissors,
  faUtensils,
  faUpload,
  faCircleCheck,
  faPhone,
  faHouse,
  faReceipt,
  faLocationDot,
  faTag,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { compressImage } from '../utils/imageOptimizer';
import { addDiscovery } from '../services/discoveryService';

const SERVICE_SUBCATEGORIES = [
  { id: 'coiffure', label: 'Coiffure & Tresses' },
  { id: 'onglerie', label: 'Onglerie & Pédicure' },
  { id: 'soins', label: 'Soins, Massage & Spa' },
  { id: 'chef', label: 'Chef Privé & Cuisine à Domicile' },
  { id: 'pressing', label: 'Blanchisserie & Pressing Express' },
  { id: 'autre', label: 'Autre Service Spécialisé' }
];

export function ProviderRegistrationModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Payment (500 FCFA), 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [category, setCategory] = useState('services'); // 'services' | 'restaurants'
  const [subcategory, setSubcategory] = useState('coiffure');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [highlightsInput, setHighlightsInput] = useState('');
  const [location, setLocation] = useState('Cotonou & Littoral');
  const [inHomeService, setInHomeService] = useState(true);
  const [pricing, setPricing] = useState('À partir de 10 000 FCFA');
  const [phone, setPhone] = useState('+229 ');
  const [whatsapp, setWhatsapp] = useState('+229 ');
  const [image, setImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Payment state (Frais de référencement : 500 FCFA)
  const [paymentMethod, setPaymentMethod] = useState('mtn'); // 'mtn' | 'moov' | 'card'
  const [payerPhone, setPayerPhone] = useState('+229 ');
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  if (!isOpen) return null;

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressedDataUrl = await compressImage(file, { maxWidth: 1200, quality: 0.85 });
      setImage(compressedDataUrl);
    } catch (err) {
      console.error('Erreur compression image:', err);
      setError('Impossible de traiter l\'image sélectionnée.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Veuillez renseigner le nom de votre établissement ou service.');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError('Veuillez fournir une description d\'au moins 20 caractères pour présenter vos prestations.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+229') {
      setError('Veuillez indiquer un numéro de téléphone pour que les clients puissent vous joindre.');
      return;
    }

    // Image par défaut si non téléchargée
    let finalImage = image;
    if (!finalImage) {
      if (category === 'services') {
        if (subcategory === 'onglerie') {
          finalImage = 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80';
        } else if (subcategory === 'soins') {
          finalImage = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80';
        } else if (subcategory === 'chef') {
          finalImage = 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80';
        } else {
          finalImage = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';
        }
      } else {
        finalImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
      }
      setImage(finalImage);
    }

    // SI RESTAURANT : Inscription 100% GRATUITE (0 FCFA) -> Publication directe
    if (category === 'restaurants') {
      setLoading(true);
      try {
        const cleanWhatsapp = (whatsapp || phone).replace(/[^0-9]/g, '');
        const highlights = highlightsInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

        if (highlights.length === 0) {
          highlights.push(
            'Saveurs authentiques & cuisine fraîche',
            'Accueil chaleureux & service soigné',
            'Carte variée & boissons locales'
          );
        }

        const newDisc = await addDiscovery({
          category: 'restaurants',
          subcategory: 'gastronomie',
          title: title.trim(),
          badge: 'Table Recommandée',
          location: location.trim() || 'Cotonou · Bénin',
          tagline: tagline.trim() || 'Table & Terroir Gourmand',
          description: description.trim(),
          highlights,
          tips: 'Réservation recommandée à l\'avance.',
          pricing: pricing.trim() || 'Plats à la carte',
          phone: phone.trim(),
          whatsapp: cleanWhatsapp,
          image: finalImage,
          inHomeService: false,
          creator_role: 'restaurant_partner',
          payment_status: 'free',
          payment_reference: 'RESTO-FREE-0F',
          status: 'active'
        });

        setPaymentReceipt({
          reference: 'RESTO-FREE-0F',
          amount: 0,
          currency: 'FCFA',
          method: 'GRATUIT (0 FCFA)',
          date: new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });

        setStep(3);
        if (onSuccess) {
          onSuccess(newDisc);
        }
      } catch (err) {
        console.error('Erreur inscription restaurant gratuit:', err);
        setError('Une erreur est survenue lors de l\'enregistrement de votre restaurant.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // SI AUTRES SERVICES : Étape de paiement des 500 FCFA
    setStep(2);
  };

  const handleConfirmPaymentAndPublish = async () => {
    setError('');
    setLoading(true);

    try {
      // Simulation du paiement Mobile Money / Carte 500 FCFA
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const receiptRef = `BB-SRV-500-${Date.now().toString().slice(-6)}`;
      const cleanWhatsapp = (whatsapp || phone).replace(/[^0-9]/g, '');

      const highlights = highlightsInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      if (highlights.length === 0) {
        highlights.push(
          inHomeService ? 'Déplacement en villa ou appartement' : 'Service certifié Bénin Beyond',
          'Disponibilité 7j/7 sur rendez-vous',
          'Satisfaction garantie'
        );
      }

      const newDisc = await addDiscovery({
        category,
        subcategory: category === 'restaurants' ? 'gastronomie' : subcategory,
        title: title.trim(),
        badge: inHomeService ? 'Prestation en Villa' : 'Certifié Bénin Beyond',
        location: location.trim() || 'Cotonou · Bénin',
        tagline: tagline.trim() || (category === 'restaurants' ? 'Table & Terroir' : 'Prestations Privées en Villa'),
        description: description.trim(),
        highlights,
        tips: inHomeService
          ? 'Contactez directement le prestataire par WhatsApp ou téléphone pour convenir de l\'heure d\'intervention dans votre hébergement.'
          : 'Réservation recommandée à l\'avance.',
        pricing: pricing.trim(),
        phone: phone.trim(),
        whatsapp: cleanWhatsapp,
        image,
        inHomeService: Boolean(inHomeService),
        creator_role: 'provider',
        payment_status: 'paid',
        payment_reference: receiptRef,
        status: 'active'
      });

      setPaymentReceipt({
        reference: receiptRef,
        amount: 500,
        currency: 'FCFA',
        method: paymentMethod.toUpperCase(),
        date: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      setStep(3);
      if (onSuccess) {
        onSuccess(newDisc);
      }
    } catch (err) {
      console.error('Erreur enregistrement prestataire:', err);
      setError('Une erreur est survenue lors du paiement et de la publication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-foreground/15 shadow-2xl p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground/70 hover:text-foreground hover:bg-muted/80 transition-all"
          title="Fermer"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
            <span>Réseau Partenaires Bénin Beyond</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-foreground">
            {step === 1 && "Faire référencer votre service ou restaurant"}
            {step === 2 && "Activation & Frais d'inscription (500 FCFA)"}
            {step === 3 && "Votre service est en ligne !"}
          </h2>
          <p className="text-xs sm:text-sm text-foreground/60 mt-1">
            {step === 1 && "Proposez vos prestations (coiffure, onglerie, soins, gastronomie) directement aux résidents de nos villas et appartements de standing."}
            {step === 2 && "Frais symboliques d'activation pour être mis en relation directe avec les résidents et touristes VIP."}
            {step === 3 && "Votre fiche est publiée dans l'espace Découvertes de Bénin Beyond avec contact direct."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-destructive/10 border border-destructive/25 p-3.5 text-xs text-destructive font-medium flex items-center gap-2">
            <span>•</span>
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 1 : FORMULAIRE D'INFORMATIONS SUR LE SERVICE */}
        {/* ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleProceedToPayment} className="space-y-5">
            {/* Type de prestation */}
            {/* Type de prestation */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                  <span>Sélectionnez votre type d'activité</span>
                  <span className="text-primary">*</span>
                </label>
                <span className="text-[11px] text-foreground/50 font-medium hidden sm:inline">
                  Cliquez sur une option ci-dessous
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Restaurants */}
                <button
                  type="button"
                  onClick={() => setCategory('restaurants')}
                  className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col justify-between ${
                    category === 'restaurants'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                      : 'border-foreground/15 bg-card/60 hover:border-foreground/30 hover:bg-card/90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        category === 'restaurants'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-muted text-foreground/70 group-hover:bg-muted/80'
                      }`}>
                        <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
                      </div>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        category === 'restaurants'
                          ? 'bg-emerald-600 text-white scale-105 shadow-sm'
                          : 'border-2 border-foreground/30 text-transparent'
                      }`}>
                        <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      Gastronomie & Restaurant
                    </h4>
                    <p className="text-xs text-foreground/65 mt-1 leading-relaxed">
                      Tables d'exception, maquis chics, bars lounge et adresses gourmandes au Bénin.
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-foreground/10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black tracking-wide shadow-sm">
                      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                      <span>100% GRATUIT · 0 FCFA</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Publication directe
                    </span>
                  </div>
                </button>

                {/* Option 2: Autres Services */}
                <button
                  type="button"
                  onClick={() => setCategory('services')}
                  className={`group relative p-4 rounded-2xl border-2 transition-all duration-200 text-left flex flex-col justify-between ${
                    category === 'services'
                      ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-foreground/15 bg-card/60 hover:border-foreground/30 hover:bg-card/90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        category === 'services'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-muted text-foreground/70 group-hover:bg-muted/80'
                      }`}>
                        <FontAwesomeIcon icon={faScissors} className="h-5 w-5" />
                      </div>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                        category === 'services'
                          ? 'bg-amber-500 text-slate-950 scale-105 shadow-sm'
                          : 'border-2 border-foreground/30 text-transparent'
                      }`}>
                        <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      Autres Services & À Domicile
                    </h4>
                    <p className="text-xs text-foreground/65 mt-1 leading-relaxed">
                      Coiffure, bien-être, manucure, chef privé, blanchisserie ou prestations en villa VIP.
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-foreground/10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black tracking-wide shadow-sm">
                      <FontAwesomeIcon icon={faTag} className="h-2.5 w-2.5" />
                      <span>Frais d'Activation : 500 FCFA</span>
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      Paiement unique
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Sous-catégorie pour Services */}
            {category === 'services' && (
              <div className="rounded-2xl border border-foreground/15 bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground/80">
                    Spécialité du service *
                  </label>
                  <span className="text-[11px] text-accent font-semibold">
                    Sélection obligatoire
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_SUBCATEGORIES.map((sub) => {
                    const isSelected = subcategory === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSubcategory(sub.id)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between gap-1.5 ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                            : 'border-foreground/15 bg-card text-foreground/80 hover:bg-muted/60 hover:border-foreground/30'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {isSelected && (
                          <FontAwesomeIcon icon={faCheck} className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nom & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Nom du professionnel ou de l'enseigne *
                </label>
                <input
                  type="text"
                  required
                  placeholder={category === 'services' ? "Ex: Glamour Nails & Spa" : "Ex: Le Jardin Tropical"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Slogan ou phrase d'accroche
                </label>
                <input
                  type="text"
                  placeholder="Ex: Soins haute définition chez vous"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Option Déplacement en Villa */}
            {category === 'services' && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Déplacement en villa ou appartement
                    </h4>
                    <p className="text-[11px] text-foreground/65">
                      Indique aux voyageurs qu'ils peuvent vous faire venir directement dans leur logement sans se déplacer.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={inHomeService}
                    onChange={(e) => setInHomeService(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            )}

            {/* Description détaillée */}
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Description de vos services & savoir-faire *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Décrivez vos prestations, votre expérience, vos produits (ex: huiles bio, matériel stérilisé, techniques de coupe)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Localisation & Tarifs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-primary" />
                  <span>Zone d'intervention / Ville</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cotonou (Haie Vive, Fidjrossè) & Calavi"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Tarifs indicatifs
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pose complète dès 12 000 FCFA"
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Contacts directs : Téléphone & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-primary" />
                  <span>Téléphone d'appel direct *</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+229 97 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faWhatsapp} className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Numéro WhatsApp pour commandes</span>
                </label>
                <input
                  type="tel"
                  placeholder="+229 97 00 00 00"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Photo principale / Portfolio */}
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Photo de votre travail ou de votre établissement
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {image && (
                  <div className="relative h-20 w-28 rounded-xl overflow-hidden border border-foreground/15 shrink-0 bg-muted">
                    <img src={image} alt="Aperçu" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1 w-full">
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/25 bg-muted/30 hover:bg-muted/60 px-4 py-3 cursor-pointer transition-colors text-xs text-foreground/70">
                    {uploadingImage ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-primary" />
                        <span>Compression en cours...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUpload} className="h-4 w-4 text-primary" />
                        <span>{image ? "Changer la photo" : "Téléverser une photo (Galerie / Appareil)"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Points forts / Prestations */}
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Points forts (1 par ligne)
              </label>
              <textarea
                rows={2}
                placeholder="Déplacement avec matériel complet&#10;Produits de haute qualité certifiés&#10;Disponibilité 7j/7 de 08h à 20h"
                value={highlightsInput}
                onChange={(e) => setHighlightsInput(e.target.value)}
                className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Bouton vers Paiement ou Publication Directe */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-xs sm:text-sm font-extrabold shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                  category === 'restaurants'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/30'
                    : 'bg-gradient-to-r from-amber-500 via-amber-600 to-primary hover:brightness-110 text-white shadow-amber-500/25 ring-1 ring-amber-400/30'
                }`}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : category === 'restaurants' ? (
                  <>
                    <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" />
                    <span>Publier mon Établissement Gratuitement (0 FCFA)</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1 opacity-80" />
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
                    <span>Continuer vers l'Activation VIP (500 FCFA)</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 2 : PAIEMENT DES FRAIS D'INSCRIPTION & ACTIVATION (500 FCFA) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Récapitulatif du service */}
            <div className="rounded-2xl border border-foreground/15 bg-card p-4 flex items-center gap-3.5 shadow-xs">
              {image && (
                <img src={image} alt={title} className="h-14 w-14 rounded-xl object-cover shrink-0 ring-1 ring-foreground/10" />
              )}
              <div className="flex-1 min-w-0">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">
                  {category === 'services' ? 'Prestataire de Service Certifié' : 'Restaurant'}
                </span>
                <h4 className="text-sm font-extrabold text-foreground truncate mt-1">{title}</h4>
                <p className="text-xs text-foreground/70 font-medium">{location} · {phone}</p>
              </div>
            </div>

            {/* Boîte tarifaire explicative */}
            <div className="rounded-2xl border-2 border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-background to-amber-500/5 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-2.5 w-2.5" />
                    Frais d'Activation Officiels
                  </span>
                  <h5 className="text-sm font-black text-foreground mt-2">
                    Référencement & Mise en relation VIP
                  </h5>
                  <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">
                    Visibilité directe auprès des résidents de villas et appartements de standing Bénin Beyond.
                  </p>
                </div>
                <div className="text-right shrink-0 bg-background/95 border border-amber-500/30 px-4 py-2.5 rounded-2xl shadow-sm">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl font-black text-foreground">500</span>
                    <span className="text-xs font-black text-amber-500">FCFA</span>
                  </div>
                  <p className="text-[10px] text-foreground/60 font-bold uppercase tracking-wider">Paiement unique</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-foreground/10 space-y-2 text-xs text-foreground/85">
                <div className="flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                  </div>
                  <span className="font-medium">Votre fiche activée immédiatement dans l'espace Découvertes</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                  </div>
                  <span className="font-medium">Boutons d'appel direct & commande WhatsApp directe sans commission (0%)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                  </div>
                  <span className="font-medium">Badge officiel « Prestation en Villa » certifié Bénin Beyond</span>
                </div>
              </div>
            </div>

            {/* Choix du mode de paiement */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground/80 mb-2.5">
                Choisissez votre moyen de paiement sécurisé
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mtn')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                    paymentMethod === 'mtn'
                      ? 'border-amber-500 bg-amber-500/15 text-foreground font-extrabold shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : 'border-foreground/15 bg-card/60 text-foreground/70 hover:border-foreground/30 hover:bg-card'
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm">
                    MTN
                  </div>
                  <span className="text-xs font-bold">MTN MoMo</span>
                  {paymentMethod === 'mtn' && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">
                      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('moov')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                    paymentMethod === 'moov'
                      ? 'border-blue-500 bg-blue-500/15 text-foreground font-extrabold shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                      : 'border-foreground/15 bg-card/60 text-foreground/70 hover:border-foreground/30 hover:bg-card'
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                    Moov
                  </div>
                  <span className="text-xs font-bold">Moov Money</span>
                  {paymentMethod === 'moov' && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                    paymentMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-500/15 text-foreground font-extrabold shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-foreground/15 bg-card/60 text-foreground/70 hover:border-foreground/30 hover:bg-card'
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Carte Bancaire</span>
                  {paymentMethod === 'card' && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Numéro pour le débit */}
            <div>
              <label className="block text-xs font-bold text-foreground/85 mb-1.5">
                {paymentMethod === 'card' ? "Numéro de téléphone associé à la carte" : `Numéro de compte ${paymentMethod.toUpperCase()} (+229)`}
              </label>
              <input
                type="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none font-medium"
              />
              <p className="text-[11px] text-foreground/60 mt-1 font-medium">
                Une invite de confirmation USSD sécurisée sera envoyée sur votre téléphone pour valider les 500 FCFA.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3.5 rounded-2xl border border-foreground/20 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                disabled={loading}
              >
                ← Retour
              </button>

              <button
                type="button"
                onClick={handleConfirmPaymentAndPublish}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 px-6 py-4 text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                    <span>Validation du paiement (500 FCFA)...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faReceipt} className="h-4 w-4" />
                    <span>Régler 500 FCFA & Activer mon Référencement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 3 : CONFIRMATION & SUCCÈS */}
        {/* ========================================================================= */}
        {step === 3 && paymentReceipt && (
          <div className="text-center py-6 space-y-5 animate-scale-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
              <FontAwesomeIcon icon={faCircleCheck} className="h-8 w-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold text-accent tracking-wider">
                Félicitations & Bienvenue sur Bénin Beyond
              </span>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-foreground mt-1">
                {category === 'restaurants' ? 'Votre restaurant est désormais publié !' : 'Votre service est désormais publié !'}
              </h3>
              <p className="text-xs sm:text-sm text-foreground/60 max-w-md mx-auto mt-2">
                Votre établissement / profil <strong>{title}</strong> est désormais référencé dans notre catalogue officiel. 
                Les voyageurs et résidents peuvent vous contacter directement par téléphone ou WhatsApp.
              </p>
            </div>

            {/* Reçu officiel d'enregistrement / paiement */}
            <div className="max-w-md mx-auto rounded-2xl border border-foreground/10 bg-muted/40 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-foreground/10">
                <span className="font-semibold text-foreground/60">Référence Dossier :</span>
                <span className="font-mono font-bold text-primary">{paymentReceipt.reference}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/60">Frais d'inscription :</span>
                <span className="font-bold text-foreground">
                  {paymentReceipt.amount === 0 ? '0 FCFA (Gratuit)' : `${paymentReceipt.amount} FCFA`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/60">Statut du compte :</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                  <span>Actif & Publié</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/60">Mode d'adhésion :</span>
                <span className="font-medium text-foreground">
                  {paymentReceipt.amount === 0 ? 'Partenaire Restaurant (Offert)' : `${paymentReceipt.method} Mobile`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/60">Date & Heure :</span>
                <span className="text-foreground/75">{paymentReceipt.date}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                <span>{category === 'restaurants' ? 'Voir mon restaurant dans Découvertes' : 'Voir mon service dans Découvertes'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
