import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo,
  faCircleCheck,
  faEye,
  faEyeSlash,
  faArrowRight,
  faArrowLeft,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { useLanguage } from '../context/LanguageContext';

const CITIES = ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Ouidah', 'Grand-Popo', 'Parakou', 'Natitingou', 'Abomey', 'Bohicon', 'Lokossa', 'Djougou', 'Autre'];

// Valeurs acceptées par profiles.partner_type
const OFFERS = [
  { id: 'villa', label: 'Logement' },
  { id: 'hotel', label: 'Hôtel' },
  { id: 'vehicle', label: 'Véhicule' },
  { id: 'agency', label: 'Logements et véhicules' }
];

const INPUT =
  'w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-foreground/35 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';
const LABEL = 'mb-1.5 block text-sm font-medium text-foreground';

function ChoiceButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors ${
        active ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-foreground/15 text-foreground/75 hover:border-foreground/35'
      }`}
    >
      {children}
    </button>
  );
}

export function RegisterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, user } = useAuth();

  const emailParam = new URLSearchParams(location.search).get('email') || '';

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+229 ');
  const [email, setEmail] = useState(() => emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState('individual'); // 'individual' | 'business'
  const [companyName, setCompanyName] = useState('');
  const [offer, setOffer] = useState('villa');
  const [city, setCity] = useState('Cotonou');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const cleanPhone = phone.replace(/[^\d+]/g, '');

  // Étape 1 : identité et accès au compte
  const handleContinue = (e) => {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 3) return setError('Veuillez renseigner votre nom complet.');
    if (cleanPhone.replace(/\D/g, '').length < 8) return setError('Veuillez renseigner un numéro de téléphone valide.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Veuillez renseigner votre adresse e-mail.');
    if (password.length < 6) return setError('Le mot de passe doit comporter au moins 6 caractères.');
    setStep(2);
  };

  // Étape 2 : activité, puis création du compte
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (accountType === 'business' && !companyName.trim()) return setError("Veuillez renseigner le nom de votre entreprise.");
    if (!acceptTerms) return setError("Veuillez accepter les conditions d'utilisation pour créer votre compte.");

    setLoading(true);
    try {
      const res = await register({
        name: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        password,
        role: 'owner',
        company: accountType === 'business' ? companyName.trim() : '',
        partnerType: offer,
        city
      });

      if (res.success) {
        setSuccessMsg('Compte partenaire créé avec succès ! Redirection vers votre espace propriétaire...');
        try {
          localStorage.setItem('benin_beyond_just_registered', 'true');
        } catch {}
        setTimeout(() => navigate('/dashboard/partner', { replace: true }), 600);
      } else {
        setError(res.error || "Impossible de créer votre compte partenaire.");
        // Adresse déjà utilisée ou mot de passe refusé : retour à l'étape du compte
        if (/e-mail|mot de passe/i.test(res.error || '')) setStep(1);
      }
    } catch {
      setError("Une erreur inattendue est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      try {
        localStorage.setItem('benin_beyond_just_registered', 'true');
      } catch {}
      const res = await loginWithGoogle('owner', 'Partenaire Bénin Beyond', '/dashboard/partner');
      if (res?.error) setError(res.error);
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1600&q=85"
      eyebrow="Espace propriétaires"
      headline="Louez votre logement ou votre véhicule aux voyageurs du monde entier."
    >
      {user && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-card px-4 py-3 text-xs">
          <span className="truncate text-foreground/70">
            {t('Connecté :')} <strong className="text-foreground">{user.name || user.email}</strong>
          </span>
          <Link
            to={user.role === 'admin' || user.role === 'subadmin' ? '/admin' : user.role === 'owner' || user.role === 'partner' ? '/dashboard/partner' : '/dashboard/client'}
            className="shrink-0 font-semibold text-primary hover:underline"
          >
            {t('Accéder à mon espace →')}
          </Link>
        </div>
      )}

      {/* En-tête et progression */}
      <div className="mb-7">
        <p className="text-xs font-medium text-foreground/50">{t('Étape {n} sur 2', { n: step })}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          <span className="h-1 flex-1 rounded-full bg-primary" />
          <span className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step === 2 ? 'bg-primary' : 'bg-foreground/10'}`} />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {step === 1 ? t('Créer votre compte Hôte') : t('Parlez-nous de votre activité')}
        </h1>
        <p className="mt-1.5 text-sm text-foreground/60">
          {step === 1
            ? t('Quelques informations pour sécuriser votre compte.')
            : t('Ces informations nous aident à préparer votre espace propriétaire.')}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="flex items-start gap-2">
            <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t(error)}</span>
          </span>
          {error.includes('déjà associé') && (
            <Link to="/login" className="shrink-0 font-semibold text-primary underline">
              {t('Se connecter')}
            </Link>
          )}
        </div>
      )}

      {successMsg && (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
          <span>{t(successMsg)}</span>
        </div>
      )}

      {step === 1 ? (
        <div key="step-1" className="animate-fade-in">
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loadingGoogle || loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-foreground/15 bg-white py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loadingGoogle ? t('Connexion Google...') : t("S'inscrire avec Google")}</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-foreground/45">
            <span className="h-px flex-1 bg-foreground/10" />
            <span>{t('ou avec votre adresse e-mail')}</span>
            <span className="h-px flex-1 bg-foreground/10" />
          </div>

          <form onSubmit={handleContinue} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reg-name" className={LABEL}>{t('Nom complet')}</label>
              <input id="reg-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('Prénom et nom')} className={INPUT} />
            </div>
            <div>
              <label htmlFor="reg-phone" className={LABEL}>{t('Téléphone / WhatsApp')}</label>
              <input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 01 97 00 00 00" className={INPUT} />
            </div>
            <div>
              <label htmlFor="reg-email" className={LABEL}>{t('Adresse e-mail')}</label>
              <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('vous@exemple.com')} className={INPUT} />
            </div>
            <div>
              <label htmlFor="reg-password" className={LABEL}>{t('Mot de passe')}</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('Au moins 6 caractères')}
                  className={`${INPUT} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/40 transition-colors hover:text-foreground"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span>{t('Continuer')}</span>
              <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <form key="step-2" onSubmit={handleSubmit} className="animate-fade-in space-y-5" noValidate>
          <fieldset>
            <legend className={LABEL}>{t('Vous êtes')}</legend>
            <div className="grid grid-cols-2 gap-2.5">
              <ChoiceButton active={accountType === 'individual'} onClick={() => setAccountType('individual')}>
                {t('Particulier')}
              </ChoiceButton>
              <ChoiceButton active={accountType === 'business'} onClick={() => setAccountType('business')}>
                {t('Professionnel')}
              </ChoiceButton>
            </div>
          </fieldset>

          {accountType === 'business' && (
            <div className="animate-fade-in">
              <label htmlFor="reg-company" className={LABEL}>{t("Nom de l'entreprise")}</label>
              <input id="reg-company" type="text" autoComplete="organization" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t('Ex : Résidence Les Cocotiers')} className={INPUT} />
            </div>
          )}

          <fieldset>
            <legend className={LABEL}>{t('Vous proposez')}</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {OFFERS.map((o) => (
                <ChoiceButton key={o.id} active={offer === o.id} onClick={() => setOffer(o.id)}>
                  {t(o.label)}
                </ChoiceButton>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="reg-city" className={LABEL}>{t('Ville principale')}</label>
            <select id="reg-city" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT}>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c === 'Autre' ? t('Autre ville') : c}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground/70">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
            <span>
              {t("J'accepte les")}{' '}
              <Link to="/cgu" target="_blank" className="font-medium text-primary hover:underline">{t("conditions d'utilisation")}</Link>
              {' '}{t('et la')}{' '}
              <Link to="/confidentialite" target="_blank" className="font-medium text-primary hover:underline">{t('politique de confidentialité')}</Link>
              {' '}{t('de Bénin Beyond.')}
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(1);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-foreground/15 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
              <span>{t('Retour')}</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                  <span>{t('Création de votre compte...')}</span>
                </>
              ) : (
                <span>{t('Créer mon compte Hôte')}</span>
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-foreground/60">
        {t('Déjà inscrit sur Bénin Beyond ?')}{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t('Se connecter')}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-foreground/45">
        {t('Vous êtes un voyageur ?')}{' '}
        <Link to="/explore" className="font-medium text-foreground/70 hover:text-primary hover:underline">
          {t('Explorer et réserver un séjour directement')}
        </Link>
      </p>
    </AuthLayout>
  );
}
