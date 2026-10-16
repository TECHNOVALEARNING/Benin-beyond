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
import { useLanguage } from '../context/LanguageContext';

const SERVICE_SUBCATEGORIES = [
  { id: 'coiffure', label: 'Coiffure & Tresses' },
  { id: 'onglerie', label: 'Onglerie & Pédicure' },
  { id: 'soins', label: 'Soins, Massage & Spa' },
  { id: 'chef', label: 'Chef Privé & Cuisine à Domicile' },
  { id: 'pressing', label: 'Blanchisserie & Pressing Express' },
  { id: 'autre', label: 'Autre Service Spécialisé' }
];

export function ProviderRegistrationModal({ isOpen, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1); // 1: formulaire, 3: demande envoyée
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

  // Demande envoyée (en attente de validation par l'équipe)
  const [submittedDiscovery, setSubmittedDiscovery] = useState(null);

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
      setError("Impossible de traiter l'image sélectionnée.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError(t("Veuillez renseigner le nom de votre établissement ou service."));
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Veuillez fournir une description d'au moins 20 caractères pour présenter vos prestations.");
      return;
    }
    if (!phone.trim() || phone.trim() === '+229') {
      setError(t("Veuillez indiquer un numéro de téléphone pour que les clients puissent vous joindre."));
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

    // Toute demande (restaurant ou prestataire) est enregistrée « en attente » :
    // l'équipe Bénin Beyond la vérifie — et encaisse les 500 FCFA des prestataires — avant publication.
    setLoading(true);
    try {
      const isRestaurant = category === 'restaurants';
      const cleanWhatsapp = (whatsapp || phone).replace(/[^0-9]/g, '');
      const highlights = highlightsInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const newDisc = await addDiscovery({
        category,
        subcategory: isRestaurant ? 'gastronomie' : subcategory,
        title: title.trim(),
        badge: isRestaurant ? 'Table recommandée' : (inHomeService ? 'Prestation en villa' : 'Recommandé'),
        location: location.trim() || 'Cotonou · Bénin',
        tagline: tagline.trim(),
        description: description.trim(),
        highlights,
        tips: !isRestaurant && inHomeService
          ? "Contactez directement le prestataire par WhatsApp ou téléphone pour convenir de l'heure d'intervention dans votre hébergement."
          : '',
        pricing: pricing.trim(),
        phone: phone.trim(),
        whatsapp: cleanWhatsapp,
        image: finalImage,
        inHomeService: isRestaurant ? false : Boolean(inHomeService),
        creator_role: isRestaurant ? 'restaurant_partner' : 'provider'
      });

      setSubmittedDiscovery(newDisc);
      setStep(3);
      if (onSuccess) {
        onSuccess(newDisc);
      }
    } catch (err) {
      console.error('Erreur envoi demande de référencement:', err);
      setError(t("Une erreur est survenue lors de l'envoi de votre demande. Réessayez dans un instant."));
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
          title={t("Fermer")}
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
            <span>{t("Réseau Partenaires Bénin Beyond")}</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-foreground">
            {step === 1 && "Faire référencer votre service ou restaurant"}
            {step === 3 && "Demande envoyée"}
          </h2>
          <p className="text-xs sm:text-sm text-foreground/60 mt-1">
            {step === 1 && "Proposez vos prestations (coiffure, onglerie, soins, gastronomie) directement aux résidents de nos villas et appartements de standing."}
            {step === 3 && "Votre fiche sera publiée après vérification par l'équipe Bénin Beyond."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-destructive/10 border border-destructive/25 p-3.5 text-xs text-destructive font-medium flex items-center gap-2">
            <span>•</span>
            <span>{t(error)}</span>
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
                  <span>{t("Sélectionnez votre type d'activité")}</span>
                  <span className="text-primary">*</span>
                </label>
                <span className="text-[11px] text-foreground/50 font-medium hidden sm:inline">
                  {t("Cliquez sur une option ci-dessous")}
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
                      {t("Gastronomie & Restaurant")}
                    </h4>
                    <p className="text-xs text-foreground/65 mt-1 leading-relaxed">
                      {t("Tables d'exception, maquis chics, bars lounge et adresses gourmandes au Bénin.")}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-foreground/10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black tracking-wide shadow-sm">
                      <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                      <span>{t("100% GRATUIT · 0 FCFA")}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("Après validation")}
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
                      {t("Autres Services & À Domicile")}
                    </h4>
                    <p className="text-xs text-foreground/65 mt-1 leading-relaxed">
                      {t("Coiffure, bien-être, manucure, chef privé, blanchisserie ou prestations en villa VIP.")}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-foreground/10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black tracking-wide shadow-sm">
                      <FontAwesomeIcon icon={faTag} className="h-2.5 w-2.5" />
                      <span>{t("Frais d'Activation : 500 FCFA")}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {t("Paiement unique")}
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
                    {t("Spécialité du service *")}
                  </label>
                  <span className="text-[11px] text-accent font-semibold">
                    {t("Sélection obligatoire")}
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
                        <span className="truncate">{t(sub.label)}</span>
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
                  {t("Nom du professionnel ou de l'enseigne *")}
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
                  {t("Slogan ou phrase d'accroche")}
                </label>
                <input
                  type="text"
                  placeholder={t("Ex: Soins haute définition chez vous")}
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
                      {t("Déplacement en villa ou appartement")}
                    </h4>
                    <p className="text-[11px] text-foreground/65">
                      {t("Indique aux voyageurs qu'ils peuvent vous faire venir directement dans leur logement sans se déplacer.")}
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
                {t("Description de vos services & savoir-faire *")}
              </label>
              <textarea
                required
                rows={3}
                placeholder={t("Décrivez vos prestations, votre expérience, vos produits (ex: huiles bio, matériel stérilisé, techniques de coupe)...")}
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
                  <span>{t("Zone d'intervention / Ville")}</span>
                </label>
                <input
                  type="text"
                  placeholder={t("Ex: Cotonou (Haie Vive, Fidjrossè) & Calavi")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  {t("Tarifs indicatifs")}
                </label>
                <input
                  type="text"
                  placeholder={t("Ex: Pose complète dès 12 000 FCFA")}
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
                  <span>{t("Téléphone d'appel direct *")}</span>
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
                  <span>{t("Numéro WhatsApp pour commandes")}</span>
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
                {t("Photo de votre travail ou de votre établissement")}
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {image && (
                  <div className="relative h-20 w-28 rounded-xl overflow-hidden border border-foreground/15 shrink-0 bg-muted">
                    <img src={image} alt={t("Aperçu")} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1 w-full">
                  <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/25 bg-muted/30 hover:bg-muted/60 px-4 py-3 cursor-pointer transition-colors text-xs text-foreground/70">
                    {uploadingImage ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-primary" />
                        <span>{t("Compression en cours...")}</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUpload} className="h-4 w-4 text-primary" />
                        <span>{image ? t("Changer la photo") : t("Téléverser une photo (Galerie / Appareil)")}</span>
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
                {t("Points forts (1 par ligne)")}
              </label>
              <textarea
                rows={2}
                placeholder={t('Déplacement avec matériel complet\nProduits de haute qualité certifiés\nDisponibilité 7j/7 de 08h à 20h')}
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
                    <span>{t("Traitement en cours...")}</span>
                  </>
                ) : category === 'restaurants' ? (
                  <>
                    <FontAwesomeIcon icon={faUtensils} className="h-4 w-4" />
                    <span>{t("Envoyer ma demande (gratuit)")}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1 opacity-80" />
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
                    <span>{t("Envoyer ma demande (500 FCFA)")}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ÉTAPE 3 : CONFIRMATION & SUCCÈS */}
        {/* ========================================================================= */}
        {step === 3 && submittedDiscovery && (
          <div className="space-y-5 py-4 text-center">
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{t("Demande envoyée")}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-foreground/60">
                {t("La fiche")} <strong className="font-medium text-foreground">{title}</strong> {t("est enregistrée. L'équipe Bénin Beyond la vérifie avant de la publier dans l'espace Découvertes.")}
              </p>
            </div>

            <div className="mx-auto max-w-md divide-y divide-foreground/[0.07] rounded-xl border border-foreground/10 text-left text-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-foreground/60">{t("Statut")}</span>
                <span className="font-medium text-amber-600">{t("En attente de validation")}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-foreground/60">{t("Frais de référencement")}</span>
                <span className="font-medium text-foreground">
                  {category === 'restaurants' ? t("Gratuit") : '500 FCFA'}
                </span>
              </div>
            </div>

            {category !== 'restaurants' && (
              <p className="mx-auto max-w-md text-xs leading-relaxed text-foreground/50">
                L'équipe vous contactera au {phone.trim()} pour le règlement des 500 FCFA par Mobile Money. Votre fiche est mise en ligne dès réception du paiement.
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("Fermer")}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
