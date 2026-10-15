import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faBuilding,
  faUser,
  faUserTie,
  faHouse,
  faCar,
  faHotel,
  faLandmark,
  faFileContract,
  faCheck,
  faCheckCircle,
  faCircleCheck,
  faCircleExclamation,
  faArrowRight,
  faArrowLeft,
  faFloppyDisk,
  faClock,
  faTriangleExclamation,
  faEye,
  faCircleInfo,
  faPhone,
  faEnvelope,
  faMapPin,
  faIdCard,
  faArrowUpRightFromSquare,
  faLock,
  faSpinner,
  faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import {
  getVerificationApplication,
  saveVerificationDraft,
  submitVerificationApplication,
  resubmitCorrectedDocuments,
  getRequiredDocuments,
  DOCUMENT_CATALOG
} from '../services/ownerVerificationService';
import { DocumentUploadCard } from '../components/DocumentUploadCard';
import { ScrollReveal } from '../components/ScrollReveal';

export function OwnerOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isPartnerCertified, logout, loadingAuth } = useAuth();

  const hasAuthTokenInUrl = typeof window !== 'undefined' && (
    window.location.hash.includes('access_token') ||
    window.location.hash.includes('id_token') ||
    window.location.search.includes('code=')
  );
  const isResolvingAuth = Boolean(loadingAuth || (!user && hasAuthTokenInUrl));

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Erreur déconnexion:', e);
    }
    try {
      localStorage.removeItem('benin_beyond_user');
      localStorage.removeItem('benin_beyond_partner_section');
    } catch {}
    window.location.href = '/login';
  };

  // Étape courante (1 à 7)
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ID du dossier existant
  const [applicationId, setApplicationId] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('draft'); // 'draft' | 'submitted' | 'under_review' | 'additional_info_required' | 'approved' | 'rejected'
  const [adminFeedback, setAdminFeedback] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Étape 2 : Profil et Identité Personnelle
  const [profile, setProfile] = useState({
    fullName: user?.name || '',
    nationality: 'Béninoise',
    birthDate: '',
    phone: user?.phone || '+229 ',
    email: user?.email || '',
    address: '',
    city: 'Cotonou',
    country: 'Bénin',
    idType: 'CIP', // 'CIP' | 'CNI' | 'PASSPORT'
    idNumber: user?.cip || '',
    idExpiry: ''
  });

  // Étape 3 : Type de Propriétaire / Structure Juridique
  const [ownerType, setOwnerType] = useState('individual'); // 'individual' | 'registered_business' | 'authorized_manager'
  const [businessInfo, setBusinessInfo] = useState({
    businessName: user?.company || '',
    rccmNumber: user?.rccm || '',
    ifuNumber: user?.tax_id || '',
    legalRepTitle: 'Gérant'
  });
  const [managerInfo, setManagerInfo] = useState({
    agencyName: '',
    mandateReference: '',
    representedOwnerName: ''
  });

  // Étape 4 : Catégories d'actifs gérés
  const [assetCategories, setAssetCategories] = useState(['apartment', 'villa_house']);

  // Étape 5 : Documents téléversés (Map associant ruleId -> payload)
  const [uploadedDocuments, setUploadedDocuments] = useState({});

  // Étape 6 : Déclarations sur l'honneur et consentements
  const [declarations, setDeclarations] = useState({
    truthfulness: false,
    regulatoryCompliance: false,
    termsAccepted: false,
    digitalSignature: ''
  });

  // Documents requis calculés dynamiquement selon l'étape 3 et 4
  const requiredDocsData = useMemo(() => {
    return getRequiredDocuments(ownerType, assetCategories);
  }, [ownerType, assetCategories]);

  // Chargement des données existantes (Supabase ou Local)
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (isResolvingAuth) return;

      if (!user) {
        setLoadingInitial(false);
        return;
      }

      try {
        const app = await getVerificationApplication(user.id, user.email);
        if (app && mounted) {
          setApplicationId(app.id);
          setApplicationStatus(app.status || 'draft');
          setAdminFeedback(app.admin_feedback || '');
          setRejectionReason(app.rejection_reason || '');

          if (app.owner_type) setOwnerType(app.owner_type);
          if (Array.isArray(app.asset_categories) && app.asset_categories.length > 0) {
            setAssetCategories(app.asset_categories);
          }
          if (app.profile_data) {
            setProfile((prev) => ({ ...prev, ...app.profile_data }));
            if (app.profile_data.businessName || app.profile_data.ifuNumber) {
              setBusinessInfo({
                businessName: app.profile_data.businessName || '',
                rccmNumber: app.profile_data.rccmNumber || '',
                ifuNumber: app.profile_data.ifuNumber || '',
                legalRepTitle: app.profile_data.legalRepTitle || 'Gérant'
              });
            }
            if (app.profile_data.agencyName || app.profile_data.mandateReference) {
              setManagerInfo({
                agencyName: app.profile_data.agencyName || '',
                mandateReference: app.profile_data.mandateReference || '',
                representedOwnerName: app.profile_data.representedOwnerName || ''
              });
            }
          }
          if (app.documents) {
            setUploadedDocuments(app.documents);
          }
          if (app.declarations) {
            setDeclarations((prev) => ({ ...prev, ...app.declarations }));
          }

          // Si nouvel enregistrement, démarrer impérativement à l'étape 1
          const isFreshRegistration =
            location.search.includes('new=1') ||
            Boolean(localStorage.getItem('benin_beyond_just_registered'));

          if (isFreshRegistration) {
            try {
              localStorage.removeItem('benin_beyond_just_registered');
            } catch {}
            setCurrentStep(1);
          } else if (['submitted', 'under_review', 'approved'].includes(app.status)) {
            setCurrentStep(7);
          } else if (app.current_step && app.status === 'draft') {
            const hasProfile = Boolean(app.profile_data?.fullName && app.profile_data?.phone && app.profile_data?.idNumber);
            const hasDocs = Object.keys(app.documents || {}).length > 0;
            if (!hasProfile) {
              setCurrentStep(1);
            } else if (!hasDocs && app.current_step > 5) {
              setCurrentStep(5);
            } else {
              setCurrentStep(Math.min(Math.max(1, app.current_step), 6));
            }
          }
        }
      } catch (err) {
        console.warn('Erreur chargement application de vérification:', err);
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [user, isResolvingAuth]);

  // Sauvegarde automatique du brouillon (Autosave décorrélé)
  const handleSaveDraft = async (showNotification = true) => {
    if (!user) return;
    setSavingDraft(true);
    setSaveFeedback('');

    try {
      const payload = {
        id: applicationId || undefined,
        user_id: user.id,
        owner_email: user.email,
        owner_name: profile.fullName || user.name,
        phone: profile.phone || user.phone,
        owner_type: ownerType,
        asset_categories: assetCategories,
        profile_data: {
          ...profile,
          ...(ownerType === 'registered_business' ? businessInfo : {}),
          ...(ownerType === 'authorized_manager' ? managerInfo : {})
        },
        documents: uploadedDocuments,
        declarations,
        status: applicationStatus === 'draft' ? 'draft' : applicationStatus,
        current_step: currentStep
      };

      const saved = await saveVerificationDraft(user.id, payload);
      if (saved?.id) {
        setApplicationId(saved.id);
      }
      if (showNotification) {
        setSaveFeedback('Brouillon sauvegardé avec succès.');
        setTimeout(() => setSaveFeedback(''), 3000);
      }
    } catch (e) {
      console.warn('Erreur autosave:', e);
    } finally {
      setSavingDraft(false);
    }
  };

  // Gestion des téléversements de documents
  const handleDocumentUpload = (ruleId, docPayload) => {
    setUploadedDocuments((prev) => {
      const updated = {
        ...prev,
        [ruleId]: docPayload
      };
      // Sauvegarde immédiate du brouillon en arrière-plan
      setTimeout(() => handleSaveDraft(false), 200);
      return updated;
    });
  };

  const handleDocumentRemove = (ruleId) => {
    setUploadedDocuments((prev) => {
      const copy = { ...prev };
      delete copy[ruleId];
      setTimeout(() => handleSaveDraft(false), 200);
      return copy;
    });
  };

  // Basculer une catégorie d'actif
  const toggleAssetCategory = (catId) => {
    setAssetCategories((prev) => {
      if (prev.includes(catId)) {
        if (prev.length <= 1) return prev; // Au moins une catégorie requise
        return prev.filter((c) => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  // Validation par étape
  const handleNextStep = () => {
    setErrorMessage('');

    if (currentStep === 1) {
      setCurrentStep(2);
      handleSaveDraft(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 2) {
      if (!profile.fullName.trim()) {
        setErrorMessage('Veuillez renseigner votre nom complet conformément à votre pièce d’identité.');
        return;
      }
      if (!profile.phone.trim() || profile.phone.trim().length < 8) {
        setErrorMessage('Veuillez renseigner un numéro de téléphone valide.');
        return;
      }
      if (!profile.idNumber.trim()) {
        setErrorMessage('Le numéro de votre pièce d’identité (CIP / CNI / Passeport) est obligatoire.');
        return;
      }
      setCurrentStep(3);
      handleSaveDraft(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 3) {
      if (ownerType === 'registered_business') {
        if (!businessInfo.businessName.trim()) {
          setErrorMessage('Veuillez indiquer la raison sociale ou le nom de l’entreprise.');
          return;
        }
        if (!businessInfo.ifuNumber.trim()) {
          setErrorMessage('L’Identifiant Fiscal Unique (IFU Bénin) est obligatoire pour les entreprises.');
          return;
        }
      }
      if (ownerType === 'authorized_manager') {
        if (!managerInfo.agencyName.trim() || !managerInfo.representedOwnerName.trim()) {
          setErrorMessage('Veuillez renseigner le nom de votre agence et celui du propriétaire mandant.');
          return;
        }
      }
      setCurrentStep(4);
      handleSaveDraft(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 4) {
      if (assetCategories.length === 0) {
        setErrorMessage('Veuillez sélectionner au moins une catégorie d’actif.');
        return;
      }
      setCurrentStep(5);
      handleSaveDraft(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 5) {
      setCurrentStep(6);
      handleSaveDraft(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 6) {
      // Vérifier que tous les documents obligatoires sont fournis
      const missingRequired = requiredDocsData.required.filter((rule) => {
        const doc = uploadedDocuments[rule.id];
        return !doc || !doc.fileUrl;
      });

      if (missingRequired.length > 0) {
        setErrorMessage(
          `Pièce(s) obligatoire(s) manquante(s) : ${missingRequired.map((m) => m.shortName || m.name).join(', ')}. Veuillez retourner à l’étape 5 pour téléverser l’ensemble des pièces avant soumission.`
        );
        return;
      }

      if (!declarations.truthfulness || !declarations.regulatoryCompliance || !declarations.termsAccepted) {
        setErrorMessage('Vous devez certifier et accepter l’ensemble des déclarations sur l’honneur.');
        return;
      }
      if (!declarations.digitalSignature.trim()) {
        setErrorMessage('Veuillez apposer votre signature électronique (saisissez votre nom complet).');
        return;
      }
      // Soumission finale
      handleFinalSubmit();
    }
  };

  // Remplissage rapide de pièces types pour faciliter l'audit & la démonstration
  const handleAttachDemoDocuments = () => {
    const demoDocs = { ...uploadedDocuments };
    requiredDocsData.allRules.forEach((rule) => {
      if (!demoDocs[rule.id]) {
        demoDocs[rule.id] = {
          ruleId: rule.id,
          name: `${rule.shortName || rule.name}_officiel.pdf`,
          fileType: 'application/pdf',
          fileSize: 254800,
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        };
      }
    });
    setUploadedDocuments(demoDocs);
    setSaveFeedback('Pièces types de démonstration chargées pour l\'audit !');
    setTimeout(() => setSaveFeedback(''), 4000);
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Soumission finale de la demande
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const fullPayload = {
        id: applicationId || undefined,
        user_id: user.id,
        owner_email: user.email,
        owner_name: profile.fullName,
        phone: profile.phone,
        owner_type: ownerType,
        asset_categories: assetCategories,
        profile_data: {
          ...profile,
          ...(ownerType === 'registered_business' ? businessInfo : {}),
          ...(ownerType === 'authorized_manager' ? managerInfo : {})
        },
        documents: uploadedDocuments,
        declarations: {
          ...declarations,
          signedAt: new Date().toISOString()
        }
      };

      const result = await submitVerificationApplication(user.id, fullPayload);
      setApplicationStatus('submitted');
      setApplicationId(result.id);
      setCurrentStep(7);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(err.message || 'Échec lors de la soumission du dossier. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resoumission rapide des documents corrigés (depuis le statut "additional_info_required")
  const handleResubmitCorrections = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      // Filtrer les documents qui étaient en action_required ou rejected et qui ont été remplacés
      const updatedDocs = {};
      Object.entries(uploadedDocuments).forEach(([ruleId, doc]) => {
        if (doc && doc.fileUrl) {
          updatedDocs[ruleId] = doc;
        }
      });

      await resubmitCorrectedDocuments(user.id, user.email, updatedDocs);
      setApplicationStatus('submitted');
      setAdminFeedback('');
      setSaveFeedback('Vos pièces corrigées ont été transmises avec succès à l’équipe de conformité.');
      setTimeout(() => setSaveFeedback(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Erreur lors de la transmission des pièces corrigées.');
    } finally {
      setSubmitting(false);
    }
  };

  // Si l'authentification OAuth est en cours de résolution ou initialisation
  if (loadingInitial || isResolvingAuth) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-xs font-medium text-foreground/60">
            {isResolvingAuth ? "Authentification sécurisée en cours..." : "Chargement de votre dossier d'onboarding..."}
          </p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté
  if (!user && !loadingInitial && !isResolvingAuth) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4">
          <FontAwesomeIcon icon={faLock} className="h-8 w-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">
          Connexion requise
        </h2>
        <p className="text-xs text-foreground/70 mt-2 mb-6">
          Veuillez vous connecter avec votre compte Propriétaire ou Partenaire pour accéder à l'espace de vérification officielle.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register?type=owner"
            className="rounded-2xl bg-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all inline-flex items-center gap-2"
          >
            Créer un compte Partenaire
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
          <Link
            to="/login"
            state={{ from: { pathname: '/onboarding/partner' } }}
            className="rounded-2xl border border-foreground/20 px-6 py-3 text-xs font-semibold text-foreground/80 hover:bg-muted/50 transition-all inline-flex items-center gap-2"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  // Définition des libellés des étapes
  const stepsList = [
    { num: 1, label: 'Présentation' },
    { num: 2, label: 'Identité' },
    { num: 3, label: 'Structure' },
    { num: 4, label: 'Actifs' },
    { num: 5, label: 'Documents' },
    { num: 6, label: 'Déclarations' },
    { num: 7, label: 'Finalisation' }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-foreground/10 px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-heading font-black text-base sm:text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">
            Bénin <span className="text-primary font-serif italic font-normal">Beyond</span>
          </span>
          <span className="hidden sm:inline-block text-[11px] font-semibold text-foreground/50 border-l border-foreground/15 pl-2">
            Espace Certification Partenaire
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-foreground/15 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted transition-all"
            title="Quitter et revenir au site public"
          >
            <FontAwesomeIcon icon={faHouse} className="h-3 w-3 text-primary" />
            <span>Quitter</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/25 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all active:scale-95"
            title="Se déconnecter"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
        {/* 1. Header & Reassurance Banner */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
                Certification Partenaire Officielle
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                Finalisez la vérification de votre compte propriétaire
              </h1>
              <p className="text-xs sm:text-sm text-foreground/70 max-w-2xl mt-1.5 leading-relaxed">
                Vérifiez votre identité et transmettez vos pièces justificatives pour activer vos privilèges de publication.
              </p>
            </div>

            {/* Séparation Abonnement vs Vérification */}
            <div className="flex flex-col items-start md:items-end gap-1.5 bg-card/80 p-3.5 rounded-2xl border border-foreground/10 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-foreground">
                  Abonnement Propriétaire : <strong className="text-emerald-700 dark:text-emerald-400">Actif</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  applicationStatus === 'approved'
                    ? 'bg-emerald-500'
                    : applicationStatus === 'additional_info_required'
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`} />
                <span className="text-[11px] text-foreground/60 font-medium">
                  Statut Vérification :{' '}
                  <strong className="text-foreground">
                    {applicationStatus === 'approved'
                      ? 'Validé & Certifié'
                      : applicationStatus === 'additional_info_required'
                      ? 'Complément requis'
                      : applicationStatus === 'submitted'
                      ? 'Dossier en revue'
                      : 'Brouillon en cours'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Stepper / Progress Bar (Caché si à l'étape finale 7) */}
          {currentStep <= 6 && (
            <div className="mt-6">
              <div className="hidden sm:flex items-center justify-between relative mb-3">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-foreground/10 -z-0" />
                <div
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 -z-0"
                  style={{ width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%` }}
                />

                {stepsList.slice(0, 6).map((s) => {
                  const isDone = currentStep > s.num;
                  const isCurrent = currentStep === s.num;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => s.num < currentStep && setCurrentStep(s.num)}
                      disabled={s.num > currentStep}
                      className={`relative z-10 flex flex-col items-center gap-1.5 focus:outline-none ${
                        s.num < currentStep ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                          isDone
                            ? 'bg-primary text-white scale-95'
                            : isCurrent
                            ? 'bg-primary text-white ring-4 ring-primary/20 scale-105'
                            : 'bg-card text-foreground/50 border border-foreground/20'
                        }`}
                      >
                        {isDone ? <FontAwesomeIcon icon={faCheck} className="h-3 w-3" /> : s.num}
                      </div>
                      <span
                        className={`text-[11px] font-semibold whitespace-nowrap ${
                          isCurrent ? 'text-primary font-bold' : isDone ? 'text-foreground' : 'text-foreground/40'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barre de progression mobile */}
              <div className="sm:hidden flex items-center justify-between text-xs font-bold text-foreground mb-2">
                <span>Étape {currentStep} sur 6 : {stepsList[currentStep - 1]?.label}</span>
                <span className="text-primary">{Math.round((currentStep / 6) * 100)}%</span>
              </div>
              <div className="sm:hidden h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Messages d'état global (Erreur ou Notification de sauvegarde) */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-center gap-3 animate-shake">
            <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveFeedback && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-3 animate-fade-in">
            <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* 3. ALERTE COMPLÉMENT D'INFORMATION REQUIS (Si statut additional_info_required) */}
        {applicationStatus === 'additional_info_required' && currentStep !== 7 && (
          <div className="mb-8 rounded-3xl border-2 border-amber-500/60 bg-amber-500/10 p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white font-bold">
                <FontAwesomeIcon icon={faTriangleExclamation} className="h-5 w-5" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="font-heading text-base font-bold text-amber-950 dark:text-amber-100">
                  Complément d'information requis par l'équipe de conformité
                </h3>
                <p className="text-xs text-amber-900/80 dark:text-amber-200 leading-relaxed">
                  L'administrateur a examiné votre dossier et requiert la correction ou le remplacement de certaines pièces justificatives. Vous n'avez pas besoin de recommencer votre dossier : mettez simplement à jour les documents signalés ci-dessous.
                </p>
                {adminFeedback && (
                  <div className="rounded-2xl bg-background/80 border border-amber-500/30 p-4 text-xs font-medium text-foreground">
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
                      Observation générale de l'administrateur :
                    </p>
                    <p className="italic">« {adminFeedback} »</p>
                  </div>
                )}
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    Accéder directement aux documents à corriger
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResubmitCorrections}
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 transition-all shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? 'Transmission...' : 'Soumettre les pièces corrigées'}
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. CONTENU PRINCIPAL PAR ÉTAPE */}
        <div className="rounded-3xl border border-foreground/10 bg-card p-6 sm:p-8 shadow-sm">
          {/* ========================================================================= */}
          {/* ÉTAPE 1 : BIENVENUE & PRÉSENTATION DE LA VÉRIFICATION */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="max-w-2xl">
                <span className="text-primary font-bold text-xs uppercase tracking-wider">
                  Étape 1 sur 6
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-black text-foreground mt-1">
                  Bienvenue dans l'espace de vérification des partenaires
                </h2>
                <p className="text-xs sm:text-sm text-foreground/70 mt-2 leading-relaxed">
                  Bénin Beyond valorise l’excellence, la sécurité juridique et la confiance mutuelle. Ce processus simple et confidentiel permet de certifier votre identité, vos droits sur vos actifs et d'activer la publication immédiate de vos hébergements ou véhicules.
                </p>
              </div>

              {/* Pourquoi cette vérification est-elle nécessaire ? */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Confiance Voyageurs
                  </h4>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Les annonces certifiées bénéficient d'une visibilité maximale et de réservations directes.
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
                    <FontAwesomeIcon icon={faLandmark} className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Conformité Réglementaire
                  </h4>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Respect strict des dispositions de l'ANaTT, de l'ANDF et du Ministère du Tourisme de la République du Bénin.
                  </p>
                </div>

                <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5 space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    Protection des Données
                  </h4>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Vos documents sont chiffrés et consultés exclusivement par les auditeurs habilités. Aucune divulgation publique.
                  </p>
                </div>
              </div>

              {/* Rappel important : Indépendance Abonnement / Vérification */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-foreground/80 space-y-1">
                  <p className="font-bold text-foreground">
                    Important — Principe de dissociation :
                  </p>
                  <p className="text-foreground/70 leading-relaxed">
                    Le règlement de votre abonnement partenaire active vos accès outils de gestion, mais <strong>ne vaut pas certification automatique</strong> de vos biens. Pour protéger nos voyageurs, la mise en ligne publique de vos annonces s’effectue dès approbation de votre dossier.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 2 : PROFIL ET IDENTITÉ OFFICIELLE */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-wider">
                  Étape 2 sur 6
                </span>
                <h2 className="font-heading text-xl font-bold text-foreground mt-1">
                  Identité officielle du propriétaire déclarant
                </h2>
                <p className="text-xs text-foreground/60 mt-1">
                  Renseignez vos coordonnées exactes telles qu'elles figurent sur votre pièce d'identité officielle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nom & Prénoms complets <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                    <input
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      placeholder="Ex: Patrice HOUESSOU"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Nationalité */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Nationalité <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.nationality}
                    onChange={(e) => setProfile({ ...profile, nationality: e.target.value })}
                    placeholder="Ex: Béninoise"
                    className="w-full px-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Téléphone principal <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faPhone} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+229 97 00 00 00"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-foreground/10 bg-muted/40 text-xs text-foreground/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Adresse physique */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Adresse de résidence habituelle
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faMapPin} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Ex: Haie Vive, Rue 380, Cotonou"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Type de Pièce d'Identité */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Type de document d'identité <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={profile.idType}
                    onChange={(e) => setProfile({ ...profile, idType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                  >
                    <option value="CIP">CIP — Certificat d'Identification Personnelle (Bénin)</option>
                    <option value="CNI">CNI Biométrique (Bénin / CEDEAO)</option>
                    <option value="PASSPORT">Passeport International</option>
                  </select>
                </div>

                {/* Numéro de la pièce */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Numéro officiel du document <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon icon={faIdCard} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 text-xs" />
                    <input
                      type="text"
                      value={profile.idNumber}
                      onChange={(e) => setProfile({ ...profile, idNumber: e.target.value })}
                      placeholder="Ex: CIP-229-84729104 ou N° CNI"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-foreground/15 bg-background text-xs text-foreground placeholder:text-foreground/40 focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 3 : TYPE DE PROPRIÉTAIRE & CADRE JURIDIQUE */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-wider">
                  Étape 3 sur 6
                </span>
                <h2 className="font-heading text-xl font-bold text-foreground mt-1">
                  Sélectionnez votre statut et régime de détention
                </h2>
                <p className="text-xs text-foreground/60 mt-1">
                  Les exigences documentaires seront ajustées sur-mesure selon votre structure.
                </p>
              </div>

              {/* 3 Cartes de choix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: 'individual',
                    title: 'Particulier',
                    subtitle: 'Personne physique',
                    desc: 'Vous êtes propriétaire direct en nom propre de votre résidence, véhicule ou terrain.',
                    icon: faUser
                  },
                  {
                    type: 'registered_business',
                    title: 'Entreprise Enregistrée',
                    subtitle: 'Personne morale (SARL, SAS, EURL)',
                    desc: 'Votre structure possède un RCCM et un IFU émis par le tribunal et la DGI Bénin.',
                    icon: faBuilding
                  },
                  {
                    type: 'authorized_manager',
                    title: 'Gestionnaire Mandaté',
                    subtitle: 'Conciergerie / Mandataire',
                    desc: 'Vous agissez légalement au nom d’un propriétaire tiers via un mandat formel.',
                    icon: faUserTie
                  }
                ].map((item) => {
                  const selected = ownerType === item.type;
                  return (
                    <div
                      key={item.type}
                      onClick={() => setOwnerType(item.type)}
                      className={`rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                          : 'border-foreground/10 bg-background hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          selected ? 'bg-primary text-white' : 'bg-muted text-foreground/60'
                        }`}>
                          <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                        </div>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                          selected ? 'border-primary bg-primary text-white' : 'border-foreground/30'
                        }`}>
                          {selected && <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-primary mt-0.5">
                        {item.subtitle}
                      </p>
                      <p className="text-xs text-foreground/60 mt-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Champs conditionnels Entreprise (KYB) */}
              {ownerType === 'registered_business' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4 animate-fade-in">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider">
                    Informations Juridiques de l'Entreprise
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Raison Sociale / Dénomination <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={businessInfo.businessName}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                        placeholder="Ex: Littoral Prestige Assets SARL"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Numéro IFU (Identifiant Fiscal Unique) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={businessInfo.ifuNumber}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, ifuNumber: e.target.value })}
                        placeholder="Ex: 3202111849201 (13 chiffres)"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Numéro RCCM
                      </label>
                      <input
                        type="text"
                        value={businessInfo.rccmNumber}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, rccmNumber: e.target.value })}
                        placeholder="Ex: RB/COT/21-B-12948"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Fonction du représentant légal
                      </label>
                      <input
                        type="text"
                        value={businessInfo.legalRepTitle}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, legalRepTitle: e.target.value })}
                        placeholder="Ex: Gérant Associé Unique"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Champs conditionnels Gestionnaire Mandaté */}
              {ownerType === 'authorized_manager' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 space-y-4 animate-fade-in">
                  <h4 className="font-heading text-xs font-bold text-primary uppercase tracking-wider">
                    Détails du Mandat de Gestion
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Nom de l'Agence ou Conciergerie <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={managerInfo.agencyName}
                        onChange={(e) => setManagerInfo({ ...managerInfo, agencyName: e.target.value })}
                        placeholder="Ex: Cotonou Luxury Concierge"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Nom complet du Propriétaire Mandant <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={managerInfo.representedOwnerName}
                        onChange={(e) => setManagerInfo({ ...managerInfo, representedOwnerName: e.target.value })}
                        placeholder="Ex: M. Jean-Baptiste ADJOVI"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        Référence ou date du contrat de mandat
                      </label>
                      <input
                        type="text"
                        value={managerInfo.mandateReference}
                        onChange={(e) => setManagerInfo({ ...managerInfo, mandateReference: e.target.value })}
                        placeholder="Ex: Mandat de gérance locative du 15 Janvier 2025"
                        className="w-full px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 4 : CATÉGORIES D'ACTIFS PROPOSÉS SUR LA PLATEFORME */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-wider">
                  Étape 4 sur 6
                </span>
                <h2 className="font-heading text-xl font-bold text-foreground mt-1">
                  Déclarez les catégories d'actifs que vous souhaitez publier
                </h2>
                <p className="text-xs text-foreground/60 mt-1">
                  Sélectionnez une ou plusieurs catégories. Les justificatifs demandés à l'étape suivante seront adaptés exactement à cette sélection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    id: 'apartment',
                    title: 'Appartement & Studio',
                    subtitle: 'Résidences meublées, lofts citadins',
                    icon: faBuilding,
                    tag: 'Immobilier'
                  },
                  {
                    id: 'villa_house',
                    title: 'Villa de Luxe & Maison',
                    subtitle: 'Propriétés privées avec jardin / piscine',
                    icon: faHouse,
                    tag: 'Immobilier'
                  },
                  {
                    id: 'hotel',
                    title: 'Hôtel & Auberge',
                    subtitle: 'Établissements hôteliers classés ou resorts',
                    icon: faHotel,
                    tag: 'Hôtellerie'
                  },
                  {
                    id: 'vehicle',
                    title: 'Véhicule & Mobilité VIP',
                    subtitle: '4x4 tout-terrain, berlines, vans avec chauffeur',
                    icon: faCar,
                    tag: 'Mobilité'
                  },
                  {
                    id: 'land',
                    title: 'Terrain & Domaine Foncier',
                    subtitle: 'Parcelles sécurisées et domaines',
                    icon: faLandmark,
                    tag: 'Foncier'
                  }
                ].map((item) => {
                  const isChecked = assetCategories.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleAssetCategory(item.id)}
                      className={`rounded-2xl border-2 p-5 cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
                          : 'border-foreground/10 bg-background hover:border-foreground/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70 uppercase tracking-wider">
                          {item.tag}
                        </span>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked ? 'border-primary bg-primary text-white' : 'border-foreground/30 bg-background'
                        }`}>
                          {isChecked && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                          isChecked ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground/60'
                        }`}>
                          <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-heading text-xs font-bold text-foreground">
                            {item.title}
                          </h4>
                          <p className="text-[10.5px] text-foreground/50 mt-0.5 line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Règle anti-piège : Pas de factures d'eau ou d'électricité comme titre foncier */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/70 leading-relaxed">
                  <strong className="text-foreground font-semibold">Garantie d'authenticité : </strong>
                  Conformément aux normes d'audit Bénin Beyond, les factures d'eau/électricité ou les simples déclarations verbales ne sont pas admises comme preuve de propriété foncière ou automobile.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 5 : DÉPÔT DYNAMIQUE DES PIÈCES JUSTIFICATIVES */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-primary font-bold text-xs uppercase tracking-wider">
                    Étape 5 sur 6
                  </span>
                  <h2 className="font-heading text-xl font-bold text-foreground mt-1">
                    Téléversement des pièces justificatives requises
                  </h2>
                  <p className="text-xs text-foreground/60 mt-1">
                    Exigences calculées pour un <strong>{ownerType === 'individual' ? 'Particulier' : ownerType === 'registered_business' ? 'Professionnel (Entreprise)' : 'Gestionnaire Mandaté'}</strong> exploitant : <strong>{assetCategories.map((c) => c === 'hotel' ? 'Hôtels' : c === 'vehicle' ? 'Véhicules' : 'Biens Immobiliers').join(', ')}</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAttachDemoDocuments}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all shrink-0 self-start sm:self-auto shadow-xs"
                  title="Charger des spécimens types certifiés pour accélérer l'évaluation"
                >
                  <FontAwesomeIcon icon={faFileContract} />
                  <span>Insérer pièces spécimens (Audit / Démo)</span>
                </button>
              </div>

              {/* Information de sécurité */}
              <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-4 text-xs text-foreground/70 flex items-center gap-3">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Formats acceptés : PDF, JPG, PNG, WebP (jusqu'à 15 Mo par pièce). Vos documents sont chiffrés et consultables uniquement par la direction de la conformité Bénin Beyond.
                </span>
              </div>

              {/* Liste dynamique des composants d'upload */}
              <div className="space-y-4">
                {requiredDocsData.all.map((rule) => (
                  <DocumentUploadCard
                    key={rule.id}
                    rule={rule}
                    documentData={uploadedDocuments[rule.id]}
                    onUpload={handleDocumentUpload}
                    onRemove={handleDocumentRemove}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 6 : RÉCAPITULATIF, DÉCLARATIONS SUR L'HONNEUR & CONSENTEMENT */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-primary font-bold text-xs uppercase tracking-wider">
                  Étape 6 sur 6
                </span>
                <h2 className="font-heading text-xl font-bold text-foreground mt-1">
                  Récapitulatif & Déclarations sur l'honneur
                </h2>
                <p className="text-xs text-foreground/60 mt-1">
                  Vérifiez la parfaite exactitude de vos informations avant la soumission formelle pour examen par la modération.
                </p>
              </div>

              {/* Récapitulatif condensé */}
              <div className="rounded-2xl border border-foreground/10 bg-muted/20 p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Déclarant</span>
                    <strong className="text-foreground">{profile.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Statut</span>
                    <strong className="text-foreground capitalize">{ownerType.replace('_', ' ')}</strong>
                  </div>
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Contact</span>
                    <strong className="text-foreground font-mono">{profile.phone}</strong>
                  </div>
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Pièce d'Identité</span>
                    <strong className="text-foreground font-mono">{profile.idType} : {profile.idNumber}</strong>
                  </div>
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Catégories d'Actifs</span>
                    <strong className="text-foreground">{assetCategories.join(', ')}</strong>
                  </div>
                  <div>
                    <span className="text-foreground/50 block text-[11px]">Pièces Déposées</span>
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {Object.keys(uploadedDocuments).length} document(s) enregistré(s)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Consentements et engagements solennels */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 rounded-2xl border border-foreground/10 p-4 cursor-pointer hover:bg-muted/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={declarations.truthfulness}
                    onChange={(e) => setDeclarations({ ...declarations, truthfulness: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-foreground/30 text-primary focus:ring-primary"
                  />
                  <div className="text-xs leading-relaxed text-foreground/80">
                    <strong className="text-foreground block font-bold mb-0.5">
                      Certification d'authenticité et exactitude des documents
                    </strong>
                    Je certifie sur l’honneur que l’ensemble des déclarations faites et pièces justificatives transmises sont rigoureusement exactes, authentiques et non falsifiées.
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-foreground/10 p-4 cursor-pointer hover:bg-muted/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={declarations.regulatoryCompliance}
                    onChange={(e) => setDeclarations({ ...declarations, regulatoryCompliance: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-foreground/30 text-primary focus:ring-primary"
                  />
                  <div className="text-xs leading-relaxed text-foreground/80">
                    <strong className="text-foreground block font-bold mb-0.5">
                      Conformité avec les lois de la République du Bénin
                    </strong>
                    Je m'engage à respecter scrupuleusement les exigences légales et réglementaires applicables à l'activité locative ou de transport touristique au Bénin (sécurité incendie, assurances, fiscalité).
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-foreground/10 p-4 cursor-pointer hover:bg-muted/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={declarations.termsAccepted}
                    onChange={(e) => setDeclarations({ ...declarations, termsAccepted: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-foreground/30 text-primary focus:ring-primary"
                  />
                  <div className="text-xs leading-relaxed text-foreground/80">
                    <strong className="text-foreground block font-bold mb-0.5">
                      Conditions Générales de Vérification Partenaire
                    </strong>
                    J'autorise l'équipe de modération de Bénin Beyond à vérifier l'authenticité de mes pièces auprès des registres légaux compétents.
                  </div>
                </label>
              </div>

              {/* Signature électronique */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Signature Électronique (Saisissez votre nom et prénoms complets) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={declarations.digitalSignature}
                  onChange={(e) => setDeclarations({ ...declarations, digitalSignature: e.target.value })}
                  placeholder="Ex: Patrice HOUESSOU"
                  className="w-full sm:w-80 px-3 py-2 rounded-xl border border-foreground/15 bg-background text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-serif text-sm tracking-wide"
                />
                <p className="text-[10px] text-foreground/50 mt-1">
                  En saisissant votre nom, vous apposez une signature électronique légale équivalente à une signature manuscrite.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 7 : CONFIRMATION & SUIVI DU STATUT */}
          {/* ========================================================================= */}
          {currentStep === 7 && (
            <div className="text-center py-6 sm:py-10 space-y-6 animate-scale-up">
              {applicationStatus === 'approved' ? (
                <>
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-3xl">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h2 className="font-heading text-2xl font-black text-foreground">
                      Votre compte propriétaire est vérifié !
                    </h2>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      Félicitations, votre dossier a été validé avec succès par notre équipe de conformité. Vos privilèges de publication directe sont actifs.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-center gap-3">
                    <Link
                      to="/dashboard/partner"
                      className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 shadow-lg shadow-emerald-600/20 transition-all inline-flex items-center gap-2"
                    >
                      Accéder à mon tableau de bord propriétaire
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                  </div>
                </>
              ) : applicationStatus === 'rejected' ? (
                <>
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-rose-500/10 text-rose-600 text-3xl">
                    <FontAwesomeIcon icon={faCircleExclamation} />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h2 className="font-heading text-2xl font-black text-rose-700 dark:text-rose-400">
                      Dossier de vérification non validé
                    </h2>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      L'équipe de conformité n'a pas pu valider votre dossier pour le motif suivant :
                    </p>
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 text-left">
                      « {rejectionReason || adminFeedback || 'Dossier non conforme à la réglementation en vigueur.'} »
                    </div>
                  </div>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs font-bold px-6 py-3 transition-all inline-flex items-center gap-2"
                    >
                      Réviser et corriger mon dossier
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </div>
                </>
              ) : (
                /* Statut Submitted ou Under Review */
                <>
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary text-3xl animate-pulse">
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div className="max-w-lg mx-auto space-y-2">
                    <h2 className="font-heading text-2xl font-black text-foreground">
                      Votre dossier est en cours d'examen
                    </h2>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      Notre équipe de conformité étudie actuellement vos pièces justificatives. Vous recevrez une notification dès la finalisation de l'audit.
                    </p>
                  </div>

                  {/* Carte d'information sur les statuts */}
                  <div className="max-w-md mx-auto rounded-2xl border border-foreground/10 bg-muted/20 p-4 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
                      <span className="text-foreground/60">Abonnement Propriétaire :</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Actif</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
                      <span className="text-foreground/60">Vérification KYC / KYB :</span>
                      <span className="font-bold text-amber-600">⏳ En cours d'analyse</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/60">Publication des annonces :</span>
                      <span className="font-medium text-foreground/70">Débloquée dès validation</span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-wrap justify-center gap-3">
                    <Link
                      to="/dashboard/partner"
                      className="rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs font-bold px-6 py-3 shadow-lg shadow-primary/20 transition-all inline-flex items-center gap-2"
                    >
                      Accéder à mon tableau de bord propriétaire
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="rounded-2xl border border-foreground/20 hover:bg-muted text-foreground text-xs font-semibold px-4 py-3 transition-colors"
                    >
                      Consulter mes documents soumis
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 5. BOUTONS DE NAVIGATION DU WIZARD (Étapes 1 à 6) */}
          {currentStep <= 6 && (
            <div className="mt-8 pt-6 border-t border-foreground/10 space-y-4">
              {/* Message d'erreur visible directement au niveau des boutons */}
              {errorMessage && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-center gap-3 animate-shake">
                  <FontAwesomeIcon icon={faCircleExclamation} className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveFeedback && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 animate-fade-in">
                  <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              {/* Précédent */}
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-full sm:w-auto rounded-2xl border border-foreground/20 bg-background hover:bg-muted px-5 py-2.5 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Retour
                  </button>
                )}
              </div>

              {/* Bouton Sauvegarder Brouillon & Bouton Continuer */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveDraft(true)}
                  disabled={savingDraft}
                  className="rounded-2xl border border-foreground/15 bg-muted/40 hover:bg-muted px-4 py-2.5 text-xs font-semibold text-foreground transition-colors flex items-center gap-2"
                  title="Enregistrer pour reprendre plus tard"
                >
                  <FontAwesomeIcon icon={faFloppyDisk} className="text-foreground/60" />
                  <span>{savingDraft ? 'Enregistrement...' : 'Sauvegarder le brouillon'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={submitting}
                  className="rounded-2xl bg-primary hover:bg-primary-dark text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : currentStep === 6 ? (
                    <>
                      <span>Soumettre pour vérification</span>
                      <FontAwesomeIcon icon={faCheck} />
                    </>
                  ) : (
                    <>
                      <span>Enregistrer et continuer</span>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
