import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faArrowRight,
  faCircleCheck,
  faCircleInfo,
  faSpinner,
  faShieldHalved,
  faTriangleExclamation,
  faKey,
  faXmark,
  faEye,
  faEyeSlash,
  faCrown
} from '@fortawesome/free-solid-svg-icons';
import { useAuth, getPostLoginPath } from '../context/AuthContext';
import { isSupabaseConfigured } from '../supabase/supabaseClient';
import { ScrollReveal } from '../components/ScrollReveal';
import { BrandLogo } from '../components/BrandLogo';
import { AuthLayout } from '../components/AuthLayout';
import { useLanguage } from '../context/LanguageContext';

export function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    loginWithGoogle,
    resetPassword,
    updateSuperAdminPassword,
    user,
    isPasswordRecovery,
    completePasswordRecovery
  } = useAuth();

  // Définition du nouveau mot de passe après clic sur le lien reçu par e-mail
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySaving, setRecoverySaving] = useState(false);

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    if (recoveryPassword.length < 8) {
      setRecoveryError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setRecoveryError('Les deux mots de passe ne sont pas identiques.');
      return;
    }
    setRecoverySaving(true);
    const res = await resetPassword(user?.email || 'session', recoveryPassword);
    setRecoverySaving(false);
    if (!res.success) {
      setRecoveryError(res.error || 'Le mot de passe n’a pas pu être modifié.');
      return;
    }
    window.history.replaceState(null, '', window.location.pathname);
    completePasswordRecovery();
    if (user) navigate(getPostLoginPath(user), { replace: true });
    else setSuccessMsg('Mot de passe modifié. Vous pouvez vous connecter.');
  };

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email') || '';
  const fromCheckout = searchParams.get('fromCheckout') === 'true';

  const [email, setEmail] = useState(() => emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorInfo, setErrorInfo] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [oauthTimeoutExpired, setOauthTimeoutExpired] = useState(false);

  // Modal Réinitialisation mot de passe
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);

  const oauthErrorMessage = (() => {
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const raw =
      searchParams.get('error_description') ||
      hashParams.get('error_description') ||
      searchParams.get('error') ||
      hashParams.get('error');
    return raw ? raw.replace(/\+/g, ' ') : '';
  })();

  const isOAuthCallback =
    !oauthErrorMessage && (
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('id_token') ||
      window.location.search.includes('code=') ||
      Boolean(localStorage.getItem('benin_beyond_oauth_in_progress'))
    );

  useEffect(() => {
    if (!oauthErrorMessage) return;
    localStorage.removeItem('benin_beyond_oauth_in_progress');
    const isServerError = /database error|server_error|unexpected/i.test(oauthErrorMessage);
    setError(
      isServerError
        ? "La connexion Google a échoué côté serveur (compte mal initialisé dans Supabase). Contactez l'administration du site."
        : `Connexion Google interrompue : ${oauthErrorMessage}`
    );
    // Nettoyer l'URL pour ne pas réafficher l'erreur au prochain chargement
    window.history.replaceState(null, '', window.location.pathname);
  }, [oauthErrorMessage]);

  // Redirection automatique si déjà connecté ou suite à redirection OAuth Google
  useEffect(() => {
    if (user && !isPasswordRecovery) {
      localStorage.removeItem('benin_beyond_oauth_in_progress');
      const savedRedirect = localStorage.getItem('benin_beyond_oauth_redirect_path');
      localStorage.removeItem('benin_beyond_oauth_redirect_path');
      // Une redirection mémorisée vers l'onboarding (inscription) ne doit pas piéger les connexions suivantes :
      // le tableau de bord propriétaire renvoie lui-même vers l'onboarding si le dossier n'est pas soumis.
      if (savedRedirect && !savedRedirect.includes('onboarding') && savedRedirect !== '/login') {
        navigate(savedRedirect, { replace: true });
        return;
      }

      navigate(getPostLoginPath(user), { replace: true });
    }
  }, [user, navigate, isPasswordRecovery]);

  // Timeout de sécurité si l'authentification OAuth tarde à se synchroniser
  useEffect(() => {
    if (isOAuthCallback) {
      const timer = setTimeout(() => {
        setOauthTimeoutExpired(true);
        localStorage.removeItem('benin_beyond_oauth_in_progress');
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isOAuthCallback]);

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorInfo(null);
    setSuccessMsg('');

    if (!email) {
      setError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.user.role === 'admin' || res.user.role === 'subadmin') {
          const isSub = res.user.role === 'subadmin';
          setSuccessMsg(isSub ? 'Compte Assistant Admin identifié. Accès à la console opérationnelle...' : 'Compte Super-Administrateur vérifié. Accès à la Tour de Contrôle...');
          setTimeout(() => navigate(getPostLoginPath(res.user), { replace: true }), 400);
        } else if (res.user.role === 'owner' || res.user.role === 'partner') {
          setSuccessMsg('Compte Partenaire identifié. Accès à votre tableau de bord...');
          setTimeout(() => navigate(getPostLoginPath(res.user), { replace: true }), 400);
        } else {
          setSuccessMsg('Connexion réussie ! Accès à votre espace voyageur...');
          setTimeout(() => {
            if (from && !from.includes('/admin') && !from.includes('/dashboard')) {
              navigate(from, { replace: true });
            } else {
              navigate('/dashboard/client', { replace: true });
            }
          }, 400);
        }
      } else {
        setError(res.error || 'Identifiants invalides.');
        setErrorInfo({
          message: res.error || 'Identifiants invalides.',
          isGoogleAccount: Boolean(res.isGoogleAccount),
          isUnknownAccount: Boolean(res.isUnknownAccount),
          isWrongPassword: Boolean(res.isWrongPassword)
        });
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion.');
      setErrorInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanForgotEmail = (forgotEmail || '').trim().toLowerCase();
    if (!cleanForgotEmail) {
      setForgotError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    // Réinitialisation directe uniquement en mode local ; avec Supabase, un lien est envoyé par e-mail
    const isSuperAdminEmail = !isSupabaseConfigured && (
      cleanForgotEmail === 'isidoretoudonou@gmail.com' ||
      cleanForgotEmail === 'admin@beninbeyond.com' ||
      cleanForgotEmail === 'admin@beninbeyond.bj');

    if (isSuperAdminEmail) {
      if (!adminNewPassword) {
        setForgotError('Veuillez saisir votre nouveau mot de passe personnalisé.');
        return;
      }
      if (adminNewPassword.length < 4) {
        setForgotError('Le mot de passe doit contenir au moins 4 caractères.');
        return;
      }
      if (adminNewPassword !== adminConfirmPassword) {
        setForgotError('Les deux mots de passe saisis ne sont pas identiques.');
        return;
      }

      setForgotLoading(true);
      try {
        const success = await updateSuperAdminPassword(adminNewPassword);
        if (success) {
          setPassword(adminNewPassword);
          setEmail(cleanForgotEmail);
          setForgotSuccess('Votre mot de passe Administrateur a été enregistré avec succès ! Vous pouvez maintenant vous connecter directement.');
        } else {
          setForgotError('Erreur lors de la mise à jour du mot de passe.');
        }
      } catch (err) {
        setForgotError('Une erreur est survenue lors de la réinitialisation.');
      } finally {
        setForgotLoading(false);
      }
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(cleanForgotEmail);
      if (res.success) {
        setForgotSuccess(res.message || 'Un lien de réinitialisation vous a été envoyé.');
      } else {
        setForgotError(res.error || 'Impossible d’envoyer le lien de réinitialisation.');
      }
    } catch (err) {
      setForgotError('Une erreur est survenue.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setErrorInfo(null);
    setLoadingGoogle(true);
    localStorage.setItem('benin_beyond_oauth_in_progress', 'true');
    try {
      const cleanEmail = email.trim().toLowerCase();
      let hintRole = null;
      let hintCompany = '';
      if (cleanEmail) {
        try {
          const registered = JSON.parse(localStorage.getItem('benin_beyond_registered_users') || '[]');
          const found = registered.find((u) => (u.email || '').toLowerCase() === cleanEmail);
          if (found) {
            hintRole = found.role;
            hintCompany = found.company;
          }
        } catch {}
      }
      const res = await loginWithGoogle(hintRole, hintCompany);
      if (res?.success && res.user) {
        localStorage.removeItem('benin_beyond_oauth_in_progress');
        navigate(getPostLoginPath(res.user), { replace: true });
      } else if (res?.error) {
        localStorage.removeItem('benin_beyond_oauth_in_progress');
        setError(res.error);
        setLoadingGoogle(false);
      }
    } catch (err) {
      localStorage.removeItem('benin_beyond_oauth_in_progress');
      setError(err.message || 'Erreur lors de la connexion Google');
      setLoadingGoogle(false);
    }
  };

  const pendingRedirectTarget = typeof window !== 'undefined' ? localStorage.getItem('benin_beyond_oauth_redirect_path') : null;
  const isOnboardingRedirect = pendingRedirectTarget && pendingRedirectTarget.includes('onboarding');

  if (isPasswordRecovery) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <form onSubmit={handleRecoverySubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-foreground/10 bg-card p-6 shadow-sm">
          <div className="flex justify-center">
            <BrandLogo size="md" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">{t("Nouveau mot de passe")}</h1>
            <p className="mt-1 text-xs text-foreground/55">{t("Choisissez un mot de passe d’au moins 8 caractères.")}</p>
          </div>
          <input
            type="password"
            autoComplete="new-password"
            value={recoveryPassword}
            onChange={(e) => setRecoveryPassword(e.target.value)}
            placeholder={t("Nouveau mot de passe")}
            className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={recoveryConfirm}
            onChange={(e) => setRecoveryConfirm(e.target.value)}
            placeholder={t("Confirmer le mot de passe")}
            className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          {recoveryError && <p className="text-xs text-rose-600">{t(recoveryError)}</p>}
          <button
            type="submit"
            disabled={recoverySaving}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {recoverySaving ? t("Enregistrement…") : t("Enregistrer le mot de passe")}
          </button>
        </form>
      </div>
    );
  }

  // Écran de transition propre uniquement lors d'un retour OAuth en cours
  if ((isOAuthCallback || loadingGoogle) && !oauthTimeoutExpired) {
    return (
      <div className="min-h-[85vh] w-full flex flex-col items-center justify-center px-4">
        <div className="relative flex flex-col items-center max-w-sm w-full p-8 rounded-3xl bg-card border border-foreground/10 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="relative">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            </div>
            <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-md -z-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              Bénin Beyond Authentification
            </span>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {isOnboardingRedirect ? t("Préparation de votre dossier...") : t("Connexion sécurisée en cours...")}
            </h2>
            <p className="text-xs text-foreground/60 leading-relaxed">
              {isOnboardingRedirect
                ? "Validation de votre compte Partenaire et redirection directe vers l'espace d'onboarding officiel."
                : t("Validation de vos accès et redirection directe vers votre tableau de bord.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      image="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=85"
      eyebrow="Bon retour parmi nous"
      headline="Vos séjours et vos trajets au Bénin, au même endroit."
    >
      <div className="relative w-full">
        <ScrollReveal delay={0} y={15}>
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("Connexion à votre espace")}
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              {t("Accédez à vos réservations, gérez vos biens ou pilotez la plateforme")}
            </p>
          </div>

          {/* Formulaire */}
          <div>
            {/* Notification de réservation confirmée sécurisée */}
            {fromCheckout && (
              <div className="mb-6 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 p-5 text-foreground shadow-lg space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-emerald-800 dark:text-emerald-300">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-base text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{t("Paiement validé & Réservation confirmée !")}</span>
                </div>
                <p className="text-sm sm:text-base font-semibold leading-relaxed text-foreground">
                  {t("Votre règlement a bien été enregistré. Connectez-vous avec votre compte")} <strong>Google</strong> {t("ou vos identifiants pour accéder immédiatement à votre")} <strong>{t("Espace Voyageur")}</strong> {t("et télécharger vos vouchers officiels.")}
                </p>
              </div>
            )}

            {/* Feedback messages contextuels et stylisés */}
            {error && (
              <div className="mb-5 rounded-2xl border p-4 text-xs transition-all animate-fadeIn shadow-sm backdrop-blur-sm bg-card/90">
                {errorInfo?.isUnknownAccount ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 text-rose-600 dark:text-rose-400">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t("Compte introuvable")}</p>
                        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                          {t(error)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-3">
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
                      >
                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                        <span>{t("Créer un compte Hôte")}</span>
                      </Link>
                      <Link
                        to="/explore"
                        className="inline-flex items-center gap-2 rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        <span>{t("Réserver un séjour")}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setErrorInfo(null);
                          setPassword('');
                        }}
                        className="text-xs text-foreground/60 hover:text-foreground underline"
                      >
                        {t("Modifier l'e-mail")}
                      </button>
                    </div>
                  </div>
                ) : errorInfo?.isGoogleAccount ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 text-blue-600 dark:text-blue-400">
                      <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t("Compte synchronisé avec Google")}</p>
                        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                          {t(error)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-500/20">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loadingGoogle}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>{t("Se connecter avec Google")}</span>
                      </button>
                    </div>
                  </div>
                ) : errorInfo?.isWrongPassword ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5 text-amber-600 dark:text-amber-400">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t("Mot de passe incorrect")}</p>
                        <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                          {t(error)}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setShowForgotModal(true);
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                      >
                        <FontAwesomeIcon icon={faKey} className="h-3 w-3" />
                        <span>{t("Mot de passe oublié ? Réinitialiser")}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-destructive">
                    <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{t(error)}</span>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2 animate-fadeIn">
                <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 shrink-0" />
                <span>{t(successMsg)}</span>
              </div>
            )}

            {/* Google Quick Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle || loading}
              className={`w-full flex items-center justify-center gap-3 rounded-xl border py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-60 ${
                errorInfo?.isGoogleAccount
                  ? 'border-blue-500 bg-blue-50 text-blue-900 ring-4 ring-blue-500/25 animate-pulse'
                  : 'border-foreground/15 bg-white text-gray-800 hover:bg-gray-50 active:scale-[0.98]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loadingGoogle ? t("Connexion Google...") : t("Continuer avec Google")}</span>
            </button>

            {/* Divider */}
            <div className="relative my-3 sm:my-3.5 flex items-center justify-center">
              <div className="w-full border-t border-foreground/10" />
              <span className="absolute bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-foreground/50">
                {t("ou avec votre e-mail")}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">
                  {t("Adresse e-mail")}
                </label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorInfo) setErrorInfo(null);
                    }}
                    placeholder={t("votre.email@domaine.com")}
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground/80">
                    {t("Mot de passe")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-primary/80 hover:text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    {t("Mot de passe oublié ?")}
                  </button>
                </div>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faLock}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorInfo) setErrorInfo(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-11 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
                    title={showPassword ? t("Masquer le mot de passe") : t("Afficher le mot de passe")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground transition-colors cursor-pointer focus:outline-none"
                  >
                    <FontAwesomeIcon
                      icon={showPassword ? faEyeSlash : faEye}
                      className="h-4 w-4"
                    />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || loadingGoogle}
                className="w-full mt-1.5 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-primary/95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("Vérification...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("Se connecter")}</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Register or Explore */}
            <div className="mt-3.5 space-y-1.5 text-center text-xs text-foreground/60 border-t border-foreground/10 pt-2.5">
              <div>
                <span>{t("Vous êtes un voyageur ?")} </span>
                <Link
                  to="/explore"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>{t("Explorer & Réserver directement")}</span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                </Link>
              </div>
              <div className="pt-0.5">
                <span>{t("Vous êtes propriétaire ou loueur ?")} </span>
                <Link
                  to="/register"
                  className="font-bold text-accent hover:underline"
                >
                  {t("Devenir Hôte")}
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Modal Réinitialisation mot de passe */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-md rounded-3xl border border-foreground/15 bg-card p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSuccess('');
                  setForgotError('');
                }}
                className="absolute top-5 right-5 text-foreground/50 hover:text-foreground p-1"
                aria-label={t("Fermer")}
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-2 text-primary font-bold text-sm">
                <FontAwesomeIcon icon={faKey} />
                <span>{t("Sécurité & Accès")}</span>
              </div>
              <h3 className="font-heading text-lg font-black text-foreground">
                {t("Mot de passe oublié ?")}
              </h3>
              <p className="text-xs text-foreground/65 mt-1 mb-4 leading-relaxed">
                {t("Indiquez votre adresse e-mail ci-dessous. Si un compte existe, nous vous enverrons immédiatement les instructions pour définir un nouveau mot de passe.")}
              </p>

              {forgotSuccess ? (
                <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs text-emerald-800 dark:text-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-sm" />
                    <span>{t("Mot de passe mis à jour")}</span>
                  </div>
                  <p>{t(forgotSuccess)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSuccess('');
                    }}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                  >
                    {t("Retour à la connexion")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {forgotError && (
                    <div className="rounded-xl bg-destructive/15 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
                      <FontAwesomeIcon icon={faCircleInfo} className="h-3.5 w-3.5 shrink-0" />
                      <span>{t(forgotError)}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-foreground/80 mb-1">
                      {t("Votre adresse e-mail")}
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder={t("votre.email@domaine.com")}
                      className="w-full rounded-xl border border-foreground/15 bg-background/50 px-3.5 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {!isSupabaseConfigured && (forgotEmail.trim().toLowerCase() === 'isidoretoudonou@gmail.com' ||
                    forgotEmail.trim().toLowerCase() === 'admin@beninbeyond.com' ||
                    forgotEmail.trim().toLowerCase() === 'admin@beninbeyond.bj') && (
                    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-accent">
                        <FontAwesomeIcon icon={faCrown} />
                        <span>{t("Compte Super-Administrateur identifié")}</span>
                      </div>
                      <p className="text-[11px] text-foreground/75 leading-relaxed">
                        {t("En tant que Super-Administrateur, vous pouvez réinitialiser et réattribuer immédiatement votre mot de passe personnel sans délai :")}
                      </p>

                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground/80 mb-1">
                            {t("Nouveau mot de passe")}
                          </label>
                          <div className="relative">
                            <input
                              type={showAdminNewPassword ? 'text' : 'password'}
                              value={adminNewPassword}
                              onChange={(e) => setAdminNewPassword(e.target.value)}
                              placeholder={t("Votre mot de passe personnalisé")}
                              className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 pr-10 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1 text-xs"
                              tabIndex={-1}
                            >
                              <FontAwesomeIcon icon={showAdminNewPassword ? faEyeSlash : faEye} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-foreground/80 mb-1">
                            {t("Confirmer le mot de passe")}
                          </label>
                          <input
                            type={showAdminNewPassword ? 'text' : 'password'}
                            value={adminConfirmPassword}
                            onChange={(e) => setAdminConfirmPassword(e.target.value)}
                            placeholder={t("Répétez le mot de passe")}
                            className="w-full rounded-xl border border-foreground/15 bg-background px-3.5 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(false);
                        setForgotError('');
                        setAdminNewPassword('');
                        setAdminConfirmPassword('');
                      }}
                      className="flex-1 rounded-xl border border-foreground/15 py-2.5 text-xs font-bold text-foreground/70 hover:bg-muted"
                    >
                      {t("Annuler")}
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />
                          <span>{t("Traitement...")}</span>
                        </>
                      ) : (
                        <span>
                          {forgotEmail.trim().toLowerCase() === 'isidoretoudonou@gmail.com' ||
                          forgotEmail.trim().toLowerCase() === 'admin@beninbeyond.com' ||
                          forgotEmail.trim().toLowerCase() === 'admin@beninbeyond.bj'
                            ? t("Enregistrer mon mot de passe")
                            : t("Envoyer le lien")}
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
