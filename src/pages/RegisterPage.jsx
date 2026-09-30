import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faCircleInfo,
  faCircleCheck,
  faUser,
  faEnvelope,
  faLock,
  faArrowRight,
  faArrowLeft,
  faHouse,
  faCar,
  faSpinner,
  faPhone,
  faFileContract,
  faIdCard,
  faUpload,
  faShieldHalved,
  faMapPin,
  faCompass
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal } from '../components/ScrollReveal';
import { BrandIcon } from '../components/BrandLogo';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, user } = useAuth();

  // Onboarding Step State: 1 = Identité, 2 = Activité & Enseigne, 3 = Dossier KYC (IFU/RCCM/CIP)
  const [step, setStep] = useState(1);

  // Étape 1 : Identité & Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+229 ');
  const [password, setPassword] = useState('');

  // Étape 2 : Structure & Activité
  const [company, setCompany] = useState('');
  const [partnerType, setPartnerType] = useState('stay'); // 'stay' | 'drive' | 'both'
  const [city, setCity] = useState('Cotonou');

  // Étape 3 : Conformité Légale & KYC
  const [legalStatus, setLegalStatus] = useState('company'); // 'company' | 'individual'
  const [taxId, setTaxId] = useState(''); // Numéro IFU au Bénin
  const [rccm, setRccm] = useState(''); // RCCM
  const [cip, setCip] = useState(''); // CIP / CNI / Passeport
  const [kycDocType, setKycDocType] = useState('Titre Foncier / Facture SBEE');
  const [kycDocFile, setKycDocFile] = useState(null);
  const [kycDocFileName, setKycDocFileName] = useState('');
  const [kycDocPreview, setKycDocPreview] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'subadmin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'owner' || user.role === 'partner') {
        navigate('/dashboard/partner', { replace: true });
      } else if (user.role === 'client') {
        navigate('/dashboard/client', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Le fichier ne doit pas dépasser 10 Mo.');
      return;
    }

    setKycDocFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setKycDocPreview(reader.result);
      setKycDocFile(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = (e) => {
    e?.preventDefault?.();
    setError('');

    if (step === 1) {
      if (!name.trim() || !email.trim() || !password) {
        setError('Veuillez renseigner votre nom, email et mot de passe.');
        return;
      }
      if (password.length < 6) {
        setError('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!company.trim()) {
        setError("Veuillez indiquer le nom de votre enseigne, résidence ou structure.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (legalStatus === 'company' && !taxId.trim()) {
      setError('Veuillez renseigner votre numéro IFU (Identifiant Fiscal Unique au Bénin).');
      return;
    }
    if (legalStatus === 'individual' && !cip.trim()) {
      setError('Veuillez renseigner votre numéro de CIP (Certificat d\'Identification Personnelle) ou CNI.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        role: 'owner',
        phone,
        company,
        partnerType,
        taxId: taxId || (legalStatus === 'company' ? 'IFU En cours' : ''),
        rccm: rccm || '',
        cip: cip || '',
        kycDocType: `${kycDocType} (${legalStatus === 'company' ? 'Société' : 'Particulier'})`,
        kycDocUrl: kycDocFile || kycDocFileName || 'Dossier déposé à l\'inscription',
        password
      });

      if (res.success) {
        setSuccessMsg('Dossier propriétaire initialisé avec succès ! Redirection vers votre espace...');
        setTimeout(() => {
          navigate('/dashboard/partner', { replace: true });
        }, 600);
      } else {
        setError(res.error || "Impossible d'enregistrer votre dossier.");
      }
    } catch (err) {
      setError("Une erreur est survenue lors de l'enregistrement de votre dossier.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      const res = await loginWithGoogle('owner', company || 'Partenaire Bénin Beyond');
      if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="relative min-h-[92vh] w-full flex items-center justify-center px-4 py-16">
      {/* Background Ambience */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        <ScrollReveal delay={0} y={20}>
          
          {/* Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            <Link to="/" className="inline-flex flex-col items-center gap-2 group mb-2">
              <BrandIcon size="lg" className="hover:scale-105 transition-transform" />
              <span className="font-heading text-3xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                Bénin Beyond
              </span>
            </Link>
            <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-[11px] font-bold uppercase tracking-wider">
              <FontAwesomeIcon icon={faBuilding} className="h-3 w-3" />
              <span>Espace Propriétaire & Partenaire</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground mt-3">
              Créer votre compte Partenaire
            </h1>
            <p className="text-xs text-foreground/60 mt-1.5 max-w-md mx-auto">
              Rejoignez le réseau officiel de prestige au Bénin pour vos résidences de standing et flottes de véhicules d'exception.
            </p>
          </div>

          {/* Stepper Wizard Indicator */}
          <div className="flex items-center justify-between mb-8 px-2 sm:px-6">
            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= 1 ? 'bg-primary text-white shadow-md' : 'bg-muted text-foreground/40 border border-foreground/10'
                }`}
              >
                1
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === 1 ? 'text-primary font-bold' : 'text-foreground/60'}`}>
                Identité
              </span>
            </div>
            
            <div className={`flex-1 h-0.5 mx-3 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-foreground/15'}`} />

            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= 2 ? 'bg-primary text-white shadow-md' : 'bg-muted text-foreground/40 border border-foreground/10'
                }`}
              >
                2
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === 2 ? 'text-primary font-bold' : 'text-foreground/60'}`}>
                Votre Enseigne
              </span>
            </div>

            <div className={`flex-1 h-0.5 mx-3 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-foreground/15'}`} />

            <div className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= 3 ? 'bg-primary text-white shadow-md' : 'bg-muted text-foreground/40 border border-foreground/10'
                }`}
              >
                3
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${step === 3 ? 'text-primary font-bold' : 'text-foreground/60'}`}>
                Conformité KYC
              </span>
            </div>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-foreground/10 bg-card/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-5 rounded-2xl bg-destructive/15 border border-destructive/30 p-3.5 text-xs text-destructive flex items-center gap-2.5 animate-fadeIn">
                <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-xs text-emerald-700 font-semibold flex items-center gap-2.5 animate-fadeIn">
                <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 1 : IDENTITÉ & CONTACT */}
            {/* ========================================================================= */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="border-b border-foreground/10 pb-3 mb-2">
                  <h3 className="text-sm font-bold text-foreground">Étape 1 : Coordonnées du Représentant</h3>
                  <p className="text-[11px] text-foreground/60">Le point de contact officiel pour la gestion des annonces et versements</p>
                </div>

                {/* Google Quick Button */}
                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={loadingGoogle || loading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-foreground/15 bg-white text-gray-800 py-2.5 text-xs font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{loadingGoogle ? 'Connexion Google...' : 'Créer avec Google Pro'}</span>
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-full border-t border-foreground/10" />
                  <span className="absolute bg-card px-3 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                    ou par e-mail
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Nom complet du représentant / gérant *
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Patrice Houénou"
                      className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Adresse e-mail professionnelle / de gestion *
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="direction@votre-residence.bj"
                      className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Numéro Téléphone & WhatsApp *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+229 97 00 00 00"
                        className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Mot de passe de sécurité *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <span>Étape suivante : Votre Enseigne</span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 2 : STRUCTURE & ACTIVITÉ */}
            {/* ========================================================================= */}
            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div className="border-b border-foreground/10 pb-3 mb-2">
                  <h3 className="text-sm font-bold text-foreground">Étape 2 : Votre Enseigne & Vos Biens au Bénin</h3>
                  <p className="text-[11px] text-foreground/60">Présentez les prestations ou hébergements que vous proposerez aux voyageurs</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Nom de votre enseigne, hôtel ou raison commerciale *
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faBuilding} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Ex : Villa Royale Ouidah SARL ou Résidence privée"
                      className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nature principale de vos biens proposés *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPartnerType('stay')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        partnerType === 'stay'
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-foreground/15 bg-background/50 hover:bg-muted/40'
                      }`}
                    >
                      <FontAwesomeIcon icon={faHouse} className="text-primary h-4 w-4 mb-1" />
                      <div>
                        <p className="font-bold text-xs text-foreground">Hébergements</p>
                        <p className="text-[10px] text-foreground/60">Villas, Hôtels, Suites</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPartnerType('drive')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        partnerType === 'drive'
                          ? 'border-accent bg-accent/15 shadow-sm ring-1 ring-accent'
                          : 'border-foreground/15 bg-background/50 hover:bg-muted/40'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCar} className="text-accent h-4 w-4 mb-1" />
                      <div>
                        <p className="font-bold text-xs text-foreground">Mobilité VIP</p>
                        <p className="text-[10px] text-foreground/60">SUV, 4x4, Berlines</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPartnerType('both')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        partnerType === 'both'
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500'
                          : 'border-foreground/15 bg-background/50 hover:bg-muted/40'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCompass} className="text-emerald-500 h-4 w-4 mb-1" />
                      <div>
                        <p className="font-bold text-xs text-foreground">Combiné</p>
                        <p className="text-[10px] text-foreground/60">Hébergement & Auto</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Ville principale d'implantation au Bénin
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faMapPin} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="Cotonou">Cotonou (Haie Vive, Fidjrossè, Cadjèhoun, Cocotiers)</option>
                      <option value="Ouidah">Ouidah (Route des Pêches, Cité Historique)</option>
                      <option value="Grand-Popo">Grand-Popo (Bord de Mer & Bouche du Roy)</option>
                      <option value="Porto-Novo">Porto-Novo (Capitale & Lagune)</option>
                      <option value="Parakou">Parakou & Nord Bénin</option>
                      <option value="Autre">Autre commune au Bénin</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-foreground/15 py-3 text-xs font-bold text-foreground/70 hover:bg-muted transition-all"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5 h-3 w-3" />
                    Précédent
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
                  >
                    <span>Étape 3 : Conformité KYC</span>
                    <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3" />
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* STEP 3 : CONFORMITÉ LÉGALE & KYC (BÉNIN) */}
            {/* ========================================================================= */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-b border-foreground/10 pb-3 mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Étape 3 : Audit & Conformité Légale (KYC)</h3>
                    <span className="text-[10px] font-bold rounded-full bg-accent/20 text-accent px-2 py-0.5 border border-accent/30">
                      Bénin Légal
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/60">
                    Ces informations permettent au Super-Administrateur de certifier vos annonces et de sécuriser vos reversements financiers.
                  </p>
                </div>

                {/* Statut Juridique */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Votre statut juridique *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLegalStatus('company')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        legalStatus === 'company'
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-foreground/15 bg-background/50 hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-bold text-xs text-foreground">Société / Établissement</p>
                      <p className="text-[10px] text-foreground/60">Hôtel, SARL, Agence Immobilière</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLegalStatus('individual')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        legalStatus === 'individual'
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-foreground/15 bg-background/50 hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-bold text-xs text-foreground">Particulier / Propriétaire</p>
                      <p className="text-[10px] text-foreground/60">Bailleur individuel de villa/véhicule</p>
                    </button>
                  </div>
                </div>

                {/* Champs conditionnels selon le statut */}
                {legalStatus === 'company' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Numéro IFU (Identifiant Fiscal Unique) *
                      </label>
                      <div className="relative">
                        <FontAwesomeIcon icon={faFileContract} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                        <input
                          type="text"
                          required
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          placeholder="Ex: 3202312345678"
                          className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Numéro RCCM (Registre de Commerce)
                      </label>
                      <div className="relative">
                        <FontAwesomeIcon icon={faBuilding} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                        <input
                          type="text"
                          value={rccm}
                          onChange={(e) => setRccm(e.target.value)}
                          placeholder="Ex: RB/COT/23 B 12345"
                          className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">
                      Numéro CIP (Certificat d'Identification Personnelle) ou CNI Bénin *
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon icon={faIdCard} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                      <input
                        type="text"
                        required
                        value={cip}
                        onChange={(e) => setCip(e.target.value)}
                        placeholder="Ex: 1234567890123"
                        className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Justificatif KYC */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Pièce justificative transmise à la direction
                  </label>
                  <select
                    value={kycDocType}
                    onChange={(e) => setKycDocType(e.target.value)}
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none mb-2"
                  >
                    <option value="Facture SBEE / SONEB au nom du bien">Facture SBEE / SONEB récente</option>
                    <option value="Titre de Propriété / Attestation de Recasement">Titre de Propriété / Attestation de Recasement</option>
                    <option value="Mandat de Gestion / Contrat de Bail">Mandat de Gestion / Contrat de Bail locatif</option>
                    <option value="Carte Grise & Assurance (Véhicule VIP)">Carte Grise & Assurance valide (pour véhicule)</option>
                    <option value="Extrait RCCM / Statuts Entreprise">Extrait RCCM / Statuts d'Entreprise</option>
                  </select>

                  {/* Upload Dropzone */}
                  <label className="border-2 border-dashed border-foreground/20 hover:border-primary rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-background/30 hover:bg-primary/5 transition-all text-center">
                    <FontAwesomeIcon icon={faUpload} className="h-6 w-6 text-primary mb-2" />
                    <span className="text-xs font-bold text-foreground">
                      {kycDocFileName ? kycDocFileName : 'Cliquez pour téléverser votre document (PDF, PNG, JPG)'}
                    </span>
                    <span className="text-[10px] text-foreground/50 mt-0.5">
                      Max 10 Mo • Document strictement confidentiel réservé à l'audit du Super-Administrateur
                    </span>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-foreground/10 bg-muted/20 p-3 text-[11px] text-foreground/70 flex items-start gap-2.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    En soumettant votre dossier, vous certifiez sur l'honneur l'exactitude des informations. Vos annonces seront configurables immédiatement dans votre espace, et publiées en direct après examen par l'administration.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-foreground/15 py-3 text-xs font-bold text-foreground/70 hover:bg-muted transition-all"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5 h-3 w-3" />
                    Précédent
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />
                        <span>Envoi du dossier...</span>
                      </>
                    ) : (
                      <>
                        <span>Finaliser l'Onboarding</span>
                        <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Traveler Reassurance Banner at bottom */}
          <div className="mt-8 rounded-2xl border border-foreground/10 bg-card/60 p-4 text-center backdrop-blur-sm">
            <p className="text-xs text-foreground/70">
              <span className="font-bold text-foreground">Vous êtes un voyageur ?</span> Vous n'avez pas besoin de créer de compte ici.
            </p>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              Votre Espace Voyageur est activé automatiquement dès votre première réservation !
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Link
                to="/explore"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Explorer les villas & véhicules</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
              </Link>
              <span className="text-foreground/30">•</span>
              <Link
                to="/login"
                className="text-xs font-semibold text-foreground/70 hover:text-foreground hover:underline"
              >
                Déjà client ? Se connecter
              </Link>
            </div>
          </div>

        </ScrollReveal>
      </div>
    </div>
  );
}
