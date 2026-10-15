import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faCircleInfo,
  faCircleCheck,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faArrowRight,
  faSpinner,
  faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { ScrollReveal } from '../components/ScrollReveal';
import { BrandIcon } from '../components/BrandLogo';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email') || '';

  // Form states : uniquement email & mot de passe pour l'inscription (le profil et KYC sont gérés dans l'Onboarding)
  const [email, setEmail] = useState(() => emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    if (!password) {
      setError('Veuillez définir un mot de passe de sécurité.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        email: cleanEmail,
        password,
        role: 'owner'
      });

      if (res.success) {
        setSuccessMsg('Compte partenaire créé avec succès ! Redirection vers votre dossier d’onboarding...');
        try {
          localStorage.setItem('benin_beyond_just_registered', 'true');
        } catch {}
        setTimeout(() => {
          navigate('/onboarding/partner?new=1', { replace: true });
        }, 600);
      } else {
        setError(res.error || "Impossible de créer votre compte partenaire.");
      }
    } catch (err) {
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
      const res = await loginWithGoogle('owner', 'Partenaire Bénin Beyond', '/onboarding/partner');
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

      <div className="relative z-10 w-full max-w-lg">
        <ScrollReveal delay={0} y={20}>
          
          {/* Session Banner if already connected */}
          {user && (
            <div className="mb-4 rounded-2xl bg-card border border-foreground/15 p-3.5 flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2 text-foreground/80">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  Connecté : <strong>{user.name || user.email}</strong> ({user.role === 'admin' ? 'Superviseur Admin' : user.role === 'owner' || user.role === 'partner' ? 'Partenaire' : 'Voyageur'})
                </span>
              </div>
              <Link
                to={user.role === 'admin' || user.role === 'subadmin' ? '/admin' : user.role === 'owner' || user.role === 'partner' ? '/dashboard/partner' : '/dashboard/client'}
                className="font-bold text-primary hover:underline shrink-0 text-[11px]"
              >
                Accéder à mon espace →
              </Link>
            </div>
          )}

          {/* Header Hôte */}
          <div className="text-center mb-8 flex flex-col items-center">
            <Link to="/" className="inline-flex flex-col items-center gap-2 group mb-2">
              <BrandIcon size="lg" className="hover:scale-105 transition-transform" />
              <span className="font-heading text-3xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                Bénin Beyond
              </span>
            </Link>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground mt-2">
              Créer votre compte Hôte
            </h1>
            <p className="text-xs text-foreground/60 mt-1.5 max-w-md mx-auto">
              Rejoignez le réseau officiel de prestige au Bénin. Créez vos identifiants pour démarrer votre dossier d'onboarding.
            </p>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-foreground/10 bg-card/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-5 rounded-2xl bg-destructive/15 border border-destructive/30 p-3.5 text-xs text-destructive flex items-center justify-between gap-2.5 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('déjà associé') && (
                  <Link to="/login" className="font-bold underline text-primary shrink-0 ml-2">
                    Se connecter
                  </Link>
                )}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2.5 animate-fadeIn">
                <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Quick Button */}
            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={loadingGoogle || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-foreground/15 bg-white text-gray-800 py-3 text-xs sm:text-sm font-semibold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loadingGoogle ? 'Connexion Google...' : "S'inscrire avec Google"}</span>
            </button>

            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-foreground/10" />
              <span className="absolute bg-card px-3 text-[10px] font-medium uppercase tracking-wider text-foreground/50">
                ou avec votre adresse e-mail
              </span>
            </div>

            {/* Email + Mot de passe Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
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
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Mot de passe de sécurité *
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full rounded-xl border border-foreground/15 bg-background/50 pl-10 pr-11 py-2.5 text-xs sm:text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/40 hover:text-foreground transition-colors cursor-pointer focus:outline-none"
                  >
                    <FontAwesomeIcon
                      icon={showPassword ? faEyeSlash : faEye}
                      className="h-3.5 w-3.5"
                    />
                  </button>
                </div>
                <p className="text-[10px] text-foreground/50 mt-1">
                  Ce mot de passe protégera l'accès à vos annonces, tarifs et versements financiers.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || loadingGoogle}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />
                      <span>Création de votre compte...</span>
                    </>
                  ) : (
                    <>
                      <span>Créer mon compte Hôte</span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 text-center text-xs text-foreground/60">
                <span>Déjà inscrit sur Bénin Beyond ? </span>
                <Link to="/login" className="font-bold text-primary hover:underline">
                  Se connecter
                </Link>
              </div>
            </form>
          </div>

          {/* Contextual Reassurance Banner at bottom */}
          <div className="mt-8 rounded-2xl border border-foreground/10 bg-card/60 p-4 text-center backdrop-blur-sm">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground mb-1">
              <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-500 h-3.5 w-3.5" />
              <span>Dossier KYC & Certifications</span>
            </div>
            <p className="text-[11px] text-foreground/60 max-w-md mx-auto">
              Après la création de vos identifiants, vous serez orienté vers votre espace d'onboarding officiel pour renseigner votre enseigne, coordonnées et documents légaux.
            </p>
            <div className="mt-3 pt-3 border-t border-foreground/10 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-foreground/70">
              <span>Vous êtes un voyageur ?</span>
              <Link
                to="/"
                className="font-bold text-accent hover:underline flex items-center gap-1"
              >
                <span>Explorer et réserver un séjour directement</span>
                <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>

        </ScrollReveal>
      </div>
    </div>
  );
}
